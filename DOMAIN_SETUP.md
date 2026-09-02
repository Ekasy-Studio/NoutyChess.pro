# NoutyChess — configuração oficial do domínio

Esta é uma etapa P0 do lançamento e deve ser tratada ANTES da publicação final do jogo.

## Objetivo

O endereço público oficial do jogo deve ser:

`https://noutychess.ekasy-studio.com.br`

A marca/título visível do produto deve ser simplesmente:

`NoutyChess`

Não exibir GitHub ou `chatgpt.site` como endereço principal para os usuários. A URL técnica do ChatGPT Sites pode continuar existindo apenas como infraestrutura/fallback, caso a plataforma mantenha isso automaticamente.

## Site correto

Usar o ChatGPT Site EXISTENTE do NoutyChess.

Preservar:

- `.openai/hosting.json`;
- o projeto Sites existente;
- o binding D1 `DB`;
- usuários e dados atuais;
- autenticação atual.

NÃO criar outro Site, outro D1 ou uma implantação paralela no Vercel.

## Domínio no Registro.br

Domínio-base administrado no Registro.br:

`ekasy-studio.com.br`

Subdomínio que será ligado ao NoutyChess:

`noutychess.ekasy-studio.com.br`

Abra o domínio `ekasy-studio.com.br` e a zona DNS avançada.

### Regra de segurança

Se o domínio ainda estiver em transição e o botão `Nova Entrada` não estiver disponível:

- NÃO alterar nameservers;
- NÃO remover registros;
- NÃO criar valores alternativos;
- NÃO tentar contornar a transição;
- registrar que o DNS ainda está bloqueado e encerrar somente esta etapa para ser retomada em outra execução.

Nunca inventar registros DNS.

## Registros DNS EXATOS

Quando o editor DNS avançado estiver liberado, adicionar EXATAMENTE os seguintes registros.

### Registro 1

Tipo:

`CNAME`

Nome/Host:

`noutychess`

Valor/Destino:

`custom-domains.chatgpt.site.`

IMPORTANTE: preservar o ponto final se o editor do Registro.br aceitar/exibir FQDN dessa forma. Não substituir por outro destino.

### Registro 2

Tipo:

`TXT`

Nome/Host:

`_openai-site-verification.noutychess`

Valor:

`openai-site-verification=EwxQxlWLkZqQvaMkBg4OVFO0HCD8HuobeItFqkif3_E`

### Registro 3

Tipo:

`TXT`

Nome/Host:

`_cf-custom-hostname.noutychess`

Valor:

`c462f142-c554-4b0b-9069-5fb078ae3bd8`

## Antes de salvar

Conferir caractere por caractere:

- tipo;
- nome/host;
- valor;
- ausência de espaços acidentais;
- domínio correto `ekasy-studio.com.br`.

Não apagar registros MX, SPF, DKIM, TXT ou outros registros não relacionados ao NoutyChess.

Não trocar nameservers.

## Depois de salvar

1. Confirmar que os três registros aparecem na zona DNS.
2. Confirmar que não existe CNAME conflitante para `noutychess`.
3. Voltar ao projeto ChatGPT Sites existente do NoutyChess.
4. Usar os metadados/configuração local do projeto para localizar o domínio personalizado já solicitado.
5. Atualizar/verificar o status de `noutychess.ekasy-studio.com.br`.
6. Aguardar o Sites reconhecer os registros.
7. Confirmar que o domínio fica como conectado/ativo.
8. Confirmar HTTPS e certificado válido.
9. Abrir `https://noutychess.ekasy-studio.com.br` e confirmar que carrega o NoutyChess correto.
10. Testar login e chamadas de API pelo domínio personalizado.
11. Confirmar que o mesmo D1 continua em uso.

## Identidade pública

A página deve usar:

- `<title>` / metadata principal: `NoutyChess` ou `NoutyChess — Jogue melhor`;
- nome da marca: `NoutyChess`;
- domínio público: `noutychess.ekasy-studio.com.br`.

Não colocar `GitHub`, `ChatGPT Sites` ou `chatgpt.site` no título visual da aplicação.

É normal que o navegador sempre mostre um endereço/URL na barra. O objetivo é que esse endereço seja o domínio personalizado, enquanto o título/branding pode mostrar apenas `NoutyChess`.

## URLs e compartilhamento

Depois que o domínio estiver ativo, substituir links públicos/hardcoded de convite e compartilhamento que apontem para outro domínio pelo endereço canônico:

`https://noutychess.ekasy-studio.com.br`

Isso inclui especialmente:

- convite WhatsApp;
- metadata/Open Graph;
- metadataBase;
- canonical URL, se houver;
- sitemap;
- compartilhamento de salas;
- links sociais;
- qualquer mensagem de convite gerada pelo jogo.

Não alterar endpoints relativos (`/api/...`) desnecessariamente.

## WhatsApp

Quando houver uma sala, a mensagem compartilhada deve incluir o domínio oficial e o código da sala, por exemplo conceitualmente:

`Venha jogar NoutyChess comigo: https://noutychess.ekasy-studio.com.br — Código da sala: ABC123`

Gerar a mensagem dinamicamente e usar URL encoding correto.

## Critério de conclusão

Esta etapa só pode ser marcada como concluída quando:

- os 3 registros existem no Registro.br;
- o Sites reconhece `noutychess.ekasy-studio.com.br`;
- HTTPS está válido;
- o jogo abre nesse domínio;
- login funciona nesse domínio;
- APIs funcionam nesse domínio;
- compartilhamentos usam esse domínio;
- não houve criação de outro banco/Site;
- o branding visível usa `NoutyChess`.

Se o Registro.br ainda estiver em transição, NÃO afirmar que a etapa foi concluída.
