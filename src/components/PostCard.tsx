import { Link } from 'react-router-dom';
import { Post, formatTimeAgo } from '../types';
import { MessageSquare, Heart, ExternalLink, ShieldAlert, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/AuthContext';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function PostCard({ post, isLiked }: { post: Post, isLiked?: boolean }) {
  const author = post.profiles;
  if (!author) return null;

  return (
    <article className="py-6 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors px-4 sm:px-6 -mx-4 sm:-mx-6 cursor-pointer group">
      <Link to={`/post/${post.id}`} className="block">
        <div className="flex items-center gap-2 mb-3">
          <img src={author.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${author.id}`} alt={author.name} className="w-8 h-8 rounded-full border border-gray-200" />
          <div className="flex items-center gap-1.5 flex-wrap text-sm">
            <span className="font-medium text-gray-900">{author.name}</span>
            <span className="text-gray-500">@{author.username}</span>
            <span className="text-gray-300 mx-0.5">•</span>
            {author.role === 'admin' && <span className="bg-black text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm tracking-wide">Admin</span>}
            {author.role === 'moderator' && <span className="bg-gray-200 text-gray-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm tracking-wide">Mod</span>}
            <span className="text-gray-300 mx-0.5 hidden sm:inline">•</span>
            <span className="text-gray-500 whitespace-nowrap">{formatTimeAgo(post.created_at)}</span>
          </div>
        </div>

        <div className="mb-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight mb-1 group-hover:text-gray-700 transition-colors">
            {post.title}
          </h3>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed line-clamp-3">
            {post.description}
          </p>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div 
            className={cn("flex items-center gap-1.5 transition-colors relative z-10", isLiked ? "text-red-500" : "text-gray-500 hover:text-gray-900")}
            onClick={(e) => {
              // Only to prevent navigation if we decide to implement like from feed directly. 
              // Right now PostCard doesn't handle toggling, but just in case:
            }}
          >
            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
            <span className="text-sm font-medium">{post.likes}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium">{post.comments_count}</span>
          </div>
          <div className="flex-1" />
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
            {post.category}
          </div>
        </div>
      </Link>
    </article>
  );
}
