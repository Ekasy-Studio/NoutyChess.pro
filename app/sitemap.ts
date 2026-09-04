import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://noutychess.pro';
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/clube`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/apoie`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/regras`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/termos`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacidade`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
