import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  Search, 
  Sun, 
  Moon, 
  Plus, 
  LogOut, 
  User as UserIcon, 
  Sliders, 
  X,
  ChevronDown,
  Download,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { NotificationCenter } from './NotificationCenter';
import { supabase } from '../lib/supabase';
import { isUserStaff } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { resolvedTheme, updateSetting } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpenMobile, setIsSearchOpenMobile] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsSearchOpenMobile(false);
  }, [location.pathname]);

  // Focus mobile search when opened
  useEffect(() => {
    if (isSearchOpenMobile) {
      mobileSearchInputRef.current?.focus();
    }
  }, [isSearchOpenMobile]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpenMobile(false);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    updateSetting('theme', nextTheme);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  // Derive page breadcrumb / context
  const getPageContext = () => {
    const path = location.pathname;
    if (path === '/') return 'Feed Principal';
    if (path === '/explore') return 'Explorar Acervo';
    if (path === '/publish') return 'Publicar Recurso';
    if (path === '/settings') return 'Configurações';
    if (path === '/members' || path === '/admin/members') return 'Gestão de Membros (Staff)';
    if (path.startsWith('/profile') || path.startsWith('/u/')) return 'Perfil de Criador';
    if (path.startsWith('/post/')) return 'Detalhes do Recurso';
    return 'CLEAN Community';
  };

  const isStaff = isUserStaff(profile) || isUserStaff(user as any);
  const userMetadata = user?.user_metadata || {};
  const displayName = profile?.name || userMetadata.full_name || user?.email?.split('@')[0] || 'Criador';
  const username = profile?.username || userMetadata.username || user?.email?.split('@')[0] || 'usuario';
  const avatar = profile?.avatar || userMetadata.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.id || 'clean'}`;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors">
      <div className="flex items-center justify-between h-14 md:h-16 px-3 sm:px-6 gap-2 sm:gap-4 max-w-7xl mx-auto w-full">
        
        {/* Left Section: Mobile Brand / Desktop Context Breadcrumb */}
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          {/* Mobile Logo (Sidebar is hidden on mobile) */}
          <Link to="/" className="flex md:hidden items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-black dark:bg-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white dark:text-black" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white">CLEAN</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Community</span>
            </div>
          </Link>

          {/* Desktop Page Context Indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="text-gray-400 dark:text-zinc-500 font-medium">CLEAN Community</span>
            <span className="text-gray-300 dark:text-zinc-700">/</span>
            <span className="text-gray-800 dark:text-zinc-200 font-semibold truncate max-w-[200px] lg:max-w-xs">
              {getPageContext()}
            </span>
          </div>
        </div>

        {/* Center: Desktop Global Quick Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-2 lg:mx-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar prompts, MCPs, skills ou autores..."
              className="w-full bg-gray-50/80 dark:bg-zinc-900/60 hover:bg-gray-100/70 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-12 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-zinc-600 focus:border-black dark:focus:border-zinc-600 transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-gray-400 dark:text-zinc-500 bg-gray-200/60 dark:bg-zinc-800 rounded border border-gray-300/60 dark:border-zinc-700">
                ↵
              </kbd>
            </div>
          </form>
        </div>

        {/* Right Section: Official App Badge, Theme, Auth / Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpenMobile(true)}
            className="md:hidden p-2 text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Buscar"
            aria-label="Abrir busca"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Download App (PWA) Button */}
          <Link
            to="/download"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-black dark:hover:text-white bg-gray-100/80 dark:bg-zinc-800/80 hover:bg-gray-200/80 dark:hover:bg-zinc-700/80 transition-colors border border-gray-200/60 dark:border-zinc-700/60"
            title="Instalar App no celular ou PC"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Baixar App</span>
          </Link>

          {/* Notification Center (Android Push & In-app Alerts) */}
          <NotificationCenter />

          {/* Theme Switcher Toggle */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="p-2 text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-label="Alternar tema de cores"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-600" />
            )}
          </button>

          {/* Quick Staff Button if Moderator or Admin */}
          {isStaff && (
            <Link
              to="/members"
              className="p-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              title="Painel de Membros & Moderação (Staff)"
              aria-label="Gestão de Membros"
            >
              <ShieldCheck className="w-4 h-4" />
            </Link>
          )}

          {/* User Auth Section */}
          {user ? (
            <div className="flex items-center gap-2">
              {/* Desktop Quick Publish Button */}
              <Link
                to="/publish"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publicar</span>
              </Link>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer focus:outline-none"
                  aria-expanded={isProfileMenuOpen}
                  aria-label="Abrir menu do perfil"
                >
                  <img
                    src={avatar}
                    alt={displayName}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200 dark:border-zinc-700 object-cover"
                  />
                  <ChevronDown className="w-3 h-3 text-gray-400 dark:text-zinc-500 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-zinc-800">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
                        @{username}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>Meu Perfil</span>
                      </Link>
                      <Link
                        to="/publish"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-gray-400" />
                        <span>Criar Publicação</span>
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Sliders className="w-3.5 h-3.5 text-gray-400" />
                        <span>Configurações</span>
                      </Link>

                      {isStaff && (
                        <Link
                          to="/members"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Gestão de Membros</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 uppercase font-bold">Staff</span>
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-gray-100 dark:border-zinc-800 pt-1">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair da conta</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/login?mode=login"
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Entrar
              </Link>
              <Link
                to="/login?mode=signup"
                className="px-3.5 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
              >
                Criar Conta
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* Mobile Search Overlay Bar */}
      {isSearchOpenMobile && (
        <div className="md:hidden border-t border-gray-200/80 dark:border-zinc-800 px-3 py-2 bg-white dark:bg-zinc-950 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={mobileSearchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em CLEAN Community..."
              className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-zinc-600"
            />
          </form>
          <button
            type="button"
            onClick={() => setIsSearchOpenMobile(false)}
            className="p-2 text-gray-400 hover:text-black dark:hover:text-white"
            aria-label="Fechar busca"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
}
