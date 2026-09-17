import { useState, useEffect } from 'react';
import { Post, Comment } from '../types';

const OFFLINE_POSTS_KEY = 'clean_offline_posts_cache_v1';
const OFFLINE_POST_PREFIX = 'clean_offline_post_';
const PUBLISH_DRAFT_KEY = 'clean_publish_active_draft_v1';

export function saveOfflinePosts(posts: Post[]): void {
  try {
    const payload = {
      timestamp: Date.now(),
      posts: posts.slice(0, 40) // Keep the top 40 posts cached for offline reading
    };
    localStorage.setItem(OFFLINE_POSTS_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Unable to cache posts to localStorage for offline fallback:', e);
  }
}

export const INITIAL_COMMUNITY_FALLBACK_POSTS: Post[] = [
  {
    id: "5980ce24-e062-4553-979d-a344a9a47cc3",
    author_id: "656880a5-c555-4707-8517-246a9635af83",
    title: "💎 — Sejam bem-vindos a CLEAN COMMUNITY — 💎",
    description: "By: Levi Maciel & ThalesDev",
    content: "Baixem o app!",
    category: "Skills",
    external_link: null,
    likes: 1,
    comments_count: 0,
    created_at: "2026-09-17T13:50:45.509Z",
    profiles: {
      id: "656880a5-c555-4707-8517-246a9635af83",
      bio: "💜 — Insta: @atosweb_\n💎 — Owner: LPVCW Workflow \n🎩 — Moderador: CLEAN Community",
      name: "Thales — Atos Web 💜",
      role: "moderator",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=thalesdev",
      username: "thalesdev",
      created_at: "2026-09-17T03:14:48.929Z"
    }
  },
  {
    id: "913efc0a-6ea4-4f6a-8f5d-f30f3f6c97dc",
    author_id: "26ea1f85-d97e-4e6d-acf0-567ce1609583",
    title: "salve rapaziadinha",
    description: "so testando aqui",
    content: null,
    category: "Skills",
    external_link: null,
    likes: 2,
    comments_count: 0,
    created_at: "2026-09-17T04:04:57.591Z",
    profiles: {
      id: "26ea1f85-d97e-4e6d-acf0-567ce1609583",
      bio: null,
      name: "levi.clean.ltda",
      role: "member",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=26ea1f85",
      username: "levi.clean.ltda_ff6d",
      created_at: "2026-09-17T04:04:33.669Z"
    }
  }
];

export function getOfflinePosts(): { posts: Post[]; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(OFFLINE_POSTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.posts) && parsed.posts.length > 0) {
        return parsed;
      }
    }
    // Return preloaded community posts so feed is never blank or stuck on fresh PC visit
    return {
      posts: INITIAL_COMMUNITY_FALLBACK_POSTS,
      timestamp: Date.now()
    };
  } catch {
    return {
      posts: INITIAL_COMMUNITY_FALLBACK_POSTS,
      timestamp: Date.now()
    };
  }
}

export function saveOfflinePostDetails(id: string, post: Post, comments: Comment[]): void {
  try {
    const payload = {
      timestamp: Date.now(),
      post,
      comments
    };
    localStorage.setItem(`${OFFLINE_POST_PREFIX}${id}`, JSON.stringify(payload));
  } catch (e) {
    console.warn('Unable to cache post details to localStorage for offline fallback:', e);
  }
}

export function getOfflinePostDetails(id: string): { post: Post; comments: Comment[]; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(`${OFFLINE_POST_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export interface PublishDraft {
  title: string;
  description: string;
  content: string;
  category: string;
  link: string;
  savedAt: number;
}

export function savePublishDraft(draft: Omit<PublishDraft, 'savedAt'>): void {
  try {
    // Only save if there is actual content entered
    if (!draft.title && !draft.description && !draft.content) {
      localStorage.removeItem(PUBLISH_DRAFT_KEY);
      return;
    }
    const payload: PublishDraft = {
      ...draft,
      savedAt: Date.now()
    };
    localStorage.setItem(PUBLISH_DRAFT_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Unable to save draft in localStorage:', e);
  }
}

export function getPublishDraft(): PublishDraft | null {
  try {
    const raw = localStorage.getItem(PUBLISH_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPublishDraft(): void {
  try {
    localStorage.removeItem(PUBLISH_DRAFT_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Hook to track online/offline connectivity and provide fallback awareness.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
