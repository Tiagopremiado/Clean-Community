import { Link, NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, Plus, User as UserIcon, FileTerminal, Sparkles, Workflow, PenTool, Database, LayoutTemplate, Library } from 'lucide-react';
import { Category } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/AuthContext';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Sidebar() {
  const { user } = useAuth();
  const userMetadata = user?.user_metadata || {};
  
  // Use metadata if available (assuming trigger populates it, or fallback)
  const displayName = userMetadata.full_name || user?.email?.split('@')[0] || 'Usuário';
  const username = userMetadata.username || user?.email?.split('@')[0] || 'usuario';
  const avatar = userMetadata.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.id}`;

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
    <aside className="w-64 border-r border-gray-200 h-screen sticky top-0 bg-[#FAFAFA] flex flex-col p-4 z-20 hidden md:flex">
      <div className="mb-8 px-2 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h1 className="font-bold text-lg tracking-tight">CLEAN</h1>
      </div>

      <nav className="flex flex-col gap-1 mb-8">
        <NavLink 
          to="/" 
          className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100", isActive ? "bg-gray-100 text-black" : "text-gray-600")}
          end
        >
          <Home className="w-4 h-4" />
          Home
        </NavLink>
        <NavLink 
          to="/explore" 
          className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100", isActive ? "bg-gray-100 text-black" : "text-gray-600")}
        >
          <Compass className="w-4 h-4" />
          Explorar
        </NavLink>
      </nav>

      <div className="mb-2 px-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Categorias</h2>
      </div>
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {categories.map((cat) => (
          <NavLink 
            key={cat.name}
            to={`/?category=${cat.name.toLowerCase()}`}
            className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100", isActive ? "bg-gray-100 text-black" : "text-gray-600")}
          >
            <cat.icon className="w-4 h-4" />
            {cat.name}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 flex flex-col gap-3">
        <Link 
          to="/publish" 
          className="flex items-center justify-center gap-2 bg-black text-white hover:bg-gray-800 transition-colors px-4 py-2.5 rounded-xl text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Publicar
        </Link>
        <Link 
          to="/profile" 
          className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <img src={avatar} alt={displayName} className="w-8 h-8 rounded-full border border-gray-200" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate">{displayName}</span>
            <span className="text-xs text-gray-500 truncate">@{username}</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-[#FAFAFA] z-50 flex items-center justify-around p-3 pb-safe">
      <NavLink to="/" className={({ isActive }) => cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-colors", isActive ? "text-black" : "text-gray-400")}>
        <Home className="w-5 h-5" />
      </NavLink>
      <NavLink to="/explore" className={({ isActive }) => cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-colors", isActive ? "text-black" : "text-gray-400")}>
        <Compass className="w-5 h-5" />
      </NavLink>
      <Link to="/publish" className="flex flex-col items-center gap-1 p-3 bg-black text-white rounded-full -mt-6 shadow-sm">
        <Plus className="w-5 h-5" />
      </Link>
      <NavLink to="/profile" className={({ isActive }) => cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-colors", isActive ? "text-black" : "text-gray-400")}>
        <UserIcon className="w-5 h-5" />
      </NavLink>
    </div>
  );
}

