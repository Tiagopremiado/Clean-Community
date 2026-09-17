import React, { useEffect, useState, useCallback } from 'react';
import { PostCard } from '../components/PostCard';
import { Search, Loader2, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Post, normalizeProfile, getPinnedPostId } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { saveOfflinePosts, getOfflinePosts } from '../lib/offlineFallback';
import { NetworkStatusBar } from '../components/NetworkStatusBar';
import { FeedFilterBar, FeedSortOption } from '../components/FeedFilterBar';

export function Feed() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategory = searchParams.get('category');
  const { settings } = useSettings();
  
  // Default to user setting if no specific category is in query params
  const categoryFilter = rawCategory || (settings.defaultCategory !== 'todos' ? settings.defaultCategory : null);

  const [feedSort, setFeedSort] = useState<FeedSortOption>('recent');
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);
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
  
  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. OBRIGATÓRIO: Consulta prioritária diretamente ao banco de dados Supabase
      let query = supabase
        .from('posts')
        .select('*, profiles(*), comments(count), likes_count:likes(count)');

      // Ordenação dinâmica: mais recentes ou mais populares (em alta)
      if (feedSort === 'popular') {
        query = query.order('likes', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      query = query.limit(50);
        
      if (categoryFilter && categoryFilter !== 'todos') {
        const categoriesObj: Record<string, string> = {
          'skills': 'Skills',
          'mcps': 'MCPs',
          'workflows': 'Workflows',
          'prompts': 'Prompts',
          'ferramentas': 'Ferramentas',
          'referências': 'Referências'
        };
        const mapped = categoriesObj[categoryFilter.toLowerCase()];
        if (mapped) {
          query = query.eq('category', mapped);
        }
      }

      const { data: postsData, error: postsError } = await query;
      if (postsError) throw postsError;
      
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
      setIsOfflineFallback(false);
      setLastSyncTimestamp(Date.now());

      // 2. Salva no localStorage estritamente como snapshot/fallback para modo offline
      saveOfflinePosts(formattedPosts as Post[]);

      if (user && postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
          
        if (likesData) {
          setLikedPostIds(new Set(likesData.map(l => l.post_id)));
        }
      }
    } catch (err: any) {
      console.warn('Falha na conexão com banco de dados Supabase. Ativando fallback offline:', err);
      
      // 3. Fallback: Se o banco estiver temporariamente indisponível ou usuário offline, carrega do localStorage
      const cached = getOfflinePosts();
      if (cached && cached.posts && cached.posts.length > 0) {
        let sorted = [...cached.posts];
        if (feedSort === 'popular') {
          sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        } else {
          sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        if (categoryFilter && categoryFilter.toLowerCase() !== 'todos') {
          sorted = sorted.filter(p => p.category.toLowerCase() === categoryFilter.toLowerCase());
        }
        setPosts(sorted);
        setIsOfflineFallback(true);
        setLastSyncTimestamp(cached.timestamp);
      } else {
        setError('Não foi possível conectar ao banco de dados Supabase e não há cache offline disponível.');
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, user, feedSort]);

  useEffect(() => {
    loadFeed();
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
        post.title.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q)
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
      {/* Indicador de Status de Conexão com o Banco Supabase / Fallback Offline */}
      <div className="mb-6 rounded-2xl overflow-hidden shadow-xs border border-amber-500/20">
        <NetworkStatusBar 
          isOfflineFallback={isOfflineFallback} 
          onRefresh={loadFeed} 
          lastSyncTime={lastSyncTimestamp} 
        />
      </div>

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
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-500 text-sm font-medium">{error}</p>
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
