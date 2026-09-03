# NoutyChess

Plataforma de xadrez competitiva da **Ekasy Studio**.

**Endereço público planejado:** https://noutychess.ekasy-studio.com.br

O projeto reúne partidas locais, Academia com professores digitais, multiplayer por código ou pareamento, ranking Elo, recompensas, perfis, amigos, comunidade, Clube Lendário e painel administrativo. A experiência é desenvolvida para computador e celular.

## Identidade oficial

- **Organização:** Ekasy Studio
- **Produto:** NoutyChess
- **Domínio do jogo:** https://noutychess.ekasy-studio.com.br
- **Domínio da organização:** https://ekasy-studio.com.br
- **Repositório:** proprietário; acesso ao código não concede licença para copiar, redistribuir ou comercializar o produto.

## Principais recursos

- Regras de xadrez com roque, en passant, promoção, xeque, mate e empates.
- Dicas visuais opcionais, última jogada, coordenadas, alertas e recursos para iniciantes.
- Professores Niclaus e Damon com base de conhecimento e ajuda educacional nos modos permitidos.
- Multiplayer P2P, salas com código, pareamento, convites e chat por sala.
- Elo, divisões, XP, níveis, moedas, sequência, insígnias e ranking.
- Tabuleiros e peças cosméticas, sem vantagem competitiva.
- Perfil personalizável, amigos, comunidade, apoio por Pix e Clube Lendário.
- Login opcional e modo convidado onde aplicável.
- Moderação de chat, proteção contra spam e ferramentas administrativas.
- Administração server-side com allowlist, auditoria e confirmação de persistência no D1.

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
npm run lint
npm run build
```

O GitHub Actions executa testes, auditoria diagnóstica das dependências de produção, lint e build.

## Banco de dados e publicação

O projeto usa Cloudflare D1 pelo binding `DB` configurado em `.openai/hosting.json`. O schema inicial está em `drizzle/0000_noutychess_initial.sql`; as rotas também executam migrações aditivas para instalações existentes.

A produção oficial deve permanecer no **ChatGPT Site existente**, usando o mesmo D1 e o domínio personalizado `noutychess.ekasy-studio.com.br`. Não criar uma produção paralela sem uma decisão explícita de arquitetura.

## Administração

Configure no ambiente de hospedagem:

```text
NOUTY_ADMIN_EMAILS=administrador@exemplo.com
NOUTY_ADMIN_USER_IDS=
```

`NOUTY_ADMIN_USER_IDS` é opcional e recomendado como segunda camada. Quando configurado, a identidade precisa corresponder simultaneamente à allowlist de e-mail e de user ID.

Nunca coloque senha administrativa, tokens ou secrets no frontend ou no repositório.

## Segurança e fair play

- Resultados competitivos e recompensas são validados no servidor na medida suportada pela arquitetura atual.
- Ações administrativas exigem autenticação/autorização e deixam trilha de auditoria.
- Mutações administrativas JSON recebem proteção de origem.
- Chats são normalizados, filtrados e limitados por frequência.
- Convites sociais são revalidados no aceite e possuem expiração.
- Cosméticos, Clube e moedas não alteram a força das peças nem oferecem vantagem competitiva.
- Sugestões de engine são restritas aos modos educacionais e nunca devem aparecer em partidas competitivas online.
- Source maps do navegador ficam desativados em produção.
- Dados sensíveis devem existir somente como segredos do ambiente de hospedagem.

## Propriedade intelectual

NoutyChess é software proprietário da Ekasy Studio. Consulte `LICENSE`, `SECURITY.md`, `/termos`, `/privacidade` e `/regras` para as políticas aplicáveis.

O JavaScript necessário para executar uma aplicação web pode ser tecnicamente inspecionado pelo navegador; por isso segredos, permissões administrativas e lógica sensível devem permanecer no servidor. O repositório deve ser tornado privado antes do lançamento final, desde que a integração do ChatGPT Sites com repositório privado seja confirmada e testada.

---

© 2026 Ekasy Studio. Todos os direitos reservados.
