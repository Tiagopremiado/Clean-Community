import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search, Loader2, Sparkles, Compass } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { supabase } from '../lib/supabase';
import { Post, normalizeProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { FEED_CATEGORIES } from '../components/FeedFilterBar';

export function Explore() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    let mounted = true;

    const searchPosts = async () => {
      if (!query.trim()) {
        if (mounted) {
          setPosts([]);
          setSearched(false);
        }
        return;
      }

      if (mounted) {
        setLoading(true);
        setSearched(true);
      }
      
      try {
        const { data: postsData, error } = await supabase
          .from('posts')
          .select('*, profiles(*), comments(count), likes_count:likes(count)')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) throw error;
        
        const formattedPosts = ((postsData as any[]) || []).map(p => {
          const rawLikesCount = p.likes_count?.[0]?.count ?? (Array.isArray(p.likes) ? (p.likes[0]?.count ?? 0) : (typeof p.likes === 'number' ? p.likes : 0));
          return {
            ...p,
            profiles: normalizeProfile(p.profiles) || p.profiles,
            comments_count: p.comments?.[0]?.count ?? p.comments_count ?? 0,
            likes: rawLikesCount
          };
        });
        
        if (mounted) setPosts(formattedPosts as Post[]);

        if (user && postsData && postsData.length > 0) {
          const { data: likesData } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postsData.map(p => p.id));
            
          if (likesData && mounted) {
            setLikedPostIds(new Set(likesData.map(l => l.post_id)));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      searchPosts();
    }, 400);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query, user]);

  const handleToggleLike = async (postId: string) => {
    if (!user) {
      navigate('/login?mode=signup');
      return;
    }
    const isCurrentlyLiked = likedPostIds.has(postId);
    const nextLiked = !isCurrentlyLiked;
    
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
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full pt-8 pb-32 px-4 sm:px-8">
      <header className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-gray-900 dark:text-zinc-50">Explorar</h1>
        <p className="text-gray-500 dark:text-zinc-400 text-sm">Pesquise por qualquer termo, tag ou conteúdo.</p>
        
        <div className="mt-6 relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
          <input 
            type="search" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar títulos, tags ou descrições..." 
            className="w-full bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl py-3 pl-11 pr-4 text-base focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-zinc-600 focus:border-black dark:focus:border-zinc-600 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          />
        </div>
      </header>

      <section>
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : searched ? (
          <>
            <h2 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">Resultados</h2>
            {posts.length > 0 ? (
              <div className="flex flex-col">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    isLiked={likedPostIds.has(post.id)}
                    onToggleLike={() => handleToggleLike(post.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum resultado encontrado para "{query}".</p>
              </div>
            )}
          </>
        ) : (
          <div className="py-6">
            <div className="flex items-center gap-2 mb-4 px-1">
              <Compass className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
              <h2 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                Explorar por Categoria
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEED_CATEGORIES.filter(c => c.name !== 'Todos').map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.name}
                    to={`/?category=${cat.name.toLowerCase()}`}
                    className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/70 dark:border-zinc-800/80 hover:border-black dark:hover:border-white transition-all shadow-xs group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-zinc-300 group-hover:scale-105 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-all shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors">
                        {cat.label}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                        {cat.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
