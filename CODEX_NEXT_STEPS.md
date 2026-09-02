# NoutyChess.pro — Finalização pelo Codex

Este arquivo é a instrução oficial para a próxima execução do Codex.

## Regra principal

NÃO refaça o projeto. Grande parte da atualização já foi implementada diretamente na `main`.

Trabalhe em `Ekasy-Studio/NoutyChess.pro`, branch `main`, preserve `.openai/hosting.json`, o binding D1 `DB`, autenticação, contas e dados existentes.

Arquitetura final desejada:

GitHub privado → ChatGPT Site existente → D1 existente → `https://noutychess.pro`

Não criar Vercel, outro Site ou outro banco.

## O que já foi adiantado

Já existem na `main`, entre outras mudanças:

- correção PeerJS de `promotion: null`;
- teste de regressão multiplayer;
- matchmaking mais seguro;
- persistência do nome/perfil corrigida;
- busca parcial de amigos no backend;
- status de presença;
- Pix com cópia real/fallback;
- admin com persistência confirmada no D1;
- polling administrativo enquanto aba visível;
- solicitações e validade do Clube;
- Presentes do Fundador com idempotência/auditoria;
- notificações persistentes;
- reforço de autenticação administrativa;
- licença proprietária;
- `SECURITY.md`;
- Termos, Privacidade e Copyright;
- regras de comunidade/fair play;
- online em maior destaque;
- efeitos luminosos nos principais cards;
- WhatsApp para convite de sala;
- pelo menos 3 tabuleiros gratuitos;
- pelo menos 3 conjuntos de peças gratuitos;
- configurações opcionais durante a partida;
- guia de iniciante e alertas;
- onboarding;
- base estruturada de conhecimento dos professores;
- endpoint `/api/coach`;
- chat contextual básico dos professores;
- `Dica → Orientação → Mostrar lance` nos modos educacionais;
- CI no GitHub.

Leia os commits recentes antes de alterar qualquer coisa.

---

# P0 — fazer primeiro

## 1. Deixar o CI totalmente verde

Rode:

- `npm test`
- `npm run lint`
- `npm run build`

Os 29 testes existentes já chegaram a passar. O último CI apontou problemas pequenos de lint/JSX que começaram a ser corrigidos.

Continue até testes + lint + build passarem.

Não desative regras do lint para esconder problemas.

## 2. Dependências e segurança

O `npm ci` reportou vulnerabilidades em dependências.

Faça `npm audit` e classifique o que afeta produção.

NÃO use `npm audit fix --force` cegamente.

Atualize somente dependências compatíveis e valide novamente testes/build.

## 3. Admin seguro

Revise `/admin` e `/api/admin`.

Já existem:

- `NOUTY_ADMIN_EMAILS`;
- suporte opcional a `NOUTY_ADMIN_USER_IDS`;
- autorização server-side;
- auditoria;
- persistência confirmada;
- noindex/cache privado;
- rota não divulgada na navegação pública.

Confirme que toda mutação administrativa usa proteção de mesma origem (`requireSameOriginAdminMutation()` ou equivalente).

Nunca confiar apenas em esconder `/admin`.

Validar no servidor:

- Elo;
- moedas;
- Clube;
- presentes;
- cosméticos;
- ban/mute;
- Pix;
- resultados competitivos.

## 4. GitHub privado

O repositório ainda pode estar público.

ANTES de mudar para Private:

1. confirme que o ChatGPT Site existente continuará tendo acesso/build ao repositório privado;
2. se confirmado, altere `Ekasy-Studio/NoutyChess.pro` para PRIVATE;
3. execute um build/preview depois da mudança;
4. confirme que a integração não quebrou.

Código-fonte completo deve ficar privado.

Entenda que JavaScript enviado ao navegador ainda pode ser inspecionado, então segredos/lógica sensível ficam no servidor.

Não habilitar source maps públicos de produção.

## 5. DOMÍNIO ANTES DO LANÇAMENTO

Quero `https://noutychess.pro` como domínio oficial.

Use o ChatGPT Site EXISTENTE.

No Sites:

Configurações → Adicionar domínio → `noutychess.pro`.

Obtenha exatamente os registros DNS exigidos.

NÃO invente A/CNAME/TXT/nameserver.

O proprietário fará login manualmente no Registro.com.

Antes de alterar DNS:

- registrar configuração atual;
- preservar MX;
- preservar SPF;
- preservar DKIM;
- preservar e-mail;
- não trocar nameservers sem necessidade.

Adicionar somente os registros pedidos pelo Sites.

Depois confirmar:

- domínio verificado;
- HTTPS;
- certificado;
- domínio principal;
- `www.noutychess.pro` redirecionando para raiz, se suportado;
- login funcionando pelo domínio;
- APIs funcionando pelo domínio.

---

# P0 — gameplay e social

## 6. Multiplayer real em duas sessões

Teste DUAS sessões/dispositivos.

Obrigatório:

A: `e2-e4`

B recebe e consegue responder.

B: `e7-e5`

A recebe.

Depois testar:

- captura;
- roque;
- promoção;
- en passant;
- xeque;
- mate;
- empate;
- oferta de empate;
- desistência;
- relógio;
- chat;
- desconexão;
- reconexão quando possível;
- resultado.

Nunca aplicar jogada ilegal.

## 7. Matchmaking

Teste duas sessões em Partida rápida.

Garantir:

- fila clara;
- adversário encontrado;
- vaga reservada de forma segura;
- ninguém enfrenta a própria conta;
- nenhuma dupla ocupação;
- heartbeat;
- limpeza de salas abandonadas;
- cancelamento da busca;
- estados claros na interface.

## 8. Amigos

A API já suporta busca parcial.

Validar UI completa:

- pesquisar parte do nome;
- debounce;
- avatar;
- nome;
- Elo;
- presença;
- adicionar pelo `friendId`;
- solicitação persistir;
- recebidas/enviadas;
- aceitar;
- recusar/remover;
- online/em partida/procurando/offline;
- convidar para sala;
- aceitar convite;
- refresh e login novamente sem perder amizade.

## 9. WhatsApp

Validar convite por WhatsApp.

Quando houver sala, mensagem deve conter:

- nome NoutyChess.pro;
- link `https://noutychess.pro`;
- código da sala.

Sem sala, compartilhar apenas convite geral ao jogo.

Abrir corretamente em mobile e desktop.

## 10. Social e comunidade

Validar:

- chat;
- moderação;
- mute;
- regras;
- Termos;
- Privacidade;
- Copyright;
- notificações;
- amigos;
- convites;
- WhatsApp.

---

# P1 — admin, Clube e persistência

## 11. Admin fluido

O painel deve funcionar como central de comando.

Validar:

- jogadores;
- visitantes;
- online;
- procurando partida;
- salas;
- partidas atuais/concluídas;
- chat;
- amigos;
- Clube;
- solicitações;
- presentes;
- recompensas;
- cosméticos;
- punições;
- Pix;
- configurações;
- auditoria.

Atualização automática leve somente enquanto aba visível.

Após ação:

servidor valida → D1 grava → confirma changes → relê → UI atualiza → mostra sucesso.

Não mostrar sucesso falso.

## 12. Clube Lendário

Fluxo completo:

Jogador solicita → admin vê → aprova/recusa → escolhe duração → Clube ativa → benefícios aparecem.

Só ativo se:

`membership_tier === 'legend'` E `member_until > Date.now()`.

Benefícios apenas cosméticos/sociais.

Nunca pay-to-win.

## 13. Presentes

Validar Presente do Fundador:

- moedas;
- XP;
- badge;
- cosmético;
- tabuleiro/peças;
- dias de Clube;
- pacote combinado.

Precisa:

- notificação persistente;
- auditoria;
- idempotência;
- sobreviver a refresh/login.

## 14. Pix

Teste:

admin salva → D1 confirma → refresh → valor permanece → `/apoie` mostra mesma chave → copiar → colar valor correto.

Nunca exibir “copiado” quando falhar.

## 15. Persistência geral

Auditar:

- nome;
- avatar;
- tema;
- peças;
- Elo;
- XP;
- moedas;
- amigos;
- Clube;
- presentes;
- Pix;
- cosméticos;
- onboarding;
- preferências importantes.

Nada importante pode existir apenas em React state.

---

# P1 — layout profissional

## 16. UX principal

O primeiro viewport deve destacar JOGAR ONLINE sem rolagem.

Prioridade:

1. Jogar Online
2. Perfil/Elo
3. Amigos
4. Ranking
5. Clube
6. Academia
7. Cosméticos
8. Apoie

Ações Online:

- Partida rápida
- Criar sala
- Entrar com código
- Jogar com amigo

No mobile, deixar acesso rápido e intuitivo, evitando página interminável.

Testar ~360/390/412 px.

## 17. Visual premium

Manter identidade própria NoutyChess.

Já existem efeitos luminosos inspirados na página Apoie.

Refinar sem exagero:

- Online vivo e atraente;
- Clube dourado/premium;
- Academia azul/violeta;
- Ranking por divisão.

Não usar flashes ou animação agressiva.

Respeitar `prefers-reduced-motion`.

---

# P2 — personalização

## 18. Gratuitos

Confirmar pelo menos 3 tabuleiros gratuitos:

- Clássico Verde
- Madeira Nobre
- Meia-Noite

E 3 conjuntos gratuitos:

- Clássicas
- Modernas
- Minimalistas

Livre combinação e persistência.

## 19. Premium

Premium precisa ser realmente diferenciado e desejável, não simples recoloração.

Refinar itens existentes como:

- Aurora
- Obsidiana
- Realeza
- Prisma
- Neo

e outros adequados.

Mostrar preview, origem e raridade quando fizer sentido.

Não copiar assets/código/sons do Chess.com.

---

# P2 — áudio e guias

## 20. Sons profissionais

Completar sons seguros/originais/CC0 para:

- movimento;
- captura;
- xeque;
- roque;
- promoção;
- início;
- adversário encontrado;
- convite;
- mensagem;
- vitória;
- derrota;
- empate.

Adicionar controle de volume persistente além do liga/desliga.

## 21. Guias e alertas opcionais

Já existe base de configurações durante a partida.

Validar/refinar:

- casas legais;
- coordenadas;
- último lance;
- peças ameaçadas;
- guia iniciante;
- alertas;
- animações;
- áudio/volume.

Tudo pode ser ligado/desligado durante a partida.

Em partida competitiva online:

NUNCA mostrar engine, avaliação, melhor lance, tática ou mate calculado.

---

# P2 — Professores Niclaus e Damon

## 22. Não refazer a base

Já existem:

- `lib/chess-knowledge.ts`;
- `/api/coach`;
- repertório de aberturas;
- regras;
- tática;
- estratégia;
- finais;
- chat contextual com FEN/histórico;
- `Pista → Orientação → Sugerir lance`.

Evolua isso.

## 23. IA conversacional avançada

Adicionar, se infraestrutura disponível:

- streaming;
- resposta em tempo real;
- personalidade consistente;
- contexto da partida;
- explicar a própria jogada;
- memória da sessão;
- adaptação iniciante/intermediário/avançado;
- análise pós-partida;
- exercícios baseados nos erros do jogador;
- progresso educacional não sensível.

Niclaus:
calmo, técnico, estratégico, paciente e didático.

Damon:
direto, provocador, divertido e agressivo sem insultar.

## 24. Voz e narração

Adicionar TTS opcional:

- narrar jogadas;
- professor falar explicações curtas;
- volume;
- ligar/desligar.

Nunca bloquear partida esperando voz/IA.

## 25. Fair play

Sugestões e engine somente em:

- Academia;
- Treino;
- contra professor/IA;
- análise pós-partida.

Nunca ranked/online competitivo.

Se IA avançada falhar, jogo e professor local continuam funcionando.

Secrets sempre server-side.

---

# Publicação

## 26. Preview

Quando CI estiver verde:

- gerar preview no ChatGPT Site EXISTENTE;
- não criar novo Site;
- preservar D1;
- testar preview.

## 27. Produção

Depois do preview aprovado:

publicar no mesmo Site.

Testar pelo domínio REAL `https://noutychess.pro`:

- `/`
- `/clube`
- `/apoie`
- `/regras`
- `/termos`
- `/privacidade`
- `/admin`
- login;
- perfil;
- multiplayer;
- matchmaking;
- amigos;
- WhatsApp;
- ranking;
- Clube;
- presentes;
- Pix;
- temas;
- sons;
- professores.

Confirmar que o mesmo D1 continua em uso.

---

# Definição de pronto

Só finalize quando:

- testes passam;
- lint passa;
- build passa;
- vulnerabilidades relevantes foram tratadas/documentadas;
- admin está protegido e funcional;
- GitHub está privado se compatível com Sites;
- `noutychess.pro` está verificado com HTTPS;
- duas sessões multiplayer funcionam;
- matchmaking funciona;
- amigos funcionam;
- WhatsApp funciona;
- Clube funciona;
- presentes persistem;
- Pix persiste e copia;
- 3+ tabuleiros gratuitos;
- 3+ peças gratuitas;
- premium está visualmente diferenciado;
- guias/alertas são opcionais;
- sons estão completos;
- professores funcionam nos modos educacionais;
- nenhuma assistência de engine existe em ranked;
- mobile está bom;
- versão final foi publicada no Site existente.

## Relatório final

Entregar somente:

- bugs encontrados/corrigidos;
- commits;
- testes/lint/build;
- vulnerabilidades tratadas;
- resultado multiplayer em duas sessões;
- status do admin;
- status GitHub privado;
- status domínio/DNS/HTTPS;
- status ChatGPT Sites/D1;
- pendências reais.

Economize contexto. Não explique longamente enquanto trabalha. Priorize validar e terminar o que falta.