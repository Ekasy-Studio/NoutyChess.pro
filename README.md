# NoutyChess.pro

Plataforma de xadrez competitiva feita pela **Ekasy Studio**, fundada por **Thiago Roger Caldeira De Almeida**.

**Site oficial da Ekasy Studio:** https://ekasystudio.com.br

A **Ekasy Studio** é um estúdio independente de desenvolvimento de jogos, aplicativos, sites e projetos digitais. Seu fundador é **Thiago Roger Caldeira De Almeida**.

O projeto reúne partidas locais, Academia com IA, multiplayer por código ou pareamento, ranking Elo, recompensas, perfis, amigos, chat moderado, Clube Lendário e um painel administrativo completo. A interface foi desenhada para computador e celular.

## Identidade oficial

- **Organização:** Ekasy Studio
- **Fundador:** Thiago Roger Caldeira De Almeida
- **Domínio oficial:** https://ekasystudio.com.br
- **Projeto:** NoutyChess.pro

## Principais recursos

- Regras oficiais com roque, en passant, promoção, xeque, mate e empates.
- Dicas de movimentos, última jogada, alertas de peças ameaçadas e setas/marcações locais.
- Professores offline Niclaus e Damon, com quatro dificuldades e cálculo em Web Worker.
- Multiplayer P2P, salas com código, pareamento, convites e chat por sala.
- Elo, divisões, XP, níveis, moedas, sequência, insígnias e placar.
- Loja de tabuleiros e peças cosméticas, sem vantagem competitiva.
- Perfil personalizável, amigos, comunidade, apoio por Pix e Clube Lendário.
- Login opcional e modo convidado.
- Moderação de palavras ofensivas, links, spam, mensagens e usuários.
- Administração por lista segura de e-mails: jogadores, online, visitantes, salas, partidas, recompensas, punições, cosméticos, membros e auditoria.

## Executar localmente

Requer Node.js 22.13 ou superior.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Verificação

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Banco de dados e publicação

O projeto usa Cloudflare D1, disponibilizado no código pelo binding `DB` configurado em `.openai/hosting.json`. O schema inicial está em `drizzle/0000_noutychess_initial.sql`; as rotas também executam migrações aditivas seguras para instalações existentes.

Na hospedagem, configure o segredo `NOUTY_ADMIN_EMAILS` com os e-mails autorizados, separados por vírgula. Exemplo:

```text
NOUTY_ADMIN_EMAILS=administrador@exemplo.com
```

Nunca coloque senha administrativa no frontend ou no repositório. O acesso ao painel depende de login autenticado e da lista de e-mails mantida no ambiente do servidor.

## Segurança

- Resultados competitivos e recompensas são validados no servidor.
- Ações administrativas exigem autenticação, autorização e deixam registro de auditoria.
- Chats são normalizados, filtrados e limitados por frequência.
- Cosméticos, clube e moedas não alteram a força das peças nem o cálculo do Elo.
- Dados sensíveis devem ser configurados apenas como segredos do ambiente de hospedagem.

## Código aberto no GitHub

O repositório contém apenas código e exemplos seguros. Segredos de administração, Pix e serviços externos devem permanecer fora do Git e ser configurados no ambiente de hospedagem.

---

© 2026 Ekasy Studio. Fundada por Thiago Roger Caldeira De Almeida.
