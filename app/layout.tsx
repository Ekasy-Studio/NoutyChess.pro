import type { Metadata } from 'next';
import './globals.css';
import './enhancements.css';

export const metadata: Metadata = {
  title: 'NoutyChess.pro — Jogue melhor',
  description: 'Xadrez moderno, competitivo e acessível da Ekasy Studio, fundada por Thiago Roger Caldeira De Almeida.',
  metadataBase: new URL('https://noutychess.pro'),
  manifest: '/manifest.webmanifest',
  creator: 'Thiago Roger Caldeira De Almeida',
  publisher: 'Ekasy Studio',
  authors: [{ name: 'Thiago Roger Caldeira De Almeida', url: 'https://ekasystudio.com.br' }],
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  openGraph: {
    title: 'NoutyChess.pro — Jogue melhor',
    description: 'Seu próximo grande lance começa aqui. Um projeto da Ekasy Studio.',
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'NoutyChess.pro — Projeto da Ekasy Studio.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NoutyChess.pro — Jogue melhor',
    description: 'Seu próximo grande lance começa aqui. Um projeto da Ekasy Studio.',
    images: ['/og.jpg'],
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://ekasystudio.com.br/#organization',
  name: 'Ekasy Studio',
  url: 'https://ekasystudio.com.br/',
  founder: {
    '@type': 'Person',
    name: 'Thiago Roger Caldeira De Almeida',
    url: 'https://ekasystudio.com.br/fundador',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
      </body>
    </html>
  );
}