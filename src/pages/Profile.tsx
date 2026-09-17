import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PostCard } from '../components/PostCard';
import { ProfileSettings } from '../components/ProfileSettings';
import { 
  Settings, 
  LogOut, 
  Loader2, 
  Camera, 
  Sliders, 
  ArrowLeft, 
  Shield, 
  Crown, 
  User, 
  Check, 
  X,
  FileText,
  Heart,
  Ban,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Post, 
  UserProfile, 
  Role, 
  normalizeProfile, 
  isAdminUser, 
  isUserAdminOrDev, 
  isUserStaff,
  setStoredRoleOverride,
  toggleUserBan,
  isUserBanned
} from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Profile() {
  const { userIdOrUsername } = useParams<{ userIdOrUsername?: string }>();
  const navigate = useNavigate();
  const { user, profile: authProfile, signOut, refreshProfile } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'posts' | 'settings'>('posts');

  // Role edit modal state for Dev/Admin
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('member');
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Erro ao sair da conta:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Check if viewing own profile
  const cleanParam = userIdOrUsername?.toLowerCase().trim().replace(/^@/, '');
  const isCurrentUserByParam = !cleanParam || 
    cleanParam === user?.id || 
    (authProfile?.username && authProfile.username.toLowerCase() === cleanParam) ||
    (user?.email && user.email.split('@')[0].toLowerCase() === cleanParam);

  const isOwnProfile = isCurrentUserByParam;
  const isViewerAdminOrDev = isUserAdminOrDev(authProfile) || isUserAdminOrDev(user as any);
  const isViewerStaff = isUserStaff(authProfile) || isUserStaff(user as any);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let targetUserId = user?.id;
      let targetProfileData: UserProfile | null = null;

      if (!isOwnProfile && cleanParam) {
        // Find profile by username or id
        const { data: profileByUsername } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', cleanParam)
          .maybeSingle();

        if (profileByUsername) {
          targetProfileData = profileByUsername as UserProfile;
          targetUserId = profileByUsername.id;
        } else {
          // Try by uuid
          const { data: profileById } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', cleanParam)
            .maybeSingle();

          if (profileById) {
            targetProfileData = profileById as UserProfile;
            targetUserId = profileById.id;
          } else {
            setError('Usuário não encontrado.');
            setLoading(false);
            return;
          }
        }
      } else {
        // Own profile
        if (user) {
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
            
          targetProfileData = (myProfile as UserProfile) || authProfile;
          targetUserId = user.id;

          if (!targetProfileData) {
            const email = user.email || '';
            const emailPrefix = email ? email.split('@')[0] : '';
            const isKnownThales = email.toLowerCase().includes('thaleskaleby') || email.toLowerCase().includes('kalebyalvesgamer');
            targetProfileData = {
              id: user.id,
              name: (user.user_metadata?.full_name as string) || (isKnownThales ? 'Thales — Atos Web 💜' : (emailPrefix || 'Membro')),
              username: (user.user_metadata?.username as string) || (isKnownThales ? 'thalesdev' : (emailPrefix || 'usuario')),
              avatar: (user.user_metadata?.avatar_url as string) || `https://api.dicebear.com/9.x/notionists/svg?seed=${user.id}`,
              role: isUserAdminOrDev(user as any) ? 'admin' : 'member',
              bio: isKnownThales ? '💜 — Insta: @atosweb_\n💎 — Owner: LPVCW Workflow \n🎩 — Moderador: CLEAN Community' : null,
              created_at: user.created_at || new Date().toISOString()
            };
          }
        }
      }

      if (targetProfileData) {
        const normalized = normalizeProfile(targetProfileData);
        setProfile(normalized);
        if (normalized) {
          setSelectedRole(normalized.role || 'member');
        }
      }

      // Load user posts with exact likes and comments count
      if (targetUserId) {
        const email = user?.email?.toLowerCase() || '';
        const isThalesAlias = email.includes('thaleskaleby') || email.includes('kalebyalvesgamer');
        const authorIds = (isOwnProfile && isThalesAlias && targetUserId !== '656880a5-c555-4707-8517-246a9635af83')
          ? [targetUserId, '656880a5-c555-4707-8517-246a9635af83']
          : [targetUserId];

        let postsQuery = supabase
          .from('posts')
          .select('*, profiles(*), comments(count), likes_count:likes(count)');

        if (authorIds.length > 1) {
          postsQuery = postsQuery.in('author_id', authorIds);
        } else {
          postsQuery = postsQuery.eq('author_id', targetUserId);
        }

        const { data: postsData, error: postsError } = await postsQuery.order('created_at', { ascending: false });

        if (postsError) throw postsError;

        if (postsData) {
          const formattedPosts = ((postsData as any[]) || []).map(p => {
            const rawLikesCount = p.likes_count?.[0]?.count ?? (Array.isArray(p.likes) ? (p.likes[0]?.count ?? 0) : (typeof p.likes === 'number' ? p.likes : 0));
            return {
              ...p,
              profiles: normalizeProfile(p.profiles) || p.profiles || targetProfileData,
              comments_count: p.comments?.[0]?.count ?? p.comments_count ?? 0,
              likes: rawLikesCount
            };
          });
          setPosts(formattedPosts as Post[]);

          // Check if logged-in user liked these posts
          if (user && postsData.length > 0) {
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
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError('Erro ao carregar o perfil.');
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile, cleanParam, user, authProfile]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Handle toggling like on profile's posts
  const handleToggleLike = async (postId: string) => {
    if (!user) return;
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

  // Handle role modification by Admin/Dev
  const handleSaveRole = async () => {
    if (!profile || !isViewerAdminOrDev) return;
    setIsSavingRole(true);
    setRoleMessage(null);
    try {
      // 1. Update in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', profile.id);

      if (updateError) {
        console.warn('Supabase profile update warning:', updateError);
      }

      // 2. Update persistent override
      setStoredRoleOverride(profile.id, selectedRole);
      if (profile.username) {
        setStoredRoleOverride(profile.username, selectedRole);
      }

      // 3. Update local state immediately
      setProfile(prev => prev ? { ...prev, role: selectedRole } : null);
      setPosts(prev => prev.map(p => ({
        ...p,
        profiles: p.profiles && p.profiles.id === profile.id ? { ...p.profiles, role: selectedRole } : p.profiles
      })));

      if (isOwnProfile && refreshProfile) {
        refreshProfile();
      }

      setRoleMessage(`Cargo alterado com sucesso para ${selectedRole === 'admin' ? 'Administrador' : selectedRole === 'moderator' ? 'Moderador' : 'Membro'}!`);
      setTimeout(() => {
        setIsRoleModalOpen(false);
        setRoleMessage(null);
      }, 1200);
    } catch (err: any) {
      console.error('Error saving role:', err);
      setRoleMessage('Erro ao alterar cargo. Tente novamente.');
    } finally {
      setIsSavingRole(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto w-full pt-20 pb-32 px-4 sm:px-8 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500 mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando perfil...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto w-full pt-12 pb-32 px-4 sm:px-8">
        <button 
          onClick={() => navigate(-1)} 
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white mb-8 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/40 p-8">
          <p className="text-gray-800 dark:text-gray-200 font-semibold mb-2">{error || 'Perfil não encontrado'}</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">O usuário solicitado pode ter alterado o nome de usuário ou a conta não existe.</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile.name || profile.username || 'Usuário';
  const username = profile.username || 'usuario';
  const avatar = profile.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${profile.id}`;
  const bio = profile.bio;
  const isProfileAdmin = profile.role === 'admin' || isAdminUser(username);
  const isProfileMod = profile.role === 'moderator';
  const totalLikes = posts.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  return (
    <div className="max-w-3xl mx-auto w-full pt-8 pb-32 px-4 sm:px-8">
      {/* Back button when viewing someone else */}
      {!isOwnProfile && (
        <button 
          onClick={() => navigate(-1)} 
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white mb-6 cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Voltar
        </button>
      )}

      {/* Profile Header */}
      <header className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-12 text-center sm:text-left">
        <div className="relative group shrink-0">
          <img 
            src={avatar} 
            alt={displayName} 
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-gray-200 dark:border-zinc-800 object-cover bg-gray-50 dark:bg-zinc-900"
          />
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="absolute inset-0 rounded-full bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Alterar foto de perfil"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5">Editar</span>
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center sm:items-start pt-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full mb-1">
            <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 break-words">
                {displayName}
              </h1>
              
              {/* Badge */}
              {isUserBanned(profile.id) || isUserBanned(username) ? (
                <span className="inline-flex items-center gap-1 bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Ban className="w-3 h-3" />
                  Suspenso
                </span>
              ) : isProfileAdmin ? (
                <span className="inline-flex items-center gap-1 bg-black dark:bg-white text-white dark:text-black text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Crown className="w-3 h-3" />
                  Admin
                </span>
              ) : isProfileMod ? (
                <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" />
                  Mod
                </span>
              ) : null}
            </div>

            {/* Actions: Settings for self OR Staff Actions for Mods/Admins */}
            <div className="flex items-center gap-2 mt-3 sm:mt-0 flex-wrap justify-center sm:justify-start">
              {isViewerStaff && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsRoleModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-zinc-800/80 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl transition-colors cursor-pointer border border-gray-200 dark:border-zinc-700"
                    title="Alterar cargo de usuário"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Editar Cargo</span>
                  </button>

                  {!isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        toggleUserBan(profile.id);
                        if (profile.username) toggleUserBan(profile.username);
                        setProfile(prev => prev ? { ...prev } : prev);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer border",
                        (isUserBanned(profile.id) || isUserBanned(username))
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                          : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50"
                      )}
                      title="Suspender ou reativar usuário"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{isUserBanned(profile.id) || isUserBanned(username) ? 'Reativar' : 'Suspender'}</span>
                    </button>
                  )}

                  <Link
                    to="/members"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Ver todos os membros"
                  >
                    <span>Membros</span>
                  </Link>
                </>
              )}

              {isOwnProfile && (
                <>
                  <button 
                    onClick={() => setActiveTab(activeTab === 'settings' ? 'posts' : 'settings')}
                    className={cn(
                      "p-2 rounded-full transition-colors cursor-pointer",
                      activeTab === 'settings' ? "bg-black dark:bg-white text-white dark:text-black" : "text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
                    )}
                    title="Configurações do Perfil"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <Link
                    to="/settings"
                    className="p-2 text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                    title="Configurações do App"
                  >
                    <Sliders className="w-5 h-5" />
                  </Link>
                  <button 
                    type="button"
                    onClick={handleSignOut}
                    disabled={isLoggingOut}
                    className="p-2 text-gray-400 dark:text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors cursor-pointer disabled:opacity-50" 
                    title={isLoggingOut ? "Saindo da conta..." : "Sair da conta"}
                  >
                    {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin text-red-500" /> : <LogOut className="w-5 h-5" />}
                  </button>
                </>
              )}
            </div>
          </div>

          <span className="text-gray-500 dark:text-zinc-400 text-sm font-medium mb-4">
            @{username}
          </span>

          {bio && (
            <p className="text-gray-700 dark:text-zinc-300 text-sm max-w-xl leading-relaxed whitespace-pre-line mb-6">
              {bio}
            </p>
          )}

          {/* User Quick Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-zinc-400 w-full justify-center sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="text-gray-900 dark:text-zinc-100 font-bold">{posts.length}</span> {posts.length === 1 ? 'publicação' : 'publicações'}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-900 dark:text-zinc-100 font-bold">{totalLikes}</span> {totalLikes === 1 ? 'curtida recebida' : 'curtidas recebidas'}
            </div>
          </div>
        </div>
      </header>

      {/* Profile Navigation Tabs for Owner */}
      {isOwnProfile ? (
        <section>
          <div className="border-b border-gray-200 dark:border-zinc-800 mb-6 flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className={cn(
                "text-sm font-bold pb-3 px-1 -mb-[1px] transition-colors flex items-center gap-2 cursor-pointer",
                activeTab === 'posts' 
                  ? "text-black dark:text-white border-b-2 border-black dark:border-white" 
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              Minhas Publicações ({posts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={cn(
                "text-sm font-bold pb-3 px-1 -mb-[1px] transition-colors flex items-center gap-2 cursor-pointer",
                activeTab === 'settings' 
                  ? "text-black dark:text-white border-b-2 border-black dark:border-white" 
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Settings className="w-4 h-4" />
              Editar Perfil
            </button>
          </div>

          {activeTab === 'settings' ? (
            user ? (
              <ProfileSettings 
                user={user} 
                profile={profile} 
                onProfileUpdated={(updated) => {
                  const norm = normalizeProfile(updated);
                  setProfile(norm);
                  if (refreshProfile) refreshProfile();
                }}
              />
            ) : null
          ) : (
            <div>
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
                <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/30 p-8">
                  <p className="text-gray-700 dark:text-gray-300 font-semibold mb-1">Você ainda não publicou nada.</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Compartilhe sua primeira skill, prompt ou workflow com a comunidade!</p>
                  <Link
                    to="/publish"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity"
                  >
                    Criar Publicação
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        /* Visitor view of public profile */
        <section>
          <div className="border-b border-gray-200 dark:border-zinc-800 mb-6 pb-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Publicações de {displayName} ({posts.length})
            </h2>
          </div>

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
            <div className="py-16 text-center border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/30 p-8">
              <p className="text-gray-700 dark:text-gray-300 font-semibold mb-1">Nenhuma publicação encontrada.</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Este usuário ainda não postou nenhum conteúdo na comunidade.</p>
            </div>
          )}
        </section>
      )}

      {/* Role Management Modal for Dev/Admin */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setIsRoleModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Gerenciar Cargo</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Atribua permissões para @{username}</p>
              </div>
            </div>

            {roleMessage && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-xl text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{roleMessage}</span>
              </div>
            )}

            <div className="space-y-3 mb-6">
              {/* Admin Option */}
              <label 
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all",
                  selectedRole === 'admin' 
                    ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-sm" 
                    : "border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-900 dark:text-gray-100"
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={selectedRole === 'admin'}
                  onChange={() => setSelectedRole('admin')}
                  className="sr-only"
                />
                <Crown className={cn("w-5 h-5 mt-0.5 shrink-0", selectedRole === 'admin' ? "text-yellow-400 dark:text-amber-600" : "text-gray-400")} />
                <div className="flex-1">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>Administrador</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full uppercase bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">Acesso Total</span>
                  </div>
                  <p className={cn("text-xs mt-0.5", selectedRole === 'admin' ? "text-gray-200 dark:text-gray-700" : "text-gray-500 dark:text-gray-400")}>
                    Pode excluir qualquer postagem, comentários e gerenciar a comunidade.
                  </p>
                </div>
                {selectedRole === 'admin' && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
              </label>

              {/* Moderator Option */}
              <label 
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all",
                  selectedRole === 'moderator' 
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black border-zinc-800 dark:border-zinc-200 shadow-sm" 
                    : "border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-900 dark:text-gray-100"
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value="moderator"
                  checked={selectedRole === 'moderator'}
                  onChange={() => setSelectedRole('moderator')}
                  className="sr-only"
                />
                <Shield className={cn("w-5 h-5 mt-0.5 shrink-0", selectedRole === 'moderator' ? "text-blue-400 dark:text-blue-600" : "text-gray-400")} />
                <div className="flex-1">
                  <div className="font-bold text-sm">Moderador</div>
                  <p className={cn("text-xs mt-0.5", selectedRole === 'moderator' ? "text-gray-200 dark:text-gray-700" : "text-gray-500 dark:text-gray-400")}>
                    Pode moderar publicações e comentários inadequados.
                  </p>
                </div>
                {selectedRole === 'moderator' && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
              </label>

              {/* Member Option */}
              <label 
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all",
                  selectedRole === 'member' 
                    ? "bg-gray-200 text-black dark:bg-zinc-700 dark:text-white border-gray-300 dark:border-zinc-600 shadow-sm" 
                    : "border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-900 dark:text-gray-100"
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value="member"
                  checked={selectedRole === 'member'}
                  onChange={() => setSelectedRole('member')}
                  className="sr-only"
                />
                <User className="w-5 h-5 mt-0.5 shrink-0 text-gray-400" />
                <div className="flex-1">
                  <div className="font-bold text-sm">Membro</div>
                  <p className={cn("text-xs mt-0.5", selectedRole === 'member' ? "text-gray-700 dark:text-gray-300" : "text-gray-500 dark:text-gray-400")}>
                    Usuário padrão da comunidade, pode criar e interagir com posts.
                  </p>
                </div>
                {selectedRole === 'member' && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-zinc-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={isSavingRole}
                className="flex-1 py-3 px-4 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingRole ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Cargo'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
