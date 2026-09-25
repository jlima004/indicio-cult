# Tarefas: módulo `foundation`

Plano: [`tasks/plan.md`](./plan.md) · Spec: [`docs/specs/SPEC-foundation.md`](../docs/specs/SPEC-foundation.md)

Convenções: uma tarefa por PR (`feat(foundation): ...`); `npm run check` verde **localmente** antes de abrir o PR; desde T14, a CI também valida PRs e pushes para `main`; tarefas `[humano]` são executadas pela operadora com o agente apoiando. Tamanhos: XS 1 arquivo · S 1–2 · M 3–5 (arquivos gerados/boilerplate não contam).

---

## Fase A — Núcleo da aplicação (local)

### T1 · Repositório público e push da `main`

**Descrição:** Criar `jlima004/indicio-cult` (público) no GitHub, apontar o remoto e publicar a `main` com a documentação existente.

**Aceite:**

- [x] `gh repo view jlima004/indicio-cult` mostra repositório público com descrição "Arte para quem reconhece o indício. Vitrine headless (Next.js + Nuvemshop + Supabase)."
- [x] `git remote -v` aponta `origin` para o repositório; `git push -u origin main` concluído
- [x] Nenhum arquivo ignorado (`.agents/skills/`, `skills-lock.json`) foi publicado

**Verificação:** `gh repo view --web`; `git status` limpo; `gh api repos/jlima004/indicio-cult/contents` não lista `.agents`.

**Dependências:** nenhuma · **Arquivos:** nenhum · **Tamanho:** XS

---

### T2 · Scaffold Next.js 16 + TS + Tailwind + lint/format + scripts

**Descrição:** Gerar o projeto com `create-next-app` (TypeScript, Tailwind, ESLint, App Router, `src/`, alias `@/*`), fixar versões do spec §2, configurar Prettier e os scripts npm do spec §3 (exceto `test*`, `db:*`, adicionados depois). Ajustar `next.config.ts` (`output: 'standalone'`, `cacheComponents: true`) e `tsconfig` (`strict`, `noUncheckedIndexedAccess`). Instalar `zustand` para fixar versão (sem uso).

**Aceite:**

- [x] `npm ci && npm run check` (lint + format:check + typecheck) verde em máquina limpa
- [x] `npm run build` gera `.next/standalone`; `npm run dev` serve a página padrão em `:3000`
- [x] `package.json` fixa Next 16.3.x, React 19.3.x, TS 5.9.x, Tailwind 4.x, Zustand 5.x, `engines.node >=22.22.2 <23`; `.nvmrc` e `.node-version` pinam `22.23.1`; `.env.example` existe (vazio, com cabeçalho)

**Verificação:** `npm run check && npm run build`; `ls .next/standalone/server.js`.

**Dependências:** T1 · **Arquivos:** `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `prettier.config.mjs`, `.env.example` (+ gerados) · **Tamanho:** M

---

### T3 · Vitest + Testing Library

**Descrição:** Configurar `vitest.config.ts` (`jsdom`, alias `@/`, `tests/unit/**`), `@testing-library/react` e `@testing-library/jest-dom`; teste de fumaça do `src/app/page.tsx` atual; scripts `test`, `test:watch`, `test:coverage`; `test` entra no `check`.

**Aceite:**

- [x] `npm run test` executa e passa com ≥ 1 teste de componente
- [x] `npm run check` inclui `test` e continua verde
- [x] `tests/unit/` espelha `src/` (convenção documentada em comentário no `vitest.config.mts`)

**Verificação:** `npm run test`; `npm run check`.

**Dependências:** T2 · **Arquivos:** `vitest.config.mts` (`.mts` para o Vite carregar como ESM sem `"type": "module"` no `package.json`), `tests/setup.ts`, `tests/unit/app/page.test.tsx`, `package.json` · **Tamanho:** S

---

### T4 · `src/lib/env.ts` com validação e falha rápida

**Descrição:** Implementar `env` (servidor, `server-only`) e `publicEnv` conforme spec §5 e §8.4 com `zod`; preencher `.env.example` com todas as chaves e comentários; teste unitário que compara as chaves do `.env.example` com os schemas; garantir que `build`/`start` falha na inicialização apontando a variável ausente (`instrumentation.ts` seleciona o runtime e delega a validação fail-fast ao bootstrap Node-only `instrumentation.node.ts`).

**Aceite:**

- [x] `npm run build` com `.env` sem `NEXT_PUBLIC_SUPABASE_URL` falha com mensagem nomeando a variável (e `npm run start` sem `SUPABASE_SERVICE_ROLE_KEY` termina com exit 1 nomeando-a — segredos de servidor não existem na CI, então são validados na inicialização, não no build)
- [x] Teste `tests/unit/lib/env/index.test.ts` falha se uma chave for adicionada só no schema ou só no `.env.example` (verificado por mutação nos dois sentidos)
- [x] Fora de `src/lib/env/**`, `process.env` aparece somente como
      `process.env.NEXT_RUNTIME` em `src/instrumentation.ts` (allowlist verificável com
      `rg -l "process\.env" src --glob '!src/lib/env/**'` e
      `rg -o "process\.env\.[A-Z0-9_]+" src/instrumentation.ts`)

**Verificação:** `npm run test -- env`; simular env incompleta e rodar `npm run build`.

**Dependências:** T3 · **Arquivos:** `src/lib/env/{index,public,parse}.ts` (diretório em vez de `env.ts`: `public.ts` sem `server-only` para componentes cliente), `.env.example`, `tests/unit/lib/env/{index,public}.test.ts`, `src/instrumentation.ts` (dentro de `src/`, exigência do Next com `src/`), `src/app/layout.tsx` (lê `publicEnv` → valida no build), `package.json` (zod, server-only) · **Tamanho:** M

---

### T5 · Clientes Supabase, CLI, migrações e tipos

**Descrição:** `src/lib/supabase/{server,client,admin}.ts` conforme spec §8.3 e §9 (`@supabase/ssr`, padrão `getAll`/`setAll`); `supabase/config.toml` via `npx supabase init`; `supabase/migrations/README.md` com a convenção de nomes e RLS; scripts `db:types`, `db:migrate`, `db:new`; gerar e commitar `database.types.ts`. `[humano]`: criar `SUPABASE_ACCESS_TOKEN`, obter `SUPABASE_PROJECT_ID`, URL e anon key; preencher `.env` local.

**Aceite:**

- [x] `npm run db:types` gera `src/lib/supabase/database.types.ts` sem diff após commit
- [x] `admin.ts` importa `server-only`; `client.ts` só usa `publicEnv`
- [x] Teste unitário garante que `admin.ts` não é importável em contexto cliente (`server-only` real via `vi.doUnmock`, lançando no import)

**Verificação:** `npm run db:types && git diff --exit-code src/lib/supabase/database.types.ts`; `npm run test -- supabase`.

**Dependências:** T4 · **Arquivos:** `src/lib/supabase/server.ts`, `client.ts`, `admin.ts`, `database.types.ts` (gerado), `supabase/config.toml` (gerado), `supabase/migrations/README.md`, `package.json` (`supabase` CLI e `dotenv-cli` como dev-deps; `db:*` sob `dotenv -e .env --`), `.prettierignore`, `tests/unit/lib/supabase/{client,server,admin}.test.ts` · **Tamanho:** M

---

### T6 · `GET /api/health`, `lib/http` e `lib/rate-limit`

**Descrição:** Route handler dinâmico: probe somente leitura ao Data API via cliente servidor (anon key) com timeout de 2s → `200 { status:'ok', version, supabase:'ok' }` ou `503 { status:'degraded', supabase:'error' }`, com rate limit 60/min por IP. Enquanto o schema `public` estiver vazio, consultar uma relação sentinela inexistente e aceitar `PGRST205` como prova de conectividade, sem criar objetos no banco. Criar `lib/http` (`json`, `problem` RFC 9457) e `lib/rate-limit` (`RateLimiter`, `memoryRateLimiter`, `clientIp`) com testes.

**Aceite:**

- [x] `npm run start` local → `curl /api/health` retorna `supabase: 'ok'` e `version` = `APP_VERSION`
- [x] Com `NEXT_PUBLIC_SUPABASE_URL` apontando para host inexistente → 503 em ≤ 2,5s
- [x] Testes: janela/limite/reset do limiter; 61ª chamada em 1 min → 429 com corpo `problem`

**Verificação:** `npm run test -- rate-limit http`; `npm run build && npm run start` + `curl`.

**Dependências:** T5 · **Arquivos:** `src/app/api/health/route.ts`, `src/lib/http/index.ts`, `src/lib/rate-limit.ts`, `tests/unit/lib/rate-limit.test.ts`, `tests/unit/lib/http.test.ts` · **Tamanho:** M

---

### T7 · Tokens provisórios, `lib/copy.ts` e componentes de marca

**Descrição:** `globals.css` com `@import "tailwindcss"` e `@theme` (cores neutras, `--radius-none`, `--font-sans`); `styles/tokens.md`; `lib/copy.ts` com `copy.system.*` (404, 500, manutenção, vazio, tentar de novo, voltar à Home) no tom do PRD §3; `components/brand/{Wordmark,Symbol,EmptyState}.tsx` — `Wordmark` tipográfico ("indicio" / "□ cult") em variantes `stacked` e `horizontal`, `Symbol` SVG provisório (quadrado com falha), `EmptyState` com símbolo + texto; testes de renderização e acessibilidade. Script `lint:tokens` (proíbe cores literais fora de `globals.css`) incluído em `check`.

**Aceite:**

- [x] `lint:tokens` rejeita paletas Tailwind, cores arbitrárias e literais CSS fora de `globals.css`; testes positivos, negativos e prova por mutação do CLI passam
- [x] `Symbol` tem 24px por padrão e `aria-hidden` quando decorativo; `Wordmark` renderiza as duas variantes
- [x] Testes passam para os três componentes e para as chaves obrigatórias de `copy.system`

**Verificação:** `npm run check`; `npm run test -- brand copy`.

**Dependências:** T3 · **Arquivos:** `src/styles/globals.css`, `src/styles/tokens.md`, `src/lib/copy.ts`, `src/components/brand/{Wordmark,Symbol,EmptyState}.tsx`, `tests/unit/components/brand.test.tsx`, `package.json` · **Tamanho:** M

---

### T8 · Páginas de sistema

**Descrição:** Layout raiz (`lang="pt-BR"`, fonte via `next/font`, `Suspense` no slot de conteúdo; metadata em T10), Home placeholder (`Wordmark` empilhado + assinatura, um `h1`), `not-found.tsx` (símbolo, "Esse rastro não leva a lugar nenhum.", link Home), `error.tsx` e `global-error.tsx` (copy neutra, "Tentar de novo"; Sentry em T11), `manutencao/page.tsx`. Testes de componente para `not-found` e Home.

**Aceite:**

- [x] `/` renderiza wordmark + "Arte para quem reconhece o indício." com um único `h1`
- [x] `/qualquer-coisa` → 404 com a copy da marca e link para `/`
- [x] `error.tsx` renderiza com botão que chama `reset`; `/manutencao` renderiza copy da marca

**Verificação:** `npm run test -- not-found page`; `npm run build && npm run start` e navegar nas 4 rotas.

**Dependências:** T7 · **Arquivos:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/manutencao/page.tsx`, `tests/unit/app/*.test.tsx` · **Tamanho:** M (arquivos pequenos)

---

### T9 · `proxy.ts` e grupos de rota

**Descrição:** Criar `src/app/(vitrine)/layout.tsx` (cabeçalho/rodapé placeholders) e mover a Home para lá; `(conta)/layout.tsx` e `admin/layout.tsx` só com comentário do módulo dono. `src/proxy.ts` com ordem: (1) `MAINTENANCE_MODE=true` → resposta terminal 503 usando o HTML da página `/manutencao`, com `Retry-After`, exceto `/api/health`; (2) refresh de sessão Supabase (`getClaims()`); (3) sem sessão em `/conta/*` ou `/admin/*` → redirect `/` com `TODO(identity)`. Regras puras em `src/lib/proxy/rules.ts` com testes. Matcher exclui `_next/static`, `_next/image`, `favicon.ico`.

**Aceite:**

- [x] `MAINTENANCE_MODE=true npm run start` → `/` responde 503 com a página de manutenção; `/api/health` continua 200
- [x] `/conta` e `/admin` redirecionam para `/` (302) sem sessão
- [x] `npm run build` sem erros de `cacheComponents` (nenhum `cookies()` fora de `Suspense`/handlers)

**Verificação:** `npm run build && MAINTENANCE_MODE=true npm run start` + `curl -I`; `npm run test -- proxy`.

**Dependências:** T5, T8 · **Arquivos:** `src/proxy.ts`, `src/lib/proxy/rules.ts`, `src/app/(vitrine)/layout.tsx`, `src/app/(conta)/layout.tsx`, `src/app/admin/layout.tsx`, `tests/unit/lib/proxy.test.ts` · **Tamanho:** M

---

### T10 · Metadata, Open Graph, `robots.ts`, `sitemap.ts`, `track()`

**Descrição:** `metadata` padrão no layout raiz (título com template, descrição, `metadataBase` = `NEXT_PUBLIC_SITE_URL`, Open Graph com imagem do logo; canonical específico da Home); `robots.ts` (permitir tudo, `sitemap`); `sitemap.ts` com a Home; `lib/analytics/track.ts` com union tipado dos eventos do PRD §14 e implementação no-op que loga em `development`.

**Aceite:**

- [x] `curl /` contém `<title>`, `og:title`, `og:image` absoluto, `<link rel="canonical">`
- [x] `/robots.txt` e `/sitemap.xml` respondem 200 com conteúdo válido
- [x] `track('purchase', {...})` com payload errado não compila; teste garante que não lança em produção

**Verificação:** `npm run test -- track`; `npm run build && npm run start` + `curl`.

**Dependências:** T8 · **Arquivos:** `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/lib/analytics/track.ts`, `tests/unit/lib/track.test.ts` · **Tamanho:** M

---

### T11 · Sentry

**Descrição:** `@sentry/nextjs` 11.x com `instrumentation.ts`, `instrumentation-client.ts`, `withSentryConfig` em `next.config.ts` (sem upload de source maps até haver token), `tracesSampleRate` 0.1, `dataCollection` restritivo (sem coleta automática de PII; substitui o requisito original de `sendDefaultPii: false`), `release` = `APP_VERSION`, desligado quando o DSN está ausente; `error.tsx` e `global-error.tsx` chamam `Sentry.captureException`. `[humano]`: criar projeto no Sentry e obter DSN (para o `.env` local agora; para o recurso Coolify em T15).

**Aceite:**

- [x] Sem DSN, `npm run build && npm run start` funcionam e nenhum request sai para o Sentry
- [x] Com DSN em `development`, `/?boom=1` na Home (guardado por `NODE_ENV !== 'production'`) gera evento no Sentry com `release` correto
- [x] `rg SENTRY_DSN .next/static` retorna só `NEXT_PUBLIC_SENTRY_DSN`

**Verificação:** `npm run build`; teste manual com DSN local; `rg` no bundle.

**Dependências:** T4, T8 · **Arquivos:** `instrumentation.ts`, `instrumentation-client.ts`, `next.config.ts`, `src/app/error.tsx`, `src/app/global-error.tsx`, `package.json` · **Tamanho:** M

---

### T12 · Playwright: smoke E2E

**Descrição:** `playwright.config.ts` com `webServer` (`npm run build && npm run start`, reutilizando servidor existente), projetos `mobile` (Pixel 7) e `desktop` (Chromium 1280), `tests/e2e/`: `health.spec.ts` (200 + `supabase: 'ok'`), `not-found.spec.ts`, `home.spec.ts` (wordmark visível, um `h1`), `maintenance.spec.ts` (servidor separado com `MAINTENANCE_MODE=true` em porta distinta: 503 em `/`, 200 em `/api/health`). Script `test:e2e`; `playwright-report/` e `test-results/` no `.gitignore`.

**Aceite:**

- [x] `npm run test:e2e` passa localmente nos 4 cenários × 2 projetos
- [x] Falha se a copy da 404 mudar (asserção textual exata)
- [x] Relatório HTML gerado e ignorado pelo git

**Verificação:** `npm run test:e2e`.

**Dependências:** T6, T8, T9 · **Arquivos:** `playwright.config.ts`, `tests/e2e/{health,not-found,home,maintenance}.spec.ts`, `.gitignore`, `package.json` · **Tamanho:** M

---

## Checkpoint A — "Aplicação completa localmente"

- [x] `npm run check` verde; `npm run build && npm run start` → health `supabase: 'ok'`
- [x] `npm run test:e2e` verde nos 8 casos
- [x] Home, 404, erro e manutenção com copy da marca; `(conta)`/`admin` redirecionam
- [x] Revisão com a operadora antes de empacotar

**Checkpoint A:** concluído. T13–T16 também estão concluídas; o próximo gate ativo é T17.

---

## Fase B — Empacotamento e entrega

### T13 · Dockerfile + contrato Coolify/Traefik + runbook

**Descrição:** Conforme spec §8.8 e ADR-002: `deploy/Dockerfile` multi-stage (`node:22-alpine`, `npm ci`, Next `standalone`, `USER node`, `HOSTNAME=0.0.0.0`, `EXPOSE 3000`, `HEALTHCHECK /api/health`), `.dockerignore` seguro e `deploy/README.md` para aplicação Git-based Dockerfile no Coolify. Sem Compose/Caddy de aplicação. O runbook cobre variáveis de build/runtime, `SOURCE_COMMIT` → `APP_VERSION`, domínio/TLS Traefik, volume de cache `/app/.next/cache`, security headers, Auto Deploy OFF, pin de commit e deploy por API pós-CI, access logs como assunto de plataforma e rollback futuro.

**Aceite:**

- [x] Imagem multi-stage usa Node 22, Next `standalone`, usuário não-root, porta interna 3000 e healthcheck real; cache é gravável pelo usuário `node`.
- [x] `APP_VERSION` recebe o commit implantado via `SOURCE_COMMIT`, com configuração de build documentada; somente variáveis públicas e o SHA entram no build, sem segredo de servidor.
- [x] `.dockerignore` exclui `node_modules`, `.next`, `.env*`, testes e docs; nenhum proxy próprio ou porta host 80/443 é criado.
- [x] Runbook documenta recurso Coolify, domínio/TLS, storage, headers, Auto Deploy OFF, pin e deploy por API somente após CI e acesso a logs sem afirmar habilitação atual.
- [x] Nenhum deploy real executado; T13 concluída após revisão, merge da PR #12 e sincronização documental.

**Verificação:** revisão estática e gates locais; T14 constrói a imagem na CI, T15 configura a plataforma e T16 valida deploy real.

**Dependências:** T2 · **Arquivos:** `deploy/Dockerfile`, `.dockerignore`, `deploy/README.md`, template opcional de middleware · **Tamanho:** M

---

### T14 · `ci.yml` completo

**Descrição:** O job comum `ci` roda em PR e push para `main`: `npm ci` → `npm run check` → `npm run build` → `npm run test:e2e` → gitleaks → varredura de segredo no bundle → `docker build` do `deploy/Dockerfile` (sem push/publicação). O build recebe somente valores públicos e `APP_VERSION=github.sha`; nenhum Compose é exigido. O job privilegiado `db-types` roda somente em push para `main`, após o sucesso de `ci`, e verifica `npm run db:types && git diff --exit-code` com o ambiente `ci-supabase-types` restrito à branch `main`.

**Contrato CI em quatro categorias:** (A) Build/Public: `NEXT_PUBLIC_SITE_URL` (URL de teste, por exemplo `http://127.0.0.1:3000`), `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (projeto real de teste acessível pelo health); `NEXT_PUBLIC_SENTRY_DSN` opcional; `APP_VERSION=github.sha`. São GitHub Variables/valores de workflow, não secrets obrigatórios. (B) Tooling: `SUPABASE_PROJECT_ID` é Variable do repositório; `SUPABASE_ACCESS_TOKEN` é Secret apenas do GitHub Environment `ci-supabase-types`, cuja política personalizada permite somente a branch `main`. O token chega somente ao passo de tipos do job `db-types` em push para `main`, depois de `ci` verde. Preferir PAT Supabase com escopo exclusivo do projeto de CI e permissão Database: Read quando disponível; se indisponível ou não verificado, o PAT existente pode ficar temporariamente nesse ambiente restrito, com rotação para PAT com escopo como pendência. (C) E2E Runtime: `SUPABASE_SERVICE_ROLE_KEY=ci-unused-foundation-e2e` literal não secreto somente para `next start`; `MAINTENANCE_MODE=false` no servidor normal. A sentinela satisfaz a validação de startup, não é credencial Supabase e nunca deve alcançar teste admin; reavaliar quando a suíte cobrir admin. (D) Optional/Disabled: `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN` ausentes se Sentry não for testado. A service role real é obrigatória em produção/Coolify e não pertence a esses jobs CI.

**Subgate `[humano]`:** Antes de exigir workflow verde, cadastrar `SUPABASE_PROJECT_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em Variables ou valores não secretos do workflow. Criar o GitHub Environment `ci-supabase-types` com política personalizada permitindo apenas `main`, cadastrar nele o Secret `SUPABASE_ACCESS_TOKEN` e confirmar que não existe Secret de mesmo nome no repositório. A classificação pública pode seguir política do projeto. Não cadastrar service role real para os smoke E2E.

O script `db:types` usa `dotenv -e .env --`; o job privilegiado `db-types`, somente em push confiável para `main`, cria um `.env` temporário vazio após instalar um trap de limpeza, deixando `SUPABASE_PROJECT_ID` e `SUPABASE_ACCESS_TOKEN` do ambiente prevalecerem. O arquivo é removido mesmo em falha; nunca recebe o token, não é commitado, enviado como artefato nem incluído no contexto Docker.

**Aceite:**

- [x] Job comum `ci` verde em PR sem token privilegiado e em push para `main`; job `db-types` verde em push para `main` após `ci`; tempo total ≤ 10 min com cache quente.
- [x] Docker build falha quando o Dockerfile quebra; gitleaks e varredura do bundle bloqueiam segredos.
- [x] `db:types` diff falha se os tipos estiverem desatualizados, em teste local controlado ou contexto remoto confiável.
- [x] Build usa as variáveis públicas; E2E usa Supabase público real e sentinela não secreta apenas no runtime, sem chamar `admin.ts`.
- [x] `db-types` recebe project id e access token apenas no passo de tipos; o Secret do repositório está ausente, o Secret do ambiente está presente e a política do ambiente permite somente `main`; nenhuma service role real está na CI.
- [x] Docker build recebe apenas os três `NEXT_PUBLIC_*` obrigatórios, o DSN público opcional e `APP_VERSION`; exclui `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_DSN`, `SUPABASE_ACCESS_TOKEN`.

**Verificação:** `gh run list --workflow ci.yml`; `gh run view <id>`; casos negativos de Dockerfile quebrado, fixture Gitleaks e marcador no bundle podem rodar em branch/PR descartável sem token. O caso negativo de tipos desatualizados deve rodar somente em contexto confiável; teste local controlado com o mesmo comando é aceitável antes do merge. Nunca executar código de PR com PAT Supabase nem afrouxar a política do ambiente para testar o ambiente.

**Fechamento T14:** PR #13 mesclada em `main` no commit `611a880404f064dcc074f0aa0fd0a09d17e60fa9`; casos negativos de Docker, Gitleaks, bundle e `db:types` passaram; o push de `main` executou a CI run #8 (`36042674785`) com os jobs `ci` e `db-types` verdes em menos de 10 minutos. Revisão humana concluída.

**Dependências:** T12, T13 · **Arquivos:** `.github/workflows/ci.yml`, `.gitleaks.toml` (se necessário) · **Tamanho:** S

---

### T15 · `[humano]` Configurar Indicio Cult no Coolify

**Descrição:** Seguir `deploy/README.md` na VPS Hostinger já equipada com Coolify/Traefik: conectar `jlima004/indicio-cult` branch `main`, Base Directory `/`, Dockerfile Location `/deploy/Dockerfile`, porta interna 3000 e domínio; configurar variáveis Build/Runtime, `APP_VERSION=$SOURCE_COMMIT`, Include Source Commit in Build, healthcheck e Persistent Storage de cache. Configurar middleware de security headers pelo mecanismo suportado, mantendo labels existentes; verificar roteamento/TLS e registrar o estado real dos access logs. **Auto Deploy OFF.** Habilitar API Access, registrar Application UUID, criar `COOLIFY_CONFIG_TOKEN` (`read` + `write`) e `COOLIFY_DEPLOY_TOKEN` (`deploy`) na equipe proprietária; titular Admin/Owner. Cadastrar tokens como GitHub Secrets e `COOLIFY_API_URL`, `COOLIFY_APP_UUID`, URL pública de health como Variables. Impedir outros gatilhos/mutações concorrentes durante T16. `write` é amplo no escopo da equipe; não usar `root`/`read:sensitive`. Qualquer mudança global no proxy exige gate humano próprio.

**Aceite:**

- [x] Recurso Git Dockerfile e domínio configurados para a porta interna 3000, sem porta host da aplicação; DNS público/autoritativo validado para `indiciocult.com.br → 2.25.231.34`. Prova do processo/HTTPS/certificado em runtime fica explicitamente deferida à T16 porque nenhum primeiro deploy foi disparado.
- [x] Build/runtime vars e secrets têm escopo correto; Include Source Commit in Build está habilitado e `APP_VERSION=$SOURCE_COMMIT` está configurado com interpolação. A prova runtime `SOURCE_COMMIT == APP_VERSION` fica deferida à T16.
- [x] Auto Deploy OFF, API Access/UUID/tokens e GitHub secrets/variables corretos; middleware `indicio-cult-security-headers@file` configurado preservando os middlewares existentes; access logs globais verificados como DISABLED e não alterados.

**Verificação:** revisão humana da configuração Coolify/GitHub e do DNS concluída. Aplicação UUID `ly3lndsfdmzbe6z5ubun1q5d`; config token com `read+write`, deploy token com `deploy`, ambos sem `root`/`read:sensitive`; GET com config token retornou 200 e o deploy token retornou 403 para leitura. Nenhum deploy, redeploy, PATCH de `git_commit_sha` ou workflow de deploy foi executado. Evidências de runtime (health, HTTPS/TLS, cache gravável, headers públicos e identidade do SHA implantado) ficam deferidas à T16.

**Fechamento T15:** `HUMAN APPROVED`; configuração PASS; runtime evidence deferred to T16; revisão adversarial P0=0, P1=0, P2=0, P3=5 não bloqueantes. O processo local temporário usado para armazenar os tokens no GitHub foi encerrado após os dois Secrets já terem sido persistidos.

**Dependências:** T13 · **Arquivos:** nenhum de runtime; configuração humana · **Tamanho:** M

---

### T16 · `deploy.yml`: CI verde → pin SHA → deploy API → health → aquecimento

**Descrição:** Workflow após `ci.yml` verde para a `main`: definir `candidate_sha=workflow_run.head_sha`; usar `concurrency` exclusiva de produção com `cancel-in-progress: false` até terminar a verificação. Antes da mutação, comparar SHA atual da `main`; se diferente, marcar `superseded` e não fazer deploy. Fazer `PATCH /api/v1/applications/{uuid}` com `git_commit_sha=candidate_sha`, reler por `GET` e exigir igualdade. Se o pin não puder ser provado, falhar **antes** do trigger. Fazer `POST /api/v1/deploy?uuid=...`, guardar `deployment_uuid`, aguardar status final bem-sucedido e exigir `deployment.commit=candidate_sha`. Consultar `/api/health` até `status=ok`, `supabase=ok`, `version=candidate_sha`; só então aquecer Home. Cada execução redefine o pin; 2xx da API sozinho não é sucesso. O URL público para verificação pertence à configuração do workflow, não ao `.env` da aplicação.

**Aceite:**

- [x] Push/merge na `main` só chega à produção após CI verde; Auto Deploy permanece OFF.
- [x] Candidato obsoleto não deploya; concurrency impede dois workflows de alterarem `git_commit_sha` simultaneamente.
- [x] Pin igual ao candidato é relido antes do deploy; deployment parte desse pin e expõe commit igual ao candidato.
- [x] Workflow falha se API, deployment, TLS, saúde, Supabase ou versão divergir; 2xx não é prova de sucesso.
- [x] Home responde 200 com certificado público válido e aquecimento executado.

**Verificação:** PR #18 mesclada em `main` no commit `95f16f6cbb62db273f3c00bc33389efbe25774d7`; CI run #16 (`36170635738`) PASS; Deploy Production #1 (`36170999151`) PASS; deployment UUID `ref3vayi4ee6sbywqx7uycp3`. O workflow comprovou `candidate_sha == configured_git_commit_sha == deployment.commit == health.version`; T15 já havia configurado `APP_VERSION=$SOURCE_COMMIT`, e o Coolify importou/construiu exatamente o mesmo commit. Health público confirmou `status=ok`, `supabase=ok` e versão correta; os quatro security headers e a Home 200 foram validados sobre HTTPS sem bypass. O Dockerfile healthcheck ficou `healthy`. O volume `/app/.next/cache` foi confirmado gravável pelo processo `uid=1000(node) gid=1000(node)` com criação/leitura/remoção de arquivo de teste.

**Fechamento T16:** `HUMAN APPROVED`; implementação PASS; runtime validation PASS; primeiro deploy de produção PASS. T16 encerrada e T17 definido como próximo gate, ainda não iniciado.

**Dependências:** T14, T15 · **Arquivos:** `.github/workflows/deploy.yml`, `deploy/README.md` · **Tamanho:** S

---

### T17 · Proteção da `main`, Traefik TLS/headers e rollback

**Descrição:** Exigir PR e status check `ci` na `main`, sem force-push/deleção; verificar certificado Let's Encrypt real via Coolify/Traefik, middleware de security headers e roteamento; registrar evidência dos access logs (ou decisão humana sobre sua ativação global). Testar rollback com mecanismo oficial do Coolify e restaurar release vigente. Como rollback reutiliza variáveis runtime atuais, registrar commit da imagem antiga e release embutida, conferir se `APP_VERSION`/health representam essa imagem, corrigir divergência sob controle humano e só então aceitar o ensaio.

**Aceite:**

- [ ] Push direto na `main` rejeitado; PR sem CI verde não é mesclado.
- [ ] HTTPS sem `-k`, 404 da marca, TLS e headers corretos.
- [ ] Rollback do Coolify para imagem anterior testado e revertido, com evidência do commit da imagem, release embutida e health coerente; estado dos access logs registrado.

**Verificação:** proteção GitHub, `curl` público, tela/logs Coolify e registro do teste de rollback.

**Dependências:** T16 · **Arquivos:** `deploy/README.md`, documentação/evidências · **Tamanho:** S

---

## Checkpoint B — “Está no ar”

- [ ] Domínio público responde via Coolify/Traefik com TLS válido; Home, 404 e `/api/health` corretos.
- [ ] CI e deploy workflow verdes; evidência de `candidate_sha == configured git_commit_sha == deployment.commit == SOURCE_COMMIT == APP_VERSION == health.version`.
- [ ] Push/merge na `main` só aciona pin/deploy por API após CI; Auto Deploy OFF; rollback Coolify testado.
- [ ] Operadora revisou configuração, secrets, headers e estado real dos access logs.

---

## Fase C — Fechamento

### T18 · Validação final, README e baseline Lighthouse

**Descrição:** Percorrer os 11 critérios do spec §10 com evidência; rodar Lighthouse mobile na Home em produção; adicionar ao README “Como rodar” e link ao runbook Coolify; testar `MAINTENANCE_MODE=true` no recurso Coolify e reverter; atualizar este arquivo e o status do spec somente após validação.

**Aceite:**

- [ ] 11/11 critérios do spec §10 com evidência.
- [ ] Lighthouse mobile ≥ 95 em Performance, Acessibilidade e Boas práticas na Home.
- [ ] Outra pessoa consegue rodar `npm run dev` apenas com o README.

**Verificação:** `npx lighthouse <url-publica> --form-factor=mobile`; leitura cega do README em sessão nova; health/maintenance públicos.

**Dependências:** T10, T11, T17 · **Arquivos:** `README.md`, `docs/specs/SPEC-foundation.md`, `tasks/todo.md` · **Tamanho:** S

---

## Checkpoint C — "Fundação pronta"

- [ ] Todos os critérios do spec §10 verdadeiros em produção
- [ ] `SPEC-foundation.md` reflete o que foi construído (contratos §9 inalterados ou spec atualizado antes do código)
- [ ] Questões abertas revistas com a operadora
- [ ] Liberação para `SPEC-nuvemshop.md` (etapa 2 do mapa)
