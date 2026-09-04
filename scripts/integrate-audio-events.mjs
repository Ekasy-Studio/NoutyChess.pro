import fs from 'node:fs';

const path = 'components/nouty-chess-game.tsx';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error(`Trecho esperado não encontrado: ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  "import { chatSafetyReason } from '@/lib/chat-safety';\n",
  "import { chatSafetyReason } from '@/lib/chat-safety';\nimport { frequenciesForGameSound, soundEventForMove, type GameSoundEvent } from '@/lib/game-audio';\n",
  'import de áudio',
);

replaceOnce(
`  const playTone = useCallback((move: Move) => {
    if (!audioEnabled || typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      const frequencies = move.san.includes('#') ? [640, 820] : move.san.includes('+') ? [520, 650] : move.captured ? [270, 190] : move.isKingsideCastle() || move.isQueensideCastle() ? [320, 430] : [360];
      frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index % 2 === 0 ? 'sine' : 'triangle';
        oscillator.frequency.value = frequency;
        const start = context.currentTime + index * 0.045;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.002, 0.045 * audioVolume), start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.13);
      });
    } catch {
      // Audio is optional and must never block a move.
    }
  }, [audioEnabled, audioVolume]);`,
`  const playGameSound = useCallback((event: GameSoundEvent) => {
    if (!audioEnabled || typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      const frequencies = frequenciesForGameSound(event);
      frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index % 2 === 0 ? 'sine' : 'triangle';
        oscillator.frequency.value = frequency;
        const start = context.currentTime + index * 0.045;
        const duration = event === 'victory' || event === 'defeat' || event === 'draw' ? 0.18 : 0.12;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.002, 0.045 * audioVolume), start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
      });
    } catch {
      // Audio é opcional e nunca pode bloquear uma jogada ou evento de rede.
    }
  }, [audioEnabled, audioVolume]);`,
  'função de áudio',
);

replaceOnce('    playTone(move);', '    playGameSound(soundEventForMove(move));', 'som por movimento');
replaceOnce(
  '  }, [clearAnnotations, finishFromPosition, forceRender, mode, playTone, teacher, timeControl]);',
  '  }, [clearAnnotations, finishFromPosition, forceRender, mode, playGameSound, teacher, timeControl]);',
  'dependência afterAppliedMove',
);

replaceOnce(
`      setOnlinePhase('connected');
      setRoomIsMatchmaking(false);
      setNetworkError('');
      if (alertsEnabled) setStatusMessage('Adversário conectado. Boa partida!');`,
`      setOnlinePhase('connected');
      setRoomIsMatchmaking(false);
      setNetworkError('');
      playGameSound('opponent-found');
      if (alertsEnabled) setStatusMessage('Adversário conectado. Boa partida!');`,
  'adversário encontrado',
);

replaceOnce(
`      if (data.type === 'chat' && typeof data.text === 'string') {
        const text = data.text.trim().slice(0, 280);
        if (text && !chatSafetyReason(text)) setChatMessages((messages) => [...messages.slice(-29), { id: crypto.randomUUID(), author: 'Adversário', text }]);
        else if (text) setNetworkError('Uma mensagem ofensiva do adversário foi bloqueada.');
        return;
      }`,
`      if (data.type === 'chat' && typeof data.text === 'string') {
        const text = data.text.trim().slice(0, 280);
        if (text && !chatSafetyReason(text)) {
          setChatMessages((messages) => [...messages.slice(-29), { id: crypto.randomUUID(), author: 'Adversário', text }]);
          playGameSound('message');
        } else if (text) setNetworkError('Uma mensagem ofensiva do adversário foi bloqueada.');
        return;
      }`,
  'som de mensagem',
);

replaceOnce(
  '  }, [afterAppliedMove, alertsEnabled, forceRender, localDisplayName, resetGame, timeControl]);',
  '  }, [afterAppliedMove, alertsEnabled, forceRender, localDisplayName, playGameSound, resetGame, timeControl]);',
  'dependência setupConnection',
);

const statsEffect = `  useEffect(() => {
    if (!outcome || resultRecordedRef.current || mode === 'menu') return;
    resultRecordedRef.current = true;
    setStats((current) => {
      const humanWon = outcome.winner === playerColor && mode !== 'local';
      const next = {
        games: current.games + 1,
        wins: current.wins + (humanWon ? 1 : 0),
        draws: current.draws + (outcome.winner === null ? 1 : 0),
      };
      localStorage.setItem('noutychess-stats-v1', JSON.stringify(next));
      return next;
    });
  }, [mode, outcome, playerColor]);`;

replaceOnce(
  statsEffect,
`${statsEffect}

  useEffect(() => {
    if (!outcome || mode === 'menu') return;
    if (outcome.kind !== 'timeout' && outcome.kind !== 'resignation' && outcome.kind !== 'agreement') return;
    if (outcome.winner === null) {
      playGameSound('draw');
      return;
    }
    if (mode === 'local' || outcome.winner === playerColor) playGameSound('victory');
    else playGameSound('defeat');
  }, [mode, outcome, playGameSound, playerColor]);`,
  'som de resultado não derivado de lance',
);

fs.writeFileSync(path, source);
console.log('Audio events integrated.');
