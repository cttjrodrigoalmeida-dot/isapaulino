// Tipos do CMS — espelham a interface BlogPost para compatibilidade total

export interface CMSPost {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  date: string;
  readTime: string;
  coverImage: string;
  coverImageAlt?: string;
  featured?: boolean;
  content?: string;
  // SEO
  seoTitle?: string;
  metaDescription?: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
}

export interface PublishResult {
  success: boolean;
  message: string;
  commitUrl?: string;
}

export type CMSView = "dashboard" | "new" | "edit";

export interface SEOScore {
  score: number;
  checks: SEOCheck[];
}

export interface SEOCheck {
  label: string;
  passed: boolean;
  tip: string;
}
