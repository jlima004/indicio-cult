# Spec: `foundation` — base técnica da vitrine Indicio Cult

| Campo         | Valor                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Módulo        | `foundation` (ver [mapa de capacidades](./CAPABILITY-MAP.md))                                     |
| Depende de    | —                                                                                                 |
| Consumido por | todos os demais módulos                                                                           |
| Origem        | [PRD §8, §14](../PRD.md); [ADR-001](../decisions/ADR-001-stack-frontend-cache-estado-e-deploy.md) |
| Status        | Aprovado (2026-09-16)                                                                             |
| Data          | 2026-09-16                                                                                        |

---

## 1. Objetivo

Entregar o esqueleto executável sobre o qual todos os módulos do MVP são construídos: um projeto Next.js (App Router) com estrutura de rotas, tooling, conexão ao Supabase, empacotamento Docker, proxy TLS e pipeline de deploy — **implantado no VPS e respondendo HTTPS** — sem nenhuma feature de produto.

**Para quem.** A operadora/desenvolvedora (P4) e os agentes que implementarão os módulos seguintes. Este módulo não tem usuário final; seu "cliente" é o próximo módulo da ordem de construção.

**Por que agora.** PRD e ADR-001 fecharam o quê e a stack. Supabase e VPS já existem. Sem uma fundação com critérios verificáveis, cada módulo decidiria estrutura, tooling e deploy por conta própria.

**Sucesso em uma frase.** `git push` na `main` resulta, sem intervenção manual, em uma imagem publicada e em execução no VPS, servindo a 404 da marca sobre HTTPS válido, com `GET /api/health` confirmando conexão ao Supabase e a CI verde (lint, tipos, testes unitários, smoke e2e).

### Fora de escopo deste módulo

- Qualquer página de produto além de Home placeholder, 404, 500, manutenção e healthcheck.
- Tabelas de negócio no Supabase (cada módulo cria as suas por migração).
- Paleta e tipografia definitivas (tokens provisórios apenas).
- Integrações Nuvemshop, Reserva Ink, e-mail, analytics real, Google OAuth.
- Staging, múltiplas réplicas, CDN, cache handler distribuído.
- Domínio definitivo (usa subdomínio `sslip.io` derivado do IP até haver domínio).

---

## 2. Stack técnica

Versões fixadas no `package.json` com range `^` dentro da major indicada; o `package-lock.json` é a fonte exata. Upgrades de major são decisão explícita (ver Fronteiras).

| Camada             | Escolha                                         | Versão            | Observação                                                                              |
| ------------------ | ----------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| Runtime            | Node.js                                         | 22 LTS            | Imagem base `node:22-alpine`; `engines.node >=22`                                       |
| Pacotes            | npm                                             | 10.x              | Único gerenciador; `package-lock.json` versionado; CI usa `npm ci`                      |
| Framework          | Next.js (App Router)                            | 16.3.x            | `output: 'standalone'`, `cacheComponents: true`, `proxy.ts` (substitui `middleware.ts`) |
| UI                 | React / React DOM                               | 19.3.x            | Server Components por padrão                                                            |
| Linguagem          | TypeScript                                      | 5.9.x (`strict`)  | TS 7 (port nativo) avaliado após o MVP; não adotar agora                                |
| Estilo             | Tailwind CSS                                    | 4.x               | Tokens em `@theme` via variáveis CSS; sem UI kit de terceiros                           |
| Estado do carrinho | Zustand                                         | 5.x               | Instalado na fundação para fixar versão; store criada em `cart`                         |
| Supabase           | `@supabase/supabase-js`, `@supabase/ssr`        | 2.x / 0.12.x      | Clientes servidor e navegador; Supabase CLI para migrações e tipos                      |
| Testes             | Vitest + Testing Library                        | 5.x               | Unitário e componente (`jsdom`)                                                         |
| E2E                | Playwright                                      | 1.63.x            | Smoke contra build de produção local                                                    |
| Lint / format      | ESLint (flat) + `eslint-config-next` + Prettier | 10.x / 16.x / 3.x | Sem regras customizadas além do preset no início                                        |
| Erros              | `@sentry/nextjs`                                | 10.x              | DSN via env; desabilitado quando ausente                                                |
| Proxy TLS          | Caddy                                           | 2.x               | Container no mesmo `compose`; TLS automático (Let's Encrypt)                            |
| CI/CD              | GitHub Actions + GHCR                           | —                 | Build multi-stage, push por SHA e `latest`, deploy via SSH                              |

**Amendment ao ADR-001 §2.** O mecanismo de cache passa a ser `use cache` + `cacheTag` + `revalidateTag` (Cache Components), não `fetch` com `next.tags`. A estratégia (cache por tag, revalidação sob demanda por webhook/backoffice, tempo como rede de segurança) é a mesma. Nota registrada no ADR-001 em 2026-09-16.

---

## 3. Comandos

```bash
# Desenvolvimento
npm run dev                 # next dev (Turbopack) em http://localhost:3000
npm run build               # next build (standalone)
npm run start               # next start sobre o build

# Qualidade
npm run lint                # eslint .
npm run lint:fix            # eslint . --fix
npm run format              # prettier --write .
npm run format:check        # prettier --check .
npm run typecheck           # tsc --noEmit

# Testes
npm run test                # vitest run
npm run test:watch          # vitest
npm run test:coverage       # vitest run --coverage
npm run test:e2e            # playwright test (sobe `next start` via webServer)

# Supabase
npm run db:types            # supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/lib/supabase/database.types.ts
npm run db:migrate          # supabase db push (aplica supabase/migrations no projeto remoto)
npm run db:new -- <nome>    # supabase migration new <nome>

# Verificação única (o que a CI roda)
npm run check               # lint + format:check + typecheck + test
```

Docker é executado apenas na CI e no VPS (não há Docker neste WSL):

```bash
docker compose -f deploy/docker-compose.yml pull && docker compose -f deploy/docker-compose.yml up -d
```

---

## 4. Estrutura do projeto

```
.
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # html/body, fontes, tokens, Sentry, banner de consent (slot)
│   │   ├── not-found.tsx              # 404: "Esse rastro não leva a lugar nenhum."
│   │   ├── error.tsx                  # 500 (client boundary, copy da marca)
│   │   ├── global-error.tsx
│   │   ├── manutencao/page.tsx        # alvo do rewrite em modo manutenção
│   │   ├── (vitrine)/
│   │   │   ├── layout.tsx             # cabeçalho + rodapé públicos (placeholders)
│   │   │   └── page.tsx               # Home placeholder: wordmark + assinatura
│   │   ├── (conta)/layout.tsx         # reservado a `identity`; exige sessão (proxy.ts)
│   │   ├── admin/layout.tsx           # reservado a `admin`; exige papel admin (proxy.ts)
│   │   ├── api/health/route.ts        # GET → { status, version, supabase: 'ok'|'error' }
│   │   ├── robots.ts
│   │   └── sitemap.ts                 # apenas Home por enquanto
│   ├── components/
│   │   ├── ui/                        # primitivos sem regra de negócio (Button, Field, ...)
│   │   └── brand/                     # Wordmark, Symbol (logo), EmptyState
│   ├── lib/
│   │   ├── env.ts                     # validação de variáveis de ambiente (zod) — servidor e público
│   │   ├── supabase/
│   │   │   ├── server.ts              # createServerClient (cookies) — RSC, Route Handlers, Server Actions
│   │   │   ├── client.ts              # createBrowserClient
│   │   │   ├── admin.ts               # service role; só em Route Handlers/Server Actions
│   │   │   └── database.types.ts      # gerado; não editar
│   │   ├── analytics/track.ts         # track(event, payload) — provedor no-op
│   │   ├── rate-limit.ts              # limiter em memória com interface RateLimiter
│   │   ├── http/                      # helpers de resposta/erro para Route Handlers
│   │   └── copy.ts                    # strings de sistema (404, 500, manutenção, vazio)
│   └── styles/
│       ├── globals.css                # @import "tailwindcss"; @theme com tokens provisórios
│       └── tokens.md                  # documentação dos tokens e regra de substituição
├── proxy.ts                           # manutenção, proteção de (conta)/admin, cabeçalhos
├── instrumentation.ts                 # Sentry (server/edge)
├── instrumentation-client.ts          # Sentry (browser)
├── supabase/
│   ├── config.toml
│   └── migrations/                    # vazio na fundação (README explicando convenção)
├── tests/
│   ├── unit/                          # espelha src/ (ex.: tests/unit/lib/env.test.ts)
│   └── e2e/                           # Playwright: health, 404, home, manutenção
├── deploy/
│   ├── Dockerfile                     # multi-stage, standalone, non-root, HEALTHCHECK
│   ├── docker-compose.yml             # app + caddy; volumes: caddy_data, next_cache
│   ├── Caddyfile                      # {$SITE_HOST} → app:3000; cabeçalhos de segurança
│   └── README.md                      # provisionamento do VPS (passo a passo, único)
├── .github/workflows/
│   ├── ci.yml                         # PR e push: npm run check + build + e2e
│   └── deploy.yml                     # push na main: build imagem → GHCR → SSH → compose up
├── docs/                              # PRD, ADRs, specs (já existe)
├── .env.example
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── prettier.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── postcss.config.mjs
└── package.json
```

Regras:

- Tudo que toca segredo vive em `src/lib/**/server.ts`, `admin.ts` ou Route Handlers; nunca em componentes cliente. O ESLint bloqueia `import` de `src/lib/env.ts` (parte servidor) em arquivos com `'use client'` via `server-only`.
- Cada módulo futuro adiciona rotas dentro do grupo correspondente e código em `src/modules/<id>/` (convenção a ser fixada no spec de `nuvemshop`, o primeiro módulo de código de negócio).
- Testes espelham o caminho do arquivo testado.

---

## 5. Estilo de código

```ts
// src/lib/env.ts
import 'server-only'
import { z } from 'zod'

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SENTRY_DSN: z.string().url().optional(),
  MAINTENANCE_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
})

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
})

export const env = serverSchema.parse(process.env)
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
})
```

```tsx
// src/app/not-found.tsx
import Link from 'next/link'
import { Symbol } from '@/components/brand/Symbol'
import { copy } from '@/lib/copy'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Symbol aria-hidden className="size-6" />
      <h1 className="text-lg">{copy.notFound.title}</h1>
      <Link href="/" className="underline underline-offset-4">
        {copy.notFound.backHome}
      </Link>
    </main>
  )
}
```

Convenções:

- **Idioma:** código e identificadores em inglês; copy, comentários de domínio e documentação em PT-BR. Copy de sistema centralizada em `src/lib/copy.ts` (facilita a Fase 3 EN).
- **Nomes:** componentes `PascalCase` em arquivos `PascalCase.tsx`; funções e variáveis `camelCase`; rotas e slugs `kebab-case` em PT-BR conforme PRD §8; variáveis de ambiente `SCREAMING_SNAKE_CASE` com prefixo `NEXT_PUBLIC_` apenas para o que pode ir ao navegador.
- **Server first:** componente é Server Component salvo `'use client'` explícito no menor nó interativo possível.
- **Sem `any`**, sem `@ts-ignore`; `@ts-expect-error` só com justificativa na mesma linha.
- **Imports absolutos** via `@/` (`src/`).
- **Prettier decide formatação**; nenhuma discussão de estilo em review.
- **Acessibilidade mínima desde o placeholder:** `lang="pt-BR"`, um `h1` por página, foco visível, `alt` obrigatório.

---

## 6. Estratégia de testes

| Nível                      | Ferramenta                                       | O que cobre nesta fundação                                                                                                                                                                                                 | Onde            |
| -------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Unitário                   | Vitest                                           | `env.ts` (falha em env inválida), `rate-limit.ts` (janela, limite, reset), `track.ts` (no-op não lança), `copy.ts` (chaves obrigatórias)                                                                                   | `tests/unit/**` |
| Componente                 | Vitest + Testing Library (`jsdom`)               | `not-found`, `EmptyState`, `Symbol` renderizam com copy e atributos de acessibilidade                                                                                                                                      | `tests/unit/**` |
| Smoke E2E                  | Playwright (Chromium, viewport mobile e desktop) | `GET /api/health` → 200 e `supabase: 'ok'`; `/rota-inexistente` → 404 com copy da marca; `/` → 200 com wordmark; `MAINTENANCE_MODE=true` → toda rota pública responde 503 com a página de manutenção, exceto `/api/health` | `tests/e2e/**`  |
| Contrato de infraestrutura | Shell na CI                                      | Imagem constrói; container sobe; `HEALTHCHECK` passa em ≤ 30s; processo não roda como root                                                                                                                                 | `deploy.yml`    |

Cobertura: sem meta numérica na fundação (há pouco código); a meta será fixada em `CONSTRAINTS.md` quando `catalog` entrar. O que existe de lógica (env, rate limit) tem teste.

E2E roda contra `next build && next start` (não `dev`), com Supabase apontando para o projeto real via secrets da CI — o healthcheck é o único acesso e é somente leitura.

---

## 7. Fronteiras

**Sempre**

- Rodar `npm run check` antes de commitar; CI bloqueia merge se falhar.
- Ler variáveis de ambiente somente via `src/lib/env.ts`; nunca `process.env` direto fora dele.
- Manter `.env.example` sincronizado com o schema de `env.ts` (teste unitário compara as chaves).
- Executar o container como usuário não-root, com `HEALTHCHECK` e `restart: unless-stopped`.
- Escrever copy de sistema no tom do PRD §3 (sem exclamações, sem emoji, sem "Ops!").

**Perguntar antes**

- Adicionar dependência de runtime (dev-deps de tooling podem entrar com justificativa no PR).
- Alterar `next.config.ts` além do previsto aqui (`output`, `cacheComponents`, `images`).
- Mudar o fluxo de deploy, o `Caddyfile` ou o `docker-compose.yml`.
- Criar qualquer tabela, função ou política no Supabase (pertence aos módulos).
- Subir major de Next, React, TypeScript ou Tailwind.

**Nunca**

- Commitar `.env`, chaves, DSN ou tokens (inclusive em testes ou fixtures).
- Expor `SUPABASE_SERVICE_ROLE_KEY` ou qualquer segredo em código com `'use client'` ou com prefixo `NEXT_PUBLIC_`.
- Rodar a aplicação como root ou publicar a porta do Next diretamente (só o Caddy expõe 80/443).
- Desabilitar `strict`, remover testes falhando ou adicionar `eslint-disable` para "passar a CI".
- Fazer deploy manual fora do pipeline (o VPS é descartável; o pipeline é a única fonte de verdade).

---

## 8. Requisitos detalhados

### 8.1 Rotas e páginas

- Grupos `(vitrine)`, `(conta)`, `admin` com layouts próprios; `(conta)` e `admin` só contêm `layout.tsx` com comentário indicando o módulo dono.
- `/` (Home placeholder): wordmark empilhado, assinatura _"Arte para quem reconhece o indício."_, nada mais. Sem navegação funcional.
- `not-found.tsx`: símbolo da marca, "Esse rastro não leva a lugar nenhum.", link para a Home.
- `error.tsx` / `global-error.tsx`: copy neutra da marca, botão "Tentar de novo", reporte ao Sentry.
- `/manutencao`: copy da marca; `proxy.ts` reescreve toda rota não-`/api/health` para ela com status 503 e `Retry-After` quando `MAINTENANCE_MODE=true`.
- `robots.ts` e `sitemap.ts` mínimos; `metadata` padrão no `layout.tsx` (título, descrição, Open Graph com o logo, `lang="pt-BR"`).

### 8.2 Healthcheck

- `GET /api/health` → `200 { status: 'ok', version: <git sha>, supabase: 'ok' }` quando um `select 1` via cliente servidor (anon key) responde em ≤ 2s; caso contrário `503 { status: 'degraded', supabase: 'error' }`. Sem cache (`connection()`/dinâmico). Usado pelo `HEALTHCHECK` do Docker, pelo Caddy e pelo monitor externo de uptime.

### 8.3 Supabase

- `server.ts` usa `@supabase/ssr` com `cookies()` do Next (padrão `getAll`/`setAll`); `client.ts` usa `createBrowserClient`; `admin.ts` usa service role e importa `server-only`.
- `proxy.ts` chama `supabase.auth.getClaims()` (não `getSession()`) para refrescar a sessão e proteger `(conta)`/`admin`; como ainda não há login, a proteção redireciona para `/` com um comentário `TODO(identity)`.
- `supabase/config.toml` versionado; `supabase/migrations/` vazio com `README.md` explicando: um arquivo por mudança, nome `YYYYMMDDHHMMSS_<modulo>_<descricao>.sql`, RLS habilitado em toda tabela nova.
- `npm run db:types` gera `database.types.ts`; a CI falha se o arquivo gerado divergir do commitado (`git diff --exit-code`).

### 8.4 Variáveis de ambiente

| Variável                               | Escopo             | Obrigatória    | Uso                                          |
| -------------------------------------- | ------------------ | -------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | público            | sim            | canonical, Open Graph, sitemap               |
| `NEXT_PUBLIC_SUPABASE_URL`             | público            | sim            | clientes Supabase                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | público            | sim            | clientes Supabase                            |
| `SUPABASE_SERVICE_ROLE_KEY`            | servidor           | sim            | `admin.ts`                                   |
| `SUPABASE_PROJECT_ID`                  | tooling            | sim (local/CI) | `db:types`, `db:migrate`                     |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | servidor / público | não            | Sentry desligado se ausente                  |
| `MAINTENANCE_MODE`                     | servidor           | não (`false`)  | `proxy.ts`                                   |
| `SITE_HOST`                            | deploy             | sim            | Caddy (`<ip>.sslip.io` até haver domínio)    |
| `APP_VERSION`                          | deploy             | sim            | git sha injetado no build; exposto no health |

### 8.5 Tokens de design provisórios

- `globals.css` define em `@theme`: `--color-bg`, `--color-fg`, `--color-muted`, `--color-border`, `--color-accent` (todos neutros: branco, preto, três cinzas), `--font-sans` (fonte do sistema via `next/font` quando definida), escala de espaçamento padrão do Tailwind, `--radius-none` como padrão (a marca é reta).
- `tokens.md` registra que a paleta final substitui apenas valores de variáveis; componentes não usam cores literais (`bg-white`, `text-black` proibidos por regra ESLint simples de string no CI: `rg` em `check`).

### 8.6 Observabilidade

- Sentry: `instrumentation.ts` e `instrumentation-client.ts`; `tracesSampleRate` 0.1; `environment` = `production` | `development`; `release` = `APP_VERSION`; PII desligado. `error.tsx` reporta via `Sentry.captureException`.
- `track(event, payload)`: assinatura tipada com o union dos eventos do PRD §14 (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `sign_up`, `newsletter_subscribe`, `exchange_requested`); implementação no-op que loga em `development`. Provedor real é decisão futura (Questões abertas).
- Logs de servidor em JSON de uma linha (`console.log` com objeto); Caddy loga acesso em JSON para o volume.

### 8.7 Rate limit

- `RateLimiter` com `limit(key, { max, windowMs }) → { ok, remaining, resetAt }`; implementação `MemoryRateLimiter` (Map + limpeza preguiçosa). Sem uso na fundação além de `/api/health` (60/min por IP) para provar o contrato; `shipping`, `identity`, `orders`, `newsletter` consomem.

### 8.8 Docker e proxy

- `Dockerfile` multi-stage: `deps` (npm ci) → `build` (next build, `NEXT_TELEMETRY_DISABLED=1`, `APP_VERSION` como build arg) → `runner` (`node:22-alpine`, copia `.next/standalone`, `.next/static`, `public`; `USER node`; `EXPOSE 3000`; `HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1`).
- `docker-compose.yml`: serviços `app` (imagem `ghcr.io/jlima004/indicio-cult:<sha>`, `env_file: .env`, volume `next_cache:/app/.next/cache`, sem `ports`) e `caddy` (`caddy:2`, portas 80/443, volumes `caddy_data`, `caddy_config`, `./Caddyfile`); rede interna; `restart: unless-stopped` em ambos.
- `Caddyfile`: `{$SITE_HOST}` → `reverse_proxy app:3000`; `encode zstd gzip`; cabeçalhos `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritivo; `-Server`. CSP fica para quando houver scripts de terceiros (Questões abertas).
- `deploy/README.md`: provisionamento único do VPS (usuário não-root com sudo, Docker Engine + Compose, firewall 22/80/443, `fail2ban`, chave SSH da CI, pasta `/srv/indicio-cult` com `.env` e `docker-compose.yml`, `SITE_HOST`).

### 8.9 CI/CD (GitHub Actions)

- `ci.yml` em PR e push: `npm ci` → `npm run check` → `npm run build` → `npm run test:e2e`; `db:types` + `git diff --exit-code`; cache do npm e do Playwright.
- `deploy.yml` em push na `main` (após `ci.yml` verde, via `workflow_run` ou job dependente): build da imagem com `APP_VERSION=${{ github.sha }}`, push para GHCR com tags `sha` e `latest`; SSH no VPS (`appleboy/ssh-action` ou `ssh` puro com chave em secret); `docker compose pull && docker compose up -d --remove-orphans`; espera `GET https://$SITE_HOST/api/health` responder 200 em ≤ 90s, senão o job falha (o deploy anterior continua rodando porque `up -d` só troca o container se a imagem nova subir; rollback documentado = `docker compose up -d` com a tag anterior).
- Aquecimento pós-deploy (ADR-001): `curl` na Home após health ok.
- Secrets no GitHub: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `SITE_HOST`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN` (CLI). O `.env` de produção vive **só no VPS**; a CI não o conhece.

### 8.10 Repositório

- Criar repositório **público** `jlima004/indicio-cult` no GitHub (`gh repo create --public`), `main` protegida: PR obrigatório, `ci.yml` obrigatório, sem force-push. Por ser público: a imagem no GHCR fica pública (sem credencial de pull no VPS), nenhum segredo entra em workflow logs (`::add-mask::` para valores derivados) e a varredura de segredos do critério 10 é obrigatória desde o primeiro commit.
- Commits em PT-BR no formato _Conventional Commits_ (`feat(foundation): ...`); `README.md` ganha seção "Como rodar" e link para este spec.

---

## 9. Contratos fornecidos aos módulos dependentes

Interfaces que os demais módulos podem assumir como estáveis a partir da aprovação deste spec:

| Export                  | Assinatura                                                                      | Uso previsto                        |
| ----------------------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| `@/lib/env`             | `env`, `publicEnv` (tipados)                                                    | todo código de servidor / cliente   |
| `@/lib/supabase/server` | `createClient(): Promise<SupabaseClient<Database>>`                             | RSC, Route Handlers, Server Actions |
| `@/lib/supabase/client` | `createClient(): SupabaseClient<Database>`                                      | componentes cliente                 |
| `@/lib/supabase/admin`  | `createAdminClient(): SupabaseClient<Database>`                                 | webhooks, jobs, backoffice          |
| `@/lib/analytics/track` | `track<E extends AnalyticsEvent>(event: E, payload: AnalyticsPayload[E]): void` | eventos do funil                    |
| `@/lib/rate-limit`      | `RateLimiter`, `memoryRateLimiter`, `clientIp(req)`                             | route handlers públicos             |
| `@/lib/http`            | `json(data, init?)`, `problem(status, title, detail?)`                          | respostas padronizadas (RFC 9457)   |
| `@/lib/copy`            | `copy.system.*`                                                                 | telas de sistema                    |
| `@/components/brand/*`  | `Wordmark`, `Symbol`, `EmptyState`                                              | toda a vitrine                      |
| `proxy.ts`              | matcher e ordem: manutenção → sessão Supabase → proteção de grupo               | `identity` e `admin` estendem       |
| Convenção de módulo     | `src/modules/<id>/{server,client,components}` (fixada em `SPEC-nuvemshop.md`)   | todos                               |

Mudanças nesses contratos exigem atualizar este spec antes do código.

---

## 10. Critérios de sucesso

Todos verificáveis; a fundação está pronta quando **todos** forem verdadeiros:

1. `npm ci && npm run check` passa em máquina limpa com Node 22 e `.env` copiado de `.env.example` com valores reais do Supabase.
2. `npm run build` gera `.next/standalone`; `npm run start` responde `GET /api/health` → `200` com `supabase: 'ok'`.
3. `npm run test:e2e` passa nos quatro cenários (health, 404, home, manutenção) em viewport mobile e desktop.
4. Faltando qualquer variável obrigatória, `npm run build`/`start` falha na inicialização com mensagem apontando a variável — nunca falha tarde em runtime.
5. Imagem Docker constrói na CI; `docker inspect` mostra usuário `node`; `HEALTHCHECK` fica `healthy` em ≤ 30s.
6. Push na `main` executa `ci.yml` e `deploy.yml` sem intervenção; ao final, `https://$SITE_HOST/` responde 200 com a Home placeholder, `https://$SITE_HOST/qualquer-coisa` responde 404 com "Esse rastro não leva a lugar nenhum.", e o certificado é válido (Let's Encrypt).
7. `https://$SITE_HOST/api/health` responde 200 e o erro forçado (rota de teste removida após validação ou `?boom=1` em `development` apenas) aparece no Sentry com `release` = sha do commit.
8. Lighthouse mobile na Home placeholder ≥ 95 em Performance, Acessibilidade e Boas práticas (baseline antes de qualquer feature).
9. `MAINTENANCE_MODE=true` no `.env` do VPS + `docker compose up -d` → vitrine em 503 com página de manutenção; `/api/health` continua 200.
10. Nenhum segredo no repositório (`gitleaks` ou `trufflehog` na CI, zero achados) e nenhuma ocorrência de `SUPABASE_SERVICE_ROLE_KEY` em bundles do cliente (`rg` em `.next/static` na CI).
11. `README.md` e `deploy/README.md` permitem a um segundo desenvolvedor rodar localmente e reprovisionar o VPS do zero seguindo apenas os documentos.

---

## 11. Riscos e mitigações

| Risco                                                                                                                                       | Mitigação                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `cacheComponents` muda semântica de rotas dinâmicas (tudo que usa `cookies()`/`headers()` precisa de `Suspense`) e a equipe erra fronteiras | Fundação já entrega `layout.tsx` com `Suspense` no slot de conteúdo e exemplos comentados; regra fixada aqui antes de `catalog` |
| Cache do Next no volume `next_cache` cresce sem limite                                                                                      | Limite de 1 GB documentado; `deploy/README.md` inclui rotina `docker system prune` mensal                                       |
| TLS em `sslip.io` sujeito a rate limit do Let's Encrypt em redeploys frequentes                                                             | Volume `caddy_data` persiste certificados; troca para o domínio definitivo é só `SITE_HOST`                                     |
| Sem Docker local, erros de imagem só aparecem na CI                                                                                         | `ci.yml` constrói a imagem também em PR (sem push), não só no deploy                                                            |
| Playwright contra Supabase real na CI cria acoplamento                                                                                      | Único acesso é `select 1` com anon key; se o projeto estiver pausado a CI falha ruidosamente, o que é desejável                 |
| TypeScript 7 vira padrão do ecossistema antes do MVP terminar                                                                               | Versão fixada; upgrade é item de "Perguntar antes"                                                                              |

---

## 12. Questões abertas

1. **Provedor de analytics** (GA4, Plausible, Umami self-hosted?) — decide o que `track()` faz e se há script de terceiros (impacta CSP e consent).
2. **Domínio definitivo** — quando existir, atualizar `SITE_HOST`, `NEXT_PUBLIC_SITE_URL` e o redirect URL do Supabase Auth.
3. **Monitor externo de uptime** (UptimeRobot, Better Stack, healthchecks.io?) — ADR-001 exige antes do lançamento suave; a fundação só garante o endpoint.
4. **Fonte tipográfica provisória** — sistema (`system-ui`) ou já uma fonte candidata via `next/font`?
5. ~~Owner do GitHub~~ — **fechada em 2026-09-16:** repositório público em `jlima004/indicio-cult`.
6. **Recursos do KVM 2** — confirmar vCPU/RAM contra o consumo do build; se o build no VPS não for necessário (é feito na CI), o runtime cabe folgado, mas registrar os números (ADR-001, ação 6).

---

## Referências

- [Mapa de capacidades](./CAPABILITY-MAP.md)
- [PRD — §8 Mapa do site, §14 Requisitos não funcionais](../PRD.md)
- [ADR-001 — Stack, cache, estado e deploy](../decisions/ADR-001-stack-frontend-cache-estado-e-deploy.md)
- [Next.js — Cache Components](https://nextjs.org/docs/app/getting-started/cache-components), [`proxy.ts`](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [`output: 'standalone'`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Supabase — Server-Side Auth para Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Caddy — Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
