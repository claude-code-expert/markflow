import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MarkFlow — 팀 지식 관리 플랫폼',
    short_name: 'MarkFlow',
    description: '마크다운 기반 팀 지식 관리 플랫폼',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a56db',
    icons: [
      {
        src: '/markflow-icon-32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/markflow-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/markflow-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
