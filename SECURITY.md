# Segurança do NoutyChess.pro

NoutyChess.pro é um produto independente da Ekasy-Studio. Segurança, integridade competitiva e privacidade devem ser tratadas como requisitos de produto.

## Princípios

- Segredos, chaves e credenciais nunca devem ser enviados ao frontend ou commitados no repositório.
- Toda ação administrativa deve ser autorizada no servidor.
- Elo, moedas, Clube, presentes, punições e resultados competitivos não podem depender somente de validação client-side.
- O painel `/admin` deve permanecer fora de indexadores e com cache desativado.
- Mudanças administrativas importantes devem gerar auditoria.
- Recompensas e presentes devem usar identificadores idempotentes quando possível.
- Dados persistentes devem ser confirmados no D1 antes de a interface mostrar sucesso.
- Source maps de produção para o navegador devem permanecer desativados.
- Mutações JSON originadas pelo navegador devem validar mesma origem no servidor.

## Autenticação e hospedagem

A identidade atual do usuário é fornecida pelo ChatGPT Sites através dos headers autenticados `oai-authenticated-user-*`.

Esses headers só devem ser tratados como identidade confiável quando a aplicação estiver atrás da infraestrutura que os controla e impede que o cliente os forje. A arquitetura oficial continua sendo o ChatGPT Site existente com o D1 existente.

Não publicar a aplicação diretamente em outra hospedagem, como Vercel ou um servidor genérico, assumindo que esses mesmos headers continuarão seguros. Uma migração de hospedagem exige antes uma camada de autenticação própria/verificável no servidor e uma revisão completa das fronteiras de confiança.

## Proteção de mutações

As rotas autenticadas de jogador que alteram estado devem usar a proteção comum de mesma origem e JSON (`requireSameOriginJsonMutation`) ou uma proteção equivalente.

A proteção deve bloquear:

- `Origin` ausente em mutações de navegador protegidas;
- origem diferente da URL atendida;
- `Sec-Fetch-Site` externo quando presente;
- conteúdo diferente do formato esperado.

Essa camada complementa autenticação e validação de autorização. Ela não substitui checagem de usuário, participação em sala, propriedade do recurso ou validação de dados.

## Administração

A autorização usa `NOUTY_ADMIN_EMAILS`. Uma camada opcional adicional usa `NOUTY_ADMIN_USER_IDS`; quando configurada, e-mail e ID autenticado precisam corresponder às allowlists.

Toda mutação administrativa deve ser feita com sessão autenticada, origem válida e dados validados no servidor.

## Repositório

O objetivo de produção é manter o repositório privado depois de confirmar que a integração de hospedagem continua autorizada a ler repositórios privados. Tornar o repositório privado não substitui segurança de aplicação.

Código JavaScript enviado ao navegador pode ser inspecionado por usuários. Por isso, lógica sensível, segredos, autorização, dados administrativos e operações críticas devem permanecer no servidor.

## Relato de vulnerabilidades

Falhas de segurança devem ser reportadas de boa-fé à Ekasy-Studio e não devem ser exploradas contra usuários, contas, partidas ou infraestrutura.

Não publique credenciais, tokens, dados pessoais, chaves privadas ou detalhes que facilitem exploração ativa em issues públicas.
