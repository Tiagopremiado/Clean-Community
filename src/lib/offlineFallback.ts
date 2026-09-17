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

export function getOfflinePosts(): { posts: Post[]; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(OFFLINE_POSTS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
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
