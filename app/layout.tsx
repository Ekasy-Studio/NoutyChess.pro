import type { Metadata } from 'next';
import './globals.css';
import './enhancements.css';

const publicUrl = 'https://noutychess.ekasy-studio.com.br';

export const metadata: Metadata = {
  title: {
    default: 'NoutyChess',
    template: '%s | NoutyChess',
  },
  description: 'Xadrez moderno, competitivo e acessível da Ekasy Studio.',
  metadataBase: new URL(publicUrl),
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  creator: 'Ekasy Studio',
  publisher: 'Ekasy Studio',
  authors: [{ name: 'Ekasy Studio', url: 'https://ekasy-studio.com.br' }],
  applicationName: 'NoutyChess',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  openGraph: {
    title: 'NoutyChess',
    description: 'Seu próximo grande lance começa aqui. Jogue, evolua e desafie seus amigos.',
    type: 'website',
    siteName: 'NoutyChess',
    url: '/',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'NoutyChess' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NoutyChess',
    description: 'Seu próximo grande lance começa aqui.',
    images: ['/og.jpg'],
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://ekasy-studio.com.br/#organization',
  name: 'Ekasy Studio',
  url: 'https://ekasy-studio.com.br/',
};

const gameSchema = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'NoutyChess',
  url: publicUrl,
  applicationCategory: 'Game',
  operatingSystem: 'Web',
  publisher: {
    '@type': 'Organization',
    name: 'Ekasy Studio',
    url: 'https://ekasy-studio.com.br/',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationSchema, gameSchema]) }}
        />
        {children}
      </body>
    </html>
  );
}
