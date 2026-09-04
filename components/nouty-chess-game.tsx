'use client';

import {
  Award,
  Bell,
  BellOff,
  Bot,
  BookOpen,
  Check,
  ChevronLeft,
  CircleUserRound,
  Clock3,
  Copy,
  Crown,
  Eraser,
  Flag,
  FlipHorizontal2,
  Gamepad2,
  Globe2,
  Handshake,
  Heart,
  History,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Medal,
  MessageCircle,
  MonitorCog,
  Palette,
  PenLine,
  RotateCcw,
  Search,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  ShoppingBag,
  Target,
  TrendingUp,
  Trophy,
  Undo2,
  UserPlus,
  UsersRound,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import Link from 'next/link';
import type { DataConnection, Peer } from 'peerjs';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { chooseAiMove, type AiDifficulty, type AiPersonality } from '@/lib/chess-ai';
import { chatSafetyReason } from '@/lib/chat-safety';
import type { CompetitiveProfile, LeaderboardEntry } from '@/lib/competitive';
import {
  applyValidatedNetworkMove,
  evaluateOutcome,
  positionKey,
  type GameOutcome,
  type NetworkMove,
} from '@/lib/chess-engine';

type GameMode = 'menu' | 'computer' | 'local' | 'online';
type OnlinePhase = 'idle' | 'connecting' | 'waiting' | 'connected' | 'disconnected' | 'error';
type MatchOutcome = GameOutcome | {
  kind: 'timeout' | 'resignation' | 'agreement';
  title: string;
  detail: string;
  winner: Color | null;
};
type ChatMessage = { id: string; author: 'Você' | 'Adversário'; text: string };
type TeacherChatMessage = { id: string; author: 'Você' | 'Professor'; text: string };
type PendingPromotion = { from: Square; to: Square };
type BoardArrow = { from: Square; to: Square };
type TimeControlId = 'blitz' | 'rapid' | 'classic';
type TeachingLevel = 'beginner' | 'intermediate' | 'advanced';

const TIME_CONTROLS: Record<TimeControlId, { label: string; hint: string; seconds: number; increment: number }> = {
  blitz: { label: '5 min', hint: 'Rápida', seconds: 300, increment: 0 },
  rapid: { label: '10 min', hint: 'Recomendada', seconds: 600, increment: 0 },
  classic: { label: '15 + 10', hint: 'Pensada', seconds: 900, increment: 10 },
};

const PIECE_GLYPHS: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const PIECE_NAMES: Record<PieceSymbol, string> = {
  k: 'rei', q: 'dama', r: 'torre', b: 'bispo', n: 'cavalo', p: 'peão',
};

const DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  easy: 'Iniciante', medium: 'Intermediário', hard: 'Avançado', expert: 'Lendário',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const GENERAL_WHATSAPP_TEXT = encodeURIComponent('♟️ Vem jogar xadrez comigo no NoutyChess! https://noutychess.pro');

function allSquares(): Square[] {
  return RANKS.flatMap((rank) => FILES.map((file) => `${file}${rank}` as Square));
}

function formatClock(totalSeconds: number): string {
  const value = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function safeRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function createRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isSquareDark(square: Square): boolean {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return (file + rank) % 2 === 1;
}

function squareCenter(square: Square, orientation: Color) {
  const file = square.charCodeAt(0) - 97;
  const rankFromTop = 8 - Number(square[1]);
  const column = orientation === 'w' ? file : 7 - file;
  const row = orientation === 'w' ? rankFromTop : 7 - rankFromTop;
  return { x: (column + 0.5) * 12.5, y: (row + 0.5) * 12.5 };
}

function coachLine(personality: AiPersonality, move: Move): string {
  const tactical = move.san.includes('#') ? 'mate' : move.san.includes('+') ? 'check' : move.captured ? 'capture' : move.isKingsideCastle() || move.isQueensideCastle() ? 'castle' : 'quiet';
  const lines: Record<AiPersonality, Record<typeof tactical, string[]>> = {
    niclaus: {
      mate: ['Mate encontrado. Sempre procure primeiro os lances forçados.'],
      check: ['Um xeque muda as prioridades da posição. Calcule a resposta antes de seguir.'],
      capture: ['A troca altera o equilíbrio material. Confira sempre a recaptura.'],
      castle: ['Boa decisão: desenvolvimento e segurança do rei caminham juntos.'],
      quiet: ['Observe o centro, a peça menos ativa e a segurança dos dois reis.'],
    },
    damon: {
      mate: ['Fim da conversa. O rei já entendeu antes de você.'],
      check: ['Xeque. Nada pessoal. Reis só odeiam surpresas.'],
      capture: ['Uma peça saiu do tabuleiro. Espero que você tenha calculado o troco.'],
      castle: ['Finalmente o rei encontrou um esconderijo minimamente aceitável.'],
      quiet: ['Um lance discreto. Ou brilhante. Ou suspeito. Vamos descobrir.'],
    },
  };
  const options = lines[personality][tactical];
  return options[Math.floor(Math.random() * options.length)];
}

function divisionClient(rating: number) {
  if (rating < 1000) return { name: 'Bronze', floor: 0, ceiling: 999 };
  if (rating < 1300) return { name: 'Prata', floor: 1000, ceiling: 1299 };
  if (rating < 1600) return { name: 'Ouro', floor: 1300, ceiling: 1599 };
  if (rating < 1900) return { name: 'Platina', floor: 1600, ceiling: 1899 };
  if (rating < 2200) return { name: 'Diamante', floor: 1900, ceiling: 2199 };
  if (rating < 2500) return { name: 'Mestre', floor: 2200, ceiling: 2499 };
  return { name: 'Lendário', floor: 2500, ceiling: 3000 };
}

function levelFromDifficulty(difficulty: AiDifficulty): TeachingLevel {
  if (difficulty === 'hard' || difficulty === 'expert') return 'advanced';
  if (difficulty === 'medium') return 'intermediate';
  return 'beginner';
}

type NoutyChessGameProps = {
  authenticatedUser: { displayName: string; email: string } | null;
  initialProfile: CompetitiveProfile | null;
  initialLeaderboard: LeaderboardEntry[];
  signInPath: string;
};

export function NoutyChessGame({ authenticatedUser, initialProfile, initialLeaderboard, signInPath }: NoutyChessGameProps) {
  const chessRef = useRef(new Chess());
  const gameTokenRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const resultRecordedRef = useRef(false);
  const matchReportedRef = useRef(false);
  const timeoutDeclaredRef = useRef(false);
  const rightDragRef = useRef<Square | null>(null);

  const [revision, setRevision] = useState(0);
  const [mode, setMode] = useState<GameMode>('menu');
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [outcome, setOutcome] = useState<MatchOutcome | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [difficulty, setDifficulty] = useState<AiDifficulty>('medium');
  const [teacher, setTeacher] = useState<AiPersonality>('niclaus');
  const [coachMessage, setCoachMessage] = useState('Escolha seu professor e comece a treinar.');
  const [teacherQuestion, setTeacherQuestion] = useState('');
  const [teacherChat, setTeacherChat] = useState<TeacherChatMessage[]>([]);
  const [teacherChatBusy, setTeacherChatBusy] = useState(false);
  const [timeControl, setTimeControl] = useState<TimeControlId>('rapid');
  const [clocks, setClocks] = useState({ w: 600, b: 600 });
  const [orientation, setOrientation] = useState<Color>('w');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0.65);
  const [showLegalMoves, setShowLegalMoves] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showLastMove, setShowLastMove] = useState(true);
  const [showThreats, setShowThreats] = useState(false);
  const [beginnerGuide, setBeginnerGuide] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Escolha um modo para começar.');
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [onlinePhase, setOnlinePhase] = useState<OnlinePhase>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [roomIsMatchmaking, setRoomIsMatchmaking] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [networkError, setNetworkError] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [drawOffer, setDrawOffer] = useState(false);
  const [, setStats] = useState({ games: 0, wins: 0, draws: 0 });
  const [guestName, setGuestName] = useState('Convidado');
  const [remoteName, setRemoteName] = useState('Adversário');
  const [competitiveProfile, setCompetitiveProfile] = useState(initialProfile);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(initialProfile?.displayName ?? authenticatedUser?.displayName ?? 'Jogador');
  const [profileEmote, setProfileEmote] = useState(initialProfile?.avatarEmote ?? '♘');
  const [profileTitle, setProfileTitle] = useState(initialProfile?.profileTitle ?? 'Desafiante');
  const [boardTheme, setBoardTheme] = useState(initialProfile?.boardTheme ?? 'emerald');
  const [pieceTheme, setPieceTheme] = useState(initialProfile?.pieceTheme ?? 'classic');
  const [profileError, setProfileError] = useState('');
  const [annotationMode, setAnnotationMode] = useState(false);
  const [annotationStart, setAnnotationStart] = useState<Square | null>(null);
  const [markedSquares, setMarkedSquares] = useState<Set<Square>>(() => new Set());
  const [boardArrows, setBoardArrows] = useState<BoardArrow[]>([]);
  const localDisplayName = competitiveProfile?.displayName || guestName.trim() || 'Convidado';

  const chess = chessRef.current;
  const history = chess.history({ verbose: true });
  const lastMove = history.at(-1) ?? null;
  const currentOutcome = outcome ?? evaluateOutcome(chess);
  const legalTargets = useMemo(() => {
    void revision;
    if (!selected) return new Map<Square, Move[]>();
    const map = new Map<Square, Move[]>();
    chessRef.current.moves({ square: selected, verbose: true }).forEach((move) => {
      map.set(move.to, [...(map.get(move.to) ?? []), move]);
    });
    return map;
  }, [selected, revision]);

  const checkedKing = useMemo(() => {
    void revision;
    if (!chessRef.current.inCheck()) return null;
    const color = chessRef.current.turn();
    for (const rank of chessRef.current.board()) {
      const king = rank.find((piece) => piece?.type === 'k' && piece.color === color);
      if (king) return king.square;
    }
    return null;
  }, [revision]);

  const captured: Record<Color, PieceSymbol[]> = { w: [], b: [] };
  history.forEach((move) => {
    if (move.captured) captured[move.color].push(move.captured);
  });

  const boardSquares = useMemo(() => {
    const squares = allSquares();
    return orientation === 'w' ? squares : squares.reverse();
  }, [orientation]);

  const forceRender = useCallback(() => setRevision((value) => value + 1), []);

  const clearAnnotations = useCallback(() => {
    setAnnotationStart(null);
    setMarkedSquares(new Set());
    setBoardArrows([]);
  }, []);

  const toggleMarkedSquare = useCallback((square: Square) => {
    setMarkedSquares((current) => {
      const next = new Set(current);
      if (next.has(square)) next.delete(square);
      else next.add(square);
      return next;
    });
  }, []);

  const toggleArrow = useCallback((from: Square, to: Square) => {
    if (from === to) {
      toggleMarkedSquare(from);
      return;
    }
    setBoardArrows((current) => current.some((arrow) => arrow.from === from && arrow.to === to)
      ? current.filter((arrow) => arrow.from !== from || arrow.to !== to)
      : [...current, { from, to }].slice(-12));
  }, [toggleMarkedSquare]);

  const playTone = useCallback((move: Move) => {
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
  }, [audioEnabled, audioVolume]);

  const finishFromPosition = useCallback(() => {
    const result = evaluateOutcome(chessRef.current);
    if (result) {
      setOutcome(result);
      setStatusMessage(result.title);
    } else if (chessRef.current.inCheck()) {
      setStatusMessage(beginnerGuide ? 'Xeque! Seu rei está atacado e precisa ser defendido.' : 'Xeque.');
    } else {
      setStatusMessage(chessRef.current.turn() === 'w' ? 'Vez das brancas.' : 'Vez das pretas.');
    }
  }, [beginnerGuide]);

  const afterAppliedMove = useCallback((move: Move, origin: 'local' | 'remote', previousPosition: string) => {
    const increment = TIME_CONTROLS[timeControl].increment;
    if (increment > 0) setClocks((value) => ({ ...value, [move.color]: value[move.color] + increment }));
    setSelected(null);
    setPendingPromotion(null);
    clearAnnotations();
    playTone(move);
    if (mode === 'computer') setCoachMessage(coachLine(teacher, move));
    finishFromPosition();

    if (mode === 'online' && origin === 'local' && connectionRef.current?.open) {
      const payload: NetworkMove = {
        type: 'move',
        from: move.from,
        to: move.to,
        promotion: move.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
        ply: chessRef.current.history().length,
        previousPosition,
      };
      void connectionRef.current.send(payload);
    }
    forceRender();
  }, [clearAnnotations, finishFromPosition, forceRender, mode, playTone, teacher, timeControl]);

  const attemptMove = useCallback((from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => {
    const previousPosition = positionKey(chessRef.current);
    try {
      const move = chessRef.current.move({ from, to, promotion });
      if (!move) return false;
      afterAppliedMove(move, 'local', previousPosition);
      return true;
    } catch {
      setStatusMessage(beginnerGuide ? 'Esse lance não é permitido nesta posição. Confira o movimento da peça, a vez e a segurança do seu rei.' : 'Lance inválido.');
      return false;
    }
  }, [afterAppliedMove, beginnerGuide]);

  const resetGame = useCallback((nextMode: GameMode, color: Color = 'w') => {
    gameTokenRef.current += 1;
    chessRef.current = new Chess();
    resultRecordedRef.current = false;
    matchReportedRef.current = false;
    timeoutDeclaredRef.current = false;
    setMode(nextMode);
    setPlayerColor(color);
    setOrientation(color);
    setSelected(null);
    setPendingPromotion(null);
    setOutcome(null);
    setAiThinking(false);
    setTeacherChat([]);
    setClocks({ w: TIME_CONTROLS[timeControl].seconds, b: TIME_CONTROLS[timeControl].seconds });
    setStatusMessage('Vez das brancas.');
    setDrawOffer(false);
    setRemoteName('Adversário');
    clearAnnotations();
    forceRender();
  }, [clearAnnotations, forceRender, timeControl]);

  const cleanupNetwork = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    setOnlinePhase('idle');
    setRoomIsMatchmaking(false);
    setNetworkError('');
    setDrawOffer(false);
  }, []);

  const returnToMenu = useCallback(() => {
    if (mode === 'online') {
      const validRoom = /^[A-Z2-9]{6}$/.test(roomCode);
      if (authenticatedUser && validRoom && onlinePhase === 'connected' && !currentOutcome) {
        const winner: Color = playerColor === 'w' ? 'b' : 'w';
        const result = winner === 'w' ? '1-0' : '0-1';
        chessRef.current.setHeader('Result', result);
        const pgn = chessRef.current.pgn({ maxWidth: 0, newline: '\n' });
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
    gameTokenRef.current += 1;
    chessRef.current = new Chess();
    setMode('menu');
    setSelected(null);
    setOutcome(null);
    setAiThinking(false);
    setOrientation('w');
    setStatusMessage('Escolha um modo para começar.');
    setAnnotationMode(false);
    clearAnnotations();
    forceRender();
  }, [authenticatedUser, cleanupNetwork, clearAnnotations, currentOutcome, forceRender, mode, onlinePhase, playerColor, roomCode]);

  const handleSquareClick = (square: Square) => {
    if (mode === 'menu' || currentOutcome || aiThinking) return;
    if (annotationMode) {
      if (!annotationStart) {
        setAnnotationStart(square);
        setStatusMessage('Escolha a casa de destino da seta. Toque na mesma casa para marcá-la.');
      } else {
        toggleArrow(annotationStart, square);
        setAnnotationStart(null);
        setStatusMessage('Anotação local criada. Ela não é enviada ao adversário.');
      }
      return;
    }
    if (mode === 'computer' && chess.turn() !== 'w') return;
    if (mode === 'online' && (onlinePhase !== 'connected' || chess.turn() !== playerColor)) return;

    const piece = chess.get(square);
    if (selected) {
      const candidates = legalTargets.get(square) ?? [];
      if (candidates.length > 0) {
        const promotionMoves = candidates.filter((move) => Boolean(move.promotion));
        if (promotionMoves.length > 0) setPendingPromotion({ from: selected, to: square });
        else attemptMove(selected, square);
        return;
      }
    }

    if (piece?.color === chess.turn()) {
      setSelected(square === selected ? null : square);
      setStatusMessage(square === selected ? 'Seleção cancelada.' : `${PIECE_NAMES[piece.type]} em ${square} selecionado.`);
    } else {
      setSelected(null);
    }
  };

  const undoMove = () => {
    if (mode === 'online' || history.length === 0 || aiThinking || currentOutcome?.kind === 'resignation') return;
    gameTokenRef.current += 1;
    chessRef.current.undo();
    if (mode === 'computer' && chessRef.current.turn() === 'b' && chessRef.current.history().length > 0) chessRef.current.undo();
    setOutcome(null);
    setSelected(null);
    setStatusMessage('Lance desfeito.');
    resultRecordedRef.current = false;
    forceRender();
  };

  const resign = () => {
    if (mode === 'menu' || currentOutcome) return;
    const resigningColor = mode === 'online' ? playerColor : chess.turn();
    const winner: Color = resigningColor === 'w' ? 'b' : 'w';
    setOutcome({
      kind: 'resignation',
      title: 'Desistência',
      detail: winner === 'w' ? 'As brancas venceram.' : 'As pretas venceram.',
      winner,
    });
    if (mode === 'online' && connectionRef.current?.open) void connectionRef.current.send({ type: 'resign' });
  };

  const offerDraw = () => {
    if (mode === 'local') {
      setOutcome({ kind: 'agreement', title: 'Empate por acordo', detail: 'Os jogadores concordaram com o empate.', winner: null });
      return;
    }
    if (mode === 'online' && connectionRef.current?.open) {
      void connectionRef.current.send({ type: 'draw-offer' });
      setStatusMessage('Proposta de empate enviada.');
    }
  };

  const acceptDraw = () => {
    setDrawOffer(false);
    setOutcome({ kind: 'agreement', title: 'Empate por acordo', detail: 'Os jogadores concordaram com o empate.', winner: null });
    void connectionRef.current?.send({ type: 'draw-accept' });
  };

  const setupConnection = useCallback((connection: DataConnection, role: 'host' | 'guest') => {
    if (connectionRef.current && connectionRef.current !== connection) connectionRef.current.close();
    connectionRef.current = connection;

    connection.on('open', () => {
      setOnlinePhase('connected');
      setRoomIsMatchmaking(false);
      setNetworkError('');
      if (alertsEnabled) setStatusMessage('Adversário conectado. Boa partida!');
      void connection.send({ type: 'hello', displayName: localDisplayName.slice(0, 24) });
      if (role === 'host') {
        resetGame('online', 'w');
        void connection.send({ type: 'sync', protocol: 1, fen: chessRef.current.fen(), displayName: localDisplayName.slice(0, 24) });
      } else {
        setStatusMessage('Sincronizando a partida…');
      }
    });

    connection.on('data', (data: unknown) => {
      if (!isRecord(data) || typeof data.type !== 'string') return;

      if (data.type === 'hello' && typeof data.displayName === 'string') {
        const name = data.displayName.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24);
        if (name) setRemoteName(name);
        return;
      }

      if (data.type === 'sync' && role === 'guest' && data.protocol === 1 && typeof data.fen === 'string' && data.fen.length <= 100) {
        try {
          if (typeof data.displayName === 'string') {
            const name = data.displayName.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24);
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
      }

      if (data.type === 'move') {
        const remoteColor: Color = role === 'host' ? 'b' : 'w';
        const previous = positionKey(chessRef.current);
        const result = applyValidatedNetworkMove(chessRef.current, data, remoteColor);
        if (!result.ok) {
          setNetworkError(result.reason);
          setStatusMessage('Um lance inválido recebido foi rejeitado.');
          void connection.send({ type: 'reject', reason: result.reason, fen: chessRef.current.fen() });
          return;
        }
        afterAppliedMove(result.move, 'remote', previous);
        return;
      }

      if (data.type === 'chat' && typeof data.text === 'string') {
        const text = data.text.trim().slice(0, 280);
        if (text && !chatSafetyReason(text)) setChatMessages((messages) => [...messages.slice(-29), { id: crypto.randomUUID(), author: 'Adversário', text }]);
        else if (text) setNetworkError('Uma mensagem ofensiva do adversário foi bloqueada.');
        return;
      }

      if (data.type === 'draw-offer') setDrawOffer(true);
      if (data.type === 'draw-accept') setOutcome({ kind: 'agreement', title: 'Empate por acordo', detail: 'Os jogadores concordaram com o empate.', winner: null });
      if (data.type === 'draw-decline') setStatusMessage('A proposta de empate foi recusada.');
      if (data.type === 'resign') {
        const winner: Color = role === 'host' ? 'w' : 'b';
        setOutcome({ kind: 'resignation', title: 'O adversário desistiu', detail: 'Você venceu a partida.', winner });
      }
      if (data.type === 'timeout' && !timeoutDeclaredRef.current) {
        timeoutDeclaredRef.current = true;
        const winner: Color = role === 'host' ? 'w' : 'b';
        setOutcome({ kind: 'timeout', title: 'Tempo esgotado', detail: 'O relógio do adversário chegou a zero. Você venceu.', winner });
      }
      if (data.type === 'reject') setNetworkError('O adversário rejeitou o último lance por inconsistência de estado.');
    });

    connection.on('close', () => {
      setOnlinePhase('disconnected');
      setStatusMessage('A conexão com o adversário foi encerrada.');
    });
    connection.on('error', () => {
      setOnlinePhase('error');
      setNetworkError('Não foi possível manter a conexão da sala.');
    });
  }, [afterAppliedMove, alertsEnabled, forceRender, localDisplayName, resetGame, timeControl]);

  const competitiveRequest = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/competitive', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'O servidor competitivo rejeitou a operação.');
    return body;
  }, []);

  const refreshCompetitiveProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/competitive', { cache: 'no-store' });
      const body = await response.json() as { profile?: CompetitiveProfile; leaderboard?: LeaderboardEntry[] };
      if (body.profile) {
        setCompetitiveProfile(body.profile);
        setProfileName(body.profile.displayName);
        setProfileEmote(body.profile.avatarEmote);
        setProfileTitle(body.profile.profileTitle);
        setBoardTheme(body.profile.boardTheme);
        setPieceTheme(body.profile.pieceTheme);
      }
      if (body.leaderboard) setLeaderboard(body.leaderboard);
    } catch {
      // Ranking refresh is non-blocking for the local board.
    }
  }, []);

  const saveProfile = async () => {
    setProfileError('');
    try {
      const body = await competitiveRequest({
        action: 'update-profile',
        displayName: profileName,
        avatarEmote: profileEmote,
        profileTitle,
        boardTheme,
        pieceTheme,
      });
      if (isRecord(body.profile)) setCompetitiveProfile(body.profile as unknown as CompetitiveProfile);
      setProfileOpen(false);
      await refreshCompetitiveProfile();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.');
    }
  };

  const buyCosmetic = async (cosmeticCode: string) => {
    setProfileError('');
    try {
      const body = await competitiveRequest({ action: 'purchase-cosmetic', cosmeticCode });
      if (isRecord(body.profile)) setCompetitiveProfile(body.profile as unknown as CompetitiveProfile);
      await refreshCompetitiveProfile();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Não foi possível desbloquear o item.');
    }
  };

  const createOnlineRoom = async (matchmaking = false) => {
    cleanupNetwork();
    setPlayerColor('w');
    setOrientation('w');
    const code = createRoomCode();
    setMode('online');
    setRoomCode(code);
    setRoomIsMatchmaking(matchmaking);
    setOnlinePhase('connecting');
    setStatusMessage('Criando sala segura…');
    try {
      const { Peer: PeerConstructor } = await import('peerjs');
      const peer = new PeerConstructor(`nouty-${code}`, { debug: 0 });
      peerRef.current = peer;
      peer.on('open', async () => {
        if (authenticatedUser) {
          try {
            await competitiveRequest({ action: 'heartbeat', roomCode: code, role: 'host', matchmaking });
          } catch (error) {
            setNetworkError(error instanceof Error ? error.message : 'Falha ao registrar a sala.');
            peer.destroy();
            return;
          }
        }
        setOnlinePhase('waiting');
        setStatusMessage(matchmaking ? 'Procurando um adversário compatível…' : 'Sala criada. Compartilhe o código.');
      });
      peer.on('connection', (connection) => setupConnection(connection, 'host'));
      peer.on('error', () => {
        setOnlinePhase('error');
        setNetworkError('O serviço de salas está indisponível. O jogo local continua funcionando.');
      });
    } catch {
      setOnlinePhase('error');
      setNetworkError('Não foi possível carregar o modo online. O jogo local continua disponível.');
    }
  };

  const joinOnlineRoom = useCallback(async (codeOverride?: string) => {
    const code = safeRoomCode(codeOverride ?? joinCode);
    if (code.length !== 6) {
      setNetworkError('Digite um código de sala com 6 caracteres.');
      return;
    }
    cleanupNetwork();
    setPlayerColor('b');
    setOrientation('b');
    setRoomCode(code);
    setRoomIsMatchmaking(false);
    setMode('online');
    setOnlinePhase('connecting');
    setStatusMessage('Procurando a sala…');
    try {
      const { Peer: PeerConstructor } = await import('peerjs');
      const peer = new PeerConstructor({ debug: 0 });
      peerRef.current = peer;
      peer.on('open', async () => {
        if (authenticatedUser) {
          try {
            await competitiveRequest({ action: 'heartbeat', roomCode: code, role: 'guest' });
          } catch (error) {
            setNetworkError(error instanceof Error ? error.message : 'Não foi possível entrar na sala ranqueada.');
            peer.destroy();
            return;
          }
        }
        const connection = peer.connect(`nouty-${code}`, { reliable: true });
        setupConnection(connection, 'guest');
      });
      peer.on('error', () => {
        setOnlinePhase('error');
        setNetworkError('Sala inexistente ou serviço online indisponível.');
      });
    } catch {
      setOnlinePhase('error');
      setNetworkError('Não foi possível carregar o modo online.');
    }
  }, [authenticatedUser, cleanupNetwork, competitiveRequest, joinCode, setupConnection]);

  const findQuickMatch = async () => {
    if (!authenticatedUser) {
      setNetworkError('Entre com sua conta para usar o pareamento competitivo automático.');
      return;
    }
    cleanupNetwork();
    setMode('online');
    setRoomIsMatchmaking(true);
    setOnlinePhase('connecting');
    setStatusMessage('Buscando uma sala compatível…');
    try {
      const body = await competitiveRequest({ action: 'find-match' });
      const match = isRecord(body.match) && typeof body.match.roomCode === 'string' ? body.match.roomCode : null;
      if (match) await joinOnlineRoom(match);
      else await createOnlineRoom(true);
    } catch (error) {
      setOnlinePhase('error');
      setNetworkError(error instanceof Error ? error.message : 'Não foi possível encontrar partida.');
    }
  };

  const sendChat = () => {
    const text = chatDraft.trim().slice(0, 280);
    if (!text || !connectionRef.current?.open) return;
    const safetyReason = chatSafetyReason(text);
    if (safetyReason) {
      setNetworkError(safetyReason);
      return;
    }
    void connectionRef.current.send({ type: 'chat', text });
    if (authenticatedUser && roomCode) {
      void fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, roomCode, scope: 'room' }),
      }).catch(() => undefined);
    }
    setChatMessages((messages) => [...messages.slice(-29), { id: crypto.randomUUID(), author: 'Você', text }]);
    setChatDraft('');
  };

  const askTeacher = useCallback(async (help: 'explain' | 'hint' | 'orientation' | 'move', questionOverride?: string) => {
    if (mode !== 'computer' || teacherChatBusy) return;
    const question = (questionOverride ?? teacherQuestion).trim() || (help === 'hint' ? 'Me dê uma pista para esta posição.' : help === 'orientation' ? 'Qual ideia devo procurar?' : help === 'move' ? 'Mostre uma sugestão de lance e explique.' : 'O que devo observar nesta posição?');
    setTeacherChatBusy(true);
    setTeacherQuestion('');
    if (questionOverride === undefined && question.trim()) setTeacherChat((messages) => [...messages.slice(-19), { id: crypto.randomUUID(), author: 'Você', text: question }]);
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fen: chessRef.current.fen(),
          history: chessRef.current.history(),
          question,
          teacher,
          level: levelFromDifficulty(difficulty),
          help,
        }),
      });
      const body = await response.json() as { message?: string; error?: string };
      if (!response.ok || !body.message) throw new Error(body.error ?? 'Professor indisponível.');
      setTeacherChat((messages) => [...messages.slice(-19), { id: crypto.randomUUID(), author: 'Professor', text: body.message! }]);
      setCoachMessage(body.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Professor avançado temporariamente indisponível.';
      setTeacherChat((messages) => [...messages.slice(-19), { id: crypto.randomUUID(), author: 'Professor', text: message }]);
    } finally {
      setTeacherChatBusy(false);
    }
  }, [difficulty, mode, teacher, teacherChatBusy, teacherQuestion]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('noutychess-preferences-v1');
      if (raw) {
        const stored = JSON.parse(raw) as Record<string, unknown>;
        if (stored.difficulty === 'easy' || stored.difficulty === 'medium' || stored.difficulty === 'hard' || stored.difficulty === 'expert') setDifficulty(stored.difficulty);
        if (stored.teacher === 'niclaus' || stored.teacher === 'damon') setTeacher(stored.teacher);
        if (stored.timeControl === 'blitz' || stored.timeControl === 'rapid' || stored.timeControl === 'classic') setTimeControl(stored.timeControl);
        if (typeof stored.audioEnabled === 'boolean') setAudioEnabled(stored.audioEnabled);
        if (typeof stored.audioVolume === 'number' && Number.isFinite(stored.audioVolume)) setAudioVolume(Math.max(0.1, Math.min(1, stored.audioVolume)));
        if (typeof stored.showLegalMoves === 'boolean') setShowLegalMoves(stored.showLegalMoves);
        if (typeof stored.showCoordinates === 'boolean') setShowCoordinates(stored.showCoordinates);
        if (typeof stored.showLastMove === 'boolean') setShowLastMove(stored.showLastMove);
        if (typeof stored.showThreats === 'boolean') setShowThreats(stored.showThreats);
        if (typeof stored.beginnerGuide === 'boolean') setBeginnerGuide(stored.beginnerGuide);
        if (typeof stored.alertsEnabled === 'boolean') setAlertsEnabled(stored.alertsEnabled);
        if (typeof stored.animationsEnabled === 'boolean') setAnimationsEnabled(stored.animationsEnabled);
        if (typeof stored.guestName === 'string') {
          const savedGuest = stored.guestName.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24);
          if (savedGuest.length >= 2) setGuestName(savedGuest);
        }
      }
      if (!localStorage.getItem('noutychess-onboarding-v1')) setOnboardingOpen(true);
      const rawStats = localStorage.getItem('noutychess-stats-v1');
      if (rawStats) {
        const stored = JSON.parse(rawStats) as Record<string, unknown>;
        if (Number.isInteger(stored.games) && Number.isInteger(stored.wins) && Number.isInteger(stored.draws)) {
          setStats({ games: Number(stored.games), wins: Number(stored.wins), draws: Number(stored.draws) });
        }
      }
    } catch {
      localStorage.removeItem('noutychess-preferences-v1');
      localStorage.removeItem('noutychess-stats-v1');
    }

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('noutychess-preferences-v1', JSON.stringify({ difficulty, teacher, timeControl, audioEnabled, audioVolume, showLegalMoves, showCoordinates, showLastMove, showThreats, beginnerGuide, alertsEnabled, animationsEnabled, guestName }));
  }, [alertsEnabled, animationsEnabled, audioEnabled, audioVolume, beginnerGuide, difficulty, guestName, showCoordinates, showLastMove, showLegalMoves, showThreats, teacher, timeControl]);

  useEffect(() => {
    let visitorId = localStorage.getItem('noutychess-visitor-id');
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem('noutychess-visitor-id', visitorId);
    }
    let sessionId = sessionStorage.getItem('noutychess-session-id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('noutychess-session-id', sessionId);
    }
    const pulse = () => {
      const presenceMode = mode === 'online'
        ? onlinePhase === 'waiting' ? (roomIsMatchmaking ? 'matchmaking' : 'online') : onlinePhase === 'connected' ? 'playing' : 'online'
        : mode;
      void fetch('/api/presence', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visitorId, sessionId, displayName: localDisplayName, roomCode: mode === 'online' ? roomCode : null, presenceMode }),
      }).catch(() => undefined);
    };
    pulse();
    const timer = window.setInterval(pulse, 25_000);
    return () => window.clearInterval(timer);
  }, [localDisplayName, mode, onlinePhase, roomCode, roomIsMatchmaking]);

  useEffect(() => {
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
  }, [mode, outcome, playerColor]);

  useEffect(() => {
    if (!authenticatedUser || mode !== 'online' || !roomCode || (onlinePhase !== 'waiting' && onlinePhase !== 'connected')) return;
    const pulse = () => {
      void competitiveRequest({
        action: 'heartbeat',
        roomCode,
        role: playerColor === 'w' ? 'host' : 'guest',
        matchmaking: playerColor === 'w' && roomIsMatchmaking && onlinePhase === 'waiting',
      }).catch(() => undefined);
    };
    const timer = window.setInterval(pulse, 25_000);
    return () => window.clearInterval(timer);
  }, [authenticatedUser, competitiveRequest, mode, onlinePhase, playerColor, roomCode, roomIsMatchmaking]);

  useEffect(() => {
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
    if (!authenticatedUser || mode !== 'online' || !outcome || !roomCode || matchReportedRef.current) return;
    matchReportedRef.current = true;
    const result = outcome.winner === 'w' ? '1-0' : outcome.winner === 'b' ? '0-1' : '1/2-1/2';
    chessRef.current.setHeader('Result', result);
    const pgn = chessRef.current.pgn({ maxWidth: 0, newline: '\n' });
    void competitiveRequest({ action: 'report-match', roomCode, color: playerColor, result, pgn })
      .then((body) => {
        if (body.confirmed === true) {
          setStatusMessage('Resultado confirmado. Elo e recompensas atualizados.');
          return refreshCompetitiveProfile();
        }
        setStatusMessage('Resultado enviado. Aguardando confirmação do adversário.');
      })
      .catch((error: unknown) => setNetworkError(error instanceof Error ? error.message : 'Falha ao registrar o resultado.'));
  }, [authenticatedUser, competitiveRequest, mode, outcome, playerColor, refreshCompetitiveProfile, roomCode]);

  useEffect(() => {
    if (mode === 'menu' || currentOutcome || (mode === 'online' && onlinePhase !== 'connected')) return;
    let lastTick = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastTick) / 1000;
      lastTick = now;
      const turn = chessRef.current.turn();
      setClocks((current) => {
        const next = { ...current, [turn]: Math.max(0, current[turn] - elapsed) };
        if (next[turn] <= 0 && !timeoutDeclaredRef.current) {
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
        }
        return next;
      });
    }, 500);
    return () => window.clearInterval(timer);
  }, [currentOutcome, mode, onlinePhase, playerColor]);

  useEffect(() => {
    if (mode !== 'computer' || currentOutcome || chessRef.current.turn() !== 'b') return;
    const token = gameTokenRef.current;
    const expectedFen = chessRef.current.fen();
    setAiThinking(true);
    setStatusMessage('Nouty Bot está analisando…');
    let cancelled = false;
    let worker: Worker | null = null;
    const applyAiChoice = (move: ReturnType<typeof chooseAiMove>) => {
      if (cancelled) return;
      if (token === gameTokenRef.current && chessRef.current.fen() === expectedFen && move && !evaluateOutcome(chessRef.current)) {
        const previous = positionKey(chessRef.current);
        try {
          const applied = chessRef.current.move(move);
          if (applied) afterAppliedMove(applied, 'local', previous);
        } catch {
          setStatusMessage('A IA descartou uma análise inválida. Sua partida está segura.');
        }
      }
      setAiThinking(false);
    };
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(new URL('../lib/chess-ai-worker.ts', import.meta.url), { type: 'module', name: 'noutychess-ai' });
        worker.onmessage = (event: MessageEvent<{ ok: boolean; move: ReturnType<typeof chooseAiMove>; fen: string; token: number }>) => {
          if (event.data.ok && event.data.fen === expectedFen && event.data.token === token) applyAiChoice(event.data.move);
          else applyAiChoice(null);
          worker?.terminate();
        };
        worker.onerror = () => {
          worker?.terminate();
          applyAiChoice(chooseAiMove(new Chess(expectedFen), difficulty, teacher));
        };
        worker.postMessage({ fen: expectedFen, difficulty, personality: teacher, token });
      } catch {
        applyAiChoice(chooseAiMove(new Chess(expectedFen), difficulty, teacher));
      }
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      worker?.terminate();
    };
  }, [afterAppliedMove, currentOutcome, difficulty, mode, revision, teacher]);

  useEffect(() => () => {
    connectionRef.current?.close();
    peerRef.current?.destroy();
    audioContextRef.current?.close().catch(() => undefined);
  }, []);

  const topColor: Color = orientation === 'w' ? 'b' : 'w';
  const bottomColor: Color = orientation === 'w' ? 'w' : 'b';
  const turnLabel = chess.turn() === 'w' ? 'Brancas' : 'Pretas';
  const active = mode !== 'menu' && !currentOutcome && (mode !== 'online' || onlinePhase === 'connected');

  return (
    <main className={`min-h-dvh overflow-x-hidden bg-background text-foreground board-${boardTheme} pieces-${pieceTheme} ${animationsEnabled ? '' : 'motion-reduced'}`}>
      <header className="app-header">
        <button className="brand" type="button" onClick={returnToMenu} aria-label="NoutyChess, voltar ao início">
          <span className="brand-mark">♘</span>
          <span><strong>NoutyChess</strong><small>Jogue melhor</small></span>
        </button>
        {competitiveProfile ? (
          <button className="profile-chip" type="button" onClick={() => setProfileOpen(true)}>
            <span>{competitiveProfile.avatarEmote}</span>
            <span><strong>{competitiveProfile.displayName}</strong><small>{competitiveProfile.rating} Elo · Nv. {competitiveProfile.level}</small></span>
          </button>
        ) : (
          <a className="signin-chip" href={signInPath} target="_top"><LogIn /> Entrar para competir</a>
        )}
        {competitiveProfile && <NotificationsMenu />}
        <Button variant="ghost" size="icon" onClick={() => setAudioEnabled((value) => !value)} aria-label={audioEnabled ? 'Desativar som' : 'Ativar som'}>
          {audioEnabled ? <Volume2 /> : <VolumeX />}
        </Button>
      </header>

      <section className="game-layout">
        <div className="game-stage">
          <PlayerStrip
            color={topColor}
            label={mode === 'computer' && topColor === 'b' ? (teacher === 'niclaus' ? 'Professor Niclaus' : 'Professor Damon') : mode === 'online' && topColor !== playerColor ? remoteName : mode === 'online' ? localDisplayName : topColor === 'w' ? 'Brancas' : 'Pretas'}
            sublabel={mode === 'computer' && topColor === 'b' ? DIFFICULTY_LABELS[difficulty] : active && chess.turn() === topColor ? 'Pensando…' : 'Aguardando'}
            seconds={clocks[topColor]}
            active={active && chess.turn() === topColor}
            captured={captured[topColor]}
          />

          <div className="board-shell">
            <div className="chessboard" aria-label={`Tabuleiro de xadrez. ${turnLabel} jogam.`}>
              {boardSquares.map((square, index) => {
                const piece = chess.get(square);
                const isSelected = selected === square;
                const availableMoves = legalTargets.get(square) ?? [];
                const isLegal = showLegalMoves && availableMoves.length > 0;
                const isCapture = isLegal && Boolean(piece);
                const isLast = showLastMove && (lastMove?.from === square || lastMove?.to === square);
                const isChecked = checkedKing === square;
                const isMarked = markedSquares.has(square);
                const isAnnotationStart = annotationStart === square;
                const isThreatened = showThreats && Boolean(piece && chess.isAttacked(square, piece.color === 'w' ? 'b' : 'w'));
                const fileEdge = orientation === 'w' ? index % 8 === 0 : index % 8 === 7;
                const rankEdge = orientation === 'w' ? index >= 56 : index < 8;
                return (
                  <button
                    type="button"
                    key={square}
                    onClick={() => handleSquareClick(square)}
                    onContextMenu={(event) => event.preventDefault()}
                    onPointerDown={(event) => { if (event.button === 2) { event.preventDefault(); rightDragRef.current = square; } }}
                    onPointerUp={(event) => { if (event.button === 2 && rightDragRef.current) { event.preventDefault(); toggleArrow(rightDragRef.current, square); rightDragRef.current = null; } }}
                    className={`square ${isSquareDark(square) ? 'square-dark' : 'square-light'} ${isSelected ? 'square-selected' : ''} ${isLast ? 'square-last' : ''} ${isChecked ? 'square-check' : ''} ${isMarked ? 'square-marked' : ''} ${isAnnotationStart ? 'square-annotation-start' : ''} ${isThreatened ? 'square-threatened' : ''}`}
                    aria-label={`${square}${piece ? `, ${PIECE_NAMES[piece.type]} ${piece.color === 'w' ? 'branco' : 'preto'}` : ', vazia'}${isLegal ? ', destino legal' : ''}${isThreatened ? ', peça sob ataque' : ''}`}
                    aria-pressed={isSelected}
                    disabled={mode === 'menu'}
                  >
                    {isLegal && <span className={isCapture ? 'legal-capture' : 'legal-dot'} />}
                    {piece && <span className={`piece piece-${piece.color}`}>{PIECE_GLYPHS[piece.color][piece.type]}</span>}
                    {isThreatened && piece && <span className="danger-alert" aria-hidden="true">!</span>}
                    {showCoordinates && fileEdge && <span className="coord coord-rank">{square[1]}</span>}
                    {showCoordinates && rankEdge && <span className="coord coord-file">{square[0]}</span>}
                  </button>
                );
              })}
              <svg className="board-arrows" viewBox="0 0 100 100" aria-hidden="true">
                <defs><marker id="nouty-arrow-head" markerWidth="4" markerHeight="4" refX="2.8" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 Z" /></marker></defs>
                {boardArrows.map((arrow) => {
                  const from = squareCenter(arrow.from, orientation);
                  const to = squareCenter(arrow.to, orientation);
                  const deltaX = to.x - from.x;
                  const deltaY = to.y - from.y;
                  const length = Math.hypot(deltaX, deltaY) || 1;
                  const endX = to.x - (deltaX / length) * 3.8;
                  const endY = to.y - (deltaY / length) * 3.8;
                  return <line key={`${arrow.from}-${arrow.to}`} x1={from.x} y1={from.y} x2={endX} y2={endY} markerEnd="url(#nouty-arrow-head)" />;
                })}
              </svg>
            </div>
          </div>

          <PlayerStrip
            color={bottomColor}
            label={mode === 'computer' && bottomColor === 'w' ? localDisplayName : mode === 'online' && bottomColor === playerColor ? localDisplayName : mode === 'online' ? remoteName : bottomColor === 'w' ? 'Brancas' : 'Pretas'}
            sublabel={active && chess.turn() === bottomColor ? 'Sua vez' : 'Aguardando'}
            seconds={clocks[bottomColor]}
            active={active && chess.turn() === bottomColor}
            captured={captured[bottomColor]}
          />
        </div>

        <aside className="control-panel" aria-live="polite">
          {mode === 'menu' ? (
            <MenuPanel
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              teacher={teacher}
              setTeacher={setTeacher}
              timeControl={timeControl}
              setTimeControl={setTimeControl}
              profile={competitiveProfile}
              leaderboard={leaderboard}
              signInPath={signInPath}
              guestName={guestName}
              setGuestName={setGuestName}
              onEditProfile={() => setProfileOpen(true)}
              onCommunityJoin={(code) => {
                setJoinCode(code);
                chessRef.current = new Chess();
                setMode('online');
                setOnlinePhase('idle');
                setStatusMessage('Código carregado. Toque em entrar.');
                forceRender();
              }}
              onComputer={() => resetGame('computer')}
              onLocal={() => resetGame('local')}
              onOnline={() => {
                chessRef.current = new Chess();
                setMode('online');
                setOnlinePhase('idle');
                setStatusMessage('Crie uma sala ou entre com um código.');
                forceRender();
              }}
            />
          ) : (
            <>
              <div className="panel-topline">
                <Button variant="ghost" size="sm" onClick={returnToMenu}><ChevronLeft /> Modos</Button>
                <span className={`connection-pill ${mode === 'online' && onlinePhase !== 'connected' ? 'connection-warn' : ''}`}>
                  {mode === 'online' ? (onlinePhase === 'connected' ? <Wifi /> : <WifiOff />) : <ShieldCheck />}
                  {mode === 'computer' ? 'Computador' : mode === 'local' ? 'Local' : onlinePhase === 'connected' ? 'Conectado' : 'Online'}
                </span>
              </div>

              {mode === 'online' && onlinePhase !== 'connected' ? (
                <OnlineLobby
                  phase={onlinePhase}
                  roomCode={roomCode}
                  joinCode={joinCode}
                  setJoinCode={(value) => setJoinCode(safeRoomCode(value))}
                  error={networkError}
                  authenticated={Boolean(authenticatedUser)}
                  signInPath={signInPath}
                  guestName={guestName}
                  setGuestName={setGuestName}
                  matchmaking={roomIsMatchmaking}
                  onQuickMatch={() => void findQuickMatch()}
                  onCreate={() => void createOnlineRoom(false)}
                  onJoin={() => void joinOnlineRoom()}
                  onCancel={returnToMenu}
                />
              ) : (
                <>
                  <div className="turn-card">
                    <span className={`turn-piece turn-piece-${chess.turn()}`}>{PIECE_GLYPHS[chess.turn()].k}</span>
                    <span><small>{aiThinking ? 'ANALISANDO' : chess.inCheck() ? 'XEQUE' : 'AGORA'}</small><strong>{aiThinking ? 'Nouty Bot pensa…' : `${turnLabel} jogam`}</strong></span>
                    {aiThinking && <LoaderCircle className="spin" />}
                  </div>

                  <p className="status-message">{statusMessage}</p>

                  {mode === 'computer' && (
                    <>
                      <div className={`coach-card coach-${teacher}`}>
                        <span>{teacher === 'niclaus' ? '🦉' : '🐉'}</span>
                        <div><small>{teacher === 'niclaus' ? 'NICLAUS ENSINA' : 'DAMON COMENTA'}</small><p>{coachMessage}</p></div>
                      </div>
                      <TeacherChat
                        teacher={teacher}
                        messages={teacherChat}
                        question={teacherQuestion}
                        setQuestion={setTeacherQuestion}
                        busy={teacherChatBusy}
                        onAsk={(help, question) => void askTeacher(help, question)}
                      />
                    </>
                  )}

                  {drawOffer && (
                    <div className="draw-offer">
                      <Handshake />
                      <span><strong>Proposta de empate</strong><small>O adversário quer encerrar empatado.</small></span>
                      <Button size="sm" onClick={acceptDraw}>Aceitar</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setDrawOffer(false); void connectionRef.current?.send({ type: 'draw-decline' }); }}>Recusar</Button>
                    </div>
                  )}

                  <div className="game-actions">
                    <Button variant="secondary" size="sm" onClick={undoMove} disabled={mode === 'online' || history.length === 0 || aiThinking}><Undo2 /> Desfazer</Button>
                    <Button variant="secondary" size="sm" onClick={() => setOrientation((color) => color === 'w' ? 'b' : 'w')}><FlipHorizontal2 /> Virar</Button>
                    <Button variant={annotationMode ? 'default' : 'secondary'} size="sm" onClick={() => { setAnnotationMode((value) => !value); setAnnotationStart(null); }}><PenLine /> {annotationMode ? 'Anotando' : 'Anotar'}</Button>
                    {(boardArrows.length > 0 || markedSquares.size > 0) && <Button variant="secondary" size="sm" onClick={clearAnnotations}><Eraser /> Limpar</Button>}
                    {(mode === 'local' || mode === 'online') && <Button variant="secondary" size="sm" onClick={offerDraw}><Handshake /> Empate</Button>}
                    <Button variant="destructive" size="sm" onClick={resign}><Flag /> Desistir</Button>
                  </div>

                  <GamePreferences
                    audioEnabled={audioEnabled}
                    setAudioEnabled={setAudioEnabled}
                    audioVolume={audioVolume}
                    setAudioVolume={setAudioVolume}
                    showLegalMoves={showLegalMoves}
                    setShowLegalMoves={setShowLegalMoves}
                    showCoordinates={showCoordinates}
                    setShowCoordinates={setShowCoordinates}
                    showLastMove={showLastMove}
                    setShowLastMove={setShowLastMove}
                    showThreats={showThreats}
                    setShowThreats={setShowThreats}
                    beginnerGuide={beginnerGuide}
                    setBeginnerGuide={setBeginnerGuide}
                    alertsEnabled={alertsEnabled}
                    setAlertsEnabled={setAlertsEnabled}
                    animationsEnabled={animationsEnabled}
                    setAnimationsEnabled={setAnimationsEnabled}
                  />

                  <section className="history-section">
                    <div className="section-heading"><span><History /> Histórico</span><small>{history.length} lances</small></div>
                    <MoveHistory moves={history} />
                  </section>

                  {mode === 'online' && onlinePhase === 'connected' && (
                    <section className="chat-section">
                      <div className="section-heading"><span><MessageCircle /> Chat da sala</span><small>texto seguro</small></div>
                      <div className="chat-log">
                        {chatMessages.length === 0 ? <p>Nenhuma mensagem ainda.</p> : chatMessages.map((message) => (
                          <div key={message.id} className={message.author === 'Você' ? 'chat-own' : ''}><small>{message.author}</small><span>{message.text}</span></div>
                        ))}
                      </div>
                      <form className="chat-form" onSubmit={(event) => { event.preventDefault(); sendChat(); }}>
                        <input value={chatDraft} onChange={(event) => setChatDraft(event.target.value.slice(0, 280))} maxLength={280} placeholder="Escreva uma mensagem" aria-label="Mensagem para o adversário" />
                        <Button size="icon" type="submit" aria-label="Enviar mensagem"><Send /></Button>
                      </form>
                    </section>
                  )}

                  {networkError && <div className="network-error"><WifiOff /> {networkError}</div>}
                </>
              )}
            </>
          )}
        </aside>
      </section>

      <footer className="app-credit">
        <span>© 2026 <strong>Ekasy-Studio</strong> · NoutyChess</span>
        <nav>
          <a className="footer-whatsapp" href={`https://wa.me/?text=${GENERAL_WHATSAPP_TEXT}`} target="_blank" rel="noreferrer"><Share2 /> Convidar no WhatsApp</a>
          <Link href="/apoie">Apoie</Link>
          <Link href="/regras">Regras</Link>
          <Link href="/termos">Termos</Link>
          <Link href="/privacidade">Privacidade</Link>
        </nav>
      </footer>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="profile-dialog">
          <DialogHeader>
            <DialogTitle>Seu perfil lendário</DialogTitle>
            <DialogDescription>Personalize sua identidade. Todo jogador começa com três tabuleiros e três conjuntos de peças gratuitos.</DialogDescription>
          </DialogHeader>
          {competitiveProfile && (
            <ProfileCustomizer
              profile={competitiveProfile}
              name={profileName}
              setName={setProfileName}
              emote={profileEmote}
              setEmote={setProfileEmote}
              title={profileTitle}
              setTitle={setProfileTitle}
              boardTheme={boardTheme}
              setBoardTheme={setBoardTheme}
              pieceTheme={pieceTheme}
              setPieceTheme={setPieceTheme}
              error={profileError}
              onBuy={(code) => void buyCosmetic(code)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>Cancelar</Button>
            <Button onClick={() => void saveProfile()}><Check /> Salvar perfil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingPromotion)} onOpenChange={(open) => { if (!open) setPendingPromotion(null); }}>
        <DialogContent showCloseButton={false} className="promotion-dialog">
          <DialogHeader><DialogTitle>Promover peão</DialogTitle><DialogDescription>Escolha a peça que entrará no tabuleiro.</DialogDescription></DialogHeader>
          <div className="promotion-options">
            {(['q', 'r', 'b', 'n'] as const).map((piece) => (
              <button key={piece} type="button" onClick={() => pendingPromotion && attemptMove(pendingPromotion.from, pendingPromotion.to, piece)}>
                <span>{PIECE_GLYPHS[chess.turn()][piece]}</span><small>{PIECE_NAMES[piece]}</small>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(outcome)} onOpenChange={() => undefined}>
        <DialogContent showCloseButton={false} className="result-dialog">
          <div className="result-icon">{outcome?.winner ? PIECE_GLYPHS[outcome.winner].k : '½'}</div>
          <DialogHeader><DialogTitle>{outcome?.title}</DialogTitle><DialogDescription>{outcome?.detail}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={returnToMenu}>Trocar modo</Button><Button onClick={() => resetGame(mode === 'online' ? 'local' : mode)}>Jogar novamente <RotateCcw /></Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <DialogContent className="profile-dialog">
          <DialogHeader><DialogTitle>Como você prefere jogar?</DialogTitle><DialogDescription>Escolha um ponto de partida. Você poderá mudar tudo durante qualquer partida.</DialogDescription></DialogHeader>
          <div className="onboarding-options">
            <button type="button" onClick={() => { setBeginnerGuide(true); setShowLegalMoves(true); setShowCoordinates(true); setShowLastMove(true); setAlertsEnabled(true); localStorage.setItem('noutychess-onboarding-v1', 'beginner'); setOnboardingOpen(false); }}><BookOpen /><strong>Sou iniciante</strong><small>Guias, casas legais e alertas ligados.</small></button>
            <button type="button" onClick={() => { setBeginnerGuide(false); setShowLegalMoves(false); setShowCoordinates(true); setShowLastMove(true); setAlertsEnabled(true); localStorage.setItem('noutychess-onboarding-v1', 'experienced'); setOnboardingOpen(false); }}><Trophy /><strong>Já sei jogar</strong><small>Interface limpa com último lance e coordenadas.</small></button>
            <button type="button" onClick={() => { localStorage.setItem('noutychess-onboarding-v1', 'custom'); setOnboardingOpen(false); }}><Settings2 /><strong>Personalizar depois</strong><small>Use as configurações durante a partida.</small></button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function PlayerStrip({ color, label, sublabel, seconds, active, captured }: {
  color: Color;
  label: string;
  sublabel: string;
  seconds: number;
  active: boolean;
  captured: PieceSymbol[];
}) {
  return (
    <div className="player-strip">
      <span className={`player-avatar player-avatar-${color}`}>{PIECE_GLYPHS[color].n}</span>
      <span className="player-copy">
        <strong>{label}</strong><small>{sublabel}</small>
        {captured.length > 0 && <span className="captured-row" aria-label={`${captured.length} peças capturadas`}>{captured.map((piece, index) => <span key={`${piece}-${index}`}>{PIECE_GLYPHS[color][piece]}</span>)}</span>}
      </span>
      <span className={`clock ${active ? 'clock-active' : ''}`}><Clock3 /> {formatClock(seconds)}</span>
    </div>
  );
}

const BOARD_SKINS = [
  { id: 'emerald', label: 'Clássico Verde', light: '#d9d8c2', dark: '#4f8778', cost: 0 },
  { id: 'wood', label: 'Madeira Nobre', light: '#e6cfad', dark: '#9a6844', cost: 0 },
  { id: 'midnight', label: 'Meia-noite', light: '#a8b6c8', dark: '#34475d', cost: 0 },
  { id: 'ocean', label: 'Oceano', light: '#b9dce0', dark: '#247488', cost: 2_000, rarity: 'Raro' },
  { id: 'royal', label: 'Realeza', light: '#dfcfae', dark: '#7a4c74', cost: 3_500, rarity: 'Épico' },
  { id: 'obsidian', label: 'Obsidiana', light: '#9f9a8e', dark: '#292d32', cost: 4_800, rarity: 'Lendário' },
  { id: 'aurora', label: 'Aurora Lendária', light: '#d8fff5', dark: '#654bc7', cost: -1, member: true, rarity: 'Clube' },
];
const PIECE_SKINS = [
  { id: 'classic', label: 'Clássicas', cost: 0 },
  { id: 'modern', label: 'Modernas', cost: 0 },
  { id: 'minimal', label: 'Minimalistas', cost: 0 },
  { id: 'neo', label: 'Neo', cost: 2_400, rarity: 'Épico' },
  { id: 'royal', label: 'Dourado real', cost: 6_000, rarity: 'Lendário' },
  { id: 'prisma', label: 'Prisma Lendário', cost: -1, member: true, rarity: 'Clube' },
];
const PROFILE_EMOTES = ['♘', '♛', '♜', '♝', '♚', '⚔️', '🦁', '🐉', '🦉', '🔥', '⚡', '💎'];
const PROFILE_TITLES = ['Desafiante', 'Estrategista', 'Caçador de reis', 'Mestre tático', 'Guardião do centro', 'Lenda da arena'];

type CommunityMessage = { id: number; user_id: string; display_name: string; avatar_emote: string; message: string; room_code: string | null; created_at: number };

function CommunityChat({ authenticated, signInPath, onJoinRoom }: { authenticated: boolean; signInPath: string; onJoinRoom: (code: string) => void }) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/chat', { cache: 'no-store' });
      const body = await response.json() as { messages?: CommunityMessage[] };
      if (body.messages) setMessages(body.messages);
    } catch {
      // Community chat is optional and never blocks the chessboard.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 8_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: draft, roomCode: inviteCode || null }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Mensagem rejeitada.');
      setDraft('');
      setInviteCode('');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar.');
    } finally {
      setSending(false);
    }
  };

  return (
    <details className="community-chat">
      <summary><span><MessageCircle /> Comunidade Nouty</span><small>{messages.length} mensagens recentes</small></summary>
      <div className="community-log">
        {messages.length === 0 ? <p>Seja a primeira pessoa a abrir uma conversa.</p> : messages.slice(-20).map((message) => (
          <div key={message.id}><span>{message.avatar_emote}</span><div><small>{message.display_name}</small><p>{message.message}</p>{message.room_code && <button type="button" onClick={() => onJoinRoom(message.room_code!)}><Gamepad2 /> Entrar na sala {message.room_code}</button>}</div></div>
        ))}
      </div>
      {authenticated ? (
        <form onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 280))} maxLength={280} placeholder="Converse com a comunidade" aria-label="Mensagem para a comunidade" />
          <input className="invite-code-input" value={inviteCode} onChange={(event) => setInviteCode(safeRoomCode(event.target.value))} maxLength={6} placeholder="SALA" aria-label="Código opcional de convite" />
          <Button size="icon" type="submit" disabled={sending || !draft.trim()} aria-label="Enviar à comunidade">{sending ? <LoaderCircle className="spin" /> : <Send />}</Button>
        </form>
      ) : <a className="community-signin" href={signInPath} target="_top"><LogIn /> Entre para conversar e publicar convites</a>}
      {error && <div className="network-error">{error}</div>}
      <Link className="rules-link" href="/regras"><ShieldCheck /> Leia as regras da comunidade</Link>
    </details>
  );
}

function ProfileCustomizer({ profile, name, setName, emote, setEmote, title, setTitle, boardTheme, setBoardTheme, pieceTheme, setPieceTheme, error, onBuy }: {
  profile: CompetitiveProfile;
  name: string;
  setName: (name: string) => void;
  emote: string;
  setEmote: (emote: string) => void;
  title: string;
  setTitle: (title: string) => void;
  boardTheme: string;
  setBoardTheme: (theme: string) => void;
  pieceTheme: string;
  setPieceTheme: (theme: string) => void;
  error: string;
  onBuy: (code: string) => void;
}) {
  const owns = (code: string, free: boolean, member = false) => free || (member && profile.membershipTier === 'legend') || profile.unlockedCosmetics.includes(code);
  return (
    <div className="profile-customizer">
      <div className="profile-preview"><span>{emote}</span><div><small>{title}</small><strong>{name || 'Jogador'}</strong><em>{profile.rating} Elo · {profile.coins} moedas</em></div></div>
      <label className="profile-name-field">Nome público<input value={name} onChange={(event) => setName(event.target.value.slice(0, 24))} minLength={2} maxLength={24} /></label>
      <div className="custom-section"><span><Star /> Emote do perfil</span><div className="emote-grid">{PROFILE_EMOTES.map((item) => <button key={item} type="button" className={emote === item ? 'is-active' : ''} onClick={() => setEmote(item)}>{item}</button>)}</div></div>
      <div className="custom-section"><span><Award /> Insígnia pública</span><div className="title-grid">{PROFILE_TITLES.map((item) => <button key={item} type="button" className={title === item ? 'is-active' : ''} onClick={() => setTitle(item)}>{item}</button>)}</div></div>
      <div className="custom-section"><span><Palette /> Tabuleiros</span><div className="skin-grid">{BOARD_SKINS.map((skin) => {
        const code = `board:${skin.id}`;
        const unlocked = owns(code, skin.cost === 0, skin.member);
        return <div key={skin.id} className={boardTheme === skin.id ? 'is-equipped' : ''}>
          <button type="button" disabled={!unlocked} onClick={() => setBoardTheme(skin.id)}><i style={{ '--skin-light': skin.light, '--skin-dark': skin.dark } as CSSProperties} /><strong>{skin.label}</strong>{unlocked ? <small>{boardTheme === skin.id ? 'Equipado' : skin.cost === 0 ? 'Grátis' : 'Disponível'}</small> : skin.member ? <small><Crown /> Clube Lendário</small> : <small><LockKeyhole /> {skin.cost.toLocaleString('pt-BR')} · {skin.rarity}</small>}</button>
          {!unlocked && (skin.member ? <Link className="member-item-link" href="/clube"><Crown /> Exclusivo do Clube</Link> : <Button size="xs" variant="secondary" onClick={() => onBuy(code)} disabled={profile.coins < skin.cost}><ShoppingBag /> Desbloquear</Button>)}
        </div>;
      })}</div></div>
      <div className="custom-section"><span><Sparkles /> Estilos de peças</span><div className="piece-skin-grid">{PIECE_SKINS.map((skin) => {
        const code = `pieces:${skin.id}`;
        const unlocked = owns(code, skin.cost === 0, skin.member);
        return <div key={skin.id} className={pieceTheme === skin.id ? 'is-equipped' : ''}><button type="button" disabled={!unlocked} onClick={() => setPieceTheme(skin.id)}><b className={`piece-sample sample-${skin.id}`}>♞</b><strong>{skin.label}</strong><small>{unlocked ? (pieceTheme === skin.id ? 'Equipado' : skin.cost === 0 ? 'Grátis' : 'Disponível') : skin.member ? 'Clube Lendário' : `${skin.cost.toLocaleString('pt-BR')} moedas · ${skin.rarity}`}</small></button>{!unlocked && (skin.member ? <Link className="member-item-link" href="/clube"><Crown /> Exclusivo do Clube</Link> : <Button size="xs" variant="secondary" onClick={() => onBuy(code)} disabled={profile.coins < skin.cost}><ShoppingBag /> Desbloquear</Button>)}</div>;
      })}</div></div>
      {error && <div className="network-error">{error}</div>}
    </div>
  );
}

function LegendaryClubCard({ profile, signInPath }: { profile: CompetitiveProfile | null; signInPath: string }) {
  const active = profile?.membershipTier === 'legend';
  return (
    <section className={`legend-club-card ${active ? 'is-member' : ''}`}>
      <div className="legend-club-crown"><Crown /></div>
      <div className="legend-club-copy"><small>{active ? 'MEMBRO LENDÁRIO ATIVO' : 'CLUBE LENDÁRIO'}</small><strong>{active ? 'Sua lenda deixa uma marca.' : 'Uma assinatura para quem vive o jogo.'}</strong><span>Aurora animada, peças Prisma, moldura viva, emotes raros e eventos de membros.</span></div>
      {profile ? <Link href="/clube">{active ? <><Sparkles /> Ver benefícios</> : <><Crown /> Conhecer o Clube</>}</Link> : <a href={signInPath} target="_top"><Crown /> Conhecer o Clube</a>}
    </section>
  );
}

type FriendRow = { pair_key: string; user_id: string; display_name: string; avatar_emote: string; rating: number; online?: number; presence_mode?: string | null };
type FriendRequest = Pick<FriendRow, 'pair_key' | 'user_id' | 'display_name' | 'avatar_emote' | 'rating'>;
type FriendInvite = { id: string; room_code: string; expires_at: number; display_name: string; avatar_emote: string };
type FriendSearchResult = { user_id: string; display_name: string; avatar_emote: string; rating: number; online?: number; presence_mode?: string | null; friendship_status?: string | null; requested_by?: string | null };
type FriendsPayload = { friends: FriendRow[]; requests: FriendRequest[]; sent: Array<{ pair_key: string; display_name: string }>; invites: FriendInvite[] };

function FriendsPanel({ authenticated, signInPath, roomCode, onJoinRoom }: {
  authenticated: boolean;
  signInPath: string;
  roomCode?: string;
  onJoinRoom: (code: string) => void;
}) {
  const [data, setData] = useState<FriendsPayload>({ friends: [], requests: [], sent: [], invites: [] });
  const [friendName, setFriendName] = useState('');
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!authenticated) return;
    try {
      const response = await fetch('/api/friends', { cache: 'no-store' });
      const body = await response.json() as Partial<FriendsPayload> & { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar os amigos.');
      setData({ friends: body.friends ?? [], requests: body.requests ?? [], sent: body.sent ?? [], invites: body.invites ?? [] });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os amigos.');
    }
  }, [authenticated]);

  useEffect(() => {
    void load();
    if (!authenticated) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 12_000);
    return () => window.clearInterval(timer);
  }, [authenticated, load]);

  useEffect(() => {
    if (!authenticated || friendName.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/friends?q=${encodeURIComponent(friendName.trim())}`, { cache: 'no-store' })
        .then(async (response) => {
          const body = await response.json() as { search?: FriendSearchResult[]; error?: string };
          if (!response.ok) throw new Error(body.error ?? 'Busca indisponível.');
          setSearchResults(body.search ?? []);
        })
        .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Busca indisponível.'));
    }, 320);
    return () => window.clearTimeout(timer);
  }, [authenticated, friendName]);

  const act = async (action: string, payload: Record<string, unknown> = {}) => {
    setBusy(`${action}:${String(payload.pairKey ?? payload.friendId ?? '')}`);
    setError('');
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const body = await response.json() as { error?: string; roomCode?: string };
      if (!response.ok) throw new Error(body.error ?? 'A operação foi rejeitada.');
      if (body.roomCode) onJoinRoom(body.roomCode);
      if (action === 'request') {
        setFriendName('');
        setSearchResults([]);
      }
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'A operação falhou.');
    } finally {
      setBusy('');
    }
  };

  if (!authenticated) {
    return <div className="friends-guest"><UsersRound /><span><strong>Amigos e convites</strong><small>Entre para montar sua lista e chamar para uma sala em um toque.</small></span><a href={signInPath} target="_top"><LogIn /> Entrar</a></div>;
  }

  const notifications = data.requests.length + data.invites.length;
  return (
    <details className="friends-panel" open={Boolean(roomCode)}>
      <summary><span><UsersRound /> Amigos {notifications > 0 && <b>{notifications}</b>}</span><small>{data.friends.length} adicionados</small></summary>
      <div className="friend-search">
        <Search />
        <input value={friendName} onChange={(event) => setFriendName(event.target.value.replace(/[<>]/g, '').slice(0, 24))} placeholder="Buscar jogador pelo nome" minLength={2} maxLength={24} aria-label="Buscar jogador pelo nome" />
      </div>
      {searchResults.length > 0 && <div className="friend-results">{searchResults.map((result) => (
        <div className="friend-result" key={result.user_id}>
          <span>{result.avatar_emote}</span>
          <span><strong>{result.display_name}</strong><small><i className={`presence-dot ${Number(result.online) === 1 ? 'online' : ''}`} />{Number(result.online) === 1 ? result.presence_mode === 'playing' ? 'Em partida' : result.presence_mode === 'matchmaking' ? 'Procurando partida' : 'Online' : 'Offline'} · {result.rating} Elo</small></span>
          {result.friendship_status === 'accepted' ? <small>Amigo</small> : result.friendship_status === 'pending' ? <small>Pendente</small> : <Button size="xs" disabled={Boolean(busy)} onClick={() => void act('request', { friendId: result.user_id })}><UserPlus /> Adicionar</Button>}
        </div>
      ))}</div>}
      {data.invites.map((invite) => <div className="friend-alert" key={invite.id}><span>{invite.avatar_emote}</span><div><strong>{invite.display_name} chamou você</strong><small>Sala {invite.room_code}</small></div><Button size="xs" onClick={() => void act('accept-invite', { inviteId: invite.id })}><Gamepad2 /> Jogar</Button></div>)}
      {data.requests.map((request) => <div className="friend-alert" key={request.pair_key}><span>{request.avatar_emote}</span><div><strong>{request.display_name}</strong><small>{request.rating} Elo quer ser seu amigo</small></div><Button size="xs" disabled={Boolean(busy)} onClick={() => void act('accept', { pairKey: request.pair_key })}><Heart /> Aceitar</Button><Button size="xs" variant="ghost" disabled={Boolean(busy)} onClick={() => void act('remove', { pairKey: request.pair_key })}>Recusar</Button></div>)}
      <div className="friend-list">
        {data.friends.length === 0 ? <p>Busque pelo nome para criar sua primeira rivalidade amistosa.</p> : data.friends.map((friend) => (
          <div key={friend.pair_key}><span>{friend.avatar_emote}</span><div><strong>{friend.display_name}</strong><small><i className={`presence-dot ${Number(friend.online) === 1 ? 'online' : ''}`} />{Number(friend.online) === 1 ? friend.presence_mode === 'playing' ? 'Em partida' : friend.presence_mode === 'matchmaking' ? 'Procurando' : 'Online' : 'Offline'} · {friend.rating} Elo</small></div>{roomCode && <Button size="xs" variant="secondary" disabled={Boolean(busy)} onClick={() => void act('invite', { friendId: friend.user_id, roomCode })}><Send /> Convidar</Button>}<button type="button" className="friend-remove" onClick={() => void act('remove', { pairKey: friend.pair_key })} aria-label={`Remover ${friend.display_name}`}>Remover</button></div>
        ))}
      </div>
      {data.sent.length > 0 && <small className="friend-pending">Aguardando: {data.sent.map((item) => item.display_name).join(', ')}</small>}
      {error && <div className="network-error">{error}</div>}
    </details>
  );
}

function MenuPanel({ difficulty, setDifficulty, teacher, setTeacher, timeControl, setTimeControl, profile, leaderboard, signInPath, guestName, setGuestName, onEditProfile, onCommunityJoin, onComputer, onLocal, onOnline }: {
  difficulty: AiDifficulty;
  setDifficulty: (difficulty: AiDifficulty) => void;
  teacher: AiPersonality;
  setTeacher: (teacher: AiPersonality) => void;
  timeControl: TimeControlId;
  setTimeControl: (control: TimeControlId) => void;
  profile: CompetitiveProfile | null;
  leaderboard: LeaderboardEntry[];
  signInPath: string;
  guestName: string;
  setGuestName: (name: string) => void;
  onEditProfile: () => void;
  onCommunityJoin: (code: string) => void;
  onComputer: () => void;
  onLocal: () => void;
  onOnline: () => void;
}) {
  return (
    <>
      <div className="eyebrow"><Sparkles /> Arena Nouty</div>
      <h1>Seu próximo grande lance começa aqui.</h1>
      <p className="panel-intro">Jogue online primeiro. Depois treine, evolua e construa sua identidade na arena.</p>

      {!profile && (
        <label className="guest-identity"><span><CircleUserRound /><span><strong>Jogar como convidado</strong><small>Sem cadastro. Digite apenas seu nome.</small></span></span><input value={guestName} onChange={(event) => setGuestName(event.target.value.replace(/[<>]/g, '').slice(0, 24))} minLength={2} maxLength={24} aria-label="Seu nome de convidado" /></label>
      )}

      <div className="mode-list mode-list-priority">
        <button className="mode-card mode-card-ranked" type="button" onClick={onOnline}>
          <span className="mode-icon"><Globe2 /></span><span><small>PRINCIPAL</small><strong>JOGAR ONLINE</strong><small>Partida rápida, sala com código ou convite de amigo</small><LivePresence /></span><span aria-hidden="true">→</span>
        </button>
        <button className="mode-card mode-card-primary" type="button" onClick={onComputer}><span className="mode-icon"><Bot /></span><span><strong>Academia com professores</strong><small>Niclaus e Damon ensinam enquanto jogam</small></span><span aria-hidden="true">→</span></button>
        <button className="mode-card" type="button" onClick={onLocal}><span className="mode-icon"><CircleUserRound /></span><span><strong>Amigo no mesmo aparelho</strong><small>Partida local para dois</small></span><span aria-hidden="true">→</span></button>
      </div>

      <CompetitiveHub profile={profile} leaderboard={leaderboard} signInPath={signInPath} onEditProfile={onEditProfile} />
      <FriendsPanel authenticated={Boolean(profile)} signInPath={signInPath} onJoinRoom={onCommunityJoin} />
      <LegendaryClubCard profile={profile} signInPath={signInPath} />
      <CommunityChat authenticated={Boolean(profile)} signInPath={signInPath} onJoinRoom={onCommunityJoin} />

      <div className="setting-block"><span className="setting-label"><Clock3 /> Ritmo</span><div className="segmented segmented-time">{(Object.keys(TIME_CONTROLS) as TimeControlId[]).map((control) => <button key={control} type="button" className={timeControl === control ? 'is-active' : ''} onClick={() => setTimeControl(control)}><strong>{TIME_CONTROLS[control].label}</strong><small>{TIME_CONTROLS[control].hint}</small></button>)}</div></div>
      <div className="setting-block"><span className="setting-label"><Award /> Professor da academia</span><div className="teacher-picker"><button type="button" className={teacher === 'niclaus' ? 'is-active' : ''} onClick={() => setTeacher('niclaus')}><span>🦉</span><strong>Niclaus</strong><small>Calmo e didático</small></button><button type="button" className={teacher === 'damon' ? 'is-active' : ''} onClick={() => setTeacher('damon')}><span>🐉</span><strong>Damon</strong><small>Direto e tático</small></button></div></div>
      <div className="setting-block"><span className="setting-label"><MonitorCog /> Dificuldade da academia</span><div className="segmented segmented-four">{(['easy', 'medium', 'hard', 'expert'] as AiDifficulty[]).map((level) => <button key={level} type="button" className={difficulty === level ? 'is-active' : ''} onClick={() => setDifficulty(level)}>{DIFFICULTY_LABELS[level]}</button>)}</div></div>
      <div className="status-note"><span /> Motor oficial pronto para jogar</div>
    </>
  );
}

function LivePresence() {
  const [presence, setPresence] = useState({ online: 0, matchmaking: 0 });
  useEffect(() => {
    const load = () => void fetch('/api/presence', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json() as { online?: number; matchmaking?: number };
      setPresence({ online: Number(body.online ?? 0), matchmaking: Number(body.matchmaking ?? 0) });
    }).catch(() => undefined);
    load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="live-presence"><i /> {presence.online} online{presence.matchmaking > 0 ? ` · ${presence.matchmaking} pareando` : ''}</span>;
}

function CompetitiveHub({ profile, leaderboard, signInPath, onEditProfile }: {
  profile: CompetitiveProfile | null;
  leaderboard: LeaderboardEntry[];
  signInPath: string;
  onEditProfile: () => void;
}) {
  if (!profile) {
    return <div className="competitive-guest"><div><Medal /><span><strong>Ranking competitivo</strong><small>Salve Elo, moedas, níveis e insígnias. Entrar é opcional.</small></span></div><a href={signInPath} target="_top"><LogIn /> Entrar para competir</a></div>;
  }
  const division = divisionClient(profile.rating);
  const next = division.ceiling >= 3000 ? 3000 : division.ceiling + 1;
  const progress = Math.max(0, Math.min(100, ((profile.rating - division.floor) / Math.max(1, next - division.floor)) * 100));
  return (
    <div className="competitive-hub">
      <button type="button" className="rank-card" onClick={onEditProfile}><span className="rank-emote">{profile.avatarEmote}</span><span><small>{profile.profileTitle}</small><strong>{profile.displayName}</strong><em>{division.name} · {profile.rating} Elo</em></span><span className="rank-level">Nv. {profile.level}</span><i><b style={{ width: `${progress}%` }} /></i></button>
      <div className="reward-strip"><span><Star /> {profile.xp} XP</span><span><span className="coin-dot">N</span> {profile.coins} moedas</span><span><TrendingUp /> {profile.winStreak} sequência</span></div>
      <div className="mini-ranking"><div><strong><Trophy /> Top da arena</strong><small>Temporada atual</small></div>{leaderboard.slice(0, 3).map((entry) => <span key={entry.userId}><b>#{entry.rank}</b><i>{entry.avatarEmote}</i><strong>{entry.displayName}</strong><em>{entry.rating}</em></span>)}{leaderboard.length === 0 && <p>O primeiro lugar ainda está esperando por você.</p>}</div>
    </div>
  );
}

function OnlineLobby({ phase, roomCode, joinCode, setJoinCode, error, authenticated, signInPath, guestName, setGuestName, matchmaking, onQuickMatch, onCreate, onJoin, onCancel }: {
  phase: OnlinePhase;
  roomCode: string;
  joinCode: string;
  setJoinCode: (value: string) => void;
  error: string;
  authenticated: boolean;
  signInPath: string;
  guestName: string;
  setGuestName: (name: string) => void;
  matchmaking: boolean;
  onQuickMatch: () => void;
  onCreate: () => void;
  onJoin: () => void;
  onCancel: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  const inviteUrl = roomCode
    ? `https://wa.me/?text=${encodeURIComponent(`♟️ Te desafio para uma partida no NoutyChess! Código da sala: ${roomCode}\nhttps://noutychess.pro`)}`
    : `https://wa.me/?text=${GENERAL_WHATSAPP_TEXT}`;
  return (
    <div className="online-lobby">
      <div className="eyebrow"><Globe2 /> JOGAR ONLINE</div>
      <h2>Encontre seu próximo rival.</h2>
      <LivePresence />
      <p>Pareamento competitivo ou sala privada. Resultados ranqueados são validados antes de atualizar o Elo.</p>
      {phase === 'waiting' ? (
        <>
          <div className="room-code-card">
            <small>{matchmaking ? 'PAREAMENTO ATIVO' : 'SEU CÓDIGO'}</small><strong>{roomCode}</strong>
            <div className="room-share-actions">
              <Button variant="secondary" onClick={() => void copyCode()}><Copy /> {copied ? 'Copiado' : 'Copiar código'}</Button>
              <a className="whatsapp-invite" href={inviteUrl} target="_blank" rel="noreferrer"><Share2 /> WhatsApp</a>
            </div>
            <span><LoaderCircle className="spin" /> {matchmaking ? 'Procurando adversário…' : 'Aguardando seu amigo…'}</span>
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
          </div>
          <FriendsPanel authenticated={authenticated} signInPath={signInPath} roomCode={roomCode} onJoinRoom={(code) => setJoinCode(code)} />
        </>
      ) : (
        <>
          {!authenticated && <label className="guest-identity guest-identity-online"><span><CircleUserRound /><span><strong>Seu nome na sala</strong><small>O login continua opcional.</small></span></span><input value={guestName} onChange={(event) => setGuestName(event.target.value.replace(/[<>]/g, '').slice(0, 24))} minLength={2} maxLength={24} /></label>}
          {authenticated ? <Button className="quick-match-button" onClick={onQuickMatch} disabled={phase === 'connecting'}>{phase === 'connecting' ? <LoaderCircle className="spin" /> : <Target />} PARTIDA RÁPIDA</Button> : <a className="quick-signin" href={signInPath} target="_top"><LogIn /> Entre para buscar partida ranqueada</a>}
          <div className="join-divider"><span /> jogar com amigo <span /></div>
          <Button className="create-room-button" onClick={onCreate} disabled={phase === 'connecting'}>{phase === 'connecting' ? <LoaderCircle className="spin" /> : <Wifi />} Criar sala privada</Button>
          <div className="join-divider"><span /> entrar com código <span /></div>
          <div className="join-row"><input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="CÓDIGO" maxLength={6} aria-label="Código da sala" /><Button onClick={onJoin} disabled={phase === 'connecting' || joinCode.length !== 6}>Entrar</Button></div>
        </>
      )}
      {error && <div className="network-error"><WifiOff /> {error}</div>}
    </div>
  );
}

function TeacherChat({ teacher, messages, question, setQuestion, busy, onAsk }: {
  teacher: AiPersonality;
  messages: TeacherChatMessage[];
  question: string;
  setQuestion: (value: string) => void;
  busy: boolean;
  onAsk: (help: 'explain' | 'hint' | 'orientation' | 'move', question?: string) => void;
}) {
  return (
    <section className="teacher-chat">
      <div className="section-heading"><span><MessageCircle /> Chat com {teacher === 'niclaus' ? 'Niclaus' : 'Damon'}</span><small>contexto do tabuleiro</small></div>
      <div className="teacher-chat-actions">
        <Button size="xs" variant="secondary" disabled={busy} onClick={() => onAsk('hint', 'Me dê apenas uma pista, sem revelar o lance.')}><Lightbulb /> Pista</Button>
        <Button size="xs" variant="secondary" disabled={busy} onClick={() => onAsk('orientation', 'Qual ideia devo procurar nesta posição?')}><BookOpen /> Orientação</Button>
        <Button size="xs" disabled={busy} onClick={() => onAsk('move', 'Mostre uma sugestão de lance e explique por que ela faz sentido.')}><Target /> Sugerir lance</Button>
      </div>
      <div className="teacher-chat-log">
        {messages.length === 0 ? <p>Pergunte sobre a posição, uma regra, abertura ou estratégia. Sugestões de lance ficam somente na Academia.</p> : messages.map((message) => <p key={message.id}><strong>{message.author}:</strong> {message.text}</p>)}
        {busy && <p><LoaderCircle className="spin" /> O professor está analisando…</p>}
      </div>
      <form className="teacher-chat-form" onSubmit={(event) => { event.preventDefault(); if (question.trim()) onAsk('explain'); }}>
        <input value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 500))} maxLength={500} placeholder="Pergunte: por que este lance foi ruim?" aria-label="Pergunta para o professor" />
        <Button size="icon" type="submit" disabled={busy || !question.trim()} aria-label="Perguntar ao professor"><Send /></Button>
      </form>
    </section>
  );
}

function GamePreferences(props: {
  audioEnabled: boolean; setAudioEnabled: (value: boolean) => void;
  audioVolume: number; setAudioVolume: (value: number) => void;
  showLegalMoves: boolean; setShowLegalMoves: (value: boolean) => void;
  showCoordinates: boolean; setShowCoordinates: (value: boolean) => void;
  showLastMove: boolean; setShowLastMove: (value: boolean) => void;
  showThreats: boolean; setShowThreats: (value: boolean) => void;
  beginnerGuide: boolean; setBeginnerGuide: (value: boolean) => void;
  alertsEnabled: boolean; setAlertsEnabled: (value: boolean) => void;
  animationsEnabled: boolean; setAnimationsEnabled: (value: boolean) => void;
}) {
  const rows: Array<[string, boolean, (value: boolean) => void, ReactNode]> = [
    ['Sons', props.audioEnabled, props.setAudioEnabled, props.audioEnabled ? <Volume2 /> : <VolumeX />],
    ['Casas legais', props.showLegalMoves, props.setShowLegalMoves, <Target />],
    ['Coordenadas', props.showCoordinates, props.setShowCoordinates, <Gamepad2 />],
    ['Último lance', props.showLastMove, props.setShowLastMove, <History />],
    ['Alertas de peças', props.showThreats, props.setShowThreats, <Bell />],
    ['Guia para iniciantes', props.beginnerGuide, props.setBeginnerGuide, <BookOpen />],
    ['Alertas da partida', props.alertsEnabled, props.setAlertsEnabled, props.alertsEnabled ? <Bell /> : <BellOff />],
    ['Animações', props.animationsEnabled, props.setAnimationsEnabled, <Sparkles />],
  ];
  return (
    <details className="game-preferences">
      <summary><span><Settings2 /> Configurações da partida</span><small>alterar sem sair</small></summary>
      <div className="game-preferences-body">
        <label className="preference-volume"><span>Volume</span><input type="range" min="10" max="100" step="5" value={Math.round(props.audioVolume * 100)} onChange={(event) => props.setAudioVolume(Math.max(0.1, Math.min(1, Number(event.target.value) / 100)))} /><output>{Math.round(props.audioVolume * 100)}%</output></label>
        {rows.map(([label, enabled, setter, icon]) => <div className="preference-row" key={label}><span>{icon} {label}</span><button type="button" className={enabled ? 'is-on' : ''} onClick={() => setter(!enabled)}>{enabled ? 'Ligado' : 'Desligado'}</button></div>)}
      </div>
    </details>
  );
}

type NotificationItem = { id: string; kind: string; title: string; message: string; created_at: number; read_at: number | null };
function NotificationsMenu() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const body = await response.json() as { notifications?: NotificationItem[]; unread?: number };
      if (response.ok) {
        setItems(body.notifications ?? []);
        setUnread(Number(body.unread ?? 0));
      }
    } catch {
      // Notifications are non-blocking.
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 20_000);
    return () => window.clearInterval(timer);
  }, [load]);
  const readAll = async () => {
    await fetch('/api/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'read-all' }) }).catch(() => undefined);
    setUnread(0);
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? Date.now() })));
  };
  return (
    <details className="notification-menu" onToggle={(event) => { if ((event.currentTarget as HTMLDetailsElement).open && unread > 0) void readAll(); }}>
      <summary aria-label={`${unread} notificações não lidas`}><Bell />{unread > 0 && <b>{Math.min(unread, 9)}</b>}</summary>
      <div>{items.length === 0 ? <p>Nenhuma novidade.</p> : items.slice(0, 8).map((item) => <article key={item.id}><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString('pt-BR')}</small></article>)}</div>
    </details>
  );
}

function MoveHistory({ moves }: { moves: Move[] }) {
  if (moves.length === 0) return <div className="empty-history">Os lances aparecerão aqui.</div>;
  const pairs: Array<{ number: number; white?: Move; black?: Move }> = [];
  moves.forEach((move, index) => {
    const pairIndex = Math.floor(index / 2);
    if (!pairs[pairIndex]) pairs[pairIndex] = { number: pairIndex + 1 };
    if (move.color === 'w') pairs[pairIndex].white = move;
    else pairs[pairIndex].black = move;
  });
  return <div className="move-history">{pairs.map((pair) => <div key={pair.number}><span>{pair.number}.</span><strong>{pair.white?.san ?? '…'}</strong><strong>{pair.black?.san ?? ''}</strong></div>)}</div>;
}
