import React, { useState, useEffect } from 'react';
import { ExternalLink, Copy, Check, Globe } from 'lucide-react';
import { LinkPreviewData } from '../types/linkPreview';
import { fetchLinkPreview } from '../lib/linkPreview';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface RichLinkBookmarkProps {
  url: string;
  className?: string;
}

export function RichLinkBookmark({ url, className }: RichLinkBookmarkProps) {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchLinkPreview(url)
      .then((preview) => {
        if (mounted) {
          setData(preview);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [url]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  })();

  if (loading) {
    return (
      <div className={cn(
        "my-3 p-4 rounded-xl border border-gray-200/70 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/30 animate-pulse",
        className
      )}>
        <div className="w-1/3 h-4 rounded bg-gray-200 dark:bg-zinc-800 mb-2" />
        <div className="w-3/4 h-3.5 rounded bg-gray-200 dark:bg-zinc-800 mb-2" />
        <div className="w-1/4 h-3 rounded bg-gray-200 dark:bg-zinc-800" />
      </div>
    );
  }

  const title = data?.title || domain;
  const description = data?.description || '';

  return (
    <div className={cn("my-3 group", className)}>
      <div className="p-4 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-gray-300 dark:hover:border-zinc-700 transition-all shadow-2xs hover:shadow-xs">
        {/* Título da página */}
        <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-zinc-100 mb-1 leading-snug">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-start justify-between gap-2"
          >
            <span>{title}</span>
            <ExternalLink className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300 transition-colors mt-0.5" />
          </a>
        </h4>

        {/* Descrição da página */}
        {description && (
          <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mb-3 leading-relaxed">
            {description}
          </p>
        )}

        {/* Link acompanhado com domínio e atalho de cópia */}
        <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 dark:border-zinc-800/80 text-xs">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white truncate max-w-[80%]"
          >
            <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate font-mono text-[11px]">{url}</span>
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Copiar link"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
