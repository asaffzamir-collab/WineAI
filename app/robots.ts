import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dev/', '/auth/callback'],
    },
    sitemap: 'https://wine-ai-mu.vercel.app/sitemap.xml',
  };
}
