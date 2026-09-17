import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '../types';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
    if (!user) return;

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
      setError(err.message || 'Erro ao publicar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full pt-8 pb-32 px-4 sm:px-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-2">Publicar Recurso</h1>
        <p className="text-gray-500 text-sm">Compartilhe uma ferramenta, prompt ou workflow com a comunidade.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 font-medium leading-snug">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm font-bold text-gray-900">Título</label>
          <input 
            type="text" 
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Prompt de Design System para o Claude" 
            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-bold text-gray-900">Descrição curta</label>
          <textarea 
            id="description"
            required
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Resumo em uma ou duas frases." 
            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all shadow-sm resize-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold text-gray-900">Categoria <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {categories.filter(c => c !== 'Todos').map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                  selectedCategory === cat 
                    ? "bg-black text-white border-black" 
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="link" className="text-sm font-bold text-gray-900">Link Externo <span className="text-gray-400 font-normal">(Opcional)</span></label>
          <input 
            type="url" 
            id="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..." 
            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="content" className="text-sm font-bold text-gray-900">Conteúdo Detalhado <span className="text-gray-400 font-normal">(Markdown suportado)</span></label>
          <textarea 
            id="content"
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva mais detalhes, cole prompts ou explique como usar a ferramenta..." 
            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 transition-all shadow-sm resize-y"
          />
        </div>

        <div className="pt-6 mt-2 border-t border-gray-100 flex justify-end gap-3">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Publicar
          </button>
        </div>
      </form>
    </div>
  );
}
