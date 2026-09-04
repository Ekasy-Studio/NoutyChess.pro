import { Chess, type Move } from 'chess.js';
import { NextResponse } from 'next/server';

import { chooseAiMove, type AiDifficulty, type AiPersonality } from '@/lib/chess-ai';
import { conceptExplanation, detectOpening, findConcept, TEACHERS, type TeachingLevel } from '@/lib/chess-knowledge';
import { RequestSecurityError, requireSameOriginJsonMutation } from '@/lib/request-security';

export const dynamic = 'force-dynamic';

function cleanQuestion(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function teachingLevel(value: unknown): TeachingLevel {
  return value === 'advanced' || value === 'intermediate' ? value : 'beginner';
}

function teacherId(value: unknown): AiPersonality {
  return value === 'damon' ? 'damon' : 'niclaus';
}

function aiDifficulty(level: TeachingLevel): AiDifficulty {
  if (level === 'advanced') return 'hard';
  if (level === 'intermediate') return 'medium';
  return 'easy';
}

function moveDescription(chess: Chess, moveInput: { from: string; to: string; promotion?: string } | null): { san: string; explanation: string } | null {
  if (!moveInput) return null;
  const clone = new Chess(chess.fen());
  try {
    const move = clone.move(moveInput as Parameters<Chess['move']>[0]) as Move;
    const reasons: string[] = [];
    if (move.san.includes('#')) reasons.push('finaliza a partida com xeque-mate');
    else if (move.san.includes('+')) reasons.push('ganha tempo com xeque');
    if (move.captured) reasons.push('realiza uma captura concreta');
    if (move.isKingsideCastle() || move.isQueensideCastle()) reasons.push('melhora a segurança do rei e conecta as torres');
    if (['d4', 'e4', 'd5', 'e5'].includes(move.to)) reasons.push('aumenta a presença no centro');
    if (move.piece === 'n' || move.piece === 'b') reasons.push('melhora a atividade de uma peça menor');
    if (move.promotion) reasons.push(`promove o peão para ${move.promotion.toUpperCase()}`);
    return { san: move.san, explanation: reasons.length ? reasons.join(', ') : 'melhora a posição segundo a análise local disponível' };
  } catch {
    return null;
  }
}

function teacherVoice(teacher: AiPersonality, message: string): string {
  if (teacher === 'damon') return `${message} Procure a ameaça antes de jogar no automático.`;
  return `${message} Observe a posição e tente explicar o motivo do lance com suas próprias palavras.`;
}

export async function POST(request: Request) {
  try {
    requireSameOriginJsonMutation(request);
  } catch (error) {
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const fen = typeof body.fen === 'string' ? body.fen.slice(0, 120) : '';
    const question = cleanQuestion(body.question);
    const teacher = teacherId(body.teacher);
    const level = teachingLevel(body.level);
    const help = body.help === 'move' ? 'move' : body.help === 'orientation' ? 'orientation' : body.help === 'hint' ? 'hint' : 'explain';
    const history = Array.isArray(body.history) ? body.history.filter((item): item is string => typeof item === 'string').slice(-30) : [];
    if (!fen || !question) return NextResponse.json({ error: 'Posição e pergunta são obrigatórias.' }, { status: 400 });

    let chess: Chess;
    try {
      chess = new Chess(fen);
    } catch {
      return NextResponse.json({ error: 'A posição enviada é inválida.' }, { status: 400 });
    }

    const concept = findConcept(question);
    const opening = detectOpening(history);
    const inCheck = chess.inCheck();
    const gameOver = chess.isGameOver();
    const legalMoves = chess.moves({ verbose: true });
    let message = '';
    let suggestedMove: { san: string; from: string; to: string; promotion?: string } | null = null;

    if (gameOver) {
      if (chess.isCheckmate()) message = 'A posição já terminou em xeque-mate. O ponto principal agora é reconstruir onde a defesa deixou de funcionar.';
      else message = 'A partida já terminou. Podemos usar esta posição para entender a causa do empate ou o momento crítico anterior.';
    } else if (concept) {
      message = `${concept.title}: ${conceptExplanation(concept, level)}`;
    } else if (/posso rocar|posso fazer roque|rocar agora/i.test(question)) {
      const castles = legalMoves.filter((move) => move.isKingsideCastle() || move.isQueensideCastle());
      message = castles.length
        ? `Sim. Nesta posição existe roque legal: ${castles.map((move) => move.san).join(' ou ')}.`
        : 'Não há roque legal nesta posição. Verifique se rei ou torre já se moveram, se existem peças no caminho, se o rei está em xeque ou se atravessaria uma casa atacada.';
    } else if (/xeque|check/i.test(question)) {
      message = inCheck
        ? `Sim. ${chess.turn() === 'w' ? 'As brancas' : 'As pretas'} estão em xeque e precisam responder à ameaça antes de qualquer outro plano.`
        : 'O rei do lado que joga não está em xeque nesta posição. Ainda assim, vale conferir ameaças de um lance e peças sem defesa.';
    } else if (/abertura|opening|que abertura|qual abertura/i.test(question) && opening) {
      message = `A sequência se encaixa em ${opening.name} (${opening.eco}). Ideias centrais: ${opening.ideas.join(', ')}. Um erro comum é ${opening.commonMistakes[0].toLowerCase()}.`;
    } else {
      message = inCheck
        ? 'Comece pelas respostas ao xeque: capture o atacante, bloqueie a linha quando for possível ou mova o rei para uma casa segura.'
        : 'Antes de escolher um lance, procure nesta ordem: xeques, capturas, ameaças, peças soltas, desenvolvimento e segurança dos reis.';
    }

    if (help === 'hint' || help === 'orientation' || help === 'move') {
      const choice = chooseAiMove(new Chess(chess.fen()), aiDifficulty(level), teacher);
      const described = moveDescription(chess, choice ? { from: choice.from, to: choice.to, promotion: choice.promotion } : null);
      if (described && choice) {
        if (help === 'hint') {
          message = teacher === 'damon'
            ? 'Pista: existe um lance que melhora sua iniciativa. Procure primeiro peças expostas, xeques e ataques duplos.'
            : 'Pista: compare suas peças e encontre qual delas pode ficar mais ativa sem comprometer a segurança do rei.';
        } else if (help === 'orientation') {
          message = `Orientação: procure um lance com a ideia de ${described.explanation}. Tente encontrá-lo antes de revelar a resposta.`;
        } else {
          message = `Sugestão: ${described.san}. A ideia principal é que o lance ${described.explanation}.`;
          suggestedMove = { san: described.san, from: choice.from, to: choice.to, promotion: choice.promotion };
        }
      }
    }

    if (opening && help === 'explain' && !/abertura|opening/i.test(question)) {
      message += ` Contexto de abertura: você está em uma estrutura relacionada a ${opening.name}.`;
    }

    return NextResponse.json({
      ok: true,
      teacher,
      teacherName: TEACHERS[teacher].name,
      message: teacherVoice(teacher, message),
      suggestedMove,
      context: {
        inCheck,
        legalMoveCount: legalMoves.length,
        opening: opening ? { name: opening.name, eco: opening.eco } : null,
      },
      source: 'local-coach',
    });
  } catch {
    return NextResponse.json({ error: 'O professor local não conseguiu analisar esta pergunta.' }, { status: 500 });
  }
}
