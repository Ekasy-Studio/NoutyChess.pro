'use client';

import { Award, Ban, Crown, DoorClosed, Eye, Gamepad2, Gift, MessageCircle, Palette, Radio, RefreshCw, Save, Settings, ShieldCheck, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type AdminData = {
  counters: { users: number; unique_visitors: number; sessions: number; online_players: number; active_rooms: number; matchmaking_players: number; games: number; banned: number };
  users: Array<Record<string, unknown>>;
  rooms: Array<Record<string, unknown>>;
  games: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  chat: Array<Record<string, unknown>>;
  settings: Record<string, unknown> | null;
  presence: Array<Record<string, unknown>>;
  membershipRequests: Array<Record<string, unknown>>;
  serverTime?: number;
};
type Tab = 'players' | 'online' | 'club' | 'rooms' | 'games' | 'chat' | 'settings' | 'audit';

type AdminActionResponse = {
  ok?: boolean;
  error?: string;
  duplicate?: boolean;
  persisted?: Record<string, unknown> | null;
  giftId?: string;
};

export function AdminDashboard({ adminName }: { adminName: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>('players');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null);
  const [rating, setRating] = useState('1200');
  const [coins, setCoins] = useState('0');
  const [days, setDays] = useState('7');
  const [muteMinutes, setMuteMinutes] = useState('60');
  const [memberDays, setMemberDays] = useState('30');
  const [cosmeticCode, setCosmeticCode] = useState('board:ocean');
  const [pixKey, setPixKey] = useState('');
  const [pixDirty, setPixDirty] = useState(false);
  const [rewardCoins, setRewardCoins] = useState('100');
  const [rewardXp, setRewardXp] = useState('100');
  const [badge, setBadge] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch('/api/admin', { cache: 'no-store' });
      const body = await response.json() as AdminData & { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Falha ao carregar dados.');
      setData(body);
      if (!pixDirty) setPixKey(String(body.settings?.value ?? ''));
      setError('');
      if (selectedUser) {
        const refreshed = body.users.find((user) => user.user_id === selectedUser.user_id);
        if (refreshed) setSelectedUser(refreshed);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar o painel.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pixDirty, selectedUser]);

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    const timer = window.setInterval(refreshIfVisible, 6_000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [load]);

  const act = async (payload: Record<string, unknown>, reasonOverride?: string) => {
    const auditReason = (reasonOverride ?? reason).trim();
    if (!auditReason) {
      setError('Informe um motivo para a trilha de auditoria.');
      return;
    }
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, reason: auditReason }),
      });
      const body = await response.json() as AdminActionResponse;
      if (!response.ok) throw new Error(body.error ?? 'A operação foi rejeitada.');
      if (body.persisted?.user_id) {
        setSelectedUser(body.persisted);
        setRating(String(body.persisted.rating ?? rating));
        setCoins(String(body.persisted.coins ?? coins));
      }
      if (payload.action === 'update-pix') setPixDirty(false);
      setReason('');
      setNotice(body.duplicate ? 'A ação já havia sido aplicada e não foi duplicada.' : 'Salvo com sucesso no banco.');
      await load(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'A operação falhou.');
    }
  };

  const chooseUser = (user: Record<string, unknown>) => {
    setSelectedUser(user);
    setRating(String(user.rating ?? 1200));
    setCoins(String(user.coins ?? 0));
    setNotice('');
    setError('');
  };

  const promptReason = (label: string) => window.prompt(label)?.trim() ?? '';

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="brand" href="/"><span className="brand-mark">♘</span><span><strong>NoutyChess.pro</strong><small>Controle central</small></span></Link>
        <div><small>ADMINISTRADOR</small><strong>{adminName}</strong></div>
        <Button variant="secondary" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={refreshing ? 'spin' : ''} /> {refreshing ? 'Sincronizando' : 'Atualizar'}</Button>
      </header>

      <section className="admin-hero">
        <div><span><ShieldCheck /> PAINEL SEGURO</span><h1>Central de comando</h1><p>Jogadores, partidas, Clube, presentes e moderação com sincronização automática.</p></div>
        <div className="admin-live"><i /> Atualização ao vivo · 6s</div>
      </section>

      <section className="admin-metrics">
        <Metric icon={<Eye />} label="Visitantes únicos" value={data?.counters?.unique_visitors ?? 0} />
        <Metric icon={<Radio />} label="Online agora" value={data?.counters?.online_players ?? 0} />
        <Metric icon={<Users />} label="Jogadores" value={data?.counters?.users ?? 0} />
        <Metric icon={<Gamepad2 />} label="Procurando partida" value={data?.counters?.matchmaking_players ?? 0} />
        <Metric icon={<Trophy />} label="Partidas ranqueadas" value={data?.counters?.games ?? 0} />
        <Metric icon={<Ban />} label="Suspensões" value={data?.counters?.banned ?? 0} />
      </section>

      {notice && <div className="admin-success"><ShieldCheck /> {notice}</div>}
      {error && <div className="admin-error">{error}</div>}

      <section className="admin-workspace">
        <nav className="admin-tabs" aria-label="Áreas administrativas">
          {([['players', 'Jogadores'], ['online', 'Online agora'], ['club', `Clube${data?.membershipRequests?.length ? ` (${data.membershipRequests.length})` : ''}`], ['rooms', 'Salas'], ['games', 'Partidas'], ['chat', 'Chat'], ['settings', 'Configurações'], ['audit', 'Auditoria']] as const).map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>

        {loading ? <div className="admin-loading"><RefreshCw className="spin" /> Carregando dados protegidos…</div> : (
          <>
            {tab === 'players' && (
              <div className="admin-grid-split">
                <div className="admin-table-wrap">
                  <table><thead><tr><th>Jogador</th><th>Elo</th><th>Partidas</th><th>Moedas</th><th>Clube</th><th>Status</th></tr></thead>
                    <tbody>{data?.users.map((user) => (
                      <tr key={String(user.user_id)} onClick={() => chooseUser(user)} className={selectedUser?.user_id === user.user_id ? 'is-selected' : ''}>
                        <td><strong>{String(user.display_name)}</strong><small>{String(user.user_id).slice(0, 12)}…</small></td>
                        <td>{String(user.rating)}</td><td>{String(user.games)}</td><td>{String(user.coins)}</td><td>{user.membership_tier === 'legend' && Number(user.member_until) > Date.now() ? 'Lendário' : '—'}</td>
                        <td><span className={Number(user.banned_until) > Date.now() ? 'status-banned' : 'status-ok'}>{Number(user.banned_until) > Date.now() ? 'Suspenso' : 'Ativo'}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <aside className="admin-editor">
                  <h2><Crown /> Controle do jogador</h2>
                  {selectedUser ? (
                    <>
                      <strong className="selected-player">{String(selectedUser.display_name)}</strong>
                      <label>Elo<input value={rating} onChange={(event) => setRating(event.target.value)} inputMode="numeric" /></label>
                      <label>Moedas<input value={coins} onChange={(event) => setCoins(event.target.value)} inputMode="numeric" /></label>
                      <label>Dias de suspensão<input value={days} onChange={(event) => setDays(event.target.value)} inputMode="numeric" /></label>
                      <label>Minutos sem chat<input value={muteMinutes} onChange={(event) => setMuteMinutes(event.target.value)} inputMode="numeric" /></label>
                      <label>Dias de Clube<input value={memberDays} onChange={(event) => setMemberDays(event.target.value)} inputMode="numeric" /></label>
                      <label>Cosmético<select value={cosmeticCode} onChange={(event) => setCosmeticCode(event.target.value)}><option value="board:ocean">Tabuleiro Oceano</option><option value="board:royal">Tabuleiro Realeza</option><option value="board:obsidian">Tabuleiro Obsidiana</option><option value="pieces:neo">Peças Neo</option><option value="pieces:royal">Peças Dourado real</option></select></label>
                      <div className="admin-reward-box"><strong><Award /> Recompensa / presente</strong><label>Moedas<input value={rewardCoins} onChange={(event) => setRewardCoins(event.target.value)} inputMode="numeric" /></label><label>XP<input value={rewardXp} onChange={(event) => setRewardXp(event.target.value)} inputMode="numeric" /></label><label>Insígnia<select value={badge} onChange={(event) => setBadge(event.target.value)}><option value="">Sem insígnia</option><option value="fundador">Fundador</option><option value="fair-play">Fair Play</option><option value="campeao-evento">Campeão de evento</option><option value="apoiador-ekasy">Apoiador Ekasy-Studio</option><option value="lenda-comunidade">Lenda da comunidade</option></select></label></div>
                      <label>Motivo<textarea value={reason} onChange={(event) => setReason(event.target.value.slice(0, 240))} maxLength={240} placeholder="Por que esta ação está sendo feita?" /></label>
                      <div className="admin-editor-actions">
                        <Button onClick={() => void act({ action: 'adjust-player', userId: selectedUser.user_id, rating: Number(rating), coins: Number(coins) })}><Save /> Salvar jogador</Button>
                        {Number(selectedUser.banned_until) > Date.now()
                          ? <Button variant="secondary" onClick={() => void act({ action: 'unban', userId: selectedUser.user_id })}>Reativar</Button>
                          : <Button variant="destructive" onClick={() => void act({ action: 'ban', userId: selectedUser.user_id, days: Number(days) })}><Ban /> Suspender</Button>}
                        {Number(selectedUser.chat_muted_until) > Date.now()
                          ? <Button variant="secondary" onClick={() => void act({ action: 'unmute-chat', userId: selectedUser.user_id })}><MessageCircle /> Liberar chat</Button>
                          : <Button variant="secondary" onClick={() => void act({ action: 'mute-chat', userId: selectedUser.user_id, minutes: Number(muteMinutes) })}><MessageCircle /> Silenciar</Button>}
                        <Button variant="secondary" onClick={() => void act({ action: 'grant-cosmetic', userId: selectedUser.user_id, cosmeticCode })}><Palette /> Liberar item</Button>
                        <Button onClick={() => void act({ action: 'grant-reward', userId: selectedUser.user_id, rewardCoins: Number(rewardCoins), rewardXp: Number(rewardXp), badge, idempotencyKey: crypto.randomUUID() })}><Award /> Dar recompensa</Button>
                        <Button onClick={() => void act({ action: 'grant-founder-gift', userId: selectedUser.user_id, rewardCoins: Number(rewardCoins), rewardXp: Number(rewardXp), badge, cosmeticCode, memberDays: Number(memberDays), giftId: crypto.randomUUID() })}><Gift /> Presente do Fundador</Button>
                        {selectedUser.membership_tier === 'legend' && Number(selectedUser.member_until) > Date.now()
                          ? <Button variant="destructive" onClick={() => void act({ action: 'revoke-membership', userId: selectedUser.user_id })}><Crown /> Remover Clube</Button>
                          : <Button onClick={() => void act({ action: 'grant-membership', userId: selectedUser.user_id, days: Number(memberDays) })}><Crown /> Ativar Clube</Button>}
                      </div>
                    </>
                  ) : <p>Selecione um jogador para ajustar ranking, recompensas, presentes ou moderação.</p>}
                </aside>
              </div>
            )}

            {tab === 'online' && <AdminTable headers={['Visitante', 'Conta', 'Modo', 'Sala', 'Primeiro acesso', 'Último sinal']} rows={(data?.presence ?? []).map((entry) => [String(entry.display_name), entry.user_id ? String(entry.user_id).slice(0, 14) : 'Convidado', String(entry.mode), String(entry.room_code ?? '—'), formatDate(entry.first_seen_at), formatDate(entry.last_seen_at)])} />}

            {tab === 'club' && (
              <div className="admin-table-wrap">
                <table><thead><tr><th>Jogador</th><th>Elo</th><th>Nível</th><th>Solicitado</th><th>Ações</th></tr></thead>
                  <tbody>{(data?.membershipRequests ?? []).length === 0 ? <tr><td colSpan={5}>Nenhuma solicitação pendente.</td></tr> : data?.membershipRequests.map((request) => (
                    <tr key={String(request.user_id)}>
                      <td><strong>{String(request.avatar_emote)} {String(request.display_name)}</strong></td>
                      <td>{String(request.rating)}</td><td>{String(request.level)}</td><td>{formatDate(request.updated_at)}</td>
                      <td><div className="admin-inline-actions" role="group" aria-label={`Ações da solicitação de ${String(request.display_name)}`}>
                        <Button size="xs" aria-label={`Aprovar Clube de ${String(request.display_name)} por ${memberDays} dias`} onClick={() => { const why = promptReason('Motivo da aprovação:'); if (why) void act({ action: 'review-membership', userId: request.user_id, decision: 'approve', days: Number(memberDays) }, why); }}><Crown /> Aprovar {memberDays}d</Button>
                        <Button size="xs" variant="destructive" aria-label={`Recusar Clube de ${String(request.display_name)}`} onClick={() => { const why = promptReason('Motivo da recusa:'); if (why) void act({ action: 'review-membership', userId: request.user_id, decision: 'decline' }, why); }}>Recusar</Button>
                      </div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {tab === 'rooms' && <AdminTable headers={['Sala', 'Host', 'Convidado', 'Status', 'Fila', 'Último sinal', 'Ação']} rows={(data?.rooms ?? []).map((room) => [
              String(room.code), String(room.host_id).slice(0, 12), room.guest_id ? String(room.guest_id).slice(0, 12) : '—', String(room.status), Number(room.matchmaking) === 1 ? 'Rápida' : 'Privada', formatDate(room.last_seen_at),
              <Button key="terminate" size="sm" variant="destructive" aria-label={`Encerrar sala ${String(room.code)}`} onClick={() => { const why = promptReason('Motivo para encerrar a sala:'); if (why) void act({ action: 'terminate-room', roomCode: room.code }, why); }}><DoorClosed /> Encerrar</Button>,
            ])} />}

            {tab === 'games' && <AdminTable headers={['ID', 'Sala', 'Brancas', 'Pretas', 'Resultado', 'Elo final', 'Data']} rows={(data?.games ?? []).map((game) => [String(game.id).slice(0, 10), String(game.room_code ?? '—'), String(game.white_id).slice(0, 10), String(game.black_id).slice(0, 10), String(game.result), `${String(game.white_rating_after)} / ${String(game.black_rating_after)}`, formatDate(game.finished_at)])} />}

            {tab === 'chat' && <AdminTable headers={['#', 'Tipo', 'Jogador', 'Mensagem', 'Sala', 'Data', 'Ações']} rows={(data?.chat ?? []).map((message) => [String(message.id), message.scope === 'room' ? 'Sala' : 'Comunidade', `${String(message.avatar_emote)} ${String(message.display_name)}`, message.deleted_at ? '[removida]' : String(message.message), String(message.room_code ?? '—'), formatDate(message.created_at), <div className="admin-inline-actions" role="group" aria-label={`Moderação de ${String(message.display_name)}`} key="actions"><Button size="xs" variant="destructive" disabled={Boolean(message.deleted_at)} onClick={() => { const why = promptReason('Motivo para remover a mensagem:'); if (why) void act({ action: 'delete-chat-message', messageId: message.id }, why); }}><Ban /> Remover</Button><Button size="xs" variant="secondary" onClick={() => { const why = promptReason('Motivo para silenciar este jogador:'); if (why) void act({ action: 'mute-chat', userId: message.user_id, minutes: 60 }, why); }}><MessageCircle /> Silenciar 1h</Button></div>])} />}

            {tab === 'settings' && <div className="admin-settings-card"><span><Settings /></span><div><small>APOIE A EKASY</small><h2>Chave Pix pública</h2><p>A chave só é considerada salva depois de ser confirmada novamente no D1.</p><label>Chave Pix<input value={pixKey} onChange={(event) => { setPixKey(event.target.value.slice(0, 140)); setPixDirty(true); }} maxLength={140} /></label><label>Motivo da alteração<textarea value={reason} onChange={(event) => setReason(event.target.value.slice(0, 240))} maxLength={240} /></label><Button onClick={() => void act({ action: 'update-pix', pixKey })} disabled={!pixDirty}><Save /> Salvar configuração</Button></div></div>}

            {tab === 'audit' && <AdminTable headers={['#', 'Administrador', 'Alvo', 'Ação', 'Motivo', 'Data']} rows={(data?.actions ?? []).map((action) => [String(action.id), String(action.admin_id).slice(0, 12), String(action.target_user_id ?? action.room_code ?? '—').slice(0, 12), String(action.action), String(action.reason), formatDate(action.created_at)])} />}
          </>
        )}
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="admin-metric"><span>{icon}</span><div><small>{label}</small><strong>{value.toLocaleString('pt-BR')}</strong></div></div>;
}

function AdminTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <div className="admin-table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={headers.length}>Nenhum registro.</td></tr> : rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function formatDate(value: unknown) {
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR');
}