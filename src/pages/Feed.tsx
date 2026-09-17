import { useEffect, useState } from 'react';
import { PostCard } from '../components/PostCard';
import { Search, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function Feed() {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  
  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      setError('');
      try {
        let query = supabase
          .from('posts')
          .select('*, profiles(*)')
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (categoryFilter && categoryFilter !== 'todos') {
          // Supabase ENUMs are exact match, so let's use ilike on string, or map properly
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
        setPosts(postsData as Post[]);

        if (user) {
          const postIds = postsData.map(p => p.id);
          if (postIds.length > 0) {
            const { data: likesData } = await supabase
              .from('likes')
              .select('post_id')
              .eq('user_id', user.id)
              .in('post_id', postIds);
              
            if (likesData) {
              setLikedPostIds(new Set(likesData.map(l => l.post_id)));
            }
          }
        }
      } catch (err: any) {
        setError('Erro ao carregar o feed. Tente novamente mais tarde.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadFeed();
  }, [categoryFilter, user]);

  return (
    <div className="max-w-3xl mx-auto w-full pt-8 pb-24 px-4 sm:px-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {categoryFilter && categoryFilter !== 'todos' ? `Feed: ${categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}` : 'Feed'}
        </h1>
        <p className="text-gray-500 text-sm">Descubra os recursos mais recentes da comunidade.</p>
        
        <div className="mt-6 relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="search" 
            placeholder="Pesquisar..." 
            className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all shadow-sm"
          />
        </div>
      </header>

      <div className="flex flex-col">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-500 text-sm font-medium">{error}</p>
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <PostCard key={post.id} post={post} isLiked={likedPostIds.has(post.id)} />
          ))
        ) : (
          <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-500 text-sm">Nenhum recurso encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
