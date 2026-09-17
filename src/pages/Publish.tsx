import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '../types';
import { ArrowLeft, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { RichLinkBookmark } from '../components/RichLinkBookmark';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const categories: Category[] = ['Todos', 'Skills', 'MCPs', 'Workflows', 'Prompts', 'Ferramentas', 'Referências'];

export function Publish() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || selectedCategory === 'Todos') {
      setError('Selecione uma categoria válida.');
      return;
    }
    if (!user) {
      setError('Você precisa estar autenticado no Supabase para publicar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          title,
          description,
          content: content || null,
          category: selectedCategory,
          external_link: link || null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      navigate(`/post/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao gravar publicação no banco de dados Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full pt-8 pb-32 px-4 sm:px-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">Publicar Recurso</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Compartilhe uma ferramenta, prompt ou workflow com a comunidade.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 font-medium leading-snug">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm font-bold text-gray-900 dark:text-zinc-50">Título</label>
          <input 
            type="text" 
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Prompt de Design System para o Claude" 
            className="w-full bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-zinc-600 focus:border-black dark:focus:border-zinc-600 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-bold text-gray-900 dark:text-zinc-50">Descrição curta</label>
          <textarea 
            id="description"
            required
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Resumo em uma ou duas frases." 
            className="w-full bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-zinc-600 focus:border-black dark:focus:border-zinc-600 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600 resize-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-gray-900 dark:text-white ">Categoria <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {categories.filter(c => c !== 'Todos').map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                  selectedCategory === cat 
                    ? "bg-black dark:bg-white text-white dark:text-black border-black" 
                    : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-800 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 dark:bg-zinc-900/50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="link" className="text-sm font-bold text-gray-900 dark:text-zinc-50">
              Link Externo <span className="text-gray-400 dark:text-zinc-500 font-normal">(Opcional)</span>
            </label>
            {link && (link.startsWith('http://') || link.startsWith('https://')) && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Hero Preview Ativo
              </span>
            )}
          </div>
          <input 
            type="url" 
            id="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://exemplo.com ou link do GitHub / SaaS" 
            className="w-full bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-zinc-600 focus:border-black dark:focus:border-zinc-600 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          />

          {/* Preview textual do Link Colocado em Tempo Real */}
          {link && (link.startsWith('http://') || link.startsWith('https://')) && (
            <div className="mt-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 block mb-1">
                Pré-visualização do link (título e descrição):
              </span>
              <RichLinkBookmark url={link} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="content" className="text-sm font-bold text-gray-900 dark:text-zinc-50">
              Conteúdo Detalhado <span className="text-gray-400 dark:text-zinc-500 font-normal">(Estilo Obsidian / Notion)</span>
            </label>
            <span className="text-xs text-gray-400 dark:text-zinc-500 hidden sm:inline">
              Formatação rica, callouts e blocos de código
            </span>
          </div>
          
          <MarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="Documente seu prompt, MCP, workflow ou skill com formatação rica..."
            minHeight="280px"
          />
        </div>

        <div className="pt-6 mt-2 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Publicar
          </button>
        </div>
      </form>
    </div>
  );
}
