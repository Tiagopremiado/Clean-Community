import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type Category = 'Todos' | 'Skills' | 'MCPs' | 'Workflows' | 'Prompts' | 'Ferramentas' | 'Referências';
export type Role = 'member' | 'moderator' | 'admin';

export const ADMIN_USERNAMES: string[] = ['thalesdev', 'kalebyalvesgamer'];

// In-memory & localStorage store for instant persistent role updates
const ROLES_STORAGE_KEY = 'clean_community_roles_override';

export function getStoredRoleOverrides(): Record<string, Role> {
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function setStoredRoleOverride(idOrUsername: string, role: Role): void {
  try {
    const current = getStoredRoleOverrides();
    const key = idOrUsername.toLowerCase().trim().replace(/^@/, '');
    current[key] = role;
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save role override:', e);
  }
}

export function isAdminUser(username?: string | null): boolean {
  if (!username) return false;
  const clean = username.toLowerCase().trim().replace(/^@/, '');
  if (ADMIN_USERNAMES.includes(clean)) return true;
  const overrides = getStoredRoleOverrides();
  return overrides[clean] === 'admin';
}

export function isUserAdminOrDev(userOrProfile?: { role?: string; username?: string | null; email?: string | null; id?: string; user_metadata?: any } | null): boolean {
  if (!userOrProfile) return false;
  if (userOrProfile.role === 'admin') return true;
  if (userOrProfile.user_metadata?.role === 'admin') return true;
  if (userOrProfile.id) {
    const overrides = getStoredRoleOverrides();
    if (overrides[userOrProfile.id] === 'admin') return true;
  }
  if (userOrProfile.username) {
    if (isAdminUser(userOrProfile.username)) return true;
  }
  if (userOrProfile.email) {
    const emailPrefix = userOrProfile.email.split('@')[0];
    if (isAdminUser(emailPrefix) || userOrProfile.email.toLowerCase().includes('kalebyalvesgamer')) return true;
  }
  return false;
}

export function isUserModerator(userOrProfile?: { role?: string; username?: string | null; email?: string | null; id?: string; user_metadata?: any } | null): boolean {
  if (!userOrProfile) return false;
  if (userOrProfile.role === 'moderator') return true;
  if (userOrProfile.user_metadata?.role === 'moderator') return true;
  if (userOrProfile.id) {
    const overrides = getStoredRoleOverrides();
    if (overrides[userOrProfile.id] === 'moderator') return true;
  }
  if (userOrProfile.username) {
    const clean = userOrProfile.username.toLowerCase().trim().replace(/^@/, '');
    const overrides = getStoredRoleOverrides();
    if (overrides[clean] === 'moderator') return true;
  }
  return false;
}

export function isUserStaff(userOrProfile?: { role?: string; username?: string | null; email?: string | null; id?: string; user_metadata?: any } | null): boolean {
  return isUserAdminOrDev(userOrProfile) || isUserModerator(userOrProfile);
}

// Store for banned/suspended members
const BANNED_USERS_KEY = 'clean_community_banned_users';

export function getBannedUsers(): string[] {
  try {
    const raw = localStorage.getItem(BANNED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleUserBan(userIdOrUsername: string): boolean {
  try {
    const list = getBannedUsers();
    const key = userIdOrUsername.toLowerCase().trim().replace(/^@/, '');
    const exists = list.includes(key);
    const updated = exists ? list.filter(id => id !== key) : [...list, key];
    localStorage.setItem(BANNED_USERS_KEY, JSON.stringify(updated));
    return !exists;
  } catch {
    return false;
  }
}

export function isUserBanned(userIdOrUsername?: string | null): boolean {
  if (!userIdOrUsername) return false;
  const list = getBannedUsers();
  const key = userIdOrUsername.toLowerCase().trim().replace(/^@/, '');
  return list.includes(key);
}

// Store for the single pinned / highlighted post by moderators/admins
const PINNED_POST_KEY = 'clean_community_pinned_single_post';
const LEGACY_PINNED_POSTS_KEY = 'clean_community_pinned_posts';

export const OFFICIAL_SITE_URL = 'https://clean-community-three.vercel.app';

export function getOfficialShareUrl(path: string = ''): string {
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${OFFICIAL_SITE_URL}${cleanPath}`;
}

export function getPinnedPostId(): string | null {
  try {
    const single = localStorage.getItem(PINNED_POST_KEY);
    if (single) return single;
    // Migrate legacy array if exists
    const legacy = localStorage.getItem(LEGACY_PINNED_POSTS_KEY);
    if (legacy) {
      const list = JSON.parse(legacy);
      if (Array.isArray(list) && list.length > 0) {
        localStorage.setItem(PINNED_POST_KEY, list[0]);
        return list[0];
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getPinnedPosts(): string[] {
  const current = getPinnedPostId();
  return current ? [current] : [];
}

export function isPinnedPost(postId: string): boolean {
  return getPinnedPostId() === postId;
}

export const isPostPinned = isPinnedPost;

export function pinPost(postId: string): void {
  try {
    localStorage.setItem(PINNED_POST_KEY, postId);
  } catch (e) {
    console.error(e);
  }
}

export function unpinPost(postId?: string): void {
  try {
    if (!postId || getPinnedPostId() === postId) {
      localStorage.removeItem(PINNED_POST_KEY);
    }
  } catch (e) {
    console.error(e);
  }
}

export function togglePinPost(postId: string, forceReplace: boolean = false): {
  success: boolean;
  isPinned: boolean;
  replacedId: string | null;
  requiresConfirmation: boolean;
} {
  try {
    const currentPinned = getPinnedPostId();
    
    // Case 1: Post is already pinned -> unpin it
    if (currentPinned === postId) {
      unpinPost(postId);
      return { success: true, isPinned: false, replacedId: null, requiresConfirmation: false };
    }

    // Case 2: Another post is already pinned and confirmation has not been provided
    if (currentPinned && !forceReplace) {
      return { success: false, isPinned: false, replacedId: currentPinned, requiresConfirmation: true };
    }

    // Case 3: Pin this post (replacing any previous pinned post)
    pinPost(postId);
    return { success: true, isPinned: true, replacedId: currentPinned, requiresConfirmation: false };
  } catch {
    return { success: false, isPinned: false, replacedId: null, requiresConfirmation: false };
  }
}

export function normalizeProfile(profile: UserProfile | null | undefined): UserProfile | null {
  if (!profile) return null;
  const cleanUsername = profile.username ? profile.username.toLowerCase().trim().replace(/^@/, '') : '';
  const overrides = getStoredRoleOverrides();
  
  const assignedRole: Role = overrides[profile.id] || (cleanUsername ? overrides[cleanUsername] : undefined) || profile.role;
  
  if (isAdminUser(profile.username) || assignedRole === 'admin') {
    return { ...profile, role: 'admin' };
  }
  if (assignedRole) {
    return { ...profile, role: assignedRole };
  }
  return profile;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: Role;
  bio: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  title: string;
  description: string;
  content: string | null;
  category: Category;
  external_link: string | null;
  likes: number;
  comments_count: number;
  created_at: string;
  profiles?: UserProfile; 
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: UserProfile;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export function formatTimeAgo(dateString: string) {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
  } catch (e) {
    return 'algum tempo atrás';
  }
}
