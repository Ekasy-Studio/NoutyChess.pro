import type { MetadataRoute } from 'next';

const base = 'https://noutychess.ekasy-studio.com.br';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/admin'] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
