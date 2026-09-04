import fs from 'node:fs';

const manifestPath = 'public/manifest.webmanifest';
const layoutPath = 'app/layout.tsx';

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.id = '/';
manifest.lang = 'pt-BR';
manifest.dir = 'ltr';
manifest.categories = ['games', 'entertainment'];
manifest.prefer_related_applications = false;
manifest.icons = [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
];
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

let layout = fs.readFileSync(layoutPath, 'utf8');
const before = "  icons: { icon: '/icon.svg', apple: '/icon.svg' },";
const after = "  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },";
if (!layout.includes(before)) throw new Error('Metadata de ícones esperada não foi encontrada.');
layout = layout.replace(before, after);
fs.writeFileSync(layoutPath, layout);

console.log('PWA manifest and Apple icon metadata updated.');
