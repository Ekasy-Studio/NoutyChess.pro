# NoutyChess — configuração oficial do domínio

Esta etapa é P0 e deve ser concluída antes do lançamento final.

## Domínio canônico

O endereço público oficial é:

`https://noutychess.pro`

A aplicação deve continuar usando o ChatGPT Site EXISTENTE e o D1 EXISTENTE configurado pelo binding `DB` em `.openai/hosting.json`.

Não criar outro Site, outro D1, Vercel ou uma produção paralela.

## Procedimento seguro no ChatGPT Sites

1. Abra o Site existente do NoutyChess.
2. Vá a Configurações e escolha adicionar domínio personalizado.
3. Informe exatamente `noutychess.pro`.
4. Copie os registros DNS exibidos pelo Sites exatamente como forem apresentados.
5. Não reutilize registros, tokens TXT ou destinos antigos do subdomínio `noutychess.ekasy-studio.com.br`.

Os registros exigidos podem mudar. Este repositório não deve inventar A, AAAA, CNAME, ALIAS, TXT ou nameservers.

## No provedor DNS

Antes de alterar qualquer coisa, registre a configuração atual e preserve:

- MX;
- SPF;
- DKIM;
- DMARC, se existir;
- registros de e-mail;
- nameservers atuais, salvo instrução explícita do provedor/Sites.

Adicione somente os registros fornecidos pelo ChatGPT Sites para `noutychess.pro`.

Se o Sites oferecer configuração para `www.noutychess.pro`, prefira redirecionar `www` para o domínio raiz. Não crie esse redirecionamento por adivinhação.

## Verificação

Depois da propagação, confirmar:

- domínio marcado como conectado/verificado no Sites;
- HTTPS e certificado válidos;
- `https://noutychess.pro` abrindo o Site correto;
- login funcionando no domínio final;
- APIs funcionando no domínio final;
- o mesmo D1 continuando em uso;
- convites de WhatsApp usando `https://noutychess.pro`;
- metadata, Open Graph, canonical, robots e sitemap usando o domínio canônico;
- nenhuma dependência do antigo subdomínio para funcionamento da aplicação.

## Regra de rollback

Se a verificação falhar, não apague registros de e-mail e não troque nameservers às cegas. Reverta apenas os registros adicionados para o NoutyChess e mantenha o Site/D1 existentes intactos.
