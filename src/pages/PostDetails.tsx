import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Post, 
  Comment, 
  formatTimeAgo, 
  normalizeProfile, 
  isUserAdminOrDev, 
  isUserStaff, 
  isPinnedPost, 
  togglePinPost,
  getOfficialShareUrl,
  getPinnedPostId
} from '../types';
import { ArrowLeft, Heart, MessageSquare, ExternalLink, Share, MoreHorizontal, Loader2, Trash2, Pin, AlertCircle, RefreshCw } from 'lucide-react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { RichLinkBookmark } from '../components/RichLinkBookmark';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function PostDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPinned, setIsPinned] = useState(id ? isPinnedPost(id) : false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Leitura direta e exclusiva do banco de dados Supabase
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*, profiles(*), comments(count), likes_count:likes(count)')
        .eq('id', id)
        .single();
        
      if (postError) throw postError;

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('post_id', id)
        .order('created_at', { ascending: true });
      
      const rawComments = (commentsData as any[]) || [];
      const loadedComments: Comment[] = rawComments.map(c => ({
        ...c,
        profiles: normalizeProfile(c.profiles) || c.profiles
      }));
      setComments(loadedComments);

      const countComments = loadedComments.length || ((postData as any)?.comments?.[0]?.count ?? (postData as any)?.comments_count ?? 0);
      const countLikes = (postData as any)?.likes_count?.[0]?.count ?? (Array.isArray((postData as any)?.likes) ? ((postData as any)?.likes[0]?.count ?? 0) : (typeof (postData as any)?.likes === 'number' ? (postData as any)?.likes : 0));

      const normalizedPost: Post = {
        ...(postData as Post),
        profiles: normalizeProfile((postData as any)?.profiles) || (postData as any)?.profiles,
        comments_count: countComments,
        likes: countLikes
      };

      setPost(normalizedPost);

      if (user) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsLiked(!!likeData);
      }
    } catch (err: any) {
      console.error('Erro na consulta Supabase do post:', err);
      setError(err?.message || 'Post não encontrado ou falha de conexão com o Supabase.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const toggleLike = async () => {
    if (!user) {
      navigate('/login?mode=signup');
      return;
    }
    if (!post) return;
    const previousLiked = isLiked;
    const nextLiked = !previousLiked;
    const previousCount = post.likes;
    const nextCount = nextLiked ? previousCount + 1 : Math.max(0, previousCount - 1);

    // Optimistic update
    setIsLiked(nextLiked);
    setPost(prev => prev ? { ...prev, likes: nextCount } : prev);

    try {
      if (nextLiked) {
        await supabase.from('likes').upsert({ post_id: post.id, user_id: user.id });
      } else {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
      }
      // Also sync count in posts table
      await supabase.from('posts').update({ likes: nextCount }).eq('id', post.id);
    } catch (error) {
      console.error('Error toggling like:', error);
      // rollback UI state on error
      setIsLiked(previousLiked);
      setPost(prev => prev ? { ...prev, likes: previousCount } : prev);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !user || !post) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          author_id: user.id,
          content: commentText.trim()
        })
        .select('*, profiles(*)')
        .single();

      if (error) throw error;
      if (data) {
        const normalizedComment = {
          ...data,
          profiles: normalizeProfile((data as any).profiles) || (data as any).profiles
        } as Comment;
        setComments(prev => [...prev, normalizedComment]);
        setPost(prev => prev ? {...prev, comments_count: prev.comments_count + 1} : prev);
        setCommentText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este comentário?')) return;
    try {
      await supabase.from('comments').delete().eq('id', commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setPost(prev => prev ? {...prev, comments_count: Math.max(0, prev.comments_count - 1)} : prev);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !window.confirm('Tem certeza que deseja excluir esta publicação?')) return;
    try {
      await supabase.from('posts').delete().eq('id', post.id);
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePin = () => {
    if (!post) return;
    const currentPinnedId = getPinnedPostId();

    // Check if another post is already pinned
    if (currentPinnedId && currentPinnedId !== post.id) {
      const confirmReplace = window.confirm(
        '⚠️ ATENÇÃO (Moderação):\n\nSomente UMA publicação pode ficar fixada por vez.\n\nJá existe outra publicação fixada no topo do feed. Deseja fixar esta publicação e SUBSTITUIR a fixada anterior?'
      );
      if (!confirmReplace) return;

      const forced = togglePinPost(post.id, true);
      setIsPinned(forced.isPinned);
      setToastMessage('Esta publicação foi fixada no topo e substituiu a publicação anterior!');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    // Normal pin or unpin
    const res = togglePinPost(post.id, false);
    setIsPinned(res.isPinned);
    if (res.isPinned) {
      setToastMessage('Publicação fixada com sucesso no topo do feed!');
    } else {
      setToastMessage('Publicação desafixada do topo do feed.');
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleShare = async () => {
    if (!post) return;
    const officialShareUrl = getOfficialShareUrl(`/post/${post.id}`);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.title} — Clean Community`,
          text: post.description || post.title,
          url: officialShareUrl,
        });
        setCopied(true);
        setToastMessage('Link oficial compartilhado com sucesso!');
        setTimeout(() => {
          setCopied(false);
          setToastMessage(null);
        }, 3000);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // User closed share sheet
      }
    }

    try {
      await navigator.clipboard.writeText(officialShareUrl);
      setCopied(true);
      setToastMessage(`Link oficial copiado: ${officialShareUrl}`);
      setTimeout(() => {
        setCopied(false);
        setToastMessage(null);
      }, 3500);
    } catch {
      prompt('Copie o link oficial para compartilhar:', officialShareUrl);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto w-full pt-20 pb-24 px-4 sm:px-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Publicação não encontrada</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm max-w-md mx-auto">
          {error || 'Esta publicação pode ter sido removida ou não pôde ser carregada do Supabase.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button 
            onClick={() => loadPost()}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors cursor-pointer">
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  const author = post.profiles;
  const isStaff = isUserStaff(profile) || isUserStaff(user as any);
  const isAuthorOrAdmin = user && (user.id === post.author_id || isStaff);
  const userAvatar = profile?.avatar || user?.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.id}`;
  const authorProfileUrl = `/profile/${author?.username || author?.id}`;

  return (
    <div className="max-w-3xl mx-auto w-full pt-8 pb-32 px-4 sm:px-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold px-4 py-3 rounded-xl shadow-xl border border-zinc-700 dark:border-zinc-300 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)} 
            className="ml-auto opacity-70 hover:opacity-100 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <article>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link to={authorProfileUrl} className="shrink-0 hover:opacity-85 transition-opacity">
              <img src={author?.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${author?.id}`} alt={author?.name} className="w-10 h-10 rounded-full border border-gray-200 dark:border-zinc-800 object-cover" />
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link to={authorProfileUrl} className="font-bold text-gray-900 dark:text-zinc-50 hover:underline">
                  {author?.name}
                </Link>
                {author?.role === 'admin' && (
                  <span className="text-zinc-900 dark:text-zinc-100 text-[10px] uppercase font-bold tracking-wider ml-1">Admin</span>
                )}
                {author?.role === 'moderator' && (
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider ml-1">Mod</span>
                )}
              </div>
              <Link to={authorProfileUrl} className="text-gray-500 dark:text-zinc-400 text-sm hover:underline">
                @{author?.username} • {formatTimeAgo(post.created_at)}
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={`/explore?category=${post.category.toLowerCase()}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-zinc-800/80 text-xs font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {post.category}
            </Link>
            {isStaff && (
              <button
                type="button"
                onClick={handleTogglePin}
                className={cn(
                  "p-2 rounded-full transition-colors cursor-pointer",
                  isPinned 
                    ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" 
                    : "text-zinc-400 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5"
                )}
                title={isPinned ? "Desafixar do topo do feed" : "Fixar post no topo do feed (Staff)"}
              >
                <Pin className={cn("w-4 h-4", isPinned && "fill-amber-500")} />
              </button>
            )}
            {isAuthorOrAdmin && (
              <button onClick={handleDeletePost} className="p-2 text-red-500 hover:text-red-700 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer" title="Excluir publicação">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <Link
          to={`/explore?category=${post.category.toLowerCase()}`}
          className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800/80 text-xs font-medium text-gray-600 dark:text-zinc-300 mb-4 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        >
          {post.category}
        </Link>

        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 mb-4 leading-tight">{post.title}</h1>
        
        <p className="text-lg text-gray-600 dark:text-zinc-400 mb-8 leading-relaxed">
          {post.description}
        </p>

        {post.external_link && (
          <div className="mb-10">
            <RichLinkBookmark url={post.external_link} />
          </div>
        )}

        {post.content && (
          <div className="mb-10 p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800 shadow-xs">
            <MarkdownRenderer content={post.content} />
          </div>
        )}

        <div className="flex items-center gap-6 py-4 border-y border-gray-100 dark:border-zinc-800 mb-10">
          <button 
            onClick={toggleLike}
            className={cn(
              "flex items-center gap-2 transition-colors cursor-pointer p-1.5 -m-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/80", 
              isLiked ? "text-red-500 font-semibold" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <Heart className={cn("w-5 h-5 transition-transform active:scale-125", isLiked && "fill-current")} />
            <span className="font-medium">{post.likes} {post.likes === 1 ? 'curtida' : 'curtidas'}</span>
          </button>
          <button 
            type="button"
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer" 
            onClick={handleShare}
            title="Compartilhar link oficial da publicação"
          >
            <Share className="w-5 h-5" />
            <span className="font-medium">{copied ? 'Link oficial copiado!' : 'Compartilhar'}</span>
          </button>
        </div>

        <section>
          <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-zinc-100">Comentários ({comments.length})</h2>
          
          {user ? (
            <div className="flex gap-4 mb-10">
              <img src={userAvatar} alt="You" className="w-10 h-10 rounded-full border border-gray-200 dark:border-zinc-800 shrink-0 object-cover" />
              <div className="flex-1 relative group">
                <textarea 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Adicione um comentário..." 
                  className="w-full bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 pb-14 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-zinc-600 focus:border-black dark:focus:border-zinc-600 transition-all resize-none min-h-[120px]"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button 
                    onClick={handlePostComment}
                    disabled={isSubmitting || !commentText.trim()}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publicar'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-10 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 text-center flex flex-col items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-1">
                Participe da conversa
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mb-4 leading-relaxed">
                Faça login ou crie sua conta gratuitamente para comentar nesta publicação e trocar ideias com o autor.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  to="/login?mode=signup"
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  Criar conta gratuita
                </Link>
                <Link
                  to="/login?mode=login"
                  className="px-4 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-zinc-200 text-xs font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  Fazer login
                </Link>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {comments.map((comment) => {
              const commentAuthor = comment.profiles;
              const canDelete = user && (user.id === comment.author_id || isAuthorOrAdmin);
              const commenterProfileUrl = `/profile/${commentAuthor?.username || commentAuthor?.id}`;
              
              return (
                <div key={comment.id} className="flex gap-3 group">
                  <Link to={commenterProfileUrl} className="shrink-0 hover:opacity-85 transition-opacity">
                    <img src={commentAuthor?.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${commentAuthor?.id}`} alt={commentAuthor?.name} className="w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-800 shrink-0 object-cover" />
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <Link to={commenterProfileUrl} className="font-bold text-sm text-gray-900 dark:text-white hover:underline">
                        {commentAuthor?.name}
                      </Link>
                      {commentAuthor?.role === 'admin' && (
                        <span className="bg-black dark:bg-white text-white dark:text-black text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm tracking-wide">
                          Admin
                        </span>
                      )}
                      {commentAuthor?.role === 'moderator' && (
                        <span className="bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm tracking-wide">
                          Mod
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(comment.created_at)}</span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-zinc-300 mb-2">
                      <MarkdownRenderer content={comment.content} className="text-sm" />
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {canDelete && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="text-red-500 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer">Excluir</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </article>
    </div>
  );
}
