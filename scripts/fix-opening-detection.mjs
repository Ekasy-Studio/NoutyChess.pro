import fs from 'node:fs';

const path = 'lib/chess-knowledge.ts';
let source = fs.readFileSync(path, 'utf8');

const before = `export function detectOpening(history: string[]): OpeningLesson | null {
  if (history.length === 0) return null;
  let best: OpeningLesson | null = null;
  for (const opening of OPENING_LIBRARY) {
    const compared = Math.min(history.length, opening.moves.length);
    let matches = true;
    for (let index = 0; index < compared; index += 1) {
      if (history[index] !== opening.moves[index]) {
        matches = false;
        break;
      }
    }
    if (matches && compared >= 2 && (!best || opening.moves.length > best.moves.length)) best = opening;
  }
  return best;
}`;

const after = `export function detectOpening(history: string[]): OpeningLesson | null {
  if (history.length === 0) return null;
  let best: OpeningLesson | null = null;
  for (const opening of OPENING_LIBRARY) {
    // Não antecipe uma variante que ainda depende de lances futuros.
    // A abertura só recebe um nome quando toda a sequência mínima cadastrada
    // já apareceu no histórico recebido.
    if (history.length < opening.moves.length) continue;

    let matches = true;
    for (let index = 0; index < opening.moves.length; index += 1) {
      if (history[index] !== opening.moves[index]) {
        matches = false;
        break;
      }
    }
    if (matches && (!best || opening.moves.length > best.moves.length)) best = opening;
  }
  return best;
}`;

if (!source.includes(before)) throw new Error('Função detectOpening esperada não foi encontrada.');
source = source.replace(before, after);
fs.writeFileSync(path, source);
console.log('Opening detection updated.');
