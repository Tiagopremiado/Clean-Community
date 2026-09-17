import React, { useState, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  FileCode, 
  Quote, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Table, 
  Link as LinkIcon, 
  Eye, 
  Edit3, 
  Columns, 
  Lightbulb,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Escreva sua documentação, prompt ou workflow em Markdown...',
  minHeight = '320px'
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<'write' | 'preview' | 'split'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to insert or wrap markdown syntax around current selection
  const insertSyntax = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || defaultText;

    const replacement = `${prefix}${selected}${suffix}`;
    const newValue = text.substring(0, start) + replacement + text.substring(end);

    onChange(newValue);

    // Reposition cursor inside wrap
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 0);
  };

  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    // Find start of current line
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const currentLine = text.substring(lineStart, end);

    const replacement = `${prefix}${currentLine}`;
    const newValue = text.substring(0, lineStart) + replacement + text.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart + prefix.length, lineStart + replacement.length);
    }, 0);
  };

  // Handle Tab key for proper indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      insertSyntax('  ');
    }
  };

  // Quick preset templates for Obsidian/Notion users
  const insertTemplate = (type: 'prompt' | 'mcp' | 'workflow') => {
    let template = '';
    if (type === 'prompt') {
      template = `## Objetivo do Prompt\nDescreva em 1 ou 2 frases o que este prompt executa com maestria.\n\n> [!TIP]\n> Recomenda-se utilizar modelos com raciocínio avançado (ex: Gemini 2.5 Pro ou Claude 3.7).\n\n### Prompt do Sistema\n\`\`\`markdown\nVocê é um especialista sênior em design de software. Suas respostas devem ser precisas, tipadas e sem clichês de IA.\n\`\`\`\n\n### Exemplos de Entrada & Saída\n- **Entrada:** "Estruture um schema de banco para uma comunidade"\n- **Saída:** Arquivo DDL completo com índices e chaves estrangeiras.\n`;
    } else if (type === 'mcp') {
      template = `## Servidor MCP: Nome do Servidor\nIntegração MCP para conectar ferramentas locais e automações.\n\n> [!NOTE]\n> Requer Node.js 18+ ou Docker instalado.\n\n### Configuração (\`claude_desktop_config.json\`)\n\`\`\`json\n{\n  "mcpServers": {\n    "minha-ferramenta": {\n      "command": "npx",\n      "args": ["-y", "@clean/mcp-server"]\n    }\n  }\n}\n\`\`\`\n\n### Ferramentas Disponíveis\n| Nome da Tool | Descrição | Parâmetros |\n| --- | --- | --- |\n| \`fetch_data\` | Busca dados remotos | \`id: string\` |\n| \`process_job\` | Executa processamento assíncrono | \`timeout: number\` |\n`;
    } else if (type === 'workflow') {
      template = `## Fluxo de Trabalho (Workflow)\nGuia passo a passo para executar este processo do início ao fim.\n\n### Checklist Pré-requisitos\n- [ ] Chave de API configurada no ambiente\n- [ ] Dependências instaladas\n- [ ] Arquivo de configuração preenchido\n\n### Passos de Execução\n1. **Clone o repositório ou baixe os artefatos:**\n\`\`\`bash\ngit clone https://github.com/...\n\`\`\`\n2. **Inicie o servidor de testes:**\n\`\`\`bash\nnpm run dev\n\`\`\`\n\n> [!WARNING]\n> Nunca suba credenciais ou segredos em branches públicas.\n`;
    }

    if (template) {
      const textarea = textareaRef.current;
      if (!textarea) {
        onChange(value ? `${value}\n\n${template}` : template);
        return;
      }
      const start = textarea.selectionStart;
      const text = textarea.value;
      const newValue = text.substring(0, start) + (text ? '\n\n' : '') + template + text.substring(start);
      onChange(newValue);
    }
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs transition-colors">
      
      {/* Top Toolbar (Notion & Obsidian Style) */}
      <div className="flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-zinc-800 px-3 py-2 bg-gray-50/70 dark:bg-zinc-900/60 gap-2">
        
        {/* Formatting Actions */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Headings */}
          <button
            type="button"
            onClick={() => insertLinePrefix('# ')}
            className="p-1.5 text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Título 1 (#)"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('## ')}
            className="p-1.5 text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Título 2 (##)"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('### ')}
            className="p-1.5 text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Título 3 (###)"
          >
            H3
          </button>

          <div className="w-px h-4 bg-gray-300 dark:bg-zinc-700 mx-1" />

          {/* Text Styling */}
          <button
            type="button"
            onClick={() => insertSyntax('**', '**', 'negrito')}
            className="p-1.5 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Negrito (**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax('*', '*', 'itálico')}
            className="p-1.5 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Itálico (*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax('~~', '~~', 'tachado')}
            className="p-1.5 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Tachado (~~)"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax('`', '`', 'código')}
            className="p-1.5 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Código em linha (`)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-gray-300 dark:bg-zinc-700 mx-1" />

          {/* Code Block & Callout */}
          <button
            type="button"
            onClick={() => insertSyntax('```typescript\n', '\n```', '// Código aqui')}
            className="p-1.5 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Bloco de Código (```)"
          >
            <FileCode className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('> [!NOTE]\n> ')}
            className="p-1.5 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Callout / Citação (> [!NOTE])"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-gray-300 dark:bg-zinc-700 mx-1" />

          {/* Lists & Tables */}
          <button
            type="button"
            onClick={() => insertLinePrefix('- ')}
            className="p-1.5 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Lista com marcadores (- )"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('1. ')}
            className="p-1.5 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Lista numerada (1. )"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('- [ ] ')}
            className="p-1.5 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Checklist / Tarefa (- [ ] )"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax('| Cabeçalho 1 | Cabeçalho 2 |\n| --- | --- |\n| Item 1 | Item 2 |\n')}
            className="p-1.5 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Tabela Markdown"
          >
            <Table className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax('[', '](https://exemplo.com)', 'texto do link')}
            className="p-1.5 text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Inserir Link [texto](url)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Switcher (Write / Split / Preview) */}
        <div className="flex items-center gap-1 bg-gray-200/60 dark:bg-zinc-800/80 p-0.5 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('write')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
              viewMode === 'write' 
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xs" 
                : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
            title="Modo de Edição"
          >
            <Edit3 className="w-3 h-3" />
            <span className="hidden sm:inline">Escrever</span>
          </button>
          
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={cn(
              "hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
              viewMode === 'split' 
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xs" 
                : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
            title="Modo Lado a Lado (Obsidian)"
          >
            <Columns className="w-3 h-3" />
            <span>Lado a Lado</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
              viewMode === 'preview' 
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-2xs" 
                : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            )}
            title="Modo de Pré-visualização"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">Visualizar</span>
          </button>
        </div>
      </div>

      {/* Quick Notion/Obsidian Template Chips */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50/40 dark:bg-zinc-900/30 border-b border-gray-100 dark:border-zinc-800/80 overflow-x-auto text-[11px]">
        <span className="text-gray-400 dark:text-zinc-500 font-medium shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Modelos rápidos:
        </span>
        <button
          type="button"
          onClick={() => insertTemplate('prompt')}
          className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:border-black dark:hover:border-zinc-500 transition-colors shrink-0 cursor-pointer"
        >
          Prompt de IA
        </button>
        <button
          type="button"
          onClick={() => insertTemplate('mcp')}
          className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:border-black dark:hover:border-zinc-500 transition-colors shrink-0 cursor-pointer"
        >
          Servidor MCP
        </button>
        <button
          type="button"
          onClick={() => insertTemplate('workflow')}
          className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:border-black dark:hover:border-zinc-500 transition-colors shrink-0 cursor-pointer"
        >
          Workflow / Guia
        </button>
      </div>

      {/* Editor Body Area */}
      <div className="relative">
        {/* Write Only Mode */}
        {viewMode === 'write' && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full p-4 font-mono text-[13.5px] leading-relaxed bg-transparent text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none resize-y selection:bg-black/10 dark:selection:bg-white/20"
          />
        )}

        {/* Preview Only Mode */}
        {viewMode === 'preview' && (
          <div 
            style={{ minHeight }}
            className="w-full p-6 overflow-y-auto bg-white dark:bg-zinc-950"
          >
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <div className="py-12 text-center text-gray-400 dark:text-zinc-600 text-sm">
                Nada para pré-visualizar ainda. Digite seu conteúdo na aba "Escrever".
              </div>
            )}
          </div>
        )}

        {/* Split Mode (Obsidian Dual Pane) */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-zinc-800" style={{ minHeight }}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full p-4 font-mono text-[13.5px] leading-relaxed bg-transparent text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none resize-none selection:bg-black/10 dark:selection:bg-white/20"
            />
            <div className="p-5 overflow-y-auto max-h-[500px] bg-gray-50/30 dark:bg-zinc-900/20">
              {value.trim() ? (
                <MarkdownRenderer content={value} />
              ) : (
                <div className="py-12 text-center text-gray-400 dark:text-zinc-600 text-xs">
                  Pré-visualização em tempo real aparecerá aqui.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar (Word Count, Syntax Hint) */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-zinc-900/40 text-[11px] text-gray-400 dark:text-zinc-500">
        <div className="flex items-center gap-3">
          <span>{wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}</span>
          <span>•</span>
          <span>{charCount} caracteres</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3 h-3" />
          <span>Suporta Markdown GFM, tabelas, blocos de código e callouts &gt; [!NOTE]</span>
        </div>
      </div>

    </div>
  );
}
