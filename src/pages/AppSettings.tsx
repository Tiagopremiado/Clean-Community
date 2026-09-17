import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Layers, 
  Sparkles, 
  RotateCcw, 
  Check, 
  UserCircle, 
  Sliders,
  Globe,
  ExternalLink,
  Bell,
  Download,
  Smartphone,
  CheckCircle2,
  Volume2,
  Share
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendNativeNotification 
} from '../lib/notifications';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES = [
  { id: 'todos', label: 'Todos os Recursos' },
  { id: 'skills', label: 'Skills' },
  { id: 'mcps', label: 'MCPs' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'ferramentas', label: 'Ferramentas' },
  { id: 'referências', label: 'Referências' },
];

export function AppSettings() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const [resetFeedback, setResetFeedback] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [testingNotif, setTestingNotif] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  const handleReset = () => {
    if (window.confirm('Deseja redefinir todas as preferências do app para os valores padrão?')) {
      resetSettings();
      setResetFeedback(true);
      setTimeout(() => setResetFeedback(false), 3000);
    }
  };

  const handleRequestNotif = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      await sendNativeNotification('🎉 Notificações Ativadas!', {
        body: 'Alertas configurados com sucesso no seu dispositivo!',
        type: 'system',
      });
    }
  };

  const handleTestNotif = async () => {
    setTestingNotif(true);
    await sendNativeNotification('🔔 Alerta de Teste CLEAN', {
      body: 'Notificação nativa no Android / Computador disparada com sucesso!',
      type: 'system',
    });
    setTimeout(() => setTestingNotif(false), 1000);
  };

  return (
    <div className="max-w-3xl mx-auto w-full pt-10 pb-32 px-4 sm:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-black dark:bg-white dark:bg-white dark:bg-zinc-900 text-white dark:text-black  flex items-center justify-center shadow-xs">
            <Sliders className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white ">
            Configurações do App
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 text-sm">
          Gerencie a aparência, preferências de navegação e densidade da interface.
        </p>
      </div>

      {resetFeedback && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm font-medium">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Preferências redefinidas com sucesso para o padrão do estúdio.</span>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Seção 1: Tema & Aparência */}
        <section className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white ">Aparência da Interface</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-0.5">
                Escolha o esquema de cores que melhor se adapta ao seu ambiente de trabalho.
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => updateSetting('theme', 'light')}
              className={cn(
                "flex flex-col items-center gap-2.5 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                settings.theme === 'light'
                  ? "border-black bg-zinc-50 dark:bg-zinc-800 text-black dark:text-white  ring-1 ring-black"
                  : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 dark:text-gray-400 hover:border-gray-300"
              )}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span>Claro</span>
            </button>

            <button
              type="button"
              onClick={() => updateSetting('theme', 'dark')}
              className={cn(
                "flex flex-col items-center gap-2.5 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                settings.theme === 'dark'
                  ? "border-black dark:border-white bg-zinc-900 text-white dark:text-black ring-1 ring-zinc-700"
                  : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 dark:text-gray-400 hover:border-gray-300"
              )}
            >
              <Moon className="w-5 h-5 text-indigo-400" />
              <span>Escuro</span>
            </button>

            <button
              type="button"
              onClick={() => updateSetting('theme', 'system')}
              className={cn(
                "flex flex-col items-center gap-2.5 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                settings.theme === 'system'
                  ? "border-black dark:border-white bg-zinc-50 dark:bg-zinc-800 text-black dark:text-white  ring-1 ring-black"
                  : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 dark:text-gray-400 hover:border-gray-300"
              )}
            >
              <Monitor className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span>Sistema</span>
            </button>
          </div>
        </section>

        {/* Seção 2: Feed & Leitura */}
        <section className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white ">Preferências do Feed</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-0.5">
                Controle o layout dos cards e o comportamento de abertura de links.
              </p>
            </div>
            <Layers className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="flex flex-col gap-5 divide-y divide-gray-100 dark:divide-zinc-800">
            {/* Densidade */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white ">Densidade de Conteúdo</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                  {settings.feedDensity === 'compact'
                    ? 'Modo Compacto: maior volume de recursos na tela sem rolagem excessiva.'
                    : 'Modo Confortável: espaçamento respirável e elegante.'}
                </p>
              </div>
              <div className="inline-flex p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => updateSetting('feedDensity', 'comfortable')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    settings.feedDensity === 'comfortable'
                      ? "bg-white dark:bg-zinc-900 dark:bg-zinc-700 text-black dark:text-white  shadow-xs"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white  dark:hover:text-gray-200"
                  )}
                >
                  Confortável
                </button>
                <button
                  type="button"
                  onClick={() => updateSetting('feedDensity', 'compact')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    settings.feedDensity === 'compact'
                      ? "bg-white dark:bg-zinc-900 dark:bg-zinc-700 text-black dark:text-white  shadow-xs"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white  dark:hover:text-gray-200"
                  )}
                >
                  Compacto
                </button>
              </div>
            </div>

            {/* Categoria Padrão */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white ">Categoria Inicial</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                  Filtro pré-selecionado automaticamente ao abrir a página inicial.
                </p>
              </div>
              <select
                value={settings.defaultCategory}
                onChange={(e) => updateSetting('defaultCategory', e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 dark:border-zinc-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white  focus:outline-none focus:ring-1 focus:ring-black"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Links externos em nova aba */}
            <div className="flex items-center justify-between gap-3 pt-4">
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white ">
                  Abrir Links Externos em Nova Aba
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">
                  Abre repositórios, MCPs e ferramentas sem sair do app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting('openLinksInNewTab', !settings.openLinksInNewTab)}
                className={cn(
                  "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                  settings.openLinksInNewTab ? "bg-black dark:bg-white dark:bg-white dark:bg-zinc-900" : "bg-gray-200 dark:bg-zinc-700"
                )}
                aria-label="Alternar abertura de links em nova aba"
              >
                <div
                  className={cn(
                    "bg-white dark:bg-black w-4 h-4 rounded-full shadow-xs transform transition-transform",
                    settings.openLinksInNewTab ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Seção 3: Notificações no Dispositivo (Android / Desktop) */}
        <section className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Notificações no Dispositivo</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Receba alertas nativos com vibração no Android e avisos de novos recursos no computador.
              </p>
            </div>
            <Bell className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                  {notifPermission === 'granted' ? 'Notificações Ativadas' : 'Notificações Desativadas'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                  {notifPermission === 'granted' 
                    ? 'Seu dispositivo está pronto para receber notificações em tempo real.'
                    : 'Permita as notificações para não perder nenhuma atualização da comunidade.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {notifPermission === 'granted' ? (
                <button
                  type="button"
                  onClick={handleTestNotif}
                  disabled={testingNotif}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{testingNotif ? 'Enviando...' : 'Testar no Android/PC'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestNotif}
                  className="px-3.5 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Ativar Notificações
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Seção 4: Aplicativo PWA (Download & Offline) */}
        <section className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Aplicativo PWA</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Instale o CLEAN como aplicativo independente com funcionamento offline.
              </p>
            </div>
            <Download className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              {isInstalled ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <Download className="w-5 h-5 text-gray-400 dark:text-zinc-500 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                  {isInstalled ? 'App Instalado no Dispositivo' : 'Versão em Navegador Web'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                  {isInstalled 
                    ? 'Executando em modo de aplicativo independente de alta performance.'
                    : 'Instale para usar em tela cheia, offline e com acesso rápido.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isInstallable ? (
                <button
                  type="button"
                  onClick={install}
                  className="px-3.5 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Instalar Agora
                </button>
              ) : (
                <Link
                  to="/download"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 text-xs font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  <span>Ver Central de Download</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Seção: Versão Oficial do App */}
        <section className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Versão Oficial do App</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Acesse o ambiente oficial em produção hospedado na nuvem.
              </p>
            </div>
            <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                clean-community-three.vercel.app
              </span>
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                Deploy Oficial (Produção Vercel)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const officialUrl = 'https://clean-community-three.vercel.app/';
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: 'CLEAN Community',
                        text: 'Acesse o aplicativo oficial da CLEAN Community!',
                        url: officialUrl,
                      });
                      return;
                    } catch (err: any) {
                      if (err?.name === 'AbortError') return;
                    }
                  }
                  try {
                    await navigator.clipboard.writeText(officialUrl);
                    setShareFeedback(true);
                    setTimeout(() => setShareFeedback(false), 2500);
                  } catch {
                    prompt('Copie o link oficial:', officialUrl);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="Compartilhar link oficial do app"
              >
                <Share className="w-3.5 h-3.5" />
                <span>{shareFeedback ? 'Link Copiado!' : 'Compartilhar Link'}</span>
              </button>

              <a
                href="https://clean-community-three.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
              >
                <span>Abrir App Oficial</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* Seção: Acesso Rápido ao Perfil & Reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Link
            to="/profile"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900  text-xs font-bold rounded-xl transition-colors"
          >
            <UserCircle className="w-4 h-4" />
            Editar Perfil & Foto
          </Link>

          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors py-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Redefinir Preferências Padrão
          </button>
        </div>
      </div>
    </div>
  );
}
