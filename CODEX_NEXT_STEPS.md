# NoutyChess.pro — Finalização e próximos avanços

Este arquivo registra o estado atual do projeto e o que ainda vale evoluir.

## Estado atual validado

A `main` já passou por uma rodada completa de finalização com:

- 29/29 testes passando;
- lint sem erros;
- build de produção passando;
- auditoria de produção sem vulnerabilidades High/Critical;
- dependências principais atualizadas de forma compatível;
- service worker ajustado para não cachear HTML autenticado nem `/api/`;
- domínio canônico interno ajustado para `https://noutychess.pro`;
- matchmaking com reserva mais segura e nova tentativa enquanto aguarda;
- cancelamento/saída fechando sala no servidor;
- relógio online com declaração de timeout pelo próprio jogador;
- presença de amigos baseada na sessão mais recente;
- ação de recusar solicitação de amizade;
- chat de sala restrito aos participantes;
- relatório competitivo bloqueado para sala terminada pela moderação;
- admin com proteção server-side e mesma origem nas mutações;
- CI permanente bloqueando auditoria High/Critical.

## Arquitetura preservada

Continuar usando:

GitHub → ChatGPT Site existente → D1 existente (`DB`) → `https://noutychess.pro`

Não criar outro D1 nem outra produção sem necessidade.

O repositório deve permanecer público apenas enquanto ainda não estiver comprovado que o ChatGPT Sites consegue continuar buildando o projeto depois da mudança para privado. Só privatizar após teste real do Site.

---

# Próximos avanços de código

## P0.5 — robustez antes da publicação

1. Adicionar regressões automatizadas para fluxos online onde for possível sem depender de duas sessões reais.
2. Revisar CSRF/mésma origem nas rotas autenticadas públicas de mutação sem quebrar a autenticação do ChatGPT Sites.
3. Refinar reconexão/desconexão e mensagens de estado do multiplayer.
4. Garantir que abandonar partida conectada resulte em desistência consistente nos dois lados.
5. Manter o CI verde após cada lote pequeno.

## P1 — UX e social

1. Melhorar feedback sonoro original para:
   - início;
   - adversário encontrado;
   - convite;
   - mensagem;
   - vitória;
   - derrota;
   - empate;
   - promoção.
2. Manter volume persistente e respeitar liga/desliga.
3. Refinar mobile em 360/390/412 px sem esconder o botão JOGAR ONLINE.
4. Exibir estados claros de fila, conexão, sala cheia, sala encerrada e reconexão.
5. Refinar convites entre amigos e ações de cancelamento quando fizer sentido.

## P1 — persistência/admin

Continuar validando:

- perfil;
- Elo;
- XP;
- moedas;
- amigos;
- Clube Lendário;
- Presentes do Fundador;
- Pix;
- cosméticos;
- notificações;
- auditoria administrativa.

Nunca mostrar sucesso na UI antes da confirmação do servidor/D1.

## P2 — Academia e professores

A base de Niclaus/Damon já existe. Evoluir apenas sem contaminar ranked/online competitivo:

- memória da sessão educacional;
- análise pós-partida;
- exercícios gerados a partir de erros;
- TTS opcional;
- respostas mais contextuais;
- fallback local se IA avançada estiver indisponível.

Nunca mostrar engine, melhor lance ou avaliação em partida online competitiva.

---

# O que depende de acesso externo/manual

## Publicação no ChatGPT Sites

No Site existente:

1. salvar uma nova versão da `main` validada;
2. testar preview;
3. publicar no mesmo projeto;
4. confirmar que o D1 `DB` continua sendo usado.

## Domínio

Adicionar `noutychess.pro` pelo ChatGPT Sites e copiar exatamente os registros DNS fornecidos pela plataforma.

Preservar MX/SPF/DKIM/DMARC e registros de e-mail. Não inventar A/CNAME/TXT/nameserver.

## Teste real em duas sessões

Obrigatório antes do lançamento oficial:

- e2-e4 / e7-e5;
- captura;
- roque;
- promoção;
- en passant;
- xeque/mate;
- empate e oferta de empate;
- desistência;
- relógio;
- chat;
- desconexão;
- resultado;
- matchmaking simultâneo;
- amigos/convites.

## GitHub privado

Somente depois de confirmar que o ChatGPT Site existente continua acessando/buildando o repositório privado.

---

# Definição de pronto

O projeto estará pronto para lançamento oficial quando:

- CI final estiver verde;
- Site existente estiver publicado com a versão atual;
- duas sessões reais passarem no multiplayer;
- domínio `noutychess.pro` estiver verificado com HTTPS;
- login e APIs funcionarem no domínio final;
- o mesmo D1 estiver preservado;
- não houver assistência de engine em ranked;
- mobile estiver validado;
- GitHub estiver privado, se comprovadamente compatível com Sites.
