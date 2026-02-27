import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WineJourney',
    short_name: 'WineJourney',
    description: 'Your personal wine companion — discover, collect, and explore wines tailored to your taste.',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FDF8F0',
    theme_color: '#5A1E2A',
    orientation: 'portrait',
    categories: ['food', 'lifestyle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', form_factor: 'narrow' } as any,
    ],
  };
}
