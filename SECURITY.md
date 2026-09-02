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

## Administração

A autorização usa `NOUTY_ADMIN_EMAILS`. Uma camada opcional adicional usa `NOUTY_ADMIN_USER_IDS`; quando configurada, e-mail e ID autenticado precisam corresponder às allowlists.

Toda mutação administrativa deve ser feita com sessão autenticada, origem válida e dados validados no servidor.

## Repositório

O objetivo de produção é manter o repositório privado depois de confirmar que a integração de hospedagem continua autorizada a ler repositórios privados. Tornar o repositório privado não substitui segurança de aplicação.

Código JavaScript enviado ao navegador pode ser inspecionado por usuários. Por isso, lógica sensível, segredos, autorização, dados administrativos e operações críticas devem permanecer no servidor.

## Relato de vulnerabilidades

Falhas de segurança devem ser reportadas de boa-fé à Ekasy-Studio e não devem ser exploradas contra usuários, contas, partidas ou infraestrutura.

Não publique credenciais, tokens, dados pessoais, chaves privadas ou detalhes que facilitem exploração ativa em issues públicas.