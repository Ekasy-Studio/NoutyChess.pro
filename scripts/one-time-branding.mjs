import { readFile, writeFile } from 'node:fs/promises';

const path = 'components/nouty-chess-game.tsx';
const before = await readFile(path, 'utf8');
const after = before
  .replaceAll('https://noutychess.pro', 'https://noutychess.ekasy-studio.com.br')
  .replaceAll('NoutyChess.pro', 'NoutyChess');

if (after === before) {
  console.log('Nenhuma substituição necessária.');
} else {
  await writeFile(path, after, 'utf8');
  console.log('Branding e domínio atualizados no componente principal.');
}
