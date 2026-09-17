import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Compass, 
  Plus, 
  User as UserIcon, 
  FileTerminal, 
  Sparkles, 
  Workflow, 
  PenTool, 
  Database, 
  LayoutTemplate, 
  Library,
  Sliders,
  Globe,
  ExternalLink,
  LogIn,
  LogOut,
  Loader2,
  Download,
  ShieldCheck
} from 'lucide-react';
import { Category, isUserStaff } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/AuthContext';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Sidebar() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isStaff = isUserStaff(profile) || isUserStaff(user as any);
  const userMetadata = user?.user_metadata || {};

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Erro ao sair da conta:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  const displayName = profile?.name || userMetadata.full_name || user?.email?.split('@')[0] || 'Usuário';
  const username = profile?.username || userMetadata.username || user?.email?.split('@')[0] || 'usuario';
  const avatar = profile?.avatar || userMetadata.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.id}`;

  const categories: { name: Category; icon: React.ElementType }[] = [
    { name: 'Todos', icon: LayoutTemplate },
    { name: 'Skills', icon: Sparkles },
    { name: 'MCPs', icon: Database },
    { name: 'Workflows', icon: Workflow },
    { name: 'Prompts', icon: FileTerminal },
    { name: 'Ferramentas', icon: PenTool },
    { name: 'Referências', icon: Library },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-zinc-800 h-screen sticky top-0 bg-[#FAFAFA] dark:bg-zinc-950 flex flex-col p-4 z-20 hidden md:flex transition-colors">
      <div className="mb-8 px-2 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-white dark:text-black" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">CLEAN</span>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Community</span>
          </div>
        </Link>

        <a
          href="https://clean-community-three.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          title="App Oficial (Vercel)"
          className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <nav className="flex flex-col gap-1 mb-6">
        <NavLink 
          to="/" 
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
            isActive ? "bg-black/5 dark:bg-white/10 text-black dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
          )}
          end
        >
          <Home className={cn("w-4 h-4", "transition-transform group-hover:scale-110")} />
          Home
        </NavLink>
        <NavLink 
          to="/explore" 
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
            isActive ? "bg-black/5 dark:bg-white/10 text-black dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
          )}
        >
          <Compass className={cn("w-4 h-4", "transition-transform group-hover:scale-110")} />
          Explorar
        </NavLink>
        <NavLink 
          to="/settings" 
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
            isActive ? "bg-black/5 dark:bg-white/10 text-black dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
          )}
        >
          <Sliders className={cn("w-4 h-4", "transition-transform group-hover:scale-110")} />
          Configurações
        </NavLink>
        {isStaff && (
          <NavLink 
            to="/members" 
            className={({ isActive }) => cn(
              "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
              isActive ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold" : "text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
            )}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className={cn("w-4 h-4 text-blue-500", "transition-transform group-hover:scale-110")} />
              <span>Membros & Mod</span>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Staff
            </span>
          </NavLink>
        )}
        <NavLink 
          to="/download" 
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
            isActive ? "bg-black/5 dark:bg-white/10 text-black dark:text-white font-semibold" : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
          )}
        >
          <Download className={cn("w-4 h-4 text-emerald-500", "transition-transform group-hover:scale-110")} />
          <span>Baixar App (PWA)</span>
        </NavLink>
      </nav>

      <div className="mb-3 px-3">
        <h2 className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Categorias</h2>
      </div>
      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
        {categories.map((cat) => (
          <NavLink 
            key={cat.name}
            to={`/?category=${cat.name.toLowerCase()}`}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
              isActive ? "bg-black/5 dark:bg-white/10 text-black dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            <cat.icon className={cn("w-4 h-4", "transition-transform group-hover:scale-110")} />
            {cat.name}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 flex flex-col gap-3">
        {user ? (
          <>
            <Link 
              to="/publish" 
              className="flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors px-4 py-2.5 rounded-xl text-sm font-medium shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Publicar
            </Link>
            <div className="flex items-center justify-between p-1.5 bg-gray-100/90 dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-xl">
              <Link 
                to="/profile" 
                className="flex items-center gap-2.5 p-1 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                title="Meu Perfil"
              >
                <img src={avatar} alt={displayName} className="w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-700 object-cover shrink-0" />
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="text-xs font-bold truncate text-gray-900 dark:text-white">{displayName}</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">@{username}</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="p-2 text-gray-400 dark:text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title={isLoggingOut ? "Saindo..." : "Sair da conta"}
                aria-label="Sair da conta"
              >
                {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <LogOut className="w-4 h-4" />}
              </button>
            </div>
          </>
        ) : (
          <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-left">
            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 block mb-1">
              Participe da Comunidade
            </span>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-3 leading-relaxed">
              Crie sua conta para publicar, curtir e interagir com criadores.
            </p>
            <div className="flex flex-col gap-2">
              <Link 
                to="/login?mode=signup" 
                className="w-full py-2 px-3 text-center bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Criar Conta
              </Link>
              <Link 
                to="/login?mode=login" 
                className="w-full py-2 px-3 text-center bg-white dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-200 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors"
              >
                Entrar
              </Link>
            </div>
          </div>
        )}

        {/* Link Oficial do App */}
        <a 
          href="https://clean-community-three.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white transition-colors group"
          title="Abrir versão oficial no Vercel"
        >
          <span className="flex items-center gap-2 truncate">
            <Globe className="w-3.5 h-3.5 shrink-0 text-zinc-400 group-hover:text-black dark:group-hover:text-white" />
            <span className="truncate">clean-community-three.vercel.app</span>
          </span>
          <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100" />
        </a>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const { user, profile } = useAuth();
  const isStaff = isUserStaff(profile) || isUserStaff(user as any);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-zinc-800 bg-[#FAFAFA] dark:bg-zinc-950 z-50 flex items-center justify-around p-2 pb-safe">
      <NavLink to="/" className={({ isActive }) => cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-colors", isActive ? "text-black dark:text-white" : "text-gray-400")}>
        <Home className="w-5 h-5" />
      </NavLink>
      <NavLink to="/explore" className={({ isActive }) => cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-colors", isActive ? "text-black dark:text-white" : "text-gray-400")}>
        <Compass className="w-5 h-5" />
      </NavLink>
      <Link to={user ? "/publish" : "/login?mode=signup"} className="flex flex-col items-center gap-1 p-3 bg-black dark:bg-white text-white dark:text-black rounded-full -mt-5 shadow-md" title={user ? "Publicar" : "Cadastrar para publicar"}>
        <Plus className="w-5 h-5" />
      </Link>
      {isStaff ? (
        <NavLink to="/members" className={({ isActive }) => cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-blue-500/80")} title="Membros & Moderação">
          <ShieldCheck className="w-5 h-5" />
        </NavLink>
      ) : (
        <NavLink to="/download" className={({ isActive }) => cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-colors", isActive ? "text-emerald-500 font-bold" : "text-gray-400")} title="Baixar App">
          <Download className="w-5 h-5" />
        </NavLink>
      )}
      {user ? (
        <NavLink to="/profile" className={({ isActive }) => cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-colors", isActive ? "text-black dark:text-white" : "text-gray-400")}>
          <UserIcon className="w-5 h-5" />
        </NavLink>
      ) : (
        <NavLink to="/settings" className={({ isActive }) => cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-colors", isActive ? "text-black dark:text-white" : "text-gray-400")}>
          <Sliders className="w-5 h-5" />
        </NavLink>
      )}
    </div>
  );
}
