import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Filter, 
  UserCheck, 
  Crown, 
  Ban, 
  RefreshCw, 
  ArrowUpRight, 
  MoreVertical, 
  Check, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Copy,
  Lock,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  UserProfile, 
  Role, 
  normalizeProfile, 
  isUserAdminOrDev, 
  isUserModerator, 
  isUserStaff, 
  setStoredRoleOverride,
  toggleUserBan,
  isUserBanned,
  formatTimeAgo
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const CACHED_MEMBERS_KEY = 'clean_community_cached_members_list';

export function MembersManagement() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'staff' | 'admin' | 'moderator' | 'member' | 'banned'>('all');
  
  // Selected member for role editing modal
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('member');
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isCurrentAdmin = isUserAdminOrDev(profile) || isUserAdminOrDev(user as any);
  const isCurrentStaff = isUserStaff(profile) || isUserStaff(user as any);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setActionFeedback({ message, type });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Prioridade: Consulta ao banco de dados Supabase
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (data) {
        const normalized = (data as UserProfile[]).map(p => normalizeProfile(p) || p);
        setMembers(normalized);
        try {
          localStorage.setItem(CACHED_MEMBERS_KEY, JSON.stringify(normalized));
        } catch (e) {
          console.warn('Falha ao salvar cache de membros:', e);
        }
      }
    } catch (err: any) {
      console.warn('Erro ao carregar membros do Supabase, tentando cache local:', err);
      try {
        const cached = localStorage.getItem(CACHED_MEMBERS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as UserProfile[];
          const normalized = parsed.map(p => normalizeProfile(p) || p);
          setMembers(normalized);
          showFeedback('Carregado snapshot local (offline)', 'success');
        } else {
          setError('Não foi possível carregar a lista de membros do banco de dados.');
        }
      } catch {
        setError('Erro ao carregar membros.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Se não for membro da equipe (admin ou moderador)
  if (!isCurrentStaff && !loading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto mb-6 text-zinc-400 dark:text-zinc-600 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
          Acesso Restrito à Equipe
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
          Esta área é restrita a <strong>Moderadores</strong> e <strong>Administradores</strong> da CLEAN Community para moderação e gestão de cargos.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          Voltar ao Feed Principal
        </button>
      </div>
    );
  }

  const handleOpenRoleModal = (member: UserProfile) => {
    setEditingMember(member);
    setSelectedRole(member.role || 'member');
  };

  const handleSaveRole = async () => {
    if (!editingMember) return;
    setIsSavingRole(true);
    try {
      // 1. Atualiza no override local (garante sincronia imediata na interface)
      setStoredRoleOverride(editingMember.id, selectedRole);
      if (editingMember.username) {
        setStoredRoleOverride(editingMember.username, selectedRole);
      }

      // 2. Persiste no banco Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', editingMember.id);

      if (updateError) {
        console.warn('Aviso ao persistir no Supabase (aplicado override local):', updateError);
      }

      // Atualiza estado local
      setMembers(prev => prev.map(m => {
        if (m.id === editingMember.id) {
          return { ...m, role: selectedRole };
        }
        return m;
      }));

      showFeedback(`Cargo de @${editingMember.username} atualizado para "${selectedRole.toUpperCase()}" com sucesso!`);
      setEditingMember(null);
    } catch (err: any) {
      console.error('Erro ao atualizar cargo:', err);
      showFeedback('Erro ao persistir cargo no banco de dados.', 'error');
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleToggleBan = (member: UserProfile) => {
    const isNowBanned = toggleUserBan(member.id);
    if (member.username) {
      toggleUserBan(member.username);
    }
    showFeedback(
      isNowBanned 
        ? `@${member.username} foi suspenso temporariamente.` 
        : `@${member.username} foi reativado com sucesso.`,
      isNowBanned ? 'error' : 'success'
    );
    // Forçar re-render
    setMembers(prev => [...prev]);
  };

  const handleCopyId = async (id: string, label: string) => {
    try {
      await navigator.clipboard.writeText(id);
      showFeedback(`${label} copiado para a área de transferência!`);
    } catch {
      showFeedback('Não foi possível copiar.', 'error');
    }
  };

  // Filtragem
  const filteredMembers = members.filter(member => {
    const banned = isUserBanned(member.id) || isUserBanned(member.username);

    // Filtro por cargo
    if (roleFilter === 'banned' && !banned) return false;
    if (roleFilter === 'staff' && member.role !== 'admin' && member.role !== 'moderator') return false;
    if (roleFilter === 'admin' && member.role !== 'admin') return false;
    if (roleFilter === 'moderator' && member.role !== 'moderator') return false;
    if (roleFilter === 'member' && (member.role === 'admin' || member.role === 'moderator')) return false;

    // Filtro por busca
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = member.name?.toLowerCase().includes(q);
      const matchUser = member.username?.toLowerCase().includes(q);
      const matchBio = member.bio?.toLowerCase().includes(q);
      return matchName || matchUser || matchBio;
    }

    return true;
  });

  // Estatísticas
  const totalCount = members.length;
  const adminCount = members.filter(m => m.role === 'admin').length;
  const modCount = members.filter(m => m.role === 'moderator').length;
  const regularCount = totalCount - adminCount - modCount;
  const bannedCount = members.filter(m => isUserBanned(m.id) || isUserBanned(m.username)).length;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-32">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div 
          className={cn(
            "fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-sm font-semibold shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2",
            actionFeedback.type === 'success' 
              ? "bg-zinc-900/95 text-emerald-300 border-emerald-500/30" 
              : "bg-zinc-900/95 text-rose-300 border-rose-500/30"
          )}
        >
          {actionFeedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Header com Badge de Autoridade */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Painel de Moderação & Gestão
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Membros da Comunidade
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gerencie cargos, permissões de moderador e visualize todos os membros cadastrados.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMembers}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Atualizar Lista
        </button>
      </div>

      {/* Cartões de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">Total Membros</div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{totalCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1 flex items-center gap-1">
            <Crown className="w-3 h-3 text-amber-500" />
            Admins
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{adminCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-500" />
            Moderadores
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{modCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1">Membros</div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{regularCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-1 flex items-center gap-1 text-rose-500">
            <Ban className="w-3 h-3" />
            Suspensos
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{bannedCount}</div>
        </div>
      </div>

      {/* Controles de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, @username ou bio..."
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all shadow-xs"
          />
        </div>

        {/* Filtro de Cargos */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
              roleFilter === 'all' 
                ? "bg-black dark:bg-white text-white dark:text-black" 
                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('staff')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
              roleFilter === 'staff' 
                ? "bg-black dark:bg-white text-white dark:text-black" 
                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            Staff ({adminCount + modCount})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('moderator')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
              roleFilter === 'moderator' 
                ? "bg-black dark:bg-white text-white dark:text-black" 
                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            Mods ({modCount})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('admin')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
              roleFilter === 'admin' 
                ? "bg-black dark:bg-white text-white dark:text-black" 
                : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
          >
            Admins ({adminCount})
          </button>
          {bannedCount > 0 && (
            <button
              type="button"
              onClick={() => setRoleFilter('banned')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer text-rose-500",
                roleFilter === 'banned' 
                  ? "bg-rose-600 text-white" 
                  : "bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100"
              )}
            >
              Suspensos ({bannedCount})
            </button>
          )}
        </div>
      </div>

      {/* Lista de Membros */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-zinc-400" />
          <p className="text-xs">Consultando base de membros...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800">
          <p className="text-sm text-rose-500 mb-3">{error}</p>
          <button
            onClick={loadMembers}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
          >
            Tentar novamente
          </button>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <Users className="w-8 h-8 mx-auto text-zinc-400 mb-2 opacity-50" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum membro encontrado com os filtros atuais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMembers.map((member) => {
            const isBanned = isUserBanned(member.id) || isUserBanned(member.username);
            const memberProfileUrl = `/profile/${member.username || member.id}`;
            const isTargetAdmin = member.role === 'admin';
            const isTargetMod = member.role === 'moderator';

            return (
              <div 
                key={member.id}
                className={cn(
                  "p-4 sm:p-5 rounded-2xl border transition-all shadow-xs flex flex-col justify-between group",
                  isBanned 
                    ? "bg-rose-500/5 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60" 
                    : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700"
                )}
              >
                <div>
                  {/* Topo do Card: Avatar, Nomes e Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Link to={memberProfileUrl} className="shrink-0 group/avatar">
                        <img 
                          src={member.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.id}`} 
                          alt={member.name} 
                          className="w-11 h-11 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover group-hover/avatar:scale-105 transition-transform" 
                        />
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link 
                            to={memberProfileUrl}
                            className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 hover:underline truncate"
                          >
                            {member.name || 'Sem nome'}
                          </Link>

                          {/* Badge de Cargo */}
                          {isTargetAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black">
                              <Crown className="w-2.5 h-2.5 text-amber-400" />
                              Admin
                            </span>
                          )}
                          {isTargetMod && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              Mod
                            </span>
                          )}
                          {isBanned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-white">
                              <Ban className="w-2.5 h-2.5" />
                              Suspenso
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <Link to={memberProfileUrl} className="hover:underline">
                            @{member.username || 'usuario'}
                          </Link>
                          <span>•</span>
                          <span>Entrou {formatTimeAgo(member.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Entrar no Perfil */}
                    <Link
                      to={memberProfileUrl}
                      className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                      title="Entrar no perfil deste membro"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Bio do Membro (se houver) */}
                  {member.bio && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 my-3 line-clamp-2 leading-relaxed italic">
                      "{member.bio}"
                    </p>
                  )}
                </div>

                {/* Ações de Moderação / Gestão */}
                <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Ação: Editar Cargo */}
                    <button
                      type="button"
                      onClick={() => handleOpenRoleModal(member)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
                      title="Alterar cargo (Membro, Moderador, Administrador)"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Editar Cargo</span>
                    </button>

                    {/* Ação: Ver Posts */}
                    <Link
                      to={`/explore?q=${encodeURIComponent(member.username || member.name)}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Ver publicações deste membro"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Posts</span>
                    </Link>

                    {/* Ação: Copiar ID */}
                    <button
                      type="button"
                      onClick={() => handleCopyId(member.id, 'ID do membro')}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Copiar ID UUID do usuário"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Ação de Suspensão / Banimento */}
                  <button
                    type="button"
                    onClick={() => handleToggleBan(member)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer",
                      isBanned
                        ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        : "text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    )}
                    title={isBanned ? "Reativar conta deste membro" : "Suspender membro"}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{isBanned ? 'Reativar' : 'Suspender'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Editar Cargo */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Editar Cargo de Membro
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
              Defina as permissões e autoridade de <strong>@{editingMember.username}</strong> ({editingMember.name}) na comunidade.
            </p>

            <div className="flex flex-col gap-2.5 mb-6">
              {/* Opção: Membro Comum */}
              <label 
                onClick={() => setSelectedRole('member')}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all",
                  selectedRole === 'member'
                    ? "border-black dark:border-white bg-zinc-50 dark:bg-zinc-800/80 shadow-xs"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Membro Comum</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Pode publicar recursos, comentar e interagir.</div>
                  </div>
                </div>
                {selectedRole === 'member' && <Check className="w-4 h-4 text-black dark:text-white" />}
              </label>

              {/* Opção: Moderador */}
              <label 
                onClick={() => setSelectedRole('moderator')}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all",
                  selectedRole === 'moderator'
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>Moderador</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500 text-white font-bold">MOD</span>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Pode moderar comentários, posts e gerenciar membros.</div>
                  </div>
                </div>
                {selectedRole === 'moderator' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              </label>

              {/* Opção: Administrador */}
              <label 
                onClick={() => setSelectedRole('admin')}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all",
                  selectedRole === 'admin'
                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-xs"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>Administrador</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black dark:bg-white text-white dark:text-black font-bold">ADMIN</span>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Controle total da comunidade, banco de dados e cargos.</div>
                  </div>
                </div>
                {selectedRole === 'admin' && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                disabled={isSavingRole}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={isSavingRole}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity cursor-pointer"
              >
                {isSavingRole && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Salvar Cargo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
