import { LinkPreviewData, LinkProviderType } from '../types/linkPreview';

// In-memory cache
const previewCache = new Map<string, LinkPreviewData>();
const CACHE_PREFIX = 'clean_link_preview_v2:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getHostname(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
}

function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

// Read from localStorage cache
function getStoredPreview(url: string): LinkPreviewData | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + url);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < CACHE_TTL_MS) {
      return data;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

// Save to localStorage cache
function setStoredPreview(url: string, data: LinkPreviewData): void {
  try {
    localStorage.setItem(CACHE_PREFIX + url, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore storage full errors
  }
}

/**
 * 1. Specialized GitHub Resolver
 */
async function resolveGitHub(url: string): Promise<LinkPreviewData | null> {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (!match) return null;

  const owner = match[1];
  const repo = match[2];

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) return null;
    const data = await res.json();

    return {
      url,
      domain: 'github.com',
      title: `${data.full_name}`,
      description: data.description || 'Repositório de código aberto no GitHub.',
      image: data.owner?.avatar_url || `https://opengraph.githubassets.com/1/${owner}/${repo}`,
      screenshot: `https://opengraph.githubassets.com/1/${owner}/${repo}`,
      favicon: 'https://github.githubassets.com/favicons/favicon.svg',
      siteName: 'GitHub',
      provider: 'github',
      details: {
        stars: data.stargazers_count,
        forks: data.forks_count,
        language: data.language,
        repoName: data.name,
        owner: data.owner?.login,
        license: data.license?.spdx_id || data.license?.name
      }
    };
  } catch {
    return null;
  }
}

/**
 * 2. Specialized YouTube Resolver
 */
async function resolveYouTube(url: string): Promise<LinkPreviewData | null> {
  let videoId: string | null = null;

  const standardMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (standardMatch) {
    videoId = standardMatch[1];
  }

  if (!videoId) return null;

  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const oembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      const highResThumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      return {
        url,
        domain: 'youtube.com',
        title: oembedData.title || 'Vídeo no YouTube',
        description: `Canal: ${oembedData.author_name || 'YouTube'} • Clique para assistir ao vídeo inline.`,
        image: oembedData.thumbnail_url || thumbnail,
        screenshot: highResThumb,
        favicon: 'https://www.youtube.com/s/desktop/favicon.ico',
        siteName: 'YouTube',
        provider: 'youtube',
        details: {
          videoId,
          authorName: oembedData.author_name
        }
      };
    }
  } catch {
    // Fallback if oembed fails
  }

  return {
    url,
    domain: 'youtube.com',
    title: 'Vídeo no YouTube',
    description: 'Assista a esta demonstração ou tutorial diretamente aqui.',
    image: thumbnail,
    screenshot: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    favicon: 'https://www.youtube.com/s/desktop/favicon.ico',
    siteName: 'YouTube',
    provider: 'youtube',
    details: {
      videoId
    }
  };
}

/**
 * 3. Specialized NPM Resolver
 */
async function resolveNPM(url: string): Promise<LinkPreviewData | null> {
  const match = url.match(/npmjs\.com\/package\/([^\/\?#]+)/);
  if (!match) return null;

  const pkgName = match[1];

  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const latestVersion = data['dist-tags']?.latest;

    return {
      url,
      domain: 'npmjs.com',
      title: `${data.name} (v${latestVersion || 'latest'})`,
      description: data.description || 'Pacote no registro oficial NPM.',
      image: 'https://static-production.npmjs.com/b0f1a83183bb2ff2b18133e90e6ecd50.png',
      screenshot: `https://image.thum.io/get/width/1200/crop/750/noanimate/${encodeURI(url)}`,
      favicon: 'https://static-production.npmjs.com/1996fcfdf7ca40ea735d64e0f6d29f3a.png',
      siteName: 'npm',
      provider: 'npm',
      details: {
        version: latestVersion,
        repoName: data.name
      }
    };
  } catch {
    return null;
  }
}

/**
 * 4. General OpenGraph & Hero Screenshot Resolver
 */
async function resolveOpenGraph(url: string): Promise<LinkPreviewData> {
  const domain = getHostname(url);
  const defaultFavicon = getFaviconUrl(domain);
  const directHeroScreenshot = `https://image.thum.io/get/width/1200/crop/750/noanimate/${encodeURI(url)}`;

  // Try Microlink with screenshot=true
  try {
    const microlinkRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&meta=true`);
    if (microlinkRes.ok) {
      const mlData = await microlinkRes.json();
      if (mlData.status === 'success' && mlData.data) {
        const d = mlData.data;
        const heroCapture = d.screenshot?.url || d.image?.url || directHeroScreenshot;
        return {
          url,
          domain,
          title: d.title || domain,
          description: d.description || '',
          image: d.image?.url || heroCapture,
          screenshot: heroCapture,
          favicon: d.logo?.url || defaultFavicon,
          siteName: d.publisher || domain,
          provider: 'generic'
        };
      }
    }
  } catch {
    // Continue to generic fallback
  }

  // Graceful fallback with direct website hero screenshot
  return {
    url,
    domain,
    title: domain,
    description: url,
    image: directHeroScreenshot,
    screenshot: directHeroScreenshot,
    favicon: defaultFavicon,
    siteName: domain,
    provider: 'generic'
  };
}

/**
 * Main Public Function: fetchLinkPreview
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreviewData> {
  // Normalize url
  const normalizedUrl = url.trim();

  // 1. Check in-memory cache
  if (previewCache.has(normalizedUrl)) {
    return previewCache.get(normalizedUrl)!;
  }

  // 2. Check localStorage cache
  const stored = getStoredPreview(normalizedUrl);
  if (stored) {
    previewCache.set(normalizedUrl, stored);
    return stored;
  }

  let result: LinkPreviewData | null = null;

  // 3. Provider detection
  if (normalizedUrl.includes('github.com')) {
    result = await resolveGitHub(normalizedUrl);
  } else if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
    result = await resolveYouTube(normalizedUrl);
  } else if (normalizedUrl.includes('npmjs.com')) {
    result = await resolveNPM(normalizedUrl);
  }

  // 4. Default to OpenGraph
  if (!result) {
    result = await resolveOpenGraph(normalizedUrl);
  }

  // Save to caches
  previewCache.set(normalizedUrl, result);
  setStoredPreview(normalizedUrl, result);

  return result;
}
