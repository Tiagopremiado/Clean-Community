import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function linkPreviewPlugin() {
  return {
    name: 'link-preview-server',
    configureServer(server: any) {
      server.middlewares.use('/api/link-preview', async (req: any, res: any) => {
        try {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const targetUrl = urlObj.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing url' }));
            return;
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);

          const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; CleanBot/1.0; +https://clean.community)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });
          clearTimeout(timeout);

          const html = await response.text();

          const getMeta = (pattern: RegExp) => {
            const m = pattern.exec(html);
            return m ? m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim() : undefined;
          };

          const title = 
            getMeta(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
            getMeta(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
            getMeta(/<title[^>]*>([^<]+)<\/title>/i);

          const description = 
            getMeta(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
            getMeta(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i) ||
            getMeta(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

          let image = 
            getMeta(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
            getMeta(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);

          if (image && !image.startsWith('http')) {
            try {
              image = new URL(image, targetUrl).toString();
            } catch {}
          }

          const siteName = 
            getMeta(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            title: title || new URL(targetUrl).hostname,
            description: description || '',
            image,
            siteName
          }));
        } catch (e: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e?.message || 'Error fetching metadata' }));
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(), 
      linkPreviewPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'CLEAN Community',
          short_name: 'CLEAN',
          description: 'Um acervo vivo de recursos, ferramentas e prompts para criadores de IA.',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
