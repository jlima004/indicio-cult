# Deploy no Coolify — Indicio Cult

Este é o contrato de configuração para o futuro provisionamento (T15), primeiro
deploy (T16) e ensaio de rollback (T17). T13 somente versiona a imagem e o
runbook; não cria o recurso no Coolify nem publica a aplicação.

## Arquitetura e pré-requisitos

A VPS já possui Coolify self-hosted e Traefik v3.6 gerenciado pelo Coolify. O
container `coolify-proxy` ocupa as portas públicas 80/443. O recurso Indicio
Cult será uma **Application de repositório Git com Build Pack Dockerfile**;
`deploy/Dockerfile` constrói Next.js standalone e o processo escuta em
`0.0.0.0:3000`. O proxy compartilhado cria a rota e termina TLS. A aplicação
não publica porta no host e não inicia outro proxy.

Antes de T15, confirmar no Coolify que o servidor de destino está conectado, o
proxy está saudável, o repositório `jlima004/indicio-cult` está acessível e o
DNS do domínio aponta para a VPS. API Access só precisa ser habilitado quando
for configurar a automação em T15. `sslip.io` pode servir para um teste
**temporário**, sem integrar o contrato de produção. Consulte
[Dockerfile applications](https://coolify.io/docs/applications/builds/dockerfile),
[Traefik no Coolify](https://coolify.io/docs/core/networking/proxy/traefik/overview)
e [Domains](https://coolify.io/docs/core/networking/domains).

## Criar a aplicação no Coolify (T15)

1. No projeto e ambiente de produção, use **+ New** e escolha o repositório
   público GitHub `https://github.com/jlima004/indicio-cult` (ou a Git App
   autorizada para esse mesmo repositório). Selecione a branch `main`.
2. Selecione **Dockerfile** como **Build Pack**. Defina **Base Directory** `/`
   para usar a raiz do repositório como contexto e **Dockerfile Location**
   `/deploy/Dockerfile` relativo à base. O `COPY` precisa de `package.json`,
   `package-lock.json`, `src/` e `public/` desse contexto.
3. Em **Ports Exposes**, configure `3000`. Não configure **Ports Mappings** ou
   publicação da porta 3000 no host. O Dockerfile já define `EXPOSE 3000`,
   `HOSTNAME=0.0.0.0`, `PORT=3000` e `USER node`.
4. Em **Domains**, configure `https://<domínio>:3000`. Nesse campo, `:3000`
   escolhe a porta **interna** do container; visitantes continuam entrando
   por HTTPS/443. Sem a porta no campo Domains, o Coolify usa 80 internamente.
   `NEXT_PUBLIC_SITE_URL` é a URL pública canônica **sem** `:3000`, por exemplo
   `https://<domínio>`. Verifique DNS, rota e certificado emitido pelo Traefik
   após o futuro deploy. O resolver Let's Encrypt já pertence ao proxy host.
5. Em **Configuration > Advanced > Deployment & Git**, deixe **Auto Deploy**
   desligado. Push na `main` não deve disparar deploy antes da CI passar.
   Em **Configuration > Advanced > Build**, desabilite **Inject Build Args to
   Dockerfile**: todos os `ARG` necessários estão declarados no Dockerfile.
   Habilite **Include Source Commit in Build** para disponibilizar o commit
   selecionado ao build.

As instruções de Base Directory, Dockerfile Location, Ports Exposes e build
args seguem [Dockerfile applications](https://coolify.io/docs/applications/builds/dockerfile)
e [Advanced settings](https://coolify.io/docs/applications/configuration/advanced).
O formato do domínio e o significado de `:3000` seguem
[Domains](https://coolify.io/docs/core/networking/domains#supported-domain-formats).

## Variáveis e release

Crie as variáveis em **Configuration > Environment Variables**. Marque
**Build Variable** e **Runtime Variable** de forma independente, conforme a
tabela. As `NEXT_PUBLIC_*` são incorporadas ao bundle pelo Next.js no build;
alterá-las exige um novo deploy. Os três valores obrigatórios também precisam
estar presentes no runtime. Os valores reais devem vir do ambiente de
produção, nunca deste arquivo.

| Variável                        | Build Variable | Runtime Variable | Observação                                                                                    |
| ------------------------------- | -------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | Sim            | Sim              | URL pública canônica `https://<domínio>`; coincide com Domains sem o sufixo de porta interna. |
| `NEXT_PUBLIC_SUPABASE_URL`      | Sim            | Sim              | URL pública Supabase.                                                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim            | Sim              | Chave pública anon/publishable.                                                               |
| `NEXT_PUBLIC_SENTRY_DSN`        | Opcional       | Opcional         | DSN público, se Sentry no navegador for usado.                                                |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Não**        | Sim              | Segredo exclusivo do servidor.                                                                |
| `SENTRY_DSN`                    | **Não**        | Opcional         | DSN servidor.                                                                                 |
| `MAINTENANCE_MODE`              | **Não**        | Sim              | `false` normalmente; `true` responde 503 na vitrine.                                          |
| `APP_VERSION`                   | Sim            | Sim              | Valor `$SOURCE_COMMIT` na variável Coolify, **Literal desligado**.                            |

`SOURCE_COMMIT` é uma variável predefinida do Coolify para aplicações Git e
indica o commit implantado. Configure `APP_VERSION=$SOURCE_COMMIT` no Coolify,
com os dois escopos ativos. O Dockerfile consome `ARG APP_VERSION` durante o
build e define `ENV APP_VERSION` na imagem final. O `next.config.ts` usa esse
valor para o release público/Sentry; `/api/health` expõe a versão do servidor.
**Include Source Commit in Build** é indispensável: por padrão o Coolify omite
`SOURCE_COMMIT` do build para preservar cache. **Inject Build Args to
Dockerfile** permanece desligado porque os `ARG` estão explícitos. O build
falha se `APP_VERSION` estiver vazio. Confirme depois do deploy que a versão
pública e `/api/health` correspondem ao commit mostrado em **Deployments**.

`SUPABASE_PROJECT_ID` e `SUPABASE_ACCESS_TOKEN` pertencem ao tooling local/CI;
não entram no runtime da aplicação. Na automação T16, `COOLIFY_API_URL` e
`COOLIFY_APP_UUID` são GitHub Variables; `COOLIFY_CONFIG_TOKEN` e
`COOLIFY_DEPLOY_TOKEN` são GitHub Secrets. Nenhum desses valores entra na app
`.env` ou nos Docker build args. Nenhum segredo servidor entra em `ARG`, no
bundle público ou nas camadas da imagem. A configuração de escopos, expansão de `$SOURCE_COMMIT` e build
args segue [Environment Variables](https://coolify.io/docs/applications/configuration/environment-variables).

## Saúde, cache e operação

O Dockerfile já define `HEALTHCHECK` de dentro do container para
`http://127.0.0.1:3000/api/health` usando o próprio Node.js. O endpoint responde
200 apenas quando o Supabase está acessível e 503 quando degradado; `MAINTENANCE_MODE`
não bloqueia essa rota. O Coolify detecta o check da imagem e o usa em lugar de
um check configurado no painel. Em T16, confira logs, estado do container e o
JSON de `/api/health`, inclusive `version`; uma chamada à API apenas
**enfileira** o deploy. Se todos os containers estiverem unhealthy, o Traefik
pode devolver erro de roteamento em vez do JSON do app. Veja
[Health Checks](https://coolify.io/docs/applications/configuration/health-checks).

Em **Configuration > Persistent Storage**, T15 deve adicionar um **Volume
Mount** com **Destination Path** `/app/.next/cache`. A imagem cria esse diretório
para o usuário `node`; após montar o volume, confirme que UID/GID do processo
consegue ler e escrever. O cache é reconstruível, otimiza recargas e não é dado
de negócio nem backup. Monitore seu tamanho, com limite operacional aproximado
de 1 GB, e defina limpeza controlada se crescer; não apague volumes sem conferir
o destino e o impacto. O volume é local ao servidor e não deve ser compartilhado
entre réplicas sem um cache handler compatível. Veja
[Persistent Storage](https://coolify.io/docs/applications/configuration/persistent-storage)
e [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting#caching-and-isr).

Em T17, para rollback, abra **Configuration > Rollback**, escolha uma imagem
anterior retida, execute a ação e acompanhe **Deployments**. Valide domínio,
logs, health e identidade da imagem selecionada. Registre o commit da imagem
anterior e confira separadamente `NEXT_PUBLIC_APP_VERSION`, embutido pelo
`next.config.ts` no build da imagem selecionada. O rollback troca a imagem,
mas usa as variáveis runtime atuais: `APP_VERSION=$SOURCE_COMMIT`
pode expor no health um SHA diferente do código restaurado. Não aceite o teste
com essa divergência; ajuste a configuração de runtime ao SHA da imagem sob
controle humano, aplique a mudança sem reconstruir ou substituir a imagem
restaurada e confira o ID da imagem antes/depois. Se a plataforma não permitir
provar isso, bloqueie o aceite do rollback. Confirme novamente health e
`NEXT_PUBLIC_APP_VERSION`, e restaure a configuração da release vigente ao
terminar o ensaio. O rollback não restaura banco ou volume; retenção de imagens
limita as opções.
Veja [Rollbacks](https://coolify.io/docs/applications/deployments/rollbacks).

## Automação pós-CI (T15/T16)

O futuro fluxo é `push/merge main → CI verde → pin do commit via API → deploy
por UUID → health`. Auto Deploy continua desligado. Em T15, habilite
**Settings > Configuration > Advanced > API Access**, identifique o UUID da
Application e crie, na equipe proprietária, um token `read` + `write` para
configuração/leitura e um token `deploy` para o trigger. O painel cria o token
`deploy` como exclusivo. Seus titulares devem permanecer Admin/Owner; `write` não é
restrito a um campo ou recurso, portanto proteja o token e não conceda `root`
ou `read:sensitive`. Cadastre `COOLIFY_API_URL` (base HTTPS `/api/v1`),
`COOLIFY_APP_UUID` e a URL pública de health como GitHub Variables; cadastre
`COOLIFY_CONFIG_TOKEN` e `COOLIFY_DEPLOY_TOKEN` como GitHub Secrets. Não há
`COOLIFY_WEBHOOK` neste fluxo.

Em T16, `workflow_run` da CI verde na `main` fornece `candidate_sha` por
`head_sha`. Use uma `concurrency` group exclusiva de produção com
`cancel-in-progress: false` cobrindo checagem, mutação e verificação. Cada
execução consulta a `main` atual imediatamente antes da mutação; se avançou,
marca a candidata `superseded` e não faz deploy. Caso contrário:

1. `PATCH /api/v1/applications/{uuid}` com `{ "git_commit_sha": "<candidate_sha>" }`.
2. `GET /api/v1/applications/{uuid}` e exigir `git_commit_sha == candidate_sha`.
   Se a leitura falhar ou divergir, **falhar antes do trigger**.
3. `POST /api/v1/deploy?uuid=<application_uuid>` com Bearer token; guardar o
   `deployment_uuid` retornado e acompanhar o deployment até conclusão. Exigir
   o commit do registro de deployment igual ao candidato; se não for exposto,
   falhar o gate de identidade.
4. Consultar HTTPS público sem `-k` até `status=ok`, `supabase=ok` e
   `version == candidate_sha`. Só então aquecer a Home e exigir HTTP 200.

Cada execução redefine o pin, mesmo que outra tenha sido cancelada antes de
começar. A checagem da `main` evita promover workflow obsoleto; o pin impede
que um avanço posterior da branch altere o checkout. A exclusividade da
`concurrency` só cobre workflows que usam o mesmo grupo: operações manuais ou
outros automadores que alterem o pin/deploy durante essa janela devem ser
bloqueados por procedimento, e uma intervenção invalida a evidência do gate.
Resposta 2xx da API, ou health com outro SHA, nunca é sucesso. Consulte
[Update application](https://coolify.io/docs/api/endpoints/applications/update-application-by-uuid),
[Get application](https://coolify.io/docs/api/endpoints/applications/get-application-by-uuid),
[Deploy by UUID](https://coolify.io/docs/api/endpoints/deployments/deploy-by-tag-or-uuid),
[Get deployment](https://coolify.io/docs/api/endpoints/deployments/get-deployment-by-uuid),
[API permissions](https://coolify.io/docs/api/permissions) e
[GitHub concurrency](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency).

## Segurança de borda e logs

Os headers `Strict-Transport-Security`, `X-Content-Type-Options`,
`Referrer-Policy` e `Permissions-Policy` passam a ser responsabilidade de um
middleware Traefik gerenciado no Coolify. O template versionado
[`traefik-security-headers.yml`](traefik-security-headers.yml) será aplicado
em T15 via **Servers > servidor > Proxy > Dynamic Configurations**. A
referência do middleware usa sufixo `@file`. Para uma Application padrão, a
documentação atual do Coolify exige desabilitar **Readonly labels** para
acrescentar `indicio-cult-security-headers@file` à lista de middlewares da
label do router HTTPS existente; preserve `gzip` e todos os demais nomes e
labels gerados antes de salvar e redeployar. Confirme os quatro headers na
resposta HTTPS e examine os logs do proxy para erros de parsing/referência.
A alteração real exige revisão humana porque labels manuais deixam de ser
regeneradas pelo Coolify. Se o router falhar, use **Reset Labels to Defaults**,
reative **Readonly labels** e redeploye antes de refazer a configuração. Não
altere o Compose principal do proxy. Consulte
[Dynamic Configuration](https://coolify.io/docs/core/networking/proxy/traefik/dynamic-config)
e [Custom Middlewares](https://coolify.io/docs/core/networking/proxy/traefik/custom-middlewares).

Access logs são responsabilidade do Traefik compartilhado e a evidência atual
**não comprova** que estejam ativos. Habilitá-los em JSON, se aprovado, é uma
operação de configuração estática/global do proxy que pode afetar todos os
recursos. T13 não altera essa configuração. O gate humano/plataforma em T15 ou
T17 deve inspecionar a configuração e decidir ativação, destino, rotação e
retenção. Logs da aplicação no Coolify não substituem access logs do proxy.

T16 agora materializa: .github/workflows/deploy.yml
Workflow:
usa workflow_run da CI
filtra push/main/success
serializa produção
verifica main antes de mutar
fixa git_commit_sha
relê o pin
dispara deploy por UUID
acompanha deployment_uuid
exige deployment.commit == candidate_sha
exige health.version == candidate_sha
valida TLS sem -k
valida headers
aquece Home
