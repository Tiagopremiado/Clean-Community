import { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function Explore() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

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
          .select('*, profiles(*)')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`)
          .order('likes', { ascending: false })
          .limit(20);

        if (error) throw error;
        if (mounted) setPosts(postsData as Post[]);

        if (user && postsData && postsData.length > 0) {
          const { data: likesData } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postsData.map(p => p.id));
            
          if (likesData) {
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
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query, user]);

  return (
    <div className="max-w-3xl mx-auto w-full pt-8 pb-32 px-4 sm:px-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Explorar</h1>
        <p className="text-gray-500 text-sm">Pesquise por qualquer termo, tag ou conteúdo.</p>
        
        <div className="mt-6 relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="search" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar títulos ou descrições..." 
            className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all shadow-sm"
          />
        </div>
      </header>

      <section>
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : searched ? (
          <>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Resultados</h2>
            {posts.length > 0 ? (
              <div className="flex flex-col">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} isLiked={likedPostIds.has(post.id)} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                <p className="text-gray-500 text-sm">Nenhum resultado encontrado para "{query}".</p>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-gray-500 text-sm">Comece a digitar para pesquisar.</p>
          </div>
        )}
      </section>
    </div>
  );
}
