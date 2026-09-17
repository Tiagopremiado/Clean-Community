import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PostCard } from '../components/PostCard';
import { Search, Loader2, Sparkles, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { Post, normalizeProfile, getPinnedPostId } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { FeedFilterBar, FeedSortOption } from '../components/FeedFilterBar';

const CATEGORY_MAP: Record<string, string> = {
  'skills': 'Skills',
  'mcps': 'MCPs',
  'workflows': 'Workflows',
  'prompts': 'Prompts',
  'ferramentas': 'Ferramentas',
  'referências': 'Referências',
  'referencias': 'Referências'
};

async function fetchPostsResiliently(
  feedSort: FeedSortOption,
  categoryFilter: string | null
): Promise<any[]> {
  const mappedCategory = categoryFilter && categoryFilter.toLowerCase() !== 'todos'
    ? (CATEGORY_MAP[categoryFilter.toLowerCase()] || categoryFilter)
    : null;

  // 1. Direct REST fetcher: ultra-fast (~500ms), unaffected by Supabase JS client auth lock stalls
  const fetchViaRest = async () => {
    let url = `${supabaseUrl}/rest/v1/posts?select=*,profiles(*),comments(count),likes_count:likes(count)&limit=50`;
    if (feedSort === 'popular') {
      url += `&order=likes.desc`;
    } else {
      url += `&order=created_at.desc`;
    }
    if (mappedCategory) {
      url += `&category=eq.${encodeURIComponent(mappedCategory)}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Accept: 'application/json'
        }
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  // 2. Client query via supabase-js
  const fetchViaClient = async () => {
    let query = supabase
      .from('posts')
      .select('*, profiles(*), comments(count), likes_count:likes(count)')
      .limit(50);

    if (feedSort === 'popular') {
      query = query.order('likes', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (mappedCategory) {
      query = query.eq('category', mappedCategory);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  try {
    // Race client query with a 3.5s threshold before launching REST fallback
    const clientPromise = fetchViaClient();
    const fallbackTimerPromise = new Promise<any[]>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const restData = await fetchViaRest();
          resolve(restData);
        } catch (restErr) {
          reject(restErr);
        }
      }, 3500);
    });

    return await Promise.race([clientPromise, fallbackTimerPromise]);
  } catch (clientErr) {
    console.warn('Tentativa primária falhou, usando API REST direta:', clientErr);
    return await fetchViaRest();
  }
}

export function Feed() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategory = searchParams.get('category');
  const { settings } = useSettings();
  
  // Default to user setting if no specific category is in query params
  const categoryFilter = rawCategory || (settings.defaultCategory !== 'todos' ? settings.defaultCategory : null);

  const [feedSort, setFeedSort] = useState<FeedSortOption>('recent');
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('clean_community_feed_cache');
        if (cached) return JSON.parse(cached);
      }
    } catch {
      // Ignore parse error
    }
    return [];
  });
  const postsRef = useRef<Post[]>(posts);
  postsRef.current = posts;

  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('clean_community_feed_cache');
    } catch {
      return true;
    }
  });
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const handleSelectCategory = (category: string) => {
    const next = new URLSearchParams(searchParams);
    if (!category || category.toLowerCase() === 'todos') {
      next.delete('category');
    } else {
      next.set('category', category.toLowerCase());
    }
    setSearchParams(next);
  };
  
  const loadFeed = useCallback(async (isRetry = false) => {
    if (!postsRef.current.length || isRetry) {
      setLoading(true);
    }
    setError('');

    try {
      const postsData = await fetchPostsResiliently(feedSort, categoryFilter);

      const formattedPosts = ((postsData as any[]) || []).map(p => {
        const rawLikesCount = p.likes_count?.[0]?.count ?? (Array.isArray(p.likes) ? (p.likes[0]?.count ?? 0) : (typeof p.likes === 'number' ? p.likes : 0));
        return {
          ...p,
          profiles: normalizeProfile(p.profiles) || p.profiles,
          comments_count: p.comments?.[0]?.count ?? p.comments_count ?? 0,
          likes: rawLikesCount
        };
      });

      setPosts(formattedPosts as Post[]);

      // Cache posts locally for instant 0ms load on next visit or network blip
      try {
        if (typeof window !== 'undefined' && formattedPosts.length > 0 && (!categoryFilter || categoryFilter === 'todos')) {
          localStorage.setItem('clean_community_feed_cache', JSON.stringify(formattedPosts));
        }
      } catch {
        // Storage full/disabled
      }

      if (user && postsData && postsData.length > 0) {
        try {
          const postIds = postsData.map(p => p.id);
          const { data: likesData } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds);
            
          if (likesData) {
            setLikedPostIds(new Set(likesData.map(l => l.post_id)));
          }
        } catch (likesErr) {
          console.warn('Erro ao carregar curtidas do usuário no Supabase:', likesErr);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar feed:', err);
      // If we have cached posts, keep showing them
      if (!postsRef.current.length) {
        // Check if there is cache available
        try {
          const cached = localStorage.getItem('clean_community_feed_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPosts(parsed);
              return;
            }
          }
        } catch {}
        setError('Não foi possível conectar ao banco de dados. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, user, feedSort]);

  useEffect(() => {
    loadFeed();

    const handleOnline = () => {
      loadFeed(true);
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [loadFeed]);

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      navigate('/login?mode=signup');
      return;
    }
    const isCurrentlyLiked = likedPostIds.has(postId);
    const nextLiked = !isCurrentlyLiked;
    
    // Optimistic UI update
    setLikedPostIds(prev => {
      const next = new Set(prev);
      if (nextLiked) next.add(postId);
      else next.delete(postId);
      return next;
    });

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const newCount = nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1);
      return { ...p, likes: newCount };
    }));

    try {
      const currentPost = posts.find(p => p.id === postId);
      const updatedLikes = nextLiked ? (currentPost ? currentPost.likes + 1 : 1) : Math.max(0, (currentPost ? currentPost.likes - 1 : 0));
      
      if (nextLiked) {
        await supabase.from('likes').upsert({ post_id: postId, user_id: user.id });
      } else {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
      }
      await supabase.from('posts').update({ likes: updatedLikes }).eq('id', postId);
    } catch (e) {
      console.error('Error toggling like:', e);
      // rollback
      setLikedPostIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const rollCount = isCurrentlyLiked ? p.likes + 1 : Math.max(0, p.likes - 1);
        return { ...p, likes: rollCount };
      }));
    }
  };

  const pinnedPostId = getPinnedPostId();
  const filteredPosts = posts
    .filter(post => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (post.title || '').toLowerCase().includes(q) ||
        (post.description || '').toLowerCase().includes(q) ||
        (post.category || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!pinnedPostId) return 0;
      if (a.id === pinnedPostId) return -1;
      if (b.id === pinnedPostId) return 1;
      return 0;
    });

  return (
    <div className="max-w-3xl mx-auto w-full pt-8 pb-24 px-4 sm:px-8">
      <header className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-gray-900 dark:text-zinc-50">
          {categoryFilter && categoryFilter !== 'todos' ? `Feed: ${categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}` : 'Feed'}
        </h1>
        <p className="text-gray-500 dark:text-zinc-400 text-sm">Descubra os recursos mais recentes da comunidade.</p>
        
        {!user && (
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-zinc-900 to-black text-white dark:from-zinc-900 dark:to-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-medium text-zinc-300 mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Navegando como visitante</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                Você pode ver todo o feed livremente. Crie uma conta para publicar ferramentas, curtir e interagir com outros criadores.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Link
                to="/login?mode=login"
                className="flex-1 sm:flex-none text-center px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                Entrar
              </Link>
              <Link
                to="/login?mode=signup"
                className="flex-1 sm:flex-none text-center px-4 py-2 rounded-xl text-xs font-bold text-black bg-white hover:bg-zinc-200 transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Criar Conta</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 mb-4 relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
          <input 
            type="search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por título, descrição ou categoria..." 
            className="w-full bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-zinc-600 focus:border-black dark:focus:border-zinc-600 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          />
        </div>

        {/* Barra Seletora de Feeds e Categorias (Mobile & Desktop) */}
        <FeedFilterBar
          currentCategory={categoryFilter || 'todos'}
          onSelectCategory={handleSelectCategory}
          currentSort={feedSort}
          onSelectSort={setFeedSort}
          totalResults={filteredPosts.length}
        />
      </header>

      <div className="flex flex-col">
        {error && posts.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
            <span>Exibindo conteúdo salvo em cache. Verifique sua conexão.</span>
            <button
              onClick={() => loadFeed(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-200/60 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-900 font-semibold transition-colors cursor-pointer shrink-0"
            >
              Reconectar
            </button>
          </div>
        )}

        {loading && posts.length === 0 ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : error && posts.length === 0 ? (
          <div className="py-12 px-4 text-center border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-zinc-900 dark:text-zinc-100 text-sm font-semibold mb-1">Erro ao carregar dados do Supabase</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-4 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => loadFeed(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>
          </div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              isLiked={likedPostIds.has(post.id)}
              onToggleLike={() => handleToggleLike(post.id)}
            />
          ))
        ) : (
          <div className="py-12 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum recurso encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
