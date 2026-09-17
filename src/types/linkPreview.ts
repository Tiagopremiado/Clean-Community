export type LinkProviderType = 'github' | 'youtube' | 'npm' | 'twitter' | 'generic';

export interface LinkPreviewData {
  url: string;
  domain: string;
  title: string;
  description?: string;
  image?: string;
  screenshot?: string; // Captura em alta resolução do Hero / landing page
  favicon?: string;
  siteName?: string;
  provider: LinkProviderType;
  details?: {
    // GitHub
    stars?: number;
    forks?: number;
    language?: string;
    repoName?: string;
    owner?: string;
    license?: string;
    // YouTube
    videoId?: string;
    authorName?: string;
    // NPM
    version?: string;
    downloads?: string;
  };
}
