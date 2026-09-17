export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: 'system' | 'like' | 'comment' | 'post';
  link?: string;
}

const STORAGE_KEY = 'clean_community_notifications_v1';

export function getStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Default initial welcome notification
      const initial: AppNotification[] = [
        {
          id: 'welcome-1',
          title: 'Bem-vindo ao CLEAN Community!',
          body: 'Instale o app via PWA no seu celular ou PC e ative as notificações.',
          timestamp: new Date().toISOString(),
          read: false,
          type: 'system',
          link: '/download',
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Ignore
  }
}

export function markAllNotificationsAsRead(): AppNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  saveNotifications(updated);
  return updated;
}

export function clearAllNotifications(): AppNotification[] {
  saveNotifications([]);
  return [];
}

/**
 * Checks if browser supports Web Notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets current notification permission state
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Requests native system notification permission (Android, Desktop, iOS 16.4+)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Sends a native push notification to Android / Desktop / iOS
 * Uses ServiceWorker registration when available for background/native Android delivery with vibration
 */
export async function sendNativeNotification(
  title: string,
  options: {
    body: string;
    link?: string;
    type?: AppNotification['type'];
  }
): Promise<boolean> {
  // Always append to in-app notification center
  const newNotification: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    body: options.body,
    timestamp: new Date().toISOString(),
    read: false,
    type: options.type || 'system',
    link: options.link,
  };

  const existing = getStoredNotifications();
  saveNotifications([newNotification, ...existing.slice(0, 49)]);

  // Dispatch custom event so in-app UI updates immediately
  window.dispatchEvent(new CustomEvent('app_notification_received', { detail: newNotification }));

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    // For Android & modern browsers: ServiceWorkerRegistration.showNotification delivers native system tray notifications
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body: options.body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'clean-community-notification',
          // Vibration pattern for Android phones (vibrate 200ms, pause 100ms, vibrate 200ms)
          vibrate: [200, 100, 200],
          data: {
            url: options.link || '/',
          },
        } as NotificationOptions);
        return true;
      }
    }

    // Fallback: standard Window Notification
    const notif = new Notification(title, {
      body: options.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
    });

    notif.onclick = () => {
      window.focus();
      if (options.link) {
        window.location.href = options.link;
      }
    };

    return true;
  } catch (err) {
    console.warn('Native notification delivery failed, stored in-app only:', err);
    return false;
  }
}
