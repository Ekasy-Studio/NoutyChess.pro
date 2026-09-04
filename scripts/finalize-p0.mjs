import fs from 'node:fs';

const OLD_DOMAIN = 'https://noutychess.ekasy-studio.com.br';
const NEW_DOMAIN = 'https://noutychess.pro';

const domainTargets = [
  'components/nouty-chess-game.tsx',
  'app/layout.tsx',
  'app/sitemap.ts',
  'app/robots.ts',
  'README.md',
];

let domainReplacements = 0;
for (const path of domainTargets) {
  let content = fs.readFileSync(path, 'utf8');
  const matches = content.split(OLD_DOMAIN).length - 1;
  if (matches > 0) {
    content = content.split(OLD_DOMAIN).join(NEW_DOMAIN);
    fs.writeFileSync(path, content);
    domainReplacements += matches;
  }
}
if (domainReplacements === 0) throw new Error('Nenhuma referência ao domínio antigo foi encontrada nos alvos esperados.');

const domainGuide = `# NoutyChess — configuração oficial do domínio

Esta etapa é P0 e deve ser concluída antes do lançamento final.

## Domínio canônico

O endereço público oficial é:

\`https://noutychess.pro\`

A aplicação deve continuar usando o ChatGPT Site EXISTENTE e o D1 EXISTENTE configurado pelo binding \`DB\` em \`.openai/hosting.json\`.

Não criar outro Site, outro D1, Vercel ou uma produção paralela.

## Procedimento seguro no ChatGPT Sites

1. Abra o Site existente do NoutyChess.
2. Vá a Configurações e escolha adicionar domínio personalizado.
3. Informe exatamente \`noutychess.pro\`.
4. Copie os registros DNS exibidos pelo Sites exatamente como forem apresentados.
5. Não reutilize registros, tokens TXT ou destinos antigos do subdomínio \`noutychess.ekasy-studio.com.br\`.

Os registros exigidos podem mudar. Este repositório não deve inventar A, AAAA, CNAME, ALIAS, TXT ou nameservers.

## No provedor DNS

Antes de alterar qualquer coisa, registre a configuração atual e preserve:

- MX;
- SPF;
- DKIM;
- DMARC, se existir;
- registros de e-mail;
- nameservers atuais, salvo instrução explícita do provedor/Sites.

Adicione somente os registros fornecidos pelo ChatGPT Sites para \`noutychess.pro\`.

Se o Sites oferecer configuração para \`www.noutychess.pro\`, prefira redirecionar \`www\` para o domínio raiz. Não crie esse redirecionamento por adivinhação.

## Verificação

Depois da propagação, confirmar:

- domínio marcado como conectado/verificado no Sites;
- HTTPS e certificado válidos;
- \`https://noutychess.pro\` abrindo o Site correto;
- login funcionando no domínio final;
- APIs funcionando no domínio final;
- o mesmo D1 continuando em uso;
- convites de WhatsApp usando \`https://noutychess.pro\`;
- metadata, Open Graph, canonical, robots e sitemap usando o domínio canônico;
- nenhuma dependência do antigo subdomínio para funcionamento da aplicação.

## Regra de rollback

Se a verificação falhar, não apague registros de e-mail e não troque nameservers às cegas. Reverta apenas os registros adicionados para o NoutyChess e mantenha o Site/D1 existentes intactos.
`;
fs.writeFileSync('DOMAIN_SETUP.md', domainGuide);

const serviceWorker = `const CACHE_NAME = 'noutychess-static-v2';
const CORE_ASSETS = ['/manifest.webmanifest', '/icon.svg', '/favicon.svg'];
const STATIC_DESTINATIONS = new Set(['style', 'script', 'image', 'font']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('noutychess-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca armazenar HTML de navegação nem respostas de API. Essas respostas
  // podem conter sessão, perfil, amigos, notificações ou dados administrativos.
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname.startsWith('/api/')) return;

  const explicitlyStatic = CORE_ASSETS.includes(url.pathname);
  if (!explicitlyStatic && !STATIC_DESTINATIONS.has(request.destination)) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
`;
fs.writeFileSync('public/sw.js', serviceWorker);

const chatPath = 'app/api/chat/route.ts';
let chat = fs.readFileSync(chatPath, 'utf8');
const oldRoomCheck = `    if (roomCode) {
      const room = await d1.prepare("SELECT code FROM rooms WHERE code = ? AND status IN ('waiting', 'playing') AND last_seen_at > ?")
        .bind(roomCode, now - 90_000).first();
      if (!room) return NextResponse.json({ error: 'O convite precisa apontar para uma sala ativa.' }, { status: 400 });
    }`;
const newRoomCheck = `    if (roomCode) {
      const room = await d1.prepare("SELECT host_id, guest_id FROM rooms WHERE code = ? AND status IN ('waiting', 'playing') AND last_seen_at > ?")
        .bind(roomCode, now - 90_000).first<{ host_id: string; guest_id: string | null }>();
      if (!room) return NextResponse.json({ error: 'O convite precisa apontar para uma sala ativa.' }, { status: 400 });
      if (scope === 'room' && room.host_id !== user.userId && room.guest_id !== user.userId) {
        return NextResponse.json({ error: 'Você não participa desta sala.' }, { status: 403 });
      }
    }`;
if (!chat.includes(oldRoomCheck)) throw new Error('Bloco de autorização do chat esperado não foi encontrado.');
chat = chat.replace(oldRoomCheck, newRoomCheck);
fs.writeFileSync(chatPath, chat);

// Ao iniciar uma nova sala, não carregar a cor da partida online anterior.
const gameStatePath = 'components/nouty-chess-game.tsx';
let gameState = fs.readFileSync(gameStatePath, 'utf8');
const createRoomBefore = `  const createOnlineRoom = async (matchmaking = false) => {
    cleanupNetwork();
    const code = createRoomCode();`;
const createRoomAfter = `  const createOnlineRoom = async (matchmaking = false) => {
    cleanupNetwork();
    setPlayerColor('w');
    setOrientation('w');
    const code = createRoomCode();`;
if (!gameState.includes(createRoomBefore)) throw new Error('Bloco de criação de sala esperado não foi encontrado.');
gameState = gameState.replace(createRoomBefore, createRoomAfter);
const joinRoomBefore = `    cleanupNetwork();
    setRoomCode(code);`;
const joinRoomAfter = `    cleanupNetwork();
    setPlayerColor('b');
    setOrientation('b');
    setRoomCode(code);`;
if (!gameState.includes(joinRoomBefore)) throw new Error('Bloco de entrada em sala esperado não foi encontrado.');
gameState = gameState.replace(joinRoomBefore, joinRoomAfter);
fs.writeFileSync(gameStatePath, gameState);

if (fs.existsSync('scripts/finalize-p0.mjs')) fs.rmSync('scripts/finalize-p0.mjs');

console.log(`P0 source patch applied. Canonical-domain replacements: ${domainReplacements}.`);
