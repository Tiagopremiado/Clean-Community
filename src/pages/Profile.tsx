import { useEffect, useState } from 'react';
import { PostCard } from '../components/PostCard';
import { Settings, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Post, UserProfile } from '../types';

export function Profile() {
  const { user, signOut } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) setProfile(profileData as UserProfile);

        const { data: postsData } = await supabase
          .from('posts')
          .select('*, profiles(*)')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });
          
        if (postsData) {
          setPosts(postsData as Post[]);
          
          if (postsData.length > 0) {
            const { data: likesData } = await supabase
              .from('likes')
              .select('post_id')
              .eq('user_id', user.id)
              .in('post_id', postsData.map(p => p.id));
              
            if (likesData) {
              setLikedPostIds(new Set(likesData.map(l => l.post_id)));
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const username = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'usuario';
  const avatar = profile?.avatar || user?.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.id}`;
  const bio = profile?.bio;
  const role = profile?.role || 'member';

  return (
    <div className="max-w-3xl mx-auto w-full pt-12 pb-32 px-4 sm:px-8">
      <header className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-12 text-center sm:text-left">
        <img 
          src={avatar} 
          alt={displayName} 
          className="w-24 h-24 rounded-full border border-gray-200 shadow-sm"
        />
        <div className="flex-1 flex flex-col items-center sm:items-start pt-1">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{displayName}</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors" title="Configurações">
                <Settings className="w-4 h-4" />
              </button>
              <button 
                onClick={signOut}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" 
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          <span className="text-gray-500 font-medium mb-3">@{username}</span>
          {bio && (
            <p className="text-gray-700 text-sm max-w-md leading-relaxed">{bio}</p>
          )}
          <div className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600 uppercase tracking-wide">
            {role.toUpperCase()}
          </div>
        </div>
      </header>

      <section>
        <div className="border-b border-gray-200 mb-6">
          <h2 className="text-sm font-bold text-black border-b-2 border-black inline-block pb-3 px-1 -mb-[1px]">
            Publicações ({posts.length})
          </h2>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : posts.length > 0 ? (
          <div className="flex flex-col">
            {posts.map(post => (
              <PostCard key={post.id} post={post} isLiked={likedPostIds.has(post.id)} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-500 text-sm">Você ainda não publicou nada.</p>
          </div>
        )}
      </section>
    </div>
  );
}

