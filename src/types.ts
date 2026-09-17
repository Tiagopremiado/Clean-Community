import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type Category = 'Todos' | 'Skills' | 'MCPs' | 'Workflows' | 'Prompts' | 'Ferramentas' | 'Referências';
export type Role = 'member' | 'moderator' | 'admin';

export const ADMIN_USERNAMES: string[] = ['thalesdev', 'kalebyalvesgamer', 'thaleskaleby24', 'thaleskaleby'];

// In-memory runtime store for role updates without localStorage
const inMemoryRoleOverrides: Record<string, Role> = {};

export function getStoredRoleOverrides(): Record<string, Role> {
  return inMemoryRoleOverrides;
}

export function setStoredRoleOverride(idOrUsername: string, role: Role): void {
  const key = idOrUsername.toLowerCase().trim().replace(/^@/, '');
  inMemoryRoleOverrides[key] = role;
}

export function isAdminUser(username?: string | null): boolean {
  if (!username) return false;
  const clean = username.toLowerCase().trim().replace(/^@/, '');
  if (ADMIN_USERNAMES.includes(clean)) return true;
  return inMemoryRoleOverrides[clean] === 'admin';
}

export function isUserAdminOrDev(userOrProfile?: { role?: string; username?: string | null; email?: string | null; id?: string; user_metadata?: any } | null): boolean {
  if (!userOrProfile) return false;
  if (userOrProfile.role === 'admin') return true;
  if (userOrProfile.user_metadata?.role === 'admin') return true;
  if (userOrProfile.id && inMemoryRoleOverrides[userOrProfile.id] === 'admin') return true;
  if (userOrProfile.username && isAdminUser(userOrProfile.username)) return true;
  if (userOrProfile.email) {
    const emailLower = userOrProfile.email.toLowerCase();
    const emailPrefix = emailLower.split('@')[0];
    if (
      isAdminUser(emailPrefix) || 
      emailLower.includes('kalebyalvesgamer') || 
      emailLower.includes('thaleskaleby') ||
      emailLower.includes('thalesdev')
    ) return true;
  }
  return false;
}

export function isUserModerator(userOrProfile?: { role?: string; username?: string | null; email?: string | null; id?: string; user_metadata?: any } | null): boolean {
  if (!userOrProfile) return false;
  if (userOrProfile.role === 'moderator') return true;
  if (userOrProfile.user_metadata?.role === 'moderator') return true;
  if (userOrProfile.id && inMemoryRoleOverrides[userOrProfile.id] === 'moderator') return true;
  if (userOrProfile.username) {
    const clean = userOrProfile.username.toLowerCase().trim().replace(/^@/, '');
    if (inMemoryRoleOverrides[clean] === 'moderator') return true;
  }
  return false;
}

export function isUserStaff(userOrProfile?: { role?: string; username?: string | null; email?: string | null; id?: string; user_metadata?: any } | null): boolean {
  return isUserAdminOrDev(userOrProfile) || isUserModerator(userOrProfile);
}

// In-memory store for banned/suspended members (zero localStorage)
const inMemoryBannedUsers: Set<string> = new Set();

export function getBannedUsers(): string[] {
  return Array.from(inMemoryBannedUsers);
}

export function toggleUserBan(userIdOrUsername: string): boolean {
  const key = userIdOrUsername.toLowerCase().trim().replace(/^@/, '');
  if (inMemoryBannedUsers.has(key)) {
    inMemoryBannedUsers.delete(key);
    return false;
  } else {
    inMemoryBannedUsers.add(key);
    return true;
  }
}

export function isUserBanned(userIdOrUsername?: string | null): boolean {
  if (!userIdOrUsername) return false;
  const key = userIdOrUsername.toLowerCase().trim().replace(/^@/, '');
  return inMemoryBannedUsers.has(key);
}

// In-memory store for the pinned post (zero localStorage)
let inMemoryPinnedPostId: string | null = null;

export const OFFICIAL_SITE_URL = 'https://clean-community-three.vercel.app';

export function getOfficialShareUrl(path: string = ''): string {
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${OFFICIAL_SITE_URL}${cleanPath}`;
}

export function getPinnedPostId(): string | null {
  return inMemoryPinnedPostId;
}

export function getPinnedPosts(): string[] {
  return inMemoryPinnedPostId ? [inMemoryPinnedPostId] : [];
}

export function isPinnedPost(postId: string): boolean {
  return inMemoryPinnedPostId === postId;
}

export const isPostPinned = isPinnedPost;

export function pinPost(postId: string): void {
  inMemoryPinnedPostId = postId;
}

export function unpinPost(postId?: string): void {
  if (!postId || inMemoryPinnedPostId === postId) {
    inMemoryPinnedPostId = null;
  }
}

export function togglePinPost(postId: string, forceReplace: boolean = false): {
  success: boolean;
  isPinned: boolean;
  replacedId: string | null;
  requiresConfirmation: boolean;
} {
  const currentPinned = inMemoryPinnedPostId;
  
  if (currentPinned === postId) {
    unpinPost(postId);
    return { success: true, isPinned: false, replacedId: null, requiresConfirmation: false };
  }

  if (currentPinned && !forceReplace) {
    return { success: false, isPinned: false, replacedId: currentPinned, requiresConfirmation: true };
  }

  pinPost(postId);
  return { success: true, isPinned: true, replacedId: currentPinned, requiresConfirmation: false };
}

export function normalizeProfile(profile: any): UserProfile | null {
  if (!profile) return null;
  if (Array.isArray(profile)) {
    if (profile.length === 0) return null;
    return normalizeProfile(profile[0]);
  }
  const cleanUsername = profile.username ? String(profile.username).toLowerCase().trim().replace(/^@/, '') : '';
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
