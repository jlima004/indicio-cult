# ADR-002: Deploy pelo Coolify e TLS pelo Traefik compartilhado

## Status

Accepted — 2026-09-24

Refinamento da identidade de release e do contrato de CI — 2026-09-24 (remediação da revisão humana T13).

## Contexto

A VPS Hostinger de produção já executa Coolify e o `coolify-proxy` (Traefik v3.6) ocupa as portas públicas 80/443. O operador informou Docker provider habilitado com `exposedByDefault=false`, file provider em `/traefik/dynamic/` e resolver TLS `letsencrypt` com desafio HTTP. O plano original da T13 previa Docker Compose e Caddy próprios; a T13 ainda não havia sido commitada. Subir outro proxy duplicaria roteamento/TLS e disputaria as portas públicas.

Este ADR substitui apenas a decisão de deploy, VPS e reverse proxy do [ADR-001](./ADR-001-stack-frontend-cache-estado-e-deploy.md). As decisões de frontend, cache e estado permanecem.

## Decisão

- A aplicação será um recurso **Git repository + Dockerfile Build Pack** do Coolify, apontado para `jlima004/indicio-cult`, branch `main`, Base Directory `/` e Dockerfile Location `/deploy/Dockerfile`. O Dockerfile versionado é a fonte da imagem.
- O Next.js `standalone` escutará em `0.0.0.0:3000`; o recurso exporá internamente a porta 3000, sem publicar porta no host. Coolify conecta o container ao Traefik, administra a rota e configura o domínio. O Traefik existente termina TLS. Nenhum proxy ou Compose da aplicação será criado.
- **Auto Deploy = OFF.** T16 usará a API do Coolify: `PATCH /api/v1/applications/{uuid}` com `git_commit_sha=candidate_sha`, `GET /api/v1/applications/{uuid}` para reler o pin e `POST /api/v1/deploy` com o UUID da aplicação. O SHA candidato vem de `workflow_run.head_sha` de uma CI verde da `main`. Uma resposta 2xx apenas aceita a requisição; o workflow aguardará o deployment e verificará saúde e identidade.
- O contrato de release é `candidate_sha == configured_git_commit_sha == deployment.commit == SOURCE_COMMIT == APP_VERSION == /api/health.version`. O pin é persistente no recurso e deve ser definido e relido **antes** do trigger. O `deployment_uuid` retornado será acompanhado; o commit do registro do deployment deve coincidir com o candidato. Falha ou ausência de qualquer prova de identidade bloqueia o gate.
- Antes de mutar o recurso, T16 compara a `main` atual com `candidate_sha`; uma execução antiga fica `superseded` e não faz deploy. Essa checagem impede promoção de uma CI obsoleta, mas não previne o avanço da branch entre a checagem e o checkout. O pin previne esse TOCTOU: se a `main` avançar depois, o deployment ainda seleciona o candidato.
- Uma `concurrency` group exclusiva de produção serializará todo o trecho de checagem, PATCH, GET, trigger e verificação. Usar `cancel-in-progress: false`: uma execução iniciada termina a verificação; a pendente mais nova substitui outra pendente conforme a semântica padrão do GitHub e revalida a `main` ao iniciar. Cada execução redefine o pin, tornando o fluxo idempotente. Nenhum outro workflow ou operador pode alterar o pin ou iniciar deploy concorrente sem invalidar a garantia; T15/T16 devem registrar essa exclusividade operacional.
- Dois tokens da equipe do recurso separam capacidades: `COOLIFY_CONFIG_TOKEN` com `read` + `write` para PATCH/GET e leitura do deployment; `COOLIFY_DEPLOY_TOKEN` com `deploy` para o trigger. O painel do Coolify cria token `deploy` exclusivo. O titular deve permanecer Admin/Owner. `write` não é restrito a um campo ou aplicação, portanto a permissão é mais ampla que a mutação desejada. Não usar `root` nem `read:sensitive`. T15 cadastra `COOLIFY_API_URL`, `COOLIFY_APP_UUID` e a URL pública de health como GitHub Variables não secretas; os dois tokens são GitHub Secrets. A arquitetura não usa `COOLIFY_WEBHOOK`.
- Para aplicação Git, Coolify fornece `SOURCE_COMMIT`. A variável `APP_VERSION=$SOURCE_COMMIT` será configurada como Build Variable e Runtime Variable, com **Include Source Commit in Build** habilitado. O `deploy/Dockerfile` declara e consome `ARG APP_VERSION`; **Inject Build Args to Dockerfile** fica desligado porque os `ARG` necessários são explícitos. A configuração e o health público terão de confirmar o mesmo SHA efetivamente implantado.
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estarão disponíveis no build e runtime; `NEXT_PUBLIC_SENTRY_DSN` é opcional nos dois. `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_DSN` e `MAINTENANCE_MODE` são apenas runtime. Segredos de servidor não entram em `ARG`, build context ou layers.
- O cache `/app/.next/cache`, se persistido, usará **Persistent Storage > Volume Mount** no recurso Coolify, com escrita pelo usuário `node`. É cache reconstruível e não é dado de negócio ou backup. A operação acompanhará seu crescimento, com referência inicial de aproximadamente 1 GB.
- Cabeçalhos `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` serão aplicados por middleware Traefik específico do projeto, via **Dynamic Configurations** do Coolify. O template versionado em `deploy/traefik-security-headers.yml` é insumo para configuração humana em T15; não modifica o proxy. A documentação atual do Coolify exige desabilitar **Readonly labels** para anexar `middleware@file` ao router gerado da aplicação. Essa exceção será feita apenas em T15, preservando todos os middlewares existentes e validando a rota antes/depois.
- Access logs pertencem ao Traefik compartilhado. O estado atual não comprova que estejam habilitados. A ativação/formato JSON exigem análise humana de configuração global, com possível efeito sobre outros recursos. T13 não habilita logs nem edita `/data/coolify/proxy/docker-compose.yml`.
- Mudanças globais no proxy são operações humanas de plataforma. Domínio, TLS, labels e middleware serão verificados nos gates T15/T17. Rollback usará mecanismo suportado pelo Coolify e terá teste real na T17; esta decisão não presume execução nem resultado.

## Consequências

A arquitetura elimina Caddy, o conflito de portas 80/443, SSH como mecanismo primário de deploy e GHCR como requisito obrigatório. Reduz a operação própria e mantém a VPS como ponto único de falha, com dependência da disponibilidade da API Coolify. A configuração do recurso precisa ser reproduzível pelo [runbook](../../deploy/README.md); resposta 2xx da API não garante aplicação saudável. Incluir `SOURCE_COMMIT` no build permite identificar a release e também invalida cache das camadas afetadas a cada commit. Alterações no proxy global podem atingir outras aplicações. Rollback permanece um ensaio humano de T17.

## Alternativas rejeitadas

- **Compose + Caddy ou outro proxy próprio:** duplica TLS/roteamento e disputa portas já usadas.
- **GitHub Actions → SSH → Compose:** amplia credenciais e operação fora do Coolify.
- **Coolify Auto Deploy:** um push poderia iniciar deploy antes da CI obrigatória.
- **Porta 3000 publicada no host:** amplia a superfície pública sem necessidade.
- **GHCR obrigatório:** Coolify pode construir diretamente do Git; registry separado exigiria nova decisão.

## Referências oficiais

- [Coolify: Dockerfile](https://coolify.io/docs/applications/builds/dockerfile)
- [Coolify: Environment Variables](https://coolify.io/docs/applications/configuration/environment-variables)
- [Coolify: Advanced](https://coolify.io/docs/applications/configuration/advanced)
- [Coolify: Persistent Storage](https://coolify.io/docs/applications/configuration/persistent-storage)
- [Coolify: Automatic Deployments](https://coolify.io/docs/applications/deployments/automatic-deployments)
- [Coolify: Deploy Webhooks](https://coolify.io/docs/core/automation/deploy-webhooks)
- [Coolify API: Update application](https://coolify.io/docs/api/endpoints/applications/update-application-by-uuid), [Get application](https://coolify.io/docs/api/endpoints/applications/get-application-by-uuid), [Deploy by UUID](https://coolify.io/docs/api/endpoints/deployments/deploy-by-tag-or-uuid), [Get deployment](https://coolify.io/docs/api/endpoints/deployments/get-deployment-by-uuid)
- [Coolify: API Tokens](https://coolify.io/docs/core/security/credentials/api-tokens), [API permissions](https://coolify.io/docs/api/permissions)
- [Coolify: Traefik](https://coolify.io/docs/core/networking/proxy/traefik/overview)
- [Coolify: Dynamic Configurations](https://coolify.io/docs/core/networking/proxy/traefik/dynamic-config)
- [Coolify: Custom Middlewares](https://coolify.io/docs/core/networking/proxy/traefik/custom-middlewares)
- [Docker: Build variables](https://docs.docker.com/build/building/variables/)
- [GitHub Actions: Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
- [GitHub Actions: Concurrency](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency)
