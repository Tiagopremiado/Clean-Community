import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Post, Comment, formatTimeAgo } from '../types';
import { ArrowLeft, Heart, MessageSquare, ExternalLink, Share, MoreHorizontal, Loader2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function PostDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadPost() {
      if (!id) return;
      try {
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*, profiles(*)')
          .eq('id', id)
          .single();
          
        if (postError) throw postError;
        setPost(postData as Post);

        const { data: commentsData } = await supabase
          .from('comments')
          .select('*, profiles(*)')
          .eq('post_id', id)
          .order('created_at', { ascending: true });
        
        if (commentsData) setComments(commentsData as Comment[]);

        if (user) {
          const { data: likeData } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', id)
            .eq('user_id', user.id)
            .single();
          
          setIsLiked(!!likeData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [id, user]);

  const toggleLike = async () => {
    if (!user || !post) return;
    try {
      if (isLiked) {
        setIsLiked(false);
        setPost(prev => prev ? {...prev, likes: prev.likes - 1} : prev);
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
      } else {
        setIsLiked(true);
        setPost(prev => prev ? {...prev, likes: prev.likes + 1} : prev);
        await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
      }
    } catch (error) {
      console.error(error);
      // rollback UI state on error
      setIsLiked(!isLiked);
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
        setComments(prev => [...prev, data as Comment]);
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

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto w-full pt-20 pb-24 px-4 sm:px-8 text-center">
        <h2 className="text-xl font-bold mb-2">Publicação não encontrada</h2>
        <p className="text-gray-500 mb-6">Esta publicação pode ter sido removida ou o link está incorreto.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
          Voltar para Home
        </button>
      </div>
    );
  }

  const author = post.profiles;
  const isAuthorOrAdmin = user && (user.id === post.author_id || user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'moderator');
  const userAvatar = user?.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.id}`;

  return (
    <div className="max-w-3xl mx-auto w-full pt-8 pb-32 px-4 sm:px-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <article>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src={author?.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${author?.id}`} alt={author?.name} className="w-10 h-10 rounded-full border border-gray-200" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-gray-900">{author?.name}</span>
                {author?.role === 'admin' && <span className="bg-black text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm tracking-wide">Admin</span>}
              </div>
              <span className="text-gray-500 text-sm">@{author?.username} • {formatTimeAgo(post.created_at)}</span>
            </div>
          </div>
          {isAuthorOrAdmin && (
            <button onClick={handleDeletePost} className="p-2 text-red-500 hover:text-red-700 transition-colors rounded-full hover:bg-red-50" title="Excluir publicação">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600 mb-4">
          {post.category}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-4">{post.title}</h1>
        
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          {post.description}
        </p>

        {post.external_link && (
          <a href={post.external_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 mb-8 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all group">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">Acessar Recurso Externo</span>
              <span className="text-sm text-gray-500 truncate max-w-[250px] sm:max-w-md">{post.external_link}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
              <ExternalLink className="w-4 h-4 text-gray-600" />
            </div>
          </a>
        )}

        {post.content && (
          <div className="prose prose-gray max-w-none prose-headings:font-bold prose-a:text-black hover:prose-a:text-gray-600 prose-a:transition-colors mb-10 whitespace-pre-wrap">
            {post.content}
          </div>
        )}

        <div className="flex items-center gap-6 py-4 border-y border-gray-100 mb-10">
          <button 
            onClick={toggleLike}
            className={cn("flex items-center gap-2 transition-colors", isLiked ? "text-red-500" : "text-gray-500 hover:text-gray-900")}
          >
            <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
            <span className="font-medium">{post.likes} curtidas</span>
          </button>
          <button className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copiado!');
          }}>
            <Share className="w-5 h-5" />
            <span className="font-medium">Compartilhar</span>
          </button>
        </div>

        <section>
          <h2 className="text-lg font-bold mb-6">Comentários ({post.comments_count})</h2>
          
          <div className="flex gap-3 mb-8">
            <img src={userAvatar} alt="You" className="w-8 h-8 rounded-full border border-gray-200 shrink-0" />
            <div className="flex-1 relative">
              <textarea 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Adicione um comentário..." 
                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 pb-14 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm resize-none min-h-[100px]"
              />
              <div className="absolute bottom-3 right-3">
                <button 
                  onClick={handlePostComment}
                  disabled={isSubmitting || !commentText.trim()}
                  className="px-4 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publicar'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {comments.map((comment) => {
              const commentAuthor = comment.profiles;
              const canDelete = user && (user.id === comment.author_id || isAuthorOrAdmin);
              
              return (
                <div key={comment.id} className="flex gap-3 group">
                  <img src={commentAuthor?.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${commentAuthor?.id}`} alt={commentAuthor?.name} className="w-8 h-8 rounded-full border border-gray-200 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold text-sm text-gray-900">{commentAuthor?.name}</span>
                      <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-2 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                      {canDelete && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="text-red-500 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">Excluir</button>
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
