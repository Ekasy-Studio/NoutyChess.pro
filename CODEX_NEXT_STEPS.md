# NoutyChess.pro — Próxima grande atualização

Use este arquivo como roteiro oficial. Trabalhe sobre a `main` mais recente e preserve dados, autenticação, `.openai/hosting.json` e o binding D1 `DB`.

## Arquitetura oficial

- Código: `Ekasy-Studio/NoutyChess.pro`
- Branch: `main`
- Produção: ChatGPT Sites existente
- Banco: Cloudflare D1 existente
- Domínio oficial desejado: `noutychess.pro`
- Não criar projeto Vercel paralelo.
- Não criar outro banco ou outro Site.

## Trabalho já adiantado

- Correção PeerJS para `promotion: null`: commits `4c0a882` e `1267855`. Não regredir.
- Backend de amigos preparado para busca parcial, status e confirmação de persistência: commit `d717a15`.
- Cópia de Pix corrigida para não exibir falso sucesso e possuir fallback: commit `078d9b2`.

## P0 — fazer primeiro

### 1. Domínio

Antes do lançamento final, conectar `noutychess.pro` ao Site existente.

1. No ChatGPT Sites, abrir o Site atual e usar Adicionar domínio.
2. Obter os registros DNS exatos da plataforma.
3. O proprietário fará login manual no Registro.com.
4. Conferir DNS existentes antes de alterar.
5. Não inventar A/CNAME/TXT/nameserver e não apagar MX/SPF/DKIM sem necessidade.
6. Adicionar somente os registros pedidos pelo Sites.
7. Verificar domínio e HTTPS.
8. Usar `noutychess.pro` como domínio principal se a plataforma permitir.
9. Manter URL gratuita como fallback se possível.

### 2. Multiplayer

Validar duas sessões reais:

- A joga `e2-e4`, B recebe e pode responder.
- B joga `e7-e5`, A recebe.
- Testar captura, roque, promoção, en passant, xeque, mate, empate, desistência, oferta de empate e relógio.
- Melhorar mensagens de conexão, desconexão e reconexão.
- Nunca aplicar jogada ilegal.

### 3. Matchmaking

Preservar o que já funciona e melhorar:

- fila clara de Partida rápida;
- reserva de vaga segura/atômica quando possível;
- cancelar busca;
- heartbeat;
- limpeza de salas/fila abandonadas;
- impedir auto-partida e dupla ocupação;
- mostrar estados reais: procurando, encontrado, conectado.

### 4. Persistência

Auditar tudo que precisa sobreviver a refresh/logout:

- perfil, Elo, XP, moedas;
- temas e peças;
- amigos;
- Clube;
- presentes;
- Pix;
- cosméticos;
- configurações importantes.

Nada persistente deve depender apenas de React state.

### 5. Amigos

O backend de busca parcial já foi preparado. Completar a UI:

- campo de pesquisa por parte do nome usando `/api/friends?q=...`;
- debounce;
- resultados com avatar, nome, Elo e presença;
- adicionar pelo `friendId` retornado;
- solicitações enviadas/recebidas;
- aceitar, recusar/remover;
- persistir e atualizar automaticamente;
- convidar amigo para sala;
- online / em partida / procurando / offline quando os dados permitirem.

### 6. Admin

Transformar `/admin` em central de comando fluida:

- polling leve enquanto aba visível, reduzido/pausado quando invisível;
- jogadores, presença, matchmaking, salas, partidas, chat, Clube, presentes, configurações e auditoria;
- após ação: servidor valida -> grava D1 -> confirma `changes` -> relê dado -> UI atualiza -> mostra sucesso;
- não mostrar sucesso falso;
- manter `NOUTY_ADMIN_EMAILS` somente server-side;
- manter trilha de auditoria.

## P1 — experiência principal

### 7. Home / navegação

Primeiro viewport deve destacar `JOGAR ONLINE` sem rolagem.

Ações principais:

- Partida rápida
- Criar sala
- Entrar com código
- Jogar com amigo

Hierarquia depois disso:

1. Perfil/Elo
2. Amigos
3. Ranking
4. Clube Lendário
5. Academia
6. Cosméticos
7. Apoie

No mobile considerar barra inferior: Jogar, Amigos, Ranking, Clube, Perfil.

### 8. Direção visual

Visual competitivo premium com identidade NoutyChess.

Aproveitar a linguagem luminosa da página Apoie:

- luz de borda e brilho lento em Jogar Online;
- dourado/reflexo no Clube;
- azul/violeta analítico na Academia;
- efeitos por divisão no ranking.

Não usar flashes, excesso de partículas ou animações que atrapalhem o tabuleiro. Respeitar `prefers-reduced-motion` e oferecer animações Normal/Reduzidas/Desativadas.

### 9. Clube Lendário

Transformar pré-lançamento em fluxo funcional:

- jogador solicita;
- solicitação aparece no admin;
- admin aprova/recusa e escolhe duração;
- só considerar ativo se `membership_tier === 'legend'` e `member_until > Date.now()`;
- liberar benefícios automaticamente;
- benefícios exclusivamente cosméticos/sociais, nunca pay-to-win.

### 10. Presentes do Fundador

No admin criar fluxo para localizar jogador e conceder, com auditoria e idempotência quando aplicável:

- moedas;
- XP;
- insígnias;
- cosméticos;
- tabuleiro/peças;
- dias de Clube;
- pacote combinado.

Jogador recebe notificação `Presente do Fundador` com itens recebidos.

### 11. Pix

O botão público já foi corrigido. Confirmar também persistência administrativa:

admin salva -> relê D1 -> refresh -> valor permanece -> `/apoie` mostra mesmo valor -> copiar/colar correto.

## P2 — personalização e acabamento

### 12. Gratuitos

Liberar no mínimo 3 tabuleiros gratuitos desde o início:

- Clássico Verde
- Madeira Nobre
- Meia-Noite

Liberar no mínimo 3 peças gratuitas:

- Clássicas
- Modernas
- Minimalistas

Permitir livre combinação e persistir escolha.

### 13. Premium

Premium deve ser claramente diferente, não simples recoloração. Exemplos:

- Aurora
- Obsidiana
- Realeza
- Prisma
- Neon
- Safira

Mostrar raridade/origem e preview. Categorias possíveis: Grátis, Loja, Clube, Evento, Temporada, Conquista, Presente do Fundador.

### 14. Sons

Substituir/expandir os tons simples por áudio curto e seguro/original/CC0 para:

- movimento, captura, xeque, roque, promoção;
- início, adversário encontrado, convite, mensagem;
- vitória, derrota, empate.

Adicionar liga/desliga e volume persistente. Não copiar sons de Chess.com.

### 15. Guias e alertas

Durante a partida permitir ligar/desligar sem sair:

- coordenadas;
- último lance;
- casas legais;
- capturas possíveis;
- rei em xeque;
- animações;
- sons/volume;
- guia de iniciante;
- alertas visual/sonoro/ambos/desligado.

Em ranked online nunca mostrar engine, melhor lance, avaliação ou linha calculada. Ajuda competitiva permitida apenas para regras/visual.

### 16. Onboarding

Primeiro acesso, uma vez:

- Sou iniciante
- Já sei jogar
- Personalizar

Salvar conclusão.

## Professores IA

Transformar Niclaus e Damon em professores reais, sem comprometer P0.

Arquitetura desejada:

1. Engine/chess.js para verdade objetiva da posição.
2. Base de conhecimento para regras, aberturas, tática, estratégia e finais.
3. Camada conversacional para explicar em linguagem humana.

Niclaus: calmo, técnico, estratégico e didático.
Damon: direto, provocador, divertido e agressivo sem insultar.

Recursos educacionais:

- chat contextual usando FEN e histórico relevante;
- explicar a própria jogada;
- `Dica` -> `Orientação` -> `Mostrar lance`;
- narrar jogadas/TTS opcional;
- pós-partida: acertos, erro principal, momento crítico, conceito e próxima aula;
- memória apenas da sessão e, se implementado, progresso educacional não sensível.

Sugestão de jogada e engine somente em Academia/Treino/IA/análise pós-partida. Nunca em online competitivo.

Se serviço de IA estiver indisponível, jogo, engine local, regras e dicas básicas continuam funcionando.

## Segurança

- Todas ações sensíveis validadas server-side.
- Usuário comum não altera Elo/moedas/Clube arbitrariamente.
- Secrets nunca no frontend/GitHub.
- Admin protegido por `NOUTY_ADMIN_EMAILS`.
- Não registrar tokens/secrets nos logs.

## Performance

- Evitar polling agressivo, requests duplicados e renders desnecessários.
- Pausar/reduzir atualização automática quando aba invisível.
- Não bloquear tabuleiro esperando IA ou rede secundária.

## Testes mínimos obrigatórios

1. Login/logout.
2. Perfil salva e persiste.
3. Sala privada em duas sessões: e4/e5 e outros lances.
4. Matchmaking entre duas sessões.
5. Chat bidirecional.
6. Busca parcial de amigo, request, aceite e persistência.
7. Convite de amigo.
8. Solicitação/aprovação/expiração do Clube.
9. Presente do admin e persistência.
10. Pix salvar, recarregar, copiar e colar.
11. Admin refletir presença/sala sem reload manual.
12. Temas/peças e preferências persistirem.
13. Desktop e mobile ~360/390/412px.

Rodar testes, lint, TypeScript e build disponíveis no projeto.

## Publicação

Depois dos testes:

1. commits claros na `main`;
2. gerar/revisar preview no Site EXISTENTE;
3. não criar produção paralela;
4. publicar a versão aprovada;
5. testar pelo domínio real `noutychess.pro`:
   - `/`
   - `/admin`
   - `/clube`
   - `/apoie`
   - login
   - multiplayer
   - matchmaking
   - amigos
   - Pix
6. confirmar que o mesmo D1 continua em uso.

## Prioridade se faltar tempo/crédito

P0: domínio, multiplayer, persistência, matchmaking, amigos, admin, segurança e build.

P1: layout, Clube, presentes, Pix e mobile.

P2: temas, peças, sons, guias, professores IA e microinterações.

Não sacrificar P0 por efeitos visuais.

## Relatório final

Entregar somente um resumo objetivo com:

- bugs encontrados/corrigidos;
- arquivos/commits;
- testes e build;
- status GitHub/Sites/D1/domínio/HTTPS;
- pendências reais.
