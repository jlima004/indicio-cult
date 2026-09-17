# Tarefas: módulo `foundation`

Plano: [`tasks/plan.md`](./plan.md) · Spec: [`docs/specs/SPEC-foundation.md`](../docs/specs/SPEC-foundation.md)

Convenções: uma tarefa por PR (`feat(foundation): ...`); `npm run check` verde **localmente** antes de abrir o PR (não há CI até T14); tarefas `[humano]` são executadas pela operadora com o agente apoiando. Tamanhos: XS 1 arquivo · S 1–2 · M 3–5 (arquivos gerados/boilerplate não contam).

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
- [x] `package.json` fixa Next 16.3.x, React 19.3.x, TS 5.9.x, Tailwind 4.x, Zustand 5.x, `engines.node >=22`; `.env.example` existe (vazio, com cabeçalho)

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

**Descrição:** Implementar `env` (servidor, `server-only`) e `publicEnv` conforme spec §5 e §8.4 com `zod`; preencher `.env.example` com todas as chaves e comentários; teste unitário que compara as chaves do `.env.example` com os schemas; garantir que `build`/`start` falha na inicialização apontando a variável ausente (importar `env` em `instrumentation.ts`).

**Aceite:**

- [ ] `npm run build` com `.env` sem `NEXT_PUBLIC_SUPABASE_URL` falha com mensagem nomeando a variável
- [ ] Teste `env.test.ts` falha se uma chave for adicionada só no schema ou só no `.env.example`
- [ ] `rg "process\.env" src --glob '!src/lib/env.ts'` vazio

**Verificação:** `npm run test -- env`; simular env incompleta e rodar `npm run build`.

**Dependências:** T3 · **Arquivos:** `src/lib/env.ts`, `.env.example`, `tests/unit/lib/env.test.ts`, `instrumentation.ts`, `package.json` (zod) · **Tamanho:** M

---

### T5 · Clientes Supabase, CLI, migrações e tipos

**Descrição:** `src/lib/supabase/{server,client,admin}.ts` conforme spec §8.3 e §9 (`@supabase/ssr`, padrão `getAll`/`setAll`); `supabase/config.toml` via `npx supabase init`; `supabase/migrations/README.md` com a convenção de nomes e RLS; scripts `db:types`, `db:migrate`, `db:new`; gerar e commitar `database.types.ts`. `[humano]`: criar `SUPABASE_ACCESS_TOKEN`, obter `SUPABASE_PROJECT_ID`, URL e anon key; preencher `.env` local.

**Aceite:**

- [ ] `npm run db:types` gera `src/lib/supabase/database.types.ts` sem diff após commit
- [ ] `admin.ts` importa `server-only`; `client.ts` só usa `publicEnv`
- [ ] Teste unitário garante que `admin.ts` não é importável em contexto cliente (mock de `server-only` lançando)

**Verificação:** `npm run db:types && git diff --exit-code src/lib/supabase/database.types.ts`; `npm run test -- supabase`.

**Dependências:** T4 · **Arquivos:** `src/lib/supabase/server.ts`, `client.ts`, `admin.ts`, `database.types.ts` (gerado), `supabase/config.toml` (gerado), `supabase/migrations/README.md`, `package.json` · **Tamanho:** M

---

### T6 · `GET /api/health`, `lib/http` e `lib/rate-limit`

**Descrição:** Route handler dinâmico: `select 1` via cliente servidor com timeout de 2s → `200 { status:'ok', version, supabase:'ok' }` ou `503 { status:'degraded', supabase:'error' }`, com rate limit 60/min por IP. Criar `lib/http` (`json`, `problem` RFC 9457) e `lib/rate-limit` (`RateLimiter`, `memoryRateLimiter`, `clientIp`) com testes.

**Aceite:**

- [ ] `npm run start` local → `curl /api/health` retorna `supabase: 'ok'` e `version` = `APP_VERSION`
- [ ] Com `NEXT_PUBLIC_SUPABASE_URL` apontando para host inexistente → 503 em ≤ 2,5s
- [ ] Testes: janela/limite/reset do limiter; 61ª chamada em 1 min → 429 com corpo `problem`

**Verificação:** `npm run test -- rate-limit http`; `npm run build && npm run start` + `curl`.

**Dependências:** T5 · **Arquivos:** `src/app/api/health/route.ts`, `src/lib/http/index.ts`, `src/lib/rate-limit.ts`, `tests/unit/lib/rate-limit.test.ts`, `tests/unit/lib/http.test.ts` · **Tamanho:** M

---

### T7 · Tokens provisórios, `lib/copy.ts` e componentes de marca

**Descrição:** `globals.css` com `@import "tailwindcss"` e `@theme` (cores neutras, `--radius-none`, `--font-sans`); `styles/tokens.md`; `lib/copy.ts` com `copy.system.*` (404, 500, manutenção, vazio, tentar de novo, voltar à Home) no tom do PRD §3; `components/brand/{Wordmark,Symbol,EmptyState}.tsx` — `Wordmark` tipográfico ("indicio" / "□ cult") em variantes `stacked` e `horizontal`, `Symbol` SVG provisório (quadrado com falha), `EmptyState` com símbolo + texto; testes de renderização e acessibilidade. Script `lint:tokens` (proíbe cores literais fora de `globals.css`) incluído em `check`.

**Aceite:**

- [ ] `rg -n "bg-white|text-black|#[0-9a-fA-F]{3,6}" src --glob '!src/styles/globals.css'` vazio; `lint:tokens` falha se violado
- [ ] `Symbol` tem 24px por padrão e `aria-hidden` quando decorativo; `Wordmark` renderiza as duas variantes
- [ ] Testes passam para os três componentes e para as chaves obrigatórias de `copy.system`

**Verificação:** `npm run check`; `npm run test -- brand copy`.

**Dependências:** T3 · **Arquivos:** `src/styles/globals.css`, `src/styles/tokens.md`, `src/lib/copy.ts`, `src/components/brand/{Wordmark,Symbol,EmptyState}.tsx`, `tests/unit/components/brand.test.tsx`, `package.json` · **Tamanho:** M

---

### T8 · Páginas de sistema

**Descrição:** Layout raiz (`lang="pt-BR"`, fonte via `next/font`, `Suspense` no slot de conteúdo; metadata em T10), Home placeholder (`Wordmark` empilhado + assinatura, um `h1`), `not-found.tsx` (símbolo, "Esse rastro não leva a lugar nenhum.", link Home), `error.tsx` e `global-error.tsx` (copy neutra, "Tentar de novo"; Sentry em T11), `manutencao/page.tsx`. Testes de componente para `not-found` e Home.

**Aceite:**

- [ ] `/` renderiza wordmark + "Arte para quem reconhece o indício." com um único `h1`
- [ ] `/qualquer-coisa` → 404 com a copy da marca e link para `/`
- [ ] `error.tsx` renderiza com botão que chama `reset`; `/manutencao` renderiza copy da marca

**Verificação:** `npm run test -- not-found page`; `npm run build && npm run start` e navegar nas 4 rotas.

**Dependências:** T7 · **Arquivos:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/manutencao/page.tsx`, `tests/unit/app/*.test.tsx` · **Tamanho:** M (arquivos pequenos)

---

### T9 · `proxy.ts` e grupos de rota

**Descrição:** Criar `src/app/(vitrine)/layout.tsx` (cabeçalho/rodapé placeholders) e mover a Home para lá; `(conta)/layout.tsx` e `admin/layout.tsx` só com comentário do módulo dono. `proxy.ts` na raiz com ordem: (1) `MAINTENANCE_MODE=true` → rewrite para `/manutencao` com 503 e `Retry-After`, exceto `/api/health`; (2) refresh de sessão Supabase (`getClaims()`); (3) sem sessão em `/conta/*` ou `/admin/*` → redirect `/` com `TODO(identity)`. Regras puras em `src/lib/proxy/rules.ts` com testes. Matcher exclui `_next/static`, `_next/image`, `favicon.ico`.

**Aceite:**

- [ ] `MAINTENANCE_MODE=true npm run start` → `/` responde 503 com a página de manutenção; `/api/health` continua 200
- [ ] `/conta` e `/admin` redirecionam para `/` (302) sem sessão
- [ ] `npm run build` sem erros de `cacheComponents` (nenhum `cookies()` fora de `Suspense`/handlers)

**Verificação:** `npm run build && MAINTENANCE_MODE=true npm run start` + `curl -I`; `npm run test -- proxy`.

**Dependências:** T5, T8 · **Arquivos:** `proxy.ts`, `src/lib/proxy/rules.ts`, `src/app/(vitrine)/layout.tsx`, `src/app/(conta)/layout.tsx`, `src/app/admin/layout.tsx`, `tests/unit/lib/proxy.test.ts` · **Tamanho:** M

---

### T10 · Metadata, Open Graph, `robots.ts`, `sitemap.ts`, `track()`

**Descrição:** `metadata` padrão no layout raiz (título com template, descrição, `metadataBase` = `NEXT_PUBLIC_SITE_URL`, Open Graph com imagem do logo, `alternates.canonical`); `robots.ts` (permitir tudo, `sitemap`); `sitemap.ts` com a Home; `lib/analytics/track.ts` com union tipado dos eventos do PRD §14 e implementação no-op que loga em `development`.

**Aceite:**

- [ ] `curl /` contém `<title>`, `og:title`, `og:image` absoluto, `<link rel="canonical">`
- [ ] `/robots.txt` e `/sitemap.xml` respondem 200 com conteúdo válido
- [ ] `track('purchase', {...})` com payload errado não compila; teste garante que não lança em produção

**Verificação:** `npm run test -- track`; `npm run build && npm run start` + `curl`.

**Dependências:** T8 · **Arquivos:** `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/lib/analytics/track.ts`, `tests/unit/lib/track.test.ts` · **Tamanho:** M

---

### T11 · Sentry

**Descrição:** `@sentry/nextjs` com `instrumentation.ts`, `instrumentation-client.ts`, `withSentryConfig` em `next.config.ts` (sem upload de source maps até haver token), `tracesSampleRate` 0.1, `sendDefaultPii: false`, `release` = `APP_VERSION`, desligado quando o DSN está ausente; `error.tsx` e `global-error.tsx` chamam `Sentry.captureException`. `[humano]`: criar projeto no Sentry e obter DSN (para o `.env` local agora; do VPS em T15).

**Aceite:**

- [ ] Sem DSN, `npm run build && npm run start` funcionam e nenhum request sai para o Sentry
- [ ] Com DSN em `development`, `/?boom=1` na Home (guardado por `NODE_ENV !== 'production'`) gera evento no Sentry com `release` correto
- [ ] `rg SENTRY_DSN .next/static` retorna só `NEXT_PUBLIC_SENTRY_DSN`

**Verificação:** `npm run build`; teste manual com DSN local; `rg` no bundle.

**Dependências:** T4, T8 · **Arquivos:** `instrumentation.ts`, `instrumentation-client.ts`, `next.config.ts`, `src/app/error.tsx`, `src/app/global-error.tsx`, `package.json` · **Tamanho:** M

---

### T12 · Playwright: smoke E2E

**Descrição:** `playwright.config.ts` com `webServer` (`npm run build && npm run start`, reutilizando servidor existente), projetos `mobile` (Pixel 7) e `desktop` (Chromium 1280), `tests/e2e/`: `health.spec.ts` (200 + `supabase: 'ok'`), `not-found.spec.ts`, `home.spec.ts` (wordmark visível, um `h1`), `maintenance.spec.ts` (servidor separado com `MAINTENANCE_MODE=true` em porta distinta: 503 em `/`, 200 em `/api/health`). Script `test:e2e`; `playwright-report/` e `test-results/` no `.gitignore`.

**Aceite:**

- [ ] `npm run test:e2e` passa localmente nos 4 cenários × 2 projetos
- [ ] Falha se a copy da 404 mudar (asserção textual exata)
- [ ] Relatório HTML gerado e ignorado pelo git

**Verificação:** `npm run test:e2e`.

**Dependências:** T6, T8, T9 · **Arquivos:** `playwright.config.ts`, `tests/e2e/{health,not-found,home,maintenance}.spec.ts`, `.gitignore`, `package.json` · **Tamanho:** M

---

## Checkpoint A — "Aplicação completa localmente"

- [ ] `npm run check` verde; `npm run build && npm run start` → health `supabase: 'ok'`
- [ ] `npm run test:e2e` verde nos 8 casos
- [ ] Home, 404, erro e manutenção com copy da marca; `(conta)`/`admin` redirecionam
- [ ] Revisão com a operadora antes de empacotar

---

## Fase B — Empacotamento e entrega

### T13 · Dockerfile, Compose, Caddyfile e guia do VPS

**Descrição:** Conforme spec §8.8: `deploy/Dockerfile` multi-stage (`deps` → `build` → `runner` em `node:22-alpine`, `USER node`, `HEALTHCHECK` em `/api/health`, `APP_VERSION` como build arg), `deploy/docker-compose.yml` (`app` sem portas + `caddy` 80/443, volumes `caddy_data`, `caddy_config`, `next_cache`, `restart: unless-stopped`, `IMAGE_TAG` parametrizado), `deploy/Caddyfile` (`{$SITE_HOST}`, cabeçalhos de segurança, `encode zstd gzip`, **emissor de staging do Let's Encrypt** até T17) e `deploy/README.md` com o provisionamento único do VPS (usuário não-root, Docker Engine + Compose, firewall 22/80/443, `fail2ban`, chave SSH da CI, `/srv/indicio-cult/{.env,docker-compose.yml,Caddyfile}`, `SITE_HOST` em `sslip.io`, rollback por tag, `docker system prune` mensal, limite de 1 GB do `next_cache`).

**Aceite:**

- [ ] `Dockerfile` não roda como root e declara `HEALTHCHECK`; `.dockerignore` exclui `node_modules`, `.next`, `.env*`, `tests`, `docs`
- [ ] `docker-compose.yml` não publica a porta do Next; só o Caddy expõe 80/443
- [ ] `deploy/README.md` permite provisionar o VPS do zero sem consultar mais nada

**Verificação:** revisão manual (sem Docker local); validação executável em T14 (`compose config` + build) e T16 (deploy).

**Dependências:** T2 · **Arquivos:** `deploy/Dockerfile`, `deploy/docker-compose.yml`, `deploy/Caddyfile`, `deploy/README.md`, `.dockerignore` · **Tamanho:** M

---

### T14 · `ci.yml` completo

**Descrição:** Workflow em PR e push: `npm ci` (cache) → `npm run check` → `npm run build` → Playwright (navegadores em cache) com segredos do Supabase → `npm run db:types && git diff --exit-code` → `gitleaks` (action oficial) → `rg -q "SUPABASE_SERVICE_ROLE_KEY" .next/static && exit 1` → `docker compose -f deploy/docker-compose.yml config` → `docker build` da imagem (sem push, `APP_VERSION=${{ github.sha }}`). `[humano]`: cadastrar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN` nos segredos do repositório.

**Aceite:**

- [ ] Workflow verde na `main` e em um PR de teste; tempo total ≤ 10 min com cache quente
- [ ] Job de imagem falha se o `Dockerfile` quebrar; gitleaks bloqueia PR com segredo falso (`sk_test_...` em branch descartável)
- [ ] `db:types` diff falha se `database.types.ts` estiver desatualizado

**Verificação:** `gh run list --workflow ci.yml`; `gh run view <id>`; branches descartáveis para os casos negativos.

**Dependências:** T12, T13 · **Arquivos:** `.github/workflows/ci.yml`, `.gitleaks.toml` (se necessário) · **Tamanho:** S

---

### T15 · `[humano]` Provisionamento do VPS e segredos de deploy

**Descrição:** Seguindo `deploy/README.md`: preparar o VPS (usuário, Docker, firewall, chave SSH dedicada à CI, `/srv/indicio-cult` com `.env` completo — Supabase, `SITE_HOST=<ip-com-hifens>.sslip.io`, `APP_VERSION` é injetado pela imagem, `SENTRY_DSN` se já existir — mais `docker-compose.yml` e `Caddyfile`); cadastrar em _Settings → Secrets_: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `SITE_HOST`. Pode começar logo após T1, com o `deploy/README.md` ainda em rascunho se a operadora preferir.

**Aceite:**

- [ ] `ssh -i <chave-ci> $VPS_USER@$VPS_HOST docker compose version` funciona a partir da máquina local
- [ ] `curl -I http://$SITE_HOST` chega ao VPS (porta 80 aberta; DNS `sslip.io` resolvendo)
- [ ] `gh secret list` mostra os 4 segredos de deploy + os 4 do Supabase (T14)

**Verificação:** comandos acima executados pela operadora; agente confere `gh secret list`.

**Dependências:** T1, T13 · **Arquivos:** nenhum · **Tamanho:** S (humano)

---

### T16 · `deploy.yml`: GHCR → SSH → Compose → health → aquecimento

**Descrição:** Workflow em push na `main`, condicionado ao `ci.yml` verde: login no GHCR, build/push da imagem com tags `sha` e `latest` (pacote público), SSH no VPS, `IMAGE_TAG=<sha> docker compose pull && up -d --remove-orphans`, espera `https://$SITE_HOST/api/health` responder 200 com `version` = sha em ≤ 90s (senão falha), `curl` de aquecimento na Home. Seção de rollback no `deploy/README.md` (`IMAGE_TAG=<sha-anterior> docker compose up -d`).

**Aceite:**

- [ ] Push na `main` publica `ghcr.io/jlima004/indicio-cult:<sha>` e o VPS passa a servir essa versão (`/api/health` retorna o `version` correto e `supabase: 'ok'`)
- [ ] `https://$SITE_HOST/` responde 200 (certificado de staging nesta etapa; `curl -k` no job até T17)
- [ ] Job falha e o container anterior segue rodando quando o health não responde (testar com imagem quebrada em branch)

**Verificação:** `gh run view`; `curl -sk https://$SITE_HOST/api/health`; `docker compose ps` no VPS.

**Dependências:** T14, T15 · **Arquivos:** `.github/workflows/deploy.yml`, `deploy/README.md` · **Tamanho:** S

---

### T17 · Proteção da `main` e certificado de produção

**Descrição:** Via `gh api`: `main` exige PR, status check `ci` obrigatório, sem force-push, sem deleção. Trocar o `Caddyfile` do emissor de staging para produção do Let's Encrypt (remover `-k` do `deploy.yml`) e confirmar certificado válido. Testar rollback uma vez com a tag anterior.

**Aceite:**

- [ ] `git push origin main` direto é rejeitado; PR sem `ci` verde não pode ser mesclado
- [ ] `curl -sI https://$SITE_HOST/` sem `-k` retorna 200; `/qualquer-coisa` retorna 404 com a copy da marca
- [ ] Rollback para o sha anterior executado e revertido; documentado no `deploy/README.md`

**Verificação:** `gh api repos/jlima004/indicio-cult/branches/main/protection`; `curl`; `docker compose ps` no VPS.

**Dependências:** T16 · **Arquivos:** `deploy/Caddyfile`, `.github/workflows/deploy.yml`, `deploy/README.md` · **Tamanho:** S

---

## Checkpoint B — "Está no ar"

- [ ] `https://$SITE_HOST/`, `/qualquer-coisa` (404) e `/api/health` respondem via pipeline, certificado válido
- [ ] `ci.yml` e `deploy.yml` verdes nas duas últimas execuções; rollback testado
- [ ] Revisão com a operadora: o que o pipeline faz, onde ficam segredos, como fazer rollback

---

## Fase C — Fechamento

### T18 · Validação final, README e baseline Lighthouse

**Descrição:** Percorrer os 11 critérios do spec §10 marcando cada um com evidência (link do run, saída de comando); rodar Lighthouse mobile na Home em produção e registrar em `docs/specs/SPEC-foundation.md` (seção "Evidências", nova); adicionar ao `README.md` a seção "Como rodar" (pré-requisitos, `.env`, `npm run dev`, `npm run check`, link para `deploy/README.md`); testar `MAINTENANCE_MODE=true` no VPS e reverter; atualizar este arquivo e o status do spec para "Implementado".

**Aceite:**

- [ ] 11/11 critérios do spec §10 marcados com evidência
- [ ] Lighthouse mobile ≥ 95 em Performance, Acessibilidade e Boas práticas na Home
- [ ] Um segundo desenvolvedor (ou o agente em sessão limpa) consegue rodar `npm run dev` seguindo só o README

**Verificação:** `npx lighthouse https://$SITE_HOST --form-factor=mobile`; leitura cega do README em sessão nova.

**Dependências:** T10, T11, T17 · **Arquivos:** `README.md`, `docs/specs/SPEC-foundation.md`, `tasks/todo.md` · **Tamanho:** S

---

## Checkpoint C — "Fundação pronta"

- [ ] Todos os critérios do spec §10 verdadeiros em produção
- [ ] `SPEC-foundation.md` reflete o que foi construído (contratos §9 inalterados ou spec atualizado antes do código)
- [ ] Questões abertas revistas com a operadora
- [ ] Liberação para `SPEC-nuvemshop.md` (etapa 2 do mapa)
