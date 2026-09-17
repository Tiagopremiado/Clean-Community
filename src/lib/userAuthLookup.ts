import { supabase } from './supabase';

const STORAGE_KEY = 'clean_community_user_identifiers';

// Pre-configured mappings for known core members/aliases
const KNOWN_IDENTIFIERS: Record<string, string[]> = {
  thalesdev: ['kalebyalvesgamer@gmail.com', 'thaleskaleby24@gmail.com'],
  thaleskaleby24: ['thaleskaleby24@gmail.com', 'kalebyalvesgamer@gmail.com'],
  thaleskaleby: ['thaleskaleby24@gmail.com', 'kalebyalvesgamer@gmail.com'],
  kalebyalvesgamer: ['kalebyalvesgamer@gmail.com'],
};

// In-memory fallback if localStorage is disabled or restricted
const inMemoryMappings: Record<string, string> = {};

export function saveUserIdentifierMapping(username: string, email: string): void {
  if (!username || !email) return;
  const cleanUsername = username.toLowerCase().trim().replace(/^@/, '');
  const cleanEmail = email.toLowerCase().trim();

  inMemoryMappings[cleanUsername] = cleanEmail;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEY);
      const map: Record<string, string> = stored ? JSON.parse(stored) : {};
      map[cleanUsername] = cleanEmail;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Ignore storage quota or disabled localStorage exceptions
  }
}

export function getCachedEmailForUsername(username: string): string | null {
  const cleanUsername = username.toLowerCase().trim().replace(/^@/, '');
  
  if (inMemoryMappings[cleanUsername]) {
    return inMemoryMappings[cleanUsername];
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const map: Record<string, string> = JSON.parse(stored);
        if (map[cleanUsername]) {
          return map[cleanUsername];
        }
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

export interface ResolveIdentifierResult {
  isEmail: boolean;
  emailCandidates: string[];
  username: string | null;
  foundProfile?: {
    id: string;
    username: string;
    name: string;
    avatar: string | null;
  } | null;
}

export async function resolveIdentifierToEmails(identifier: string): Promise<ResolveIdentifierResult> {
  const cleanInput = identifier.trim();
  
  // If it contains '@' and is structured like an email
  if (cleanInput.includes('@') && !cleanInput.startsWith('@') && cleanInput.includes('.')) {
    return {
      isEmail: true,
      emailCandidates: [cleanInput.toLowerCase()],
      username: null,
      foundProfile: null,
    };
  }

  const cleanUsername = cleanInput.toLowerCase().replace(/^@/, '');
  const candidates: string[] = [];

  // 1. Check known built-in mappings
  if (KNOWN_IDENTIFIERS[cleanUsername]) {
    for (const em of KNOWN_IDENTIFIERS[cleanUsername]) {
      if (!candidates.includes(em)) candidates.push(em);
    }
  }

  // 2. Check local device cache
  const cached = getCachedEmailForUsername(cleanUsername);
  if (cached && !candidates.includes(cached)) {
    candidates.unshift(cached); // Prioritize cached
  }

  // 3. Check Supabase RPC if function exists
  try {
    const { data: rpcEmail, error: rpcError } = await supabase.rpc('get_email_by_username', {
      username_input: cleanUsername,
    });
    if (!rpcError && rpcEmail && typeof rpcEmail === 'string') {
      const cleanRpcEmail = rpcEmail.toLowerCase().trim();
      if (!candidates.includes(cleanRpcEmail)) {
        candidates.unshift(cleanRpcEmail);
      }
    }
  } catch {
    // RPC may not be created in Supabase yet; fallback smoothly
  }

  // 4. Query public.profiles to verify if this user exists in community
  let foundProfile = null;
  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, username, name, avatar')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (profileData) {
      foundProfile = profileData;
    }
  } catch {
    // Profiles query fail-safe
  }

  return {
    isEmail: false,
    emailCandidates: candidates,
    username: cleanUsername,
    foundProfile,
  };
}
