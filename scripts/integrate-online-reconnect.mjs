import fs from 'node:fs';

const path = 'components/nouty-chess-game.tsx';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Trecho esperado não encontrado: ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  "import { frequenciesForGameSound, soundEventForMove, type GameSoundEvent } from '@/lib/game-audio';\n",
  "import { frequenciesForGameSound, soundEventForMove, type GameSoundEvent } from '@/lib/game-audio';\nimport { createOnlineSyncPayload, restoreOnlineSyncPayload } from '@/lib/online-sync';\n",
  'import online sync',
);

replaceOnce(
`  const matchReportedRef = useRef(false);
  const timeoutDeclaredRef = useRef(false);
  const rightDragRef = useRef<Square | null>(null);`,
`  const matchReportedRef = useRef(false);
  const timeoutDeclaredRef = useRef(false);
  const hostSessionInitializedRef = useRef(false);
  const clocksRef = useRef({ w: 600, b: 600 });
  const rightDragRef = useRef<Square | null>(null);`,
  'refs de reconexão',
);

replaceOnce(
`    const increment = TIME_CONTROLS[timeControl].increment;
    if (increment > 0) setClocks((value) => ({ ...value, [move.color]: value[move.color] + increment }));`,
`    const increment = TIME_CONTROLS[timeControl].increment;
    if (increment > 0) setClocks((value) => {
      const next = { ...value, [move.color]: value[move.color] + increment };
      clocksRef.current = next;
      return next;
    });`,
  'incremento do relógio',
);

replaceOnce(
`    setTeacherChat([]);
    setClocks({ w: TIME_CONTROLS[timeControl].seconds, b: TIME_CONTROLS[timeControl].seconds });
    setStatusMessage('Vez das brancas.');`,
`    setTeacherChat([]);
    const nextClocks = { w: TIME_CONTROLS[timeControl].seconds, b: TIME_CONTROLS[timeControl].seconds };
    clocksRef.current = nextClocks;
    setClocks(nextClocks);
    setStatusMessage('Vez das brancas.');`,
  'reset de relógios',
);

replaceOnce(
`    peerRef.current?.destroy();
    peerRef.current = null;
    setOnlinePhase('idle');`,
`    peerRef.current?.destroy();
    peerRef.current = null;
    hostSessionInitializedRef.current = false;
    setOnlinePhase('idle');`,
  'cleanup de sessão host',
);

replaceOnce(
`      if (role === 'host') {
        resetGame('online', 'w');
        void connection.send({ type: 'sync', protocol: 1, fen: chessRef.current.fen(), displayName: localDisplayName.slice(0, 24) });
      } else {`,
`      if (role === 'host') {
        if (!hostSessionInitializedRef.current) {
          resetGame('online', 'w');
          hostSessionInitializedRef.current = true;
        }
        void connection.send(createOnlineSyncPayload(chessRef.current, clocksRef.current, localDisplayName));
      } else {`,
  'sync do host',
);

const oldSync = `      if (data.type === 'sync' && role === 'guest' && data.protocol === 1 && typeof data.fen === 'string' && data.fen.length <= 100) {
        try {
          if (typeof data.displayName === 'string') {
            const name = data.displayName.replace(/[<>\\u0000-\\u001f]/g, '').trim().slice(0, 24);
            if (name) setRemoteName(name);
          }
          chessRef.current = new Chess(data.fen);
          resultRecordedRef.current = false;
          matchReportedRef.current = false;
          timeoutDeclaredRef.current = false;
          setMode('online');
          setPlayerColor('b');
          setOrientation('b');
          setOutcome(null);
          setClocks({ w: TIME_CONTROLS[timeControl].seconds, b: TIME_CONTROLS[timeControl].seconds });
          setOnlinePhase('connected');
          setStatusMessage('Conectado. Vez das brancas.');
          forceRender();
        } catch {
          setNetworkError('O adversário enviou uma posição inválida.');
          connection.close();
        }
        return;
      }`;

const newSync = `      if (data.type === 'sync' && role === 'guest') {
        const restored = restoreOnlineSyncPayload(data);
        if (!restored) {
          setNetworkError('O adversário enviou uma sincronização inválida.');
          connection.close();
          return;
        }
        setRemoteName(restored.displayName);
        chessRef.current = restored.chess;
        resultRecordedRef.current = false;
        matchReportedRef.current = false;
        timeoutDeclaredRef.current = false;
        setMode('online');
        setPlayerColor('b');
        setOrientation('b');
        setOutcome(null);
        const restoredClocks = restored.clocks ?? { w: TIME_CONTROLS[timeControl].seconds, b: TIME_CONTROLS[timeControl].seconds };
        clocksRef.current = restoredClocks;
        setClocks(restoredClocks);
        setOnlinePhase('connected');
        setNetworkError('');
        setStatusMessage(restored.chess.history().length > 0 ? 'Reconectado. Partida restaurada.' : 'Conectado. Vez das brancas.');
        forceRender();
        return;
      }`;
replaceOnce(oldSync, newSync, 'restauração do convidado');

replaceOnce(
`    connection.on('close', () => {
      setOnlinePhase('disconnected');
      setStatusMessage('A conexão com o adversário foi encerrada.');
    });
    connection.on('error', () => {
      setOnlinePhase('error');
      setNetworkError('Não foi possível manter a conexão da sala.');
    });`,
`    connection.on('close', () => {
      setOnlinePhase('disconnected');
      setNetworkError('Conexão interrompida. A partida foi preservada para reconexão.');
      setStatusMessage(role === 'host' ? 'Aguardando o adversário reconectar…' : 'Reconecte para continuar a mesma partida.');
    });
    connection.on('error', () => {
      setOnlinePhase('disconnected');
      setNetworkError('A conexão caiu, mas a partida continua preservada.');
    });`,
  'estado de desconexão',
);

replaceOnce(
`  const createOnlineRoom = async (matchmaking = false) => {
    cleanupNetwork();
    setPlayerColor('w');`,
`  const createOnlineRoom = async (matchmaking = false) => {
    cleanupNetwork();
    hostSessionInitializedRef.current = false;
    setPlayerColor('w');`,
  'inicialização host',
);

replaceOnce(
`      peer.on('connection', (connection) => setupConnection(connection, 'host'));
      peer.on('error', () => {`,
`      peer.on('connection', (connection) => setupConnection(connection, 'host'));
      peer.on('disconnected', () => {
        setOnlinePhase('disconnected');
        setNetworkError('O serviço online desconectou. Tente reconectar sem sair da partida.');
      });
      peer.on('error', () => {`,
  'peer host disconnected',
);

replaceOnce(
`      peer.on('error', () => {
        setOnlinePhase('error');
        setNetworkError('Sala inexistente ou serviço online indisponível.');
      });`,
`      peer.on('disconnected', () => {
        setOnlinePhase('disconnected');
        setNetworkError('Sua conexão com a sala caiu. Reconecte para continuar.');
      });
      peer.on('error', () => {
        setOnlinePhase('error');
        setNetworkError('Sala inexistente ou serviço online indisponível.');
      });`,
  'peer convidado disconnected',
);

const quickMatchAnchor = `  const findQuickMatch = async () => {`;
const reconnectBlock = `  const reconnectOnline = useCallback(async () => {
    const code = safeRoomCode(roomCode);
    if (mode !== 'online' || code.length !== 6) return;
    setNetworkError('');
    if (playerColor === 'b') {
      await joinOnlineRoom(code);
      return;
    }

    const peer = peerRef.current;
    if (!peer || peer.destroyed) {
      setNetworkError('A sala do host foi encerrada. Crie uma nova sala para continuar jogando.');
      return;
    }
    try {
      if (peer.disconnected) peer.reconnect();
      setOnlinePhase('waiting');
      setStatusMessage('Sala reaberta. Aguardando o adversário reconectar…');
      if (authenticatedUser) {
        await competitiveRequest({ action: 'heartbeat', roomCode: code, role: 'host', matchmaking: false });
      }
    } catch (error) {
      setOnlinePhase('disconnected');
      setNetworkError(error instanceof Error ? error.message : 'Não foi possível reabrir a sala.');
    }
  }, [authenticatedUser, competitiveRequest, joinOnlineRoom, mode, playerColor, roomCode]);

`;
replaceOnce(quickMatchAnchor, reconnectBlock + quickMatchAnchor, 'função de reconexão');

replaceOnce(
`    if (!authenticatedUser || mode !== 'online' || !roomCode || (onlinePhase !== 'waiting' && onlinePhase !== 'connected')) return;`,
`    if (!authenticatedUser || mode !== 'online' || !roomCode || (onlinePhase !== 'waiting' && onlinePhase !== 'connected' && onlinePhase !== 'disconnected')) return;`,
  'heartbeat durante desconexão',
);

replaceOnce(
`        const next = { ...current, [turn]: Math.max(0, current[turn] - elapsed) };
        if (next[turn] <= 0 && !timeoutDeclaredRef.current) {`,
`        const next = { ...current, [turn]: Math.max(0, current[turn] - elapsed) };
        clocksRef.current = next;
        if (next[turn] <= 0 && !timeoutDeclaredRef.current) {`,
  'clock ref durante partida',
);

replaceOnce(
`                  onJoin={() => void joinOnlineRoom()}
                  onCancel={returnToMenu}`,
`                  onJoin={() => void joinOnlineRoom()}
                  onReconnect={() => void reconnectOnline()}
                  onCancel={returnToMenu}`,
  'prop onReconnect',
);

replaceOnce(
`function OnlineLobby({ phase, roomCode, joinCode, setJoinCode, error, authenticated, signInPath, guestName, setGuestName, matchmaking, onQuickMatch, onCreate, onJoin, onCancel }: {`,
`function OnlineLobby({ phase, roomCode, joinCode, setJoinCode, error, authenticated, signInPath, guestName, setGuestName, matchmaking, onQuickMatch, onCreate, onJoin, onReconnect, onCancel }: {`,
  'assinatura lobby',
);

replaceOnce(
`  onJoin: () => void;
  onCancel: () => void;`,
`  onJoin: () => void;
  onReconnect: () => void;
  onCancel: () => void;`,
  'tipo onReconnect',
);

replaceOnce(
`      {phase === 'waiting' ? (
        <>`,
`      {phase === 'disconnected' && roomCode ? (
        <div className="room-code-card reconnect-card">
          <small>PARTIDA PRESERVADA</small><strong>{roomCode}</strong>
          <p>Seu tabuleiro e o histórico continuam intactos. Reconecte usando a mesma sala.</p>
          <Button onClick={onReconnect}><Wifi /> Reconectar partida</Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>Sair da partida</Button>
        </div>
      ) : phase === 'waiting' ? (
        <>`,
  'card de reconexão',
);

fs.writeFileSync(path, source);
console.log('Online reconnect integration applied.');
