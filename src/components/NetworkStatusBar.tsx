import { useState } from 'react';
import { WifiOff, Database, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNetworkStatus } from '../lib/offlineFallback';

interface NetworkStatusBarProps {
  isOfflineFallback?: boolean;
  onRefresh?: () => void;
  lastSyncTime?: number | null;
}

export function NetworkStatusBar({ isOfflineFallback = false, onRefresh, lastSyncTime }: NetworkStatusBarProps) {
  const { isOnline } = useNetworkStatus();
  const [reconnecting, setReconnecting] = useState(false);

  // If online and not reading from offline fallback, keep the UI clean
  if (isOnline && !isOfflineFallback) {
    return null;
  }

  const handleManualSync = async () => {
    if (!onRefresh) return;
    setReconnecting(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setReconnecting(false), 500);
    }
  };

  return (
    <aside 
      aria-label="Status de conexão e sincronização com banco de dados"
      className="w-full bg-amber-500/10 dark:bg-amber-400/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-200"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          {!isOnline ? (
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <Database className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span>
            {!isOnline 
              ? "Sem conexão com a internet. Exibindo dados locais de fallback (offline)."
              : "Aviso de conexão com o banco Supabase: exibindo dados do cache local de segurança."}
          </span>
          {lastSyncTime && (
            <span className="opacity-75 text-[11px] hidden md:inline">
              (Último sync: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            <Database className="w-3 h-3" />
            Supabase Obrigatório
          </span>

          {onRefresh && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={reconnecting}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600/10 hover:bg-amber-600/20 dark:bg-amber-400/20 dark:hover:bg-amber-400/30 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${reconnecting ? 'animate-spin' : ''}`} />
              <span>{reconnecting ? 'Reconectando...' : 'Reconectar ao Banco'}</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
