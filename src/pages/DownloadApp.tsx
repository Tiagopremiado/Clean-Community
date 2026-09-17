import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Laptop, 
  Apple, 
  CheckCircle2, 
  Bell, 
  WifiOff, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  Share, 
  PlusSquare,
  Sparkles,
  Volume2
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  requestNotificationPermission, 
  sendNativeNotification, 
  getNotificationPermission 
} from '../lib/notifications';
import { PageTransition } from '../components/PageTransition';

export function DownloadApp() {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>(
    isAndroid ? 'android' : isIOS ? 'ios' : 'android'
  );
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [testingNotif, setTestingNotif] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstalledSuccess(true);
    }
  };

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      await sendNativeNotification('🎉 Notificações Ativadas com Sucesso!', {
        body: 'Seu dispositivo Android / PC agora está conectado às novidades do CLEAN Community.',
        type: 'system',
      });
    }
  };

  const handleTestNotification = async () => {
    setTestingNotif(true);
    await sendNativeNotification('🔔 Alerta de Teste CLEAN', {
      body: 'Notificação nativa recebida! Seu Android está pronto para receber alertas.',
      type: 'system',
    });
    setTimeout(() => setTestingNotif(false), 1200);
  };

  return (
    <PageTransition className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Progressive Web App (PWA)</span>
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-zinc-50 mb-4 leading-tight">
          Instale o CLEAN Community no seu dispositivo
        </h1>
        
        <p className="text-sm sm:text-base text-gray-600 dark:text-zinc-400 leading-relaxed">
          Use como aplicativo nativo no seu <strong>Android, iPhone ou Computador</strong>. 
          Sem precisar baixar da Play Store ou App Store: é instantâneo, seguro, offline e com notificações nativas.
        </p>
      </div>

      {/* Main Installation Action Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900/80 border border-gray-200/90 dark:border-zinc-800 shadow-xl mb-12 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className="w-16 h-16 rounded-2xl bg-zinc-950 dark:bg-black border border-zinc-800 flex items-center justify-center shrink-0 shadow-md">
              <img src="/icon.svg" alt="CLEAN" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-zinc-100">
                CLEAN Community App
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {isInstalled || installedSuccess ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Instalado como aplicativo nativo
                  </span>
                ) : (
                  <span className="text-xs text-gray-500 dark:text-zinc-400">
                    Versão PWA WebAPK • Gratuita e Sem Anúncios
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div>
            {isInstalled || installedSuccess ? (
              <div className="px-5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Aplicativo Já Instalado</span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-md hover:shadow-lg cursor-pointer transform active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Agora no Dispositivo</span>
              </button>
            ) : isIOS ? (
              <a
                href="#guia-ios"
                onClick={() => setActiveTab('ios')}
                className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs hover:opacity-90 transition-all"
              >
                <Apple className="w-4 h-4" />
                <span>Ver Passo a Passo para iOS</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Aplicativo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Device Guides (Tabs) */}
      <div id="guia-ios" className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
          <span>Como instalar no seu sistema</span>
        </h2>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-gray-100 dark:bg-zinc-900/60 border border-gray-200/80 dark:border-zinc-800 mb-6 max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span>Android</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Apple className="w-4 h-4 text-zinc-500" />
            <span>iPhone / iPad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-xs'
                : 'text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Laptop className="w-4 h-4 text-blue-500" />
            <span>Computador</span>
          </button>
        </div>

        {/* Android Tab Content */}
        {activeTab === 'android' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                  Instalação no Android (Google Chrome ou Samsung Internet)
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Cria um app WebAPK com suporte completo a notificações na barra de status.
                </p>
              </div>
            </div>

            <ol className="space-y-4 text-sm text-gray-700 dark:text-zinc-300">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  No Chrome do seu celular, toque no botão <strong>"Instalar Agora no Dispositivo"</strong> ou abra o menu dos <strong>três pontinhos (⋮)</strong> no canto superior direito.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Confirme em <strong>"Instalar"</strong>. O ícone do CLEAN aparecerá na sua tela de apps e inicial com funcionamento nativo!
                </span>
              </li>
            </ol>
          </div>
        )}

        {/* iOS Tab Content */}
        {activeTab === 'ios' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white">
                <Apple className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                  Instalação no iPhone e iPad (Safari)
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  A Apple suporta instalação PWA direta pelo navegador nativo Safari.
                </p>
              </div>
            </div>

            <ol className="space-y-4 text-sm text-gray-700 dark:text-zinc-300">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  Abra este site no <strong>Safari</strong> e toque no botão <strong>Compartilhar</strong>
                  <Share className="w-4 h-4 text-blue-500 inline" /> (ícone do quadrado com a seta para cima na barra inferior).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  Role a lista de ações para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                  <PlusSquare className="w-4 h-4 text-gray-600 dark:text-zinc-400 inline" />.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  No canto superior direito da tela, toque em <strong>"Adicionar"</strong>. Pronto! O CLEAN abrirá como app independente.
                </span>
              </li>
            </ol>
          </div>
        )}

        {/* Desktop Tab Content */}
        {activeTab === 'desktop' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                  Instalação no Windows, macOS e Linux
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Janela dedicada sem barras de URL, com atalho na barra de tarefas ou Dock.
                </p>
              </div>
            </div>

            <ol className="space-y-4 text-sm text-gray-700 dark:text-zinc-300">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  No Google Chrome, Edge ou Brave, localize o ícone de instalação <Download className="w-3.5 h-3.5 inline mx-1" /> na barra de endereço (lado direito).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Clique em <strong>"Instalar CLEAN Community"</strong> e confirme.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  O aplicativo será aberto em sua própria janela com suporte a atalhos do teclado.
                </span>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Notifications Management & Android Push Setup */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 text-white border border-zinc-800 mb-12 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Bell className="w-3.5 h-3.5" />
              <span>Notificações para Android & PC</span>
            </div>
            <h3 className="text-xl font-bold mb-2">
              Receba alertas de novos recursos e respostas
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              No Android, as notificações vibram e aparecem na bandeja do sistema, exatamente como um aplicativo nativo instalado.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {notifPermission === 'granted' ? (
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={testingNotif}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Volume2 className="w-4 h-4" />
                <span>{testingNotif ? 'Enviando Alerta...' : 'Testar Notificação no Android'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>Ativar Notificações no Dispositivo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-6">
          Por que usar a versão em aplicativo?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-gray-200/80 dark:border-zinc-800">
            <Zap className="w-5 h-5 text-amber-500 mb-3" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-1">
              Velocidade Instantânea
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              O Service Worker armazena em cache o código e ativos para abrir em menos de 1 segundo.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-gray-200/80 dark:border-zinc-800">
            <Bell className="w-5 h-5 text-emerald-500 mb-3" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-1">
              Notificações Nativas
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              Avisos no Android com vibração e ícone do app na barra de status superior.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-gray-200/80 dark:border-zinc-800">
            <WifiOff className="w-5 h-5 text-blue-500 mb-3" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-1">
              Acesso Offline
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              Consulte seus recursos salvos e rascunhos de publicações mesmo sem sinal de internet.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-gray-200/80 dark:border-zinc-800">
            <ShieldCheck className="w-5 h-5 text-purple-500 mb-3" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-1">
              Super Leve
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              Ocupa menos de 3MB de memória, sem consumir espaço do seu celular como apps de loja.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
