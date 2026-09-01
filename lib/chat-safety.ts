const BLOCKED_TERMS = [
  'idiota', 'imbecil', 'babaca', 'otario', 'otaria', 'burro', 'burra', 'lixo',
  'merda', 'porra', 'caralho', 'desgracado', 'desgracada', 'fdp', 'puta',
  'racista', 'nazista', 'retardado', 'retardada', 'kill yourself', 'kys',
];

function normalized(value: string): string {
  return value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll('0', 'o')
    .replaceAll('1', 'i')
    .replaceAll('3', 'e')
    .replaceAll('4', 'a')
    .replaceAll('5', 's')
    .replaceAll('7', 't')
    .replace(/[^a-z\s]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1');
}

export function chatSafetyReason(message: string): string | null {
  const compact = normalized(message);
  const joined = compact.replace(/\s+/g, '');
  if (BLOCKED_TERMS.some((term) => {
    const safeTerm = normalized(term);
    return compact.includes(safeTerm) || joined.includes(safeTerm.replace(/\s+/g, ''));
  })) return 'Mensagem bloqueada por linguagem ofensiva.';
  if (/(https?:\/\/|www\.)/i.test(message)) return 'Links não são permitidos no chat da partida.';
  return null;
}
