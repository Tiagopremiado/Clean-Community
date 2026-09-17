import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Copy, 
  Check, 
  Info, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle2, 
  Flame,
  ExternalLink 
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RichLinkBookmark } from './RichLinkBookmark';
import { HoverLinkPreview } from './HoverLinkPreview';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  
  // Extract language from className (e.g. 'language-typescript' -> 'typescript')
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  // Robust recursive text extractor to avoid [object Object] when copying
  const extractText = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (React.isValidElement(node)) {
      const props = node.props as { children?: React.ReactNode };
      return props && props.children ? extractText(props.children) : '';
    }
    return '';
  };

  const codeString = (extractText(children) || String(children || '')).replace(/\n$/, '');

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codeString);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = codeString;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy code:', e);
    }
  };

  return (
    <div className="relative my-5 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-[#0d0f12] text-zinc-100 shadow-md group/code">
      {/* Code Header with Language and prominent Copy Button */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800/80 text-xs text-zinc-400 font-mono select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
          </div>
          <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-400 ml-1">
            {language || 'código'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border active:scale-95",
            copied
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border-zinc-700/80"
          )}
          title="Copiar código"
          aria-label="Copiar código para a área de transferência"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold text-[11px]">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copiar</span>
            </>
          )}
        </button>
      </div>

      <div className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed selection:bg-zinc-700 selection:text-white">
        <pre className="!bg-transparent !p-0 !m-0 font-mono text-zinc-200">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
}

// Custom Callout parser for Obsidian/Notion style quotes (e.g. > [!NOTE], > [!TIP], > [!WARNING])
function CustomBlockquote({ children }: { children: React.ReactNode }) {
  // Check if children contain a callout identifier
  const childrenArray = React.Children.toArray(children);
  const firstChild = childrenArray[0];

  let calloutType: 'note' | 'tip' | 'warning' | 'important' | null = null;
  let remainingChildren: React.ReactNode = children;

  // Attempt to detect callout type from first paragraph
  if (React.isValidElement(firstChild)) {
    const elementProps = firstChild.props as { children?: React.ReactNode };
    if (elementProps && elementProps.children) {
      const pChildren = React.Children.toArray(elementProps.children);
      const firstText = typeof pChildren[0] === 'string' ? pChildren[0] : '';
      
      const calloutMatch = firstText.match(/^\[!(NOTE|TIP|WARNING|IMPORTANT|INFO)\]/i);
      if (calloutMatch) {
        const type = calloutMatch[1].toLowerCase();
        if (type === 'tip') calloutType = 'tip';
        else if (type === 'warning') calloutType = 'warning';
        else if (type === 'important') calloutType = 'important';
        else calloutType = 'note';

        // Remove the [!TAG] prefix from the first text node
        const strippedText = firstText.replace(/^\[!(NOTE|TIP|WARNING|IMPORTANT|INFO)\]\s*/i, '');
        const newPChildren = [strippedText, ...pChildren.slice(1)];
        const newFirstChild = React.cloneElement(firstChild as React.ReactElement<any>, {}, newPChildren);
        remainingChildren = [newFirstChild, ...childrenArray.slice(1)];
      }
    }
  }

  if (calloutType) {
    const calloutConfig = {
      note: {
        border: 'border-blue-500/40 dark:border-blue-500/30',
        bg: 'bg-blue-500/5 dark:bg-blue-500/10',
        titleColor: 'text-blue-600 dark:text-blue-400',
        icon: Info,
        title: 'Nota'
      },
      tip: {
        border: 'border-emerald-500/40 dark:border-emerald-500/30',
        bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
        titleColor: 'text-emerald-600 dark:text-emerald-400',
        icon: Lightbulb,
        title: 'Dica'
      },
      warning: {
        border: 'border-amber-500/40 dark:border-amber-500/30',
        bg: 'bg-amber-500/5 dark:bg-amber-500/10',
        titleColor: 'text-amber-600 dark:text-amber-400',
        icon: AlertTriangle,
        title: 'Atenção'
      },
      important: {
        border: 'border-rose-500/40 dark:border-rose-500/30',
        bg: 'bg-rose-500/5 dark:bg-rose-500/10',
        titleColor: 'text-rose-600 dark:text-rose-400',
        icon: Flame,
        title: 'Importante'
      }
    }[calloutType];

    const Icon = calloutConfig.icon;

    return (
      <div className={cn(
        "my-5 p-4 rounded-2xl border text-sm leading-relaxed",
        calloutConfig.border,
        calloutConfig.bg
      )}>
        <div className={cn("flex items-center gap-2 font-bold mb-2 text-xs uppercase tracking-wider", calloutConfig.titleColor)}>
          <Icon className="w-4 h-4 shrink-0" />
          <span>{calloutConfig.title}</span>
        </div>
        <div className="text-gray-800 dark:text-zinc-200 prose-p:my-1">
          {remainingChildren}
        </div>
      </div>
    );
  }

  // Standard Notion/Obsidian Quote Block
  return (
    <blockquote className="my-5 pl-4 border-l-2 border-black dark:border-white/80 py-1 text-gray-700 dark:text-zinc-300 italic">
      {children}
    </blockquote>
  );
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={cn("markdown-body text-gray-800 dark:text-zinc-200 leading-relaxed font-normal", className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Unravel pre tag so CodeBlock can control its own wrapper and copy button
          pre({ children }) {
            return <>{children}</>;
          },

          // Custom Code component
          code({ node, className, children, ...props }) {
            const isInline = !className && typeof children === 'string' && !children.includes('\n');
            if (isInline) {
              return (
                <code 
                  className="px-1.5 py-0.5 rounded-md font-mono text-[13px] bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-700/60 font-medium" 
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },

          // Callout & Quote block
          blockquote: CustomBlockquote,

          // Headings with Notion / Obsidian style
          h1: ({ children }) => (
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50 mt-8 mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 mt-7 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 mt-6 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-bold tracking-tight text-gray-900 dark:text-zinc-100 mt-5 mb-2">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="my-3.5 text-[15px] sm:text-base leading-relaxed text-gray-700 dark:text-zinc-300">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="my-3.5 pl-6 list-disc space-y-1.5 text-[15px] text-gray-700 dark:text-zinc-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3.5 pl-6 list-decimal space-y-1.5 text-[15px] text-gray-700 dark:text-zinc-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              {children}
            </li>
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xs">
              <table className="w-full text-left border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 dark:bg-zinc-900/80 border-b border-gray-200 dark:border-zinc-800 font-semibold text-gray-900 dark:text-zinc-100 text-xs uppercase tracking-wider">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="py-3 px-4 font-bold text-gray-900 dark:text-zinc-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="py-3 px-4 border-b border-gray-100 dark:border-zinc-800/60 text-gray-700 dark:text-zinc-300">
              {children}
            </td>
          ),

          // Advanced Links with Hover Previews & Rich Bookmark Cards
          a: ({ href, children }) => {
            if (!href) return <span>{children}</span>;

            // Check if this is a standalone raw URL link
            const childText = typeof children === 'string'
              ? children.trim()
              : Array.isArray(children) && typeof children[0] === 'string'
                ? (children[0] as string).trim()
                : '';

            const isStandaloneUrl = 
              childText === href.trim() || 
              childText === href.replace(/^https?:\/\//, '').replace(/\/$/, '') ||
              childText.toLowerCase() === 'bookmark';

            if (isStandaloneUrl) {
              return <RichLinkBookmark url={href} />;
            }

            return (
              <HoverLinkPreview href={href}>
                {children}
              </HoverLinkPreview>
            );
          },

          // Dividers
          hr: () => (
            <hr className="my-8 border-gray-200 dark:border-zinc-800" />
          ),

          // Checkbox task lists
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="rounded border-gray-300 dark:border-zinc-700 text-black dark:text-white mr-2.5 align-middle accent-black dark:accent-white"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          }
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
