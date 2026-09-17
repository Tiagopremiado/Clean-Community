import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Globe, Copy, Check, Star } from 'lucide-react';
import { LinkPreviewData } from '../types/linkPreview';
import { fetchLinkPreview } from '../lib/linkPreview';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface HoverLinkPreviewProps {
  href?: string;
  children: React.ReactNode;
}

export function HoverLinkPreview({ href, children }: HoverLinkPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));

  const handleMouseEnter = () => {
    if (!isExternal || !href) return;

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      if (!data) {
        setLoading(true);
        fetchLinkPreview(href)
          .then((res) => {
            setData(res);
            setLoading(false);
          })
          .catch(() => {
            setLoading(false);
          });
      }
    }, 280);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  if (!isExternal) {
    return (
      <a 
        href={href} 
        className="font-semibold text-black dark:text-white underline decoration-zinc-400 dark:decoration-zinc-600 underline-offset-4 hover:decoration-black dark:hover:decoration-white transition-colors"
      >
        {children}
      </a>
    );
  }

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-semibold text-black dark:text-white underline decoration-zinc-400 dark:decoration-zinc-600 underline-offset-4 hover:decoration-black dark:hover:decoration-white transition-colors"
      >
        <span>{children}</span>
        <ExternalLink className="w-3 h-3 opacity-60 inline shrink-0" />
      </a>

      {/* Floating Hover Preview Card (Obsidian / Linear Style) */}
      {isOpen && (
        <span 
          className="absolute left-0 bottom-full mb-2 z-50 w-72 sm:w-80 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200/90 dark:border-zinc-800 shadow-2xl p-3.5 text-left pointer-events-auto animate-in fade-in zoom-in-95 duration-150 block"
          onMouseEnter={() => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {loading ? (
            <span className="flex items-center gap-2 py-4 justify-center text-xs text-gray-400 dark:text-zinc-500">
              <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-black dark:border-zinc-700 dark:border-t-white rounded-full animate-spin" />
              <span>Carregando preview...</span>
            </span>
          ) : data ? (
            <span className="block space-y-2">
              {/* Header: Favicon & Domain */}
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate pr-2">
                  {data.favicon ? (
                    <img src={data.favicon} alt="" className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  )}
                  <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 truncate">
                    {data.siteName || data.domain}
                  </span>
                </span>

                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 rounded-md text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Copiar link"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-md text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </span>

              {/* Title */}
              <span className="block font-bold text-xs text-gray-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                {data.title}
              </span>

              {/* Description */}
              {data.description && (
                <span className="block text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {data.description}
                </span>
              )}

              {/* Link URL info */}
              <span className="block text-[10px] text-gray-400 dark:text-zinc-500 font-mono truncate pt-1 border-t border-gray-100 dark:border-zinc-800">
                {href}
              </span>

              {/* GitHub Stars or Tags */}
              {data.details?.stars !== undefined && (
                <span className="flex items-center gap-1 pt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{data.details.stars.toLocaleString()} estrelas no GitHub</span>
                </span>
              )}
            </span>
          ) : (
            <span className="block text-xs text-gray-500 truncate">{href}</span>
          )}
        </span>
      )}
    </span>
  );
}
