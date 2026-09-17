import React, { useState } from 'react';
import { 
  LayoutTemplate, 
  Sparkles, 
  Database, 
  Workflow, 
  FileTerminal, 
  PenTool, 
  Library,
  Flame,
  Clock,
  SlidersHorizontal,
  X,
  Check
} from 'lucide-react';
import { Category } from '../types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type FeedSortOption = 'recent' | 'popular';

export interface FeedCategoryItem {
  name: Category;
  label: string;
  icon: React.ElementType;
  description: string;
}

export const FEED_CATEGORIES: FeedCategoryItem[] = [
  { name: 'Todos', label: 'Todos', icon: LayoutTemplate, description: 'Visão geral com todas as publicações' },
  { name: 'Skills', label: 'Skills', icon: Sparkles, description: 'Instruções e capacidades de agentes' },
  { name: 'MCPs', label: 'MCPs', icon: Database, description: 'Model Context Protocol e servidores' },
  { name: 'Workflows', label: 'Workflows', icon: Workflow, description: 'Fluxos automáticos e integrações' },
  { name: 'Prompts', label: 'Prompts', icon: FileTerminal, description: 'Técnicas de engenharia de prompt' },
  { name: 'Ferramentas', label: 'Ferramentas', icon: PenTool, description: 'Apps, extensões e utilitários de IA' },
  { name: 'Referências', label: 'Referências', icon: Library, description: 'Guias, artigos e links úteis' },
];

interface FeedFilterBarProps {
  currentCategory: string;
  onSelectCategory: (category: string) => void;
  currentSort: FeedSortOption;
  onSelectSort: (sort: FeedSortOption) => void;
  totalResults?: number;
}

export function FeedFilterBar({
  currentCategory,
  onSelectCategory,
  currentSort,
  onSelectSort,
  totalResults,
}: FeedFilterBarProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const activeCategory = currentCategory || 'todos';

  const isCurrent = (catName: string) => {
    return activeCategory.toLowerCase() === catName.toLowerCase();
  };

  const getActiveLabel = () => {
    const found = FEED_CATEGORIES.find(c => c.name.toLowerCase() === activeCategory.toLowerCase());
    return found ? found.label : 'Todos';
  };

  return (
    <div className="w-full mb-6">
      {/* Mobile Top Bar: Current Feed Indicator + Filter Sheet Button */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-200/60 dark:border-zinc-800/60 sm:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
            Feed ativo:
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-black dark:bg-white text-white dark:text-black">
            {getActiveLabel()}
          </span>
          {activeCategory.toLowerCase() !== 'todos' && (
            <button
              type="button"
              onClick={() => onSelectCategory('todos')}
              className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded-md transition-colors"
              title="Voltar para Todos"
              aria-label="Limpar filtro de categoria"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sorting Toggle Segmented Control on Mobile */}
        <div className="flex items-center p-0.5 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onSelectSort('recent')}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
              currentSort === 'recent'
                ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-xs"
                : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
            title="Mais recentes primeiro"
          >
            <Clock className="w-3 h-3" />
            <span>Novos</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectSort('popular')}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
              currentSort === 'popular'
                ? "bg-white dark:bg-zinc-800 text-amber-500 dark:text-amber-400 shadow-xs"
                : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
            title="Mais curtidos primeiro"
          >
            <Flame className="w-3 h-3" />
            <span>Em alta</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Carousel for Categories (Touch friendly with scroll-snap) */}
      <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {FEED_CATEGORIES.map((cat) => {
            const active = isCurrent(cat.name);
            const Icon = cat.icon;

            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => onSelectCategory(cat.name.toLowerCase())}
                className={cn(
                  "snap-start shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border whitespace-nowrap active:scale-95",
                  active
                    ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xs"
                    : "bg-white dark:bg-zinc-900/70 text-gray-600 dark:text-zinc-400 border-gray-200/80 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 hover:text-black dark:hover:text-zinc-200"
                )}
                aria-pressed={active}
              >
                <Icon className={cn(
                  "w-3.5 h-3.5",
                  active ? "text-white dark:text-black" : "text-gray-400 dark:text-zinc-500"
                )} />
                <span>{cat.label}</span>
              </button>
            );
          })}

          {/* Desktop/Tablet Sorting Selector Button */}
          <div className="hidden sm:flex items-center gap-1 ml-auto pl-2 border-l border-gray-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => onSelectSort('recent')}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                currentSort === 'recent'
                  ? "bg-gray-200 dark:bg-zinc-800 text-black dark:text-white"
                  : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Mais Recentes</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectSort('popular')}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                currentSort === 'popular'
                  ? "bg-gray-200 dark:bg-zinc-800 text-amber-600 dark:text-amber-400"
                  : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
              )}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Em Alta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet / Modal for Complete Category List (Touch Friendly) */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div 
            className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle for Mobile */}
            <div className="w-12 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                  Selecionar Feed
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Escolha o tópico de recursos que deseja explorar no celular
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Categories with Descriptions */}
            <div className="space-y-2 mb-6">
              {FEED_CATEGORIES.map((cat) => {
                const active = isCurrent(cat.name);
                const Icon = cat.icon;

                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.name.toLowerCase());
                      setIsSheetOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all border cursor-pointer",
                      active
                        ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xs"
                        : "bg-gray-50/70 dark:bg-zinc-800/40 border-gray-200/70 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 hover:border-gray-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-xl",
                        active ? "bg-white/20 dark:bg-black/20" : "bg-gray-200/70 dark:bg-zinc-800"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-none mb-1">
                          {cat.label}
                        </p>
                        <p className={cn(
                          "text-[11px] leading-tight",
                          active ? "text-white/80 dark:text-black/80" : "text-gray-500 dark:text-zinc-400"
                        )}>
                          {cat.description}
                        </p>
                      </div>
                    </div>
                    {active && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Ordenação dentro do modal */}
            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 dark:text-zinc-400">
                Ordem de exibição:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectSort('recent')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    currentSort === 'recent'
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                  )}
                >
                  Recentes
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSort('popular')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    currentSort === 'popular'
                      ? "bg-amber-500 text-black"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                  )}
                >
                  Em alta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
