import { useState, useEffect } from 'react';

// Chaves antigas do localStorage para purga completa
const DEPRECATED_KEYS = [
  'clean_offline_posts_cache_v1',
  'clean_publish_active_draft_v1',
  'clean_community_cached_members_list',
  'clean_community_roles_override',
  'clean_community_banned_users',
  'clean_community_pinned_single_post',
  'clean_community_pinned_posts',
  'clean_app_settings_v1',
  'clean_community_notifications_v1'
];

// Purga ativa de qualquer resquício de localStorage em tempo de execução
export function purgeAllLegacyLocalStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    
    DEPRECATED_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });

    // Remove qualquer chave com prefixo antigo
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('clean_') || 
        key.startsWith('lp_cache_') || 
        key.startsWith('clean_offline_') || 
        key.startsWith('clean_preview_cache_')
      )) {
        // Preserva apenas chaves do próprio supabase auth (ex: sb-*-auth-token)
        if (!key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    // Silencioso se bloqueado por sandbox
  }
}

// Executa purga imediatamente ao importar
purgeAllLegacyLocalStorage();

/**
 * Hook para detectar status de conectividade de rede
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
