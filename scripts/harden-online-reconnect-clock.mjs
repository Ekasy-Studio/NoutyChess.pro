import fs from 'node:fs';

const path = 'components/nouty-chess-game.tsx';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Trecho esperado não encontrado: ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  "import { createOnlineSyncPayload, restoreOnlineSyncPayload } from '@/lib/online-sync';\n",
  "import { createOnlineSyncPayload, restoreOnlineSyncPayload } from '@/lib/online-sync';\nimport { shouldAdvanceOnlineClock } from '@/lib/online-clock';\n",
  'import do relógio online',
);

replaceOnce(
`      peer.on('disconnected', () => {
        setOnlinePhase('disconnected');
        setNetworkError('O serviço online desconectou. Tente reconectar sem sair da partida.');
      });
      peer.on('error', () => {
        setOnlinePhase('error');
        setNetworkError('O serviço de salas está indisponível. O jogo local continua funcionando.');
      });`,
`      peer.on('disconnected', () => {
        if (connectionRef.current?.open) {
          setNetworkError('O serviço de salas perdeu o sinal, mas a partida P2P continua conectada.');
          return;
        }
        setOnlinePhase('disconnected');
        setNetworkError('O serviço online desconectou. Tente reconectar sem sair da partida.');
      });
      peer.on('error', () => {
        if (connectionRef.current?.open) {
          setNetworkError('O serviço de salas está instável, mas a partida atual continua conectada.');
          return;
        }
        setOnlinePhase('error');
        setNetworkError('O serviço de salas está indisponível. O jogo local continua funcionando.');
      });`,
  'eventos Peer do host',
);

replaceOnce(
`      peer.on('disconnected', () => {
        setOnlinePhase('disconnected');
        setNetworkError('Sua conexão com a sala caiu. Reconecte para continuar.');
      });
      peer.on('error', () => {
        setOnlinePhase('error');
        setNetworkError('Sala inexistente ou serviço online indisponível.');
      });`,
`      peer.on('disconnected', () => {
        if (connectionRef.current?.open) {
          setNetworkError('O serviço de salas perdeu o sinal, mas a partida P2P continua conectada.');
          return;
        }
        setOnlinePhase('disconnected');
        setNetworkError('Sua conexão com a sala caiu. Reconecte para continuar.');
      });
      peer.on('error', () => {
        if (connectionRef.current?.open) {
          setNetworkError('O serviço de salas está instável, mas a partida atual continua conectada.');
          return;
        }
        setOnlinePhase('error');
        setNetworkError('Sala inexistente ou serviço online indisponível.');
      });`,
  'eventos Peer do convidado',
);

replaceOnce(
`  useEffect(() => {
    if (mode === 'menu' || currentOutcome || (mode === 'online' && onlinePhase !== 'connected')) return;`,
`  useEffect(() => {
    if (mode === 'menu' || currentOutcome) return;
    if (mode === 'online' && !shouldAdvanceOnlineClock(onlinePhase, playerColor)) return;`,
  'regra de avanço do relógio',
);

replaceOnce(
`          const mayDeclare = mode !== 'online' || turn === playerColor;`,
`          const mayDeclare = mode !== 'online' || (onlinePhase === 'connected' && turn === playerColor);`,
  'declaração de timeout somente conectado',
);

fs.writeFileSync(path, source);
console.log('Online reconnect and clock behavior hardened.');
