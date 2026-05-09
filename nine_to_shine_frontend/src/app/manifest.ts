import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nine to Shine',
    short_name: 'N2S',
    description: 'we have a name now :)',
    start_url: '/',
    display: 'standalone',
    background_color: '#0496FF',
    theme_color: '#0496FF',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
