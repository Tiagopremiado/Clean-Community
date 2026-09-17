import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function GuestAuthBanner() {
  const { user } = useAuth();

  if (user) return null;

  return (
    <aside 
      aria-label="Aviso para visitante"
      className="fixed bottom-16 md:bottom-4 left-3 right-3 md:left-72 md:right-8 z-40 bg-zinc-950/95 dark:bg-zinc-900/95 text-white backdrop-blur-md border border-zinc-800 p-3.5 sm:p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
          <Sparkles className="w-4 h-4 text-amber-300" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-white truncate">CLEAN Community</span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-white/10 text-zinc-300 rounded tracking-wider">Acesso Visitante</span>
          </div>
          <p className="text-xs text-zinc-400 truncate hidden sm:block">
            Crie sua conta gratuita para publicar prompts, MCPs, curtir e interagir com criadores.
          </p>
          <p className="text-xs text-zinc-400 truncate sm:hidden">
            Crie sua conta para publicar e curtir recursos.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
        <a 
          href="https://clean-community-three.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
          title="Acessar app oficial no Vercel"
        >
          <span>App Oficial</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <Link 
          to="/login?mode=login"
          className="px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
        >
          Entrar
        </Link>
        <Link 
          to="/login?mode=signup"
          className="px-3.5 py-2 text-xs font-bold text-black bg-white hover:bg-zinc-200 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm"
        >
          <span>Criar Conta</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </aside>
  );
}
