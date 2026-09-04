import fs from 'node:fs';

function replaceOnce(content, before, after, label) {
  if (!content.includes(before)) throw new Error(`Bloco esperado não encontrado: ${label}`);
  return content.replace(before, after);
}

function replaceRegex(content, pattern, replacement, label) {
  if (!pattern.test(content)) throw new Error(`Bloco esperado não encontrado: ${label}`);
  return content.replace(pattern, replacement);
}

// Matchmaking: desempate total entre salas impede duas filas paralelas permanentes.
const competitivePath = 'lib/competitive.ts';
let competitive = fs.readFileSync(competitivePath, 'utf8');
competitive = replaceRegex(
  competitive,
  /export async function findAutomaticMatch\(user: ChatGPTUser\): Promise<\{ roomCode: string; role: 'guest' \} \| null> \{[\s\S]*?\n\}\n\nexport async function closeRoom/,
  `export async function findAutomaticMatch(user: ChatGPTUser, currentRoomCode?: string): Promise<{ roomCode: string; role: 'guest' } | null> {
  await ensureSchema();
  const profile = await getOrCreateProfile(user);
  if (profile.bannedUntil && profile.bannedUntil > Date.now()) throw new Error('Sua conta está temporariamente suspensa.');
  const d1 = getD1();
  const now = Date.now();
  const staleBefore = now - 90_000;
  await d1.prepare("UPDATE rooms SET status = 'closed', matchmaking = 0 WHERE matchmaking = 1 AND status = 'waiting' AND last_seen_at <= ?").bind(staleBefore).run();

  let ownRoom: { code: string; created_at: number } | null = null;
  if (currentRoomCode) {
    ownRoom = await d1.prepare(
      \`SELECT code, created_at FROM rooms
       WHERE code = ? AND host_id = ? AND matchmaking = 1 AND status = 'waiting'
         AND guest_id IS NULL AND last_seen_at > ?\`,
    ).bind(currentRoomCode, user.userId, staleBefore).first<{ code: string; created_at: number }>();
  } else {
    await d1.prepare(
      "UPDATE rooms SET status = 'closed', matchmaking = 0, last_seen_at = ? WHERE host_id = ? AND matchmaking = 1 AND status = 'waiting' AND guest_id IS NULL",
    ).bind(now, user.userId).run();
  }

  const candidates = ownRoom
    ? await d1.prepare(
      \`SELECT code, created_at FROM rooms
       WHERE matchmaking = 1 AND status = 'waiting' AND guest_id IS NULL
         AND host_id != ? AND last_seen_at > ?
         AND (created_at < ? OR (created_at = ? AND code < ?))
       ORDER BY created_at ASC, code ASC LIMIT 5\`,
    ).bind(user.userId, staleBefore, ownRoom.created_at, ownRoom.created_at, ownRoom.code).all<{ code: string; created_at: number }>()
    : await d1.prepare(
      \`SELECT code, created_at FROM rooms
       WHERE matchmaking = 1 AND status = 'waiting' AND guest_id IS NULL
         AND host_id != ? AND last_seen_at > ?
       ORDER BY created_at ASC, code ASC LIMIT 5\`,
    ).bind(user.userId, staleBefore).all<{ code: string; created_at: number }>();

  for (const candidate of candidates.results ?? []) {
    const result = await d1.prepare(
      \`UPDATE rooms SET guest_id = ?, status = 'playing', matchmaking = 0, last_seen_at = ?
       WHERE code = ? AND matchmaking = 1 AND guest_id IS NULL
         AND status = 'waiting' AND host_id != ? AND last_seen_at > ?\`,
    ).bind(user.userId, now, candidate.code, user.userId, staleBefore).run();
    if ((result.meta.changes ?? 0) === 1) {
      if (ownRoom && ownRoom.code !== candidate.code) {
        await d1.prepare(
          "UPDATE rooms SET status = 'closed', matchmaking = 0, last_seen_at = ? WHERE code = ? AND host_id = ? AND status = 'waiting' AND guest_id IS NULL",
        ).bind(now, ownRoom.code, user.userId).run();
      }
      return { roomCode: candidate.code, role: 'guest' };
    }
  }
  return null;
}

export async function closeRoom`,
  'matchmaking automático',
);
competitive = replaceOnce(
  competitive,
  `  if (!room || !room.guest_id) throw new Error('Sala competitiva inválida.');
  const expectedId = input.color === 'w' ? String(room.host_id) : String(room.guest_id);`,
  `  if (!room || !room.guest_id) throw new Error('Sala competitiva inválida.');
  if (room.status === 'terminated') throw new Error('Esta partida foi encerrada pela moderação.');
  const expectedId = input.color === 'w' ? String(room.host_id) : String(room.guest_id);`,
  'relatório de sala terminada',
);
fs.writeFileSync(competitivePath, competitive);

const routePath = 'app/api/competitive/route.ts';
let route = fs.readFileSync(routePath, 'utf8');
route = replaceOnce(
  route,
  `    if (body.action === 'find-match') {
      const match = await findAutomaticMatch(user);
      return NextResponse.json({ ok: true, match });
    }`,
  `    if (body.action === 'find-match') {
      const currentRoomCode = typeof body.currentRoomCode === 'string' ? body.currentRoomCode.toUpperCase() : '';
      if (currentRoomCode && !/^[A-Z2-9]{6}$/.test(currentRoomCode)) throw new Error('Sala de busca inválida.');
      const match = await findAutomaticMatch(user, currentRoomCode || undefined);
      return NextResponse.json({ ok: true, match });
    }`,
  'rota find-match',
);
fs.writeFileSync(routePath, route);

// Presença social sempre usa a sessão mais recente.
const friendsPath = 'app/api/friends/route.ts';
let friends = fs.readFileSync(friendsPath, 'utf8');
friends = replaceOnce(
  friends,
  `      d1.prepare(\`SELECT f.pair_key, p.user_id, p.display_name, p.avatar_emote, p.rating,
          CASE WHEN MAX(COALESCE(pp.last_seen_at, 0)) > ? THEN 1 ELSE 0 END AS online,
          pp.mode AS presence_mode
        FROM friendships f
        JOIN profiles p ON p.user_id = CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END
        LEFT JOIN player_presence pp ON pp.user_id = p.user_id
        WHERE (f.user_a = ? OR f.user_b = ?) AND f.status = 'accepted'
        GROUP BY f.pair_key, p.user_id
        ORDER BY p.display_name\`).bind(now - 45_000, user.userId, user.userId, user.userId).all(),`,
  `      d1.prepare(\`SELECT f.pair_key, p.user_id, p.display_name, p.avatar_emote, p.rating,
          CASE WHEN COALESCE((SELECT MAX(pp.last_seen_at) FROM player_presence pp WHERE pp.user_id = p.user_id), 0) > ? THEN 1 ELSE 0 END AS online,
          (SELECT pp.mode FROM player_presence pp WHERE pp.user_id = p.user_id ORDER BY pp.last_seen_at DESC LIMIT 1) AS presence_mode
        FROM friendships f
        JOIN profiles p ON p.user_id = CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END
        WHERE (f.user_a = ? OR f.user_b = ?) AND f.status = 'accepted'
        ORDER BY p.display_name\`).bind(now - 45_000, user.userId, user.userId, user.userId).all(),`,
  'presença da lista de amigos',
);
friends = replaceOnce(
  friends,
  `      const results = await d1.prepare(\`SELECT p.user_id, p.display_name, p.avatar_emote, p.rating,
          CASE WHEN MAX(COALESCE(pp.last_seen_at, 0)) > ? THEN 1 ELSE 0 END AS online,
          pp.mode AS presence_mode,
          f.status AS friendship_status,
          f.requested_by
        FROM profiles p
        LEFT JOIN player_presence pp ON pp.user_id = p.user_id
        LEFT JOIN friendships f ON f.pair_key = CASE
          WHEN ? < p.user_id THEN ? || ':' || p.user_id
          ELSE p.user_id || ':' || ?
        END
        WHERE p.user_id != ?
          AND p.display_name LIKE ? ESCAPE '\\\\' COLLATE NOCASE
        GROUP BY p.user_id
        ORDER BY CASE WHEN p.display_name = ? COLLATE NOCASE THEN 0 ELSE 1 END,
          p.display_name COLLATE NOCASE
        LIMIT 12\`)`,
  `      const results = await d1.prepare(\`SELECT p.user_id, p.display_name, p.avatar_emote, p.rating,
          CASE WHEN COALESCE((SELECT MAX(pp.last_seen_at) FROM player_presence pp WHERE pp.user_id = p.user_id), 0) > ? THEN 1 ELSE 0 END AS online,
          (SELECT pp.mode FROM player_presence pp WHERE pp.user_id = p.user_id ORDER BY pp.last_seen_at DESC LIMIT 1) AS presence_mode,
          f.status AS friendship_status,
          f.requested_by
        FROM profiles p
        LEFT JOIN friendships f ON f.pair_key = CASE
          WHEN ? < p.user_id THEN ? || ':' || p.user_id
          ELSE p.user_id || ':' || ?
        END
        WHERE p.user_id != ?
          AND p.display_name LIKE ? ESCAPE '\\\\' COLLATE NOCASE
        ORDER BY CASE WHEN p.display_name = ? COLLATE NOCASE THEN 0 ELSE 1 END,
          p.display_name COLLATE NOCASE
        LIMIT 12\`)`,
  'presença da busca de amigos',
);
fs.writeFileSync(friendsPath, friends);

// Cliente online.
const gamePath = 'components/nouty-chess-game.tsx';
let game = fs.readFileSync(gamePath, 'utf8');

game = replaceOnce(
  game,
  `  const resultRecordedRef = useRef(false);
  const matchReportedRef = useRef(false);
  const rightDragRef = useRef<Square | null>(null);`,
  `  const resultRecordedRef = useRef(false);
  const matchReportedRef = useRef(false);
  const timeoutDeclaredRef = useRef(false);
  const rightDragRef = useRef<Square | null>(null);`,
  'ref de timeout',
);
game = replaceOnce(
  game,
  `    resultRecordedRef.current = false;
    matchReportedRef.current = false;
    setMode(nextMode);`,
  `    resultRecordedRef.current = false;
    matchReportedRef.current = false;
    timeoutDeclaredRef.current = false;
    setMode(nextMode);`,
  'reset de timeout',
);
game = replaceOnce(
  game,
  `  const returnToMenu = useCallback(() => {
    if (mode === 'online') cleanupNetwork();
    gameTokenRef.current += 1;`,
  `  const returnToMenu = useCallback(() => {
    if (mode === 'online') {
      const validRoom = /^[A-Z2-9]{6}$/.test(roomCode);
      if (authenticatedUser && validRoom && onlinePhase === 'connected' && !currentOutcome) {
        const winner: Color = playerColor === 'w' ? 'b' : 'w';
        const result = winner === 'w' ? '1-0' : '0-1';
        chessRef.current.setHeader('Result', result);
        const pgn = chessRef.current.pgn({ maxWidth: 0, newline: '\\n' });
        if (connectionRef.current?.open) void connectionRef.current.send({ type: 'resign' });
        void fetch('/api/competitive', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'report-match', roomCode, color: playerColor, result, pgn }),
          keepalive: true,
        }).catch(() => undefined);
      }
      if (authenticatedUser && validRoom) {
        void fetch('/api/competitive', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'close-room', roomCode }),
          keepalive: true,
        }).catch(() => undefined);
      }
      cleanupNetwork();
    }
    gameTokenRef.current += 1;`,
  'fechamento de sala ao sair',
);
game = replaceOnce(
  game,
  `  }, [cleanupNetwork, clearAnnotations, forceRender, mode]);`,
  `  }, [authenticatedUser, cleanupNetwork, clearAnnotations, currentOutcome, forceRender, mode, onlinePhase, playerColor, roomCode]);`,
  'dependências de returnToMenu',
);
game = replaceOnce(
  game,
  `          chessRef.current = new Chess(data.fen);
          resultRecordedRef.current = false;
          setMode('online');`,
  `          chessRef.current = new Chess(data.fen);
          resultRecordedRef.current = false;
          matchReportedRef.current = false;
          timeoutDeclaredRef.current = false;
          setMode('online');`,
  'sync das refs',
);
game = replaceOnce(
  game,
  `      if (data.type === 'resign') {
        const winner: Color = role === 'host' ? 'w' : 'b';
        setOutcome({ kind: 'resignation', title: 'O adversário desistiu', detail: 'Você venceu a partida.', winner });
      }
      if (data.type === 'reject') setNetworkError('O adversário rejeitou o último lance por inconsistência de estado.');`,
  `      if (data.type === 'resign') {
        const winner: Color = role === 'host' ? 'w' : 'b';
        setOutcome({ kind: 'resignation', title: 'O adversário desistiu', detail: 'Você venceu a partida.', winner });
      }
      if (data.type === 'timeout' && !timeoutDeclaredRef.current) {
        timeoutDeclaredRef.current = true;
        const winner: Color = role === 'host' ? 'w' : 'b';
        setOutcome({ kind: 'timeout', title: 'Tempo esgotado', detail: 'O relógio do adversário chegou a zero. Você venceu.', winner });
      }
      if (data.type === 'reject') setNetworkError('O adversário rejeitou o último lance por inconsistência de estado.');`,
  'timeout remoto',
);
game = replaceRegex(
  game,
  /  const joinOnlineRoom = async \(codeOverride\?: string\) => \{([\s\S]*?)\n  \};\n\n  const findQuickMatch/,
  `  const joinOnlineRoom = useCallback(async (codeOverride?: string) => {$1
  }, [authenticatedUser, cleanupNetwork, competitiveRequest, joinCode, setupConnection]);

  const findQuickMatch`,
  'joinOnlineRoom useCallback',
);
game = replaceOnce(
  game,
  `  useEffect(() => {
    if (!authenticatedUser || mode !== 'online' || !outcome || !roomCode || matchReportedRef.current) return;`,
  `  useEffect(() => {
    if (!authenticatedUser || mode !== 'online' || onlinePhase !== 'waiting' || !roomIsMatchmaking || playerColor !== 'w' || !roomCode) return;
    let cancelled = false;
    const probe = async () => {
      try {
        const body = await competitiveRequest({ action: 'find-match', currentRoomCode: roomCode });
        const match = isRecord(body.match) && typeof body.match.roomCode === 'string' ? body.match.roomCode : null;
        if (!cancelled && match && match !== roomCode) await joinOnlineRoom(match);
      } catch (error) {
        if (!cancelled) setNetworkError(error instanceof Error ? error.message : 'Não foi possível atualizar a busca por partida.');
      }
    };
    const timer = window.setInterval(() => { void probe(); }, 3_500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [authenticatedUser, competitiveRequest, joinOnlineRoom, mode, onlinePhase, playerColor, roomCode, roomIsMatchmaking]);

  useEffect(() => {
    if (!authenticatedUser || mode !== 'online' || !outcome || !roomCode || matchReportedRef.current) return;`,
  'polling de matchmaking',
);
game = replaceOnce(
  game,
  `        if (next[turn] <= 0) {
          const winner: Color = turn === 'w' ? 'b' : 'w';
          setOutcome({
            kind: 'timeout',
            title: 'Tempo esgotado',
            detail: winner === 'w' ? 'As brancas venceram no relógio.' : 'As pretas venceram no relógio.',
            winner,
          });
        }`,
  `        if (next[turn] <= 0 && !timeoutDeclaredRef.current) {
          const mayDeclare = mode !== 'online' || turn === playerColor;
          if (mayDeclare) {
            timeoutDeclaredRef.current = true;
            const winner: Color = turn === 'w' ? 'b' : 'w';
            setOutcome({
              kind: 'timeout',
              title: 'Tempo esgotado',
              detail: winner === 'w' ? 'As brancas venceram no relógio.' : 'As pretas venceram no relógio.',
              winner,
            });
            if (mode === 'online' && connectionRef.current?.open) void connectionRef.current.send({ type: 'timeout' });
          }
        }`,
  'autoridade do relógio',
);
game = replaceOnce(
  game,
  `  }, [currentOutcome, mode, onlinePhase]);`,
  `  }, [currentOutcome, mode, onlinePhase, playerColor]);`,
  'dependências do relógio',
);
game = replaceOnce(
  game,
  `      {data.requests.map((request) => <div className="friend-alert" key={request.pair_key}><span>{request.avatar_emote}</span><div><strong>{request.display_name}</strong><small>{request.rating} Elo quer ser seu amigo</small></div><Button size="xs" onClick={() => void act('accept', { pairKey: request.pair_key })}><Heart /> Aceitar</Button></div>)}`,
  `      {data.requests.map((request) => <div className="friend-alert" key={request.pair_key}><span>{request.avatar_emote}</span><div><strong>{request.display_name}</strong><small>{request.rating} Elo quer ser seu amigo</small></div><Button size="xs" disabled={Boolean(busy)} onClick={() => void act('accept', { pairKey: request.pair_key })}><Heart /> Aceitar</Button><Button size="xs" variant="ghost" disabled={Boolean(busy)} onClick={() => void act('remove', { pairKey: request.pair_key })}>Recusar</Button></div>)}`,
  'recusar amizade',
);
fs.writeFileSync(gamePath, game);

if (fs.existsSync('scripts/finalize-gameplay.mjs')) fs.rmSync('scripts/finalize-gameplay.mjs');
console.log('Gameplay finalization patch applied.');
