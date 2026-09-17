import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Post, formatTimeAgo, normalizeProfile, isPinnedPost, getOfficialShareUrl } from '../types';
import { MessageSquare, Heart, Globe, Pin, Share } from 'lucide-react';
import { HoverLinkPreview } from './HoverLinkPreview';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSettings } from '../contexts/SettingsContext';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface PostCardProps {
  post: Post;
  isLiked?: boolean;
  onToggleLike?: () => void;
  key?: string;
}

export function PostCard({ post, isLiked, onToggleLike }: PostCardProps) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const rawAuthor = post.profiles;
  const normalizedAuthor = normalizeProfile(rawAuthor);
  const author = normalizedAuthor || {
    id: post.author_id || 'community-member',
    name: 'Membro da Comunidade',
    username: 'membro',
    role: 'member' as const,
    avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${post.author_id || post.id}`,
    bio: null,
    created_at: post.created_at || new Date().toISOString()
  };

  const isCompact = settings.feedDensity === 'compact';
  const profileUrl = `/profile/${author.username || author.id}`;
  const isPinned = isPinnedPost(post.id);
  const [copied, setCopied] = useState(false);

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(profileUrl);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleLike) {
      onToggleLike();
    }
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const officialShareUrl = getOfficialShareUrl(`/post/${post.id}`);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.title} — Clean Community`,
          text: post.description || post.title,
          url: officialShareUrl,
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(officialShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copie o link oficial:', officialShareUrl);
    }
  };

  return (
    <article className={cn(
      "border-b border-gray-100 dark:border-zinc-800/80 last:border-0 hover:bg-white dark:hover:bg-zinc-900/40 transition-colors px-4 sm:px-6 -mx-4 sm:-mx-6 group rounded-xl",
      isPinned && "bg-amber-500/[0.02] dark:bg-amber-500/[0.03] border-l-2 border-l-amber-500",
      isCompact ? "py-4" : "py-5 sm:py-6"
    )}>
      {/* Author Header */}
      <div className={cn("flex items-center gap-2", isCompact ? "mb-2" : "mb-3")}>
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <Link 
            to={profileUrl}
            onClick={handleAuthorClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left cursor-pointer group/author shrink-0"
          >
            <img 
              src={author.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${author.id}`} 
              alt={author.name} 
              className={cn("rounded-full border border-gray-200 dark:border-zinc-800 object-cover", isCompact ? "w-5 h-5" : "w-6 h-6")} 
            />
            <span className="font-semibold text-gray-900 dark:text-zinc-100 text-sm group-hover/author:underline truncate">{author.name}</span>
          </Link>
          
          <div className="flex items-center gap-1.5 text-sm shrink-0">
            <Link 
              to={profileUrl}
              onClick={handleAuthorClick}
              className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white text-xs sm:text-sm hover:underline cursor-pointer hidden sm:inline-block"
            >
              @{author.username}
            </Link>
            
            {author.role === 'admin' && (
              <>
                <span className="text-gray-300 dark:text-gray-700 hidden sm:inline-block">•</span>
                <span className="text-zinc-900 dark:text-zinc-100 text-[10px] uppercase font-bold tracking-wider">
                  Admin
                </span>
              </>
            )}
            {author.role === 'moderator' && (
              <>
                <span className="text-gray-300 dark:text-gray-700 hidden sm:inline-block">•</span>
                <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  Mod
                </span>
              </>
            )}

            <span className="text-gray-300 dark:text-gray-700">•</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm shrink-0">
              {formatTimeAgo(post.created_at)}
            </span>

            {isPinnedPost(post.id) && (
              <>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  <Pin className="w-2.5 h-2.5 fill-amber-500" />
                  Fixado
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Post Link */}
      <Link to={`/post/${post.id}`} className="block group/post">
        <div className={cn(isCompact ? "mb-2.5" : "mb-3")}>
          <h3 className={cn(
            "font-bold text-gray-900 dark:text-zinc-100 tracking-tight group-hover/post:text-gray-600 dark:group-hover/post:text-zinc-400 transition-colors",
            isCompact ? "text-base sm:text-lg mb-1" : "text-lg sm:text-xl mb-1.5"
          )}>
            {post.title}
          </h3>
          <p className={cn(
            "text-gray-600 dark:text-zinc-400 leading-relaxed",
            isCompact ? "text-xs sm:text-sm line-clamp-2" : "text-sm sm:text-base line-clamp-3"
          )}>
            {post.description}
          </p>
        </div>
      </Link>

      {/* External Link Quick Preview Chip */}
      {post.external_link && (
        <div 
          className="mb-3 inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          <HoverLinkPreview href={post.external_link}>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 bg-gray-100/90 dark:bg-zinc-800/80 border border-gray-200/70 dark:border-zinc-700/60 hover:text-black dark:hover:text-white hover:border-gray-300 dark:hover:border-zinc-600 transition-colors">
              <Globe className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
              <span className="truncate max-w-[220px] sm:max-w-xs">
                {(() => {
                  try {
                    return new URL(post.external_link).hostname.replace(/^www\./, '');
                  } catch {
                    return post.external_link;
                  }
                })()}
              </span>
            </span>
          </HoverLinkPreview>
        </div>
      )}

      {/* Post Actions & Metadata */}
      <div className={cn("flex items-center justify-between", isCompact ? "mt-2" : "mt-4")}>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={handleLikeClick}
            className={cn(
              "flex items-center gap-1.5 transition-all p-1 -m-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer", 
              isLiked ? "text-red-500 font-semibold" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
            title={isLiked ? "Descurtir" : "Curtir"}
          >
            <Heart className={cn("w-4 h-4 transition-transform active:scale-125", isLiked && "fill-current")} />
            <span className="text-xs sm:text-sm font-medium">{post.likes}</span>
          </button>
          
          <Link 
            to={`/post/${post.id}`}
            className="flex items-center gap-1.5 p-1 -m-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-medium">{post.comments_count}</span>
          </Link>

          <button
            type="button"
            onClick={handleShareClick}
            className="flex items-center gap-1.5 p-1 -m-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Compartilhar link oficial"
          >
            <Share className="w-4 h-4" />
            {copied && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Copiado!</span>}
          </button>
        </div>

        <Link
          to={`/explore?category=${post.category.toLowerCase()}`}
          className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-zinc-200 transition-colors"
        >
          {post.category}
        </Link>
      </div>
    </article>
  );
}
