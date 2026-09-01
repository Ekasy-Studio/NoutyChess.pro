import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NoutyChess.pro — Jogue melhor',
  description: 'Xadrez moderno, competitivo e acessível para jogar contra a IA, com amigos ou online.',
  metadataBase: new URL('https://noutychess.pro'),
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  openGraph: {
    title: 'NoutyChess.pro — Jogue melhor',
    description: 'Seu próximo grande lance começa aqui.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'NoutyChess.pro — Feito pela Ekasy-Studio.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NoutyChess.pro — Jogue melhor',
    description: 'Seu próximo grande lance começa aqui.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
