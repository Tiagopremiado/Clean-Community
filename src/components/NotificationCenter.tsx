import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Smartphone, Sparkles, X, Volume2, ShieldCheck } from 'lucide-react';
import { 
  AppNotification, 
  getStoredNotifications, 
  markAllNotificationsAsRead, 
  clearAllNotifications, 
  requestNotificationPermission, 
  sendNativeNotification,
  getNotificationPermission,
  isNotificationSupported
} from '../lib/notifications';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isTesting, setIsTesting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(getStoredNotifications());
    setPermission(getNotificationPermission());

    const handleUpdate = () => {
      setNotifications(getStoredNotifications());
    };

    window.addEventListener('app_notification_received', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('app_notification_received', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      const updated = markAllNotificationsAsRead();
      setNotifications(updated);
    }
  };

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      await sendNativeNotification('🎉 Notificações Ativadas!', {
        body: 'Você receberá alertas no Android e Desktop sobre novos recursos e respostas.',
        type: 'system',
      });
    }
  };

  const handleSendTest = async () => {
    setIsTesting(true);
    await sendNativeNotification('🔔 Teste de Notificação CLEAN', {
      body: 'Notificação nativa enviada com sucesso para o seu dispositivo Android / PC!',
      type: 'system',
    });
    setTimeout(() => setIsTesting(false), 1000);
  };

  const handleClear = () => {
    const empty = clearAllNotifications();
    setNotifications(empty);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-xl text-gray-600 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        title="Notificações"
        aria-label="Abrir central de notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/90 dark:border-zinc-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-black dark:text-white" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                Notificações
              </h3>
              {notifications.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                  {notifications.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Limpar todas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Android / Device Permission Banner */}
          <div className="p-3 bg-zinc-950 text-white border-b border-zinc-800">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-zinc-100">
                    Notificações no Android e PC
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    {permission === 'granted'
                      ? 'Ativas com vibração nativa no seu dispositivo'
                      : 'Ative para receber novidades direto na barra de status'}
                  </p>
                </div>
              </div>

              {permission === 'granted' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                  <ShieldCheck className="w-3 h-3" />
                  Ativo
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="shrink-0 text-xs font-bold bg-white text-black px-2.5 py-1 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Ativar
                </button>
              )}
            </div>

            {/* Test Trigger Button */}
            <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Quer ver como fica?</span>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isTesting}
                className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Volume2 className="w-3 h-3" />
                <span>{isTesting ? 'Enviando...' : 'Testar no Android/PC'}</span>
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800/70">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-zinc-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 stroke-[1.5]" />
                <p className="text-xs font-medium">Nenhuma notificação por enquanto</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                  Você será avisado quando houver novidades na comunidade.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-3.5 transition-colors hover:bg-gray-50/80 dark:hover:bg-zinc-800/40",
                    !notif.read && "bg-emerald-500/5 dark:bg-emerald-500/10"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 leading-snug">
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 shrink-0">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    {notif.body}
                  </p>
                  {notif.link && (
                    <a
                      href={notif.link}
                      onClick={() => setIsOpen(false)}
                      className="inline-block mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Acessar recurso →
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
