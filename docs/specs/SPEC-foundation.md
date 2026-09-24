# Spec: `foundation` — base técnica da vitrine Indicio Cult

| Campo         | Valor                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Módulo        | `foundation` (ver [mapa de capacidades](./CAPABILITY-MAP.md))                                                                                                |
| Depende de    | —                                                                                                                                                            |
| Consumido por | todos os demais módulos                                                                                                                                      |
| Origem        | [PRD §8, §14](../PRD.md); [ADR-001](../decisions/ADR-001-stack-frontend-cache-estado-e-deploy.md); [ADR-002](../decisions/ADR-002-coolify-traefik-deploy.md) |
| Status        | Aprovado em 2026-09-16; arquitetura de deploy readjudicada em 2026-09-24                                                                                     |
| Data          | 2026-09-16 (aprovação original); revisão de deploy: 2026-09-24                                                                                               |

---

## 1. Objetivo

Entregar o esqueleto executável sobre o qual todos os módulos do MVP são construídos: um projeto Next.js (App Router) com estrutura de rotas, tooling, conexão ao Supabase, empacotamento Docker, proxy TLS e pipeline de deploy — **implantado no VPS e respondendo HTTPS** — sem nenhuma feature de produto.

**Para quem.** A operadora/desenvolvedora (P4) e os agentes que implementarão os módulos seguintes. Este módulo não tem usuário final; seu "cliente" é o próximo módulo da ordem de construção.

**Por que agora.** PRD e ADR-001 fecharam o quê e a stack; ADR-002 readjudicou o deploy após confirmar Coolify/Traefik na VPS. Supabase e VPS já existem. Sem uma fundação com critérios verificáveis, cada módulo decidiria estrutura, tooling e deploy por conta própria.

**Sucesso em uma frase.** Push/merge na `main` passa pela CI e só então fixa o SHA aprovado e aciona o deploy pela API Coolify; o recurso Dockerfile na VPS serve a 404 da marca sobre HTTPS via Traefik, com `GET /api/health` confirmando Supabase e o SHA aprovado.

### Fora de escopo deste módulo

- Qualquer página de produto além de Home placeholder, 404, 500, manutenção e healthcheck.
- Tabelas de negócio no Supabase (cada módulo cria as suas por migração).
- Paleta e tipografia definitivas (tokens provisórios apenas).
- Integrações Nuvemshop, Reserva Ink, e-mail, analytics real, Google OAuth.
- Staging, múltiplas réplicas, CDN, cache handler distribuído.
- Escolha/compra do domínio definitivo; T15 configura um domínio apontado para a VPS no Coolify (DNS temporário é opcional).

---

## 2. Stack técnica

Versões fixadas no `package.json` com range `^` dentro da major indicada; o `package-lock.json` é a fonte exata. Upgrades de major são decisão explícita (ver Fronteiras).

| Camada             | Escolha                                         | Versão           | Observação                                                                                                                                                               |
| ------------------ | ----------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime            | Node.js                                         | 22 LTS           | Baseline exclusiva `engines.node >=22.22.2 <23`; pins locais `.nvmrc` e `.node-version` em `22.23.1`; imagem futura `node:22-alpine`                                     |
| Pacotes            | npm                                             | 10.x             | Único gerenciador; `package-lock.json` versionado; CI usa `npm ci`                                                                                                       |
| Framework          | Next.js (App Router)                            | 16.3.x           | `output: 'standalone'`, `cacheComponents: true`, `proxy.ts` (substitui `middleware.ts`)                                                                                  |
| UI                 | React / React DOM                               | 19.3.x           | Server Components por padrão                                                                                                                                             |
| Linguagem          | TypeScript                                      | 5.9.x (`strict`) | TS 7 (port nativo) avaliado após o MVP; não adotar agora                                                                                                                 |
| Estilo             | Tailwind CSS                                    | 4.x              | Tokens em `@theme` via variáveis CSS; sem UI kit de terceiros                                                                                                            |
| Estado do carrinho | Zustand                                         | 5.x              | Instalado na fundação para fixar versão; store criada em `cart`                                                                                                          |
| Supabase           | `@supabase/supabase-js`, `@supabase/ssr`        | 2.x / 0.12.x     | Clientes servidor e navegador; Supabase CLI para migrações e tipos                                                                                                       |
| Testes             | Vitest + Testing Library                        | 5.x              | Unitário e componente (`jsdom`)                                                                                                                                          |
| E2E                | Playwright                                      | 1.63.x           | Smoke contra build de produção local                                                                                                                                     |
| Lint / format      | ESLint (flat) + `eslint-config-next` + Prettier | 9.x / 16.x / 3.x | Sem regras customizadas além do preset no início. ESLint 9 (não 10): `eslint-config-next` 16 depende de `eslint-plugin-react` 7.37, que quebra em ESLint 10 (2026-09-16) |
| Erros              | `@sentry/nextjs`                                | 11.x             | DSN via env; desabilitado quando ausente                                                                                                                                 |
| Proxy TLS          | Traefik gerenciado pelo Coolify                 | 3.6 no host      | Roteamento e TLS da VPS compartilhada; sem proxy da aplicação                                                                                                            |
| CI/CD              | GitHub Actions + API Coolify                    | —                | CI verde, commit pinado e verificado antes do deploy; Coolify constrói do Git com Dockerfile                                                                             |

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
npm run lint:runtime        # pins/engine/runtime e engines aplicáveis do package-lock compatíveis
npm run lint:tokens         # impede paletas Tailwind e cores literais fora de globals.css
npm run lint:fix            # eslint . --fix
npm run format              # prettier --write .
npm run format:check        # prettier --check .
npm run typecheck           # next typegen && tsc --noEmit (typegen emite os tipos globais de rota em .next/types)

# Testes
npm run test                # vitest run
npm run test:runtime        # node:test do contrato engines/pins/runtime atual
npm run test:tokens         # node:test do lint de tokens, incluindo prova por mutação do CLI
npm run test:watch          # vitest
npm run test:coverage       # vitest run --coverage
npm run test:e2e            # playwright test (sobe `next start` via webServer)

# Supabase (os db:* rodam sob `dotenv -e .env --` porque npm não carrega o .env; o ambiente tem precedência — é como a CI injeta SUPABASE_PROJECT_ID)
npm run db:types            # supabase gen types typescript --project-id $SUPABASE_PROJECT_ID --schema public > src/lib/supabase/database.types.ts (escreve em .tmp e só substitui em sucesso)
npm run db:migrate          # supabase db push --project-ref $SUPABASE_PROJECT_ID (aplica supabase/migrations no projeto remoto; pede a senha do banco ou lê SUPABASE_DB_PASSWORD)
npm run db:new -- <nome>    # supabase migration new <nome>

# Verificação única (o que a CI roda)
npm run check               # lint + lint:runtime + lint:tokens + format:check + typecheck + test:runtime + test:tokens + test
```

Dockerfile é validado na CI e construído pelo Coolify na VPS (Docker local não é pré-requisito da T13). O runbook está em [`deploy/README.md`](../../deploy/README.md).

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
│   │   ├── manutencao/page.tsx        # HTML da resposta terminal em modo manutenção
│   │   ├── (vitrine)/
│   │   │   ├── layout.tsx             # cabeçalho + rodapé públicos (placeholders)
│   │   │   └── page.tsx               # Home placeholder: wordmark + assinatura
│   │   ├── (conta)/layout.tsx         # reservado a `identity`; exige sessão (proxy.ts)
│   │   ├── admin/layout.tsx           # reservado a `admin`; exige sessão (proxy.ts); autorização por papel pertence ao módulo responsável
│   │   ├── api/health/route.ts        # GET → { status, version, supabase: 'ok'|'error' }
│   │   ├── robots.ts
│   │   └── sitemap.ts                 # apenas Home por enquanto
│   ├── components/
│   │   ├── ui/                        # primitivos sem regra de negócio (Button, Field, ...)
│   │   └── brand/                     # Wordmark, Symbol (logo), EmptyState
│   ├── lib/
│   │   ├── env/
│   │   │   ├── index.ts               # server-only: `env` (servidor) + re-export de `publicEnv`
│   │   │   ├── public.ts              # `publicEnv` (NEXT_PUBLIC_*), importável em componentes cliente
│   │   │   └── parse.ts               # safeParse + erro nomeando cada variável inválida
│   │   ├── supabase/
│   │   │   ├── server.ts              # createServerClient (cookies) — RSC, Route Handlers, Server Actions
│   │   │   ├── client.ts              # createBrowserClient
│   │   │   ├── admin.ts               # service role; só em Route Handlers/Server Actions
│   │   │   └── database.types.ts      # gerado; não editar
│   │   ├── analytics/track.ts         # track(event, payload) — provedor no-op
│   │   ├── rate-limit.ts              # limiter em memória com interface RateLimiter
│   │   ├── http/                      # helpers de resposta/erro para Route Handlers
│   │   └── copy.ts                    # strings de sistema (404, 500, manutenção, vazio)
│   ├── styles/
│   │   ├── globals.css                # @import "tailwindcss"; @theme com tokens provisórios
│   │   └── tokens.md                  # documentação dos tokens e regra de substituição
│   ├── proxy.ts                       # manutenção, proteção de (conta)/admin, cabeçalhos
│   ├── instrumentation.ts             # valida env de servidor na inicialização; Sentry (server/edge)
│   ├── instrumentation.node.ts        # bootstrap Node-only: env de servidor + saída fail-fast
│   └── instrumentation-client.ts      # Sentry (browser)
│                                      # (todos opcionais; com `src/`, o Next só os reconhece dentro de `src/`)
├── supabase/
│   ├── config.toml
│   └── migrations/                    # vazio na fundação (README explicando convenção)
├── tests/
│   ├── unit/                          # espelha src/, incluindo seleção Node/Edge da instrumentation
│   ├── tooling/                       # contratos executáveis do runtime Node e dos tokens
│   └── e2e/                           # Playwright: health, 404, home, manutenção
├── deploy/
│   ├── Dockerfile                     # multi-stage, standalone, non-root, HEALTHCHECK
│   ├── traefik-security-headers.yml   # template Dynamic Configuration; aplicação humana T15
│   └── README.md                      # runbook do recurso Coolify, domínio/TLS e deploy
├── .github/workflows/
│   ├── ci.yml                         # PR e push: npm run check + build + e2e
│   └── deploy.yml                     # futuro: CI verde → pin Coolify → deploy API → health/SHA
├── docs/                              # PRD, ADRs, specs (já existe)
├── .env.example
├── .nvmrc / .node-version             # pin local idêntico; deve satisfazer engines.node
├── scripts/                            # gates determinísticos de runtime e tokens
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── prettier.config.mjs
├── vitest.config.mts                  # .mts: carregado como ESM pelo Vite sem "type": "module"
├── playwright.config.ts
├── postcss.config.mjs
└── package.json
```

Regras:

- Tudo que toca segredo vive em `src/lib/**/server.ts`, `admin.ts` ou Route Handlers; nunca em componentes cliente. O build bloqueia `import` de `@/lib/env` (parte servidor) em arquivos com `'use client'` via `server-only`; cliente usa `@/lib/env/public`.
- Cada módulo futuro adiciona rotas dentro do grupo correspondente e código em `src/modules/<id>/` (convenção a ser fixada no spec de `nuvemshop`, o primeiro módulo de código de negócio).
- Testes espelham o caminho do arquivo testado.

---

## 5. Estilo de código

```ts
// src/lib/env/public.ts — sem `server-only`: componentes cliente importam daqui.
import { z } from 'zod'
import { parseEnv } from './parse' // safeParse + Error listando cada variável inválida

export const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
})

// Referências literais a process.env.NEXT_PUBLIC_* são obrigatórias para o inlining do Next.
export const publicEnv = parseEnv(publicSchema, {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  // ...
})

// src/lib/env/index.ts — servidor.
import 'server-only'
export { publicEnv, publicSchema } from './public'

export const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_VERSION: z.string().min(1).default('dev'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SENTRY_DSN: z.url().optional(),
  MAINTENANCE_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
})

export const env = parseEnv(serverSchema, process.env)
```

Onde a validação acontece: as variáveis **públicas** são inlinadas no bundle e precisam existir na CI e no build Coolify — o layout raiz lê `publicEnv`, então `next build` falha nomeando a ausente. Em produção, `SUPABASE_SERVICE_ROLE_KEY` é segredo real obrigatório no runtime Coolify. Na foundation CI, os servidores `next start` do E2E recebem a sentinela literal não secreta `ci-unused-foundation-e2e` para satisfazer o bootstrap: health usa cliente anon e Home, 404, manutenção e setup Playwright não usam `admin.ts`. A sentinela não autentica no Supabase, não serve para testes admin e exige readjudicação quando a suíte exercitar operações com service role. `src/instrumentation.ts` usa o `NEXT_RUNTIME` documentado pelo Next para importar `src/instrumentation.node.ts` somente sob `nodejs`. O bootstrap Node importa `@/lib/env` e, em falha, loga e chama `process.exit(1)` (apenas rejeitar a Promise pode deixar o processo vivo sem atender). Assim, nenhuma API Node-only entra no caminho Edge.

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

| Nível                      | Ferramenta                                       | O que cobre nesta fundação                                                                                                                                                                                                 | Onde                   |
| -------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Unitário                   | Vitest                                           | `env` (falha em env inválida), seleção Node/Edge e fail-fast da `instrumentation`, `rate-limit`, `track` e `copy`                                                                                                          | `tests/unit/**`        |
| Componente                 | Vitest + Testing Library (`jsdom`)               | `not-found`, `EmptyState`, `Symbol` renderizam com copy e atributos de acessibilidade                                                                                                                                      | `tests/unit/**`        |
| Contrato de tooling        | `node:test`                                      | Pins/faixa Node e engines aplicáveis do lockfile; scanner de tokens com casos positivos, negativos e mutação real do CLI                                                                                                   | `tests/tooling/**`     |
| Smoke E2E                  | Playwright (Chromium, viewport mobile e desktop) | `GET /api/health` → 200 e `supabase: 'ok'`; `/rota-inexistente` → 404 com copy da marca; `/` → 200 com wordmark; `MAINTENANCE_MODE=true` → toda rota pública responde 503 com a página de manutenção, exceto `/api/health` | `tests/e2e/**`         |
| Contrato de infraestrutura | CI + health público                              | Dockerfile constrói em CI; Coolify executa `USER node`, porta 3000 e health; T16 verifica SHA implantado                                                                                                                   | `ci.yml`, `deploy.yml` |

Cobertura: sem meta numérica na fundação (há pouco código); a meta será fixada em `CONSTRAINTS.md` quando `catalog` entrar. O que existe de lógica (env, rate limit) tem teste.

E2E roda contra `next build && next start` (não `dev`), com URL e anon key públicas apontando para o projeto Supabase de teste real via GitHub Variables ou valores de workflow — o healthcheck é o único acesso e é somente leitura. A sentinela de service role é literal do workflow, não GitHub Secret.

---

## 7. Fronteiras

**Sempre**

- Rodar `npm run check` antes de commitar; CI bloqueia merge se falhar.
- Ler variáveis de ambiente somente via `src/lib/env/`; a única exceção é
  `process.env.NEXT_RUNTIME` em `src/instrumentation.ts`, conforme a API de seleção de runtime do
  Next.
- Manter `.env.example` sincronizado com os schemas de `src/lib/env/` (teste unitário compara as chaves).
- Executar o container como usuário não-root, com `HEALTHCHECK`; reinício e ciclo de vida são geridos pelo Coolify.
- Escrever copy de sistema no tom do PRD §3 (sem exclamações, sem emoji, sem "Ops!").

**Perguntar antes**

- Adicionar dependência de runtime (dev-deps de tooling podem entrar com justificativa no PR).
- Alterar `next.config.ts` além do previsto aqui (`output`, `cacheComponents`, `images`).
- Mudar o fluxo de deploy, o Dockerfile, o recurso Coolify ou a configuração Traefik compartilhada.
- Criar qualquer tabela, função ou política no Supabase (pertence aos módulos).
- Subir major de Next, React, TypeScript ou Tailwind.

**Nunca**

- Commitar `.env`, chaves, DSN ou tokens (inclusive em testes ou fixtures).
- Expor `SUPABASE_SERVICE_ROLE_KEY` ou qualquer segredo em código com `'use client'` ou com prefixo `NEXT_PUBLIC_`.
- Rodar a aplicação como root, publicar a porta 3000 no host ou criar outro proxy público; o Traefik do Coolify ocupa 80/443.
- Desabilitar `strict`, remover testes falhando ou adicionar `eslint-disable` para "passar a CI".
- Contornar a CI com Auto Deploy do Coolify; produção é acionada pelo workflow após CI verde.

---

## 8. Requisitos detalhados

### 8.1 Rotas e páginas

- Grupos `(vitrine)`, `(conta)`, `admin` com layouts próprios; `(conta)` e `admin` só contêm `layout.tsx` com comentário indicando o módulo dono.
- `/` (Home placeholder): wordmark empilhado, assinatura _"Arte para quem reconhece o indício."_, nada mais. Sem navegação funcional.
- `not-found.tsx`: símbolo da marca, "Esse rastro não leva a lugar nenhum.", link para a Home.
- `error.tsx` / `global-error.tsx`: copy neutra da marca, botão "Tentar de novo", reporte ao Sentry.
- `/manutencao`: copy da marca; quando `MAINTENANCE_MODE=true`, `proxy.ts` responde terminalmente às rotas não-`/api/health` com status 503, `Retry-After` e o HTML da página de manutenção.
- `robots.ts` e `sitemap.ts` mínimos; `metadata` padrão no `layout.tsx` (título, descrição, Open Graph com o logo, `lang="pt-BR"`).

### 8.2 Healthcheck

- `GET /api/health` → `200 { status: 'ok', version: <git sha>, supabase: 'ok' }` quando um probe somente leitura ao Data API via cliente servidor (anon key) responde em ≤ 2s; caso contrário `503 { status: 'degraded', supabase: 'error' }`. Enquanto o schema `public` estiver vazio, o probe consulta uma relação sentinela inexistente e aceita `PGRST205` como prova de que o PostgREST alcançou o schema cache; isso evita criar tabela ou função só para o healthcheck. Sem cache (`connection()`/dinâmico). Usado pelo `HEALTHCHECK` do Docker, pela verificação pós-deploy e pelo monitor externo de uptime.

### 8.3 Supabase

- `server.ts` usa `@supabase/ssr` com `cookies()` do Next (padrão `getAll`/`setAll`); `client.ts` usa `createBrowserClient`; `admin.ts` usa service role e importa `server-only`.
- `proxy.ts` chama `supabase.auth.getClaims()` (não `getSession()`) para refrescar a sessão e proteger `(conta)`/`admin`; como ainda não há login, a proteção redireciona para `/` com um comentário `TODO(identity)`.
- `supabase/config.toml` versionado; `supabase/migrations/` vazio com `README.md` explicando: um arquivo por mudança, nome `YYYYMMDDHHMMSS_<modulo>_<descricao>.sql`, RLS habilitado em toda tabela nova.
- `npm run db:types` gera `database.types.ts`; a CI falha se o arquivo gerado divergir do commitado (`git diff --exit-code`).

### 8.4 Variáveis de ambiente

| Variável                                                     | Escopo no Coolify                 | Uso                                                           |
| ------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                       | Build + Runtime                   | URL canônica, igual ao domínio público configurado no Coolify |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Build + Runtime                   | Clientes Supabase; valores públicos                           |
| `NEXT_PUBLIC_SENTRY_DSN`                                     | Build + Runtime, opcional         | Sentry no navegador                                           |
| `SUPABASE_SERVICE_ROLE_KEY`                                  | Runtime only                      | `admin.ts`; nunca no build                                    |
| `SENTRY_DSN`                                                 | Runtime only, opcional            | Sentry no servidor                                            |
| `MAINTENANCE_MODE`                                           | Runtime only (`false` por padrão) | Resposta terminal 503 na vitrine                              |
| `APP_VERSION=$SOURCE_COMMIT`                                 | Build + Runtime                   | SHA do commit implantado; `dev` fora do deploy                |
| `SOURCE_COMMIT`                                              | Predefinida pelo Coolify          | Commit do Git; incluir no build em Advanced                   |
| `SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`               | Tooling local/CI                  | CLI, tipos e migrações; não são env da aplicação              |
| `COOLIFY_API_URL`, `COOLIFY_APP_UUID`, URL pública de health | GitHub Variables (T15)            | Endereço/UUID da automação T16; não são env da aplicação      |
| `COOLIFY_CONFIG_TOKEN`, `COOLIFY_DEPLOY_TOKEN`               | GitHub Secrets (T15)              | Read/write e deploy separados; não são env da aplicação       |

Configurar as variáveis públicas também como Build Variables, pois o Next as embute no build. Desabilitar Build Variable para segredos de servidor (a UI habilita Build e Runtime por padrão). Para `APP_VERSION`, habilitar **Include Source Commit in Build**, manter expansão de `$SOURCE_COMMIT` (Literal desligado) e **Inject Build Args to Dockerfile** desligado porque os `ARG` são declarados explicitamente. `NEXT_PUBLIC_SITE_URL` é a fonte da URL na aplicação; o domínio/porta interna pertencem ao recurso Coolify. O teste mantém `.env.example` alinhado aos schemas.

Na CI, `NEXT_PUBLIC_SITE_URL` pode ser `http://127.0.0.1:3000`, compatível com o Playwright atual. `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são públicos, não segredos de servidor. `SUPABASE_PROJECT_ID` é identificador de tooling; `SUPABASE_ACCESS_TOKEN` é segredo de tooling para `db:types`. A service role real continua obrigatória apenas no runtime de produção; a sentinela E2E não altera o schema.

### 8.5 Tokens de design

- `globals.css` define em `@theme` os cinco tokens cromáticos da identidade Figma (já não são neutros), `--font-sans` (Inter) e `--font-serif` (Cormorant Garamond) via `next/font`, a escala de espaçamento padrão do Tailwind e `--radius-none` (a marca é reta). Hex e nomes Figma estão na tabela de `tokens.md`.
- `tokens.md` registra que essa substituição é só o bloco `@theme`; componentes não usam paletas Tailwind diretas, cores arbitrárias ou literais CSS. `lint:tokens` aplica esse contrato fora de `globals.css`, preservando fragmentos, referências SVG e utilities semânticas/estruturais.

### 8.6 Observabilidade

- Sentry: `instrumentation.ts` e `instrumentation-client.ts`; `tracesSampleRate` 0.1; `environment` = `production` | `development`; `release` = `APP_VERSION`. DSNs ausentes desligam a integração correspondente.
- Logs de servidor em JSON de uma linha (`console.log` com objeto).
- Access logs são responsabilidade do Traefik compartilhado. O baseline fornecido não comprova que estejam habilitados. JSON é o formato desejado caso a plataforma os habilite, mas configuração de access log é global/estática e pode afetar outras aplicações. T15/T17 registram evidência ou decisão humana; T13 não altera o proxy global.
- Monitor externo consulta `/api/health`; a versão da resposta deve corresponder ao commit efetivamente implantado.

### 8.7 Rate limit

- `RateLimiter` com `limit(key, { max, windowMs }) → { ok, remaining, resetAt }`; implementação `MemoryRateLimiter` (Map + limpeza preguiçosa). Sem uso na fundação além de `/api/health` (60/min por IP) para provar o contrato; `shipping`, `identity`, `orders`, `newsletter` consomem.

### 8.8 Docker e proxy

- `deploy/Dockerfile` multi-stage em `node:22-alpine`: `deps` com `npm ci`, `build` com Next `standalone`, `runner` com `.next/standalone`, `.next/static` e `public`; `USER node`, `HOSTNAME=0.0.0.0`, porta interna `3000`, `HEALTHCHECK` real em `/api/health`. O cache `/app/.next/cache` é gravável pelo usuário. Nenhum segredo de servidor é build arg.
- O recurso Coolify é **Git repository + Dockerfile Build Pack**, Base Directory `/`, Dockerfile Location `/deploy/Dockerfile`, branch `main` e Ports Exposes `3000`. Nenhum host port é publicado. Para o domínio, usar o formato documentado `https://<domínio>:3000` no Coolify: o sufixo escolhe a porta **interna**; HTTPS público continua 443.
- O Coolify gera a rota no Traefik compartilhado e administra TLS. Não há Compose, Caddy nem outro reverse proxy da aplicação.
- Os headers `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` usam middleware Traefik específico do projeto. O template em `deploy/traefik-security-headers.yml` é aplicado manualmente como Dynamic Configuration em T15. A documentação atual do Coolify exige desabilitar Readonly labels para anexá-lo ao router HTTPS gerado; preservar os middlewares existentes e validar o resultado. Não editar `/data/coolify/proxy/docker-compose.yml` automaticamente.
- Persistência opcional do cache via Coolify Persistent Storage > Volume Mount em `/app/.next/cache`, com escrita pelo usuário `node`. Cache pode ser reconstruído; não é backup nem dado de negócio. Observar crescimento, inicialmente ~1 GB.
- `deploy/README.md` documenta configuração e verificação futuras; T13 não acessa a VPS nem executa deploy.

### 8.9 CI/CD (GitHub Actions)

- `ci.yml` em PR/push: `npm ci`, `npm run check`, `npm run build`, E2E, `db:types` diff, gitleaks, varredura de segredo do bundle e `docker build -f deploy/Dockerfile` sem publicação. O build recebe `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, opcionalmente `NEXT_PUBLIC_SENTRY_DSN`, e `APP_VERSION=github.sha`; nenhum segredo de servidor. URL/chave Supabase públicas devem alcançar o projeto de teste real. `SUPABASE_PROJECT_ID` (Variable) e `SUPABASE_ACCESS_TOKEN` (Secret) são exclusivos do passo `db:types`. Um subgate `[humano]` cadastra esses valores antes de exigir CI verde. O E2E usa `SUPABASE_SERVICE_ROLE_KEY=ci-unused-foundation-e2e` literal apenas no runtime dos servidores de teste e `MAINTENANCE_MODE=false` no servidor normal; não exercita admin. DSNs podem ficar ausentes. Sem Compose.
- **Coolify Auto Deploy = OFF.** T16 recebe `candidate_sha=workflow_run.head_sha` após CI verde da `main`. Uma `concurrency` group exclusiva de produção, com `cancel-in-progress: false`, cobre checagem, pin, deploy e verificação. Se a `main` atual já avançou antes da mutação, a execução fica `superseded`. Senão, `PATCH /api/v1/applications/{uuid}` fixa `git_commit_sha=candidate_sha`, `GET` confirma o pin, e apenas então `POST /api/v1/deploy?uuid=...` inicia o deployment. O workflow acompanha o `deployment_uuid`, exige commit do deployment igual ao candidato, `GET /api/health` com `status=ok`, `supabase=ok`, `version=candidate_sha`, e só então aquece a Home. Divergência ou prova ausente falha. HTTP 2xx da API não é conclusão.
- Invariante: `CI approved candidate_sha == configured git_commit_sha == SOURCE_COMMIT == APP_VERSION == health.version`. A checagem da `main` descarta workflow obsoleto; o pin impede a corrida entre HEAD móvel e checkout. Cada execução redefine o pin. A serialização do GitHub não cobre operador ou outro automador: T15 restringe alterações concorrentes ao recurso durante o gate.
- T15 cadastra `COOLIFY_API_URL`, `COOLIFY_APP_UUID` e URL pública de health como GitHub Variables; `COOLIFY_CONFIG_TOKEN` (`read` + `write`) e `COOLIFY_DEPLOY_TOKEN` (`deploy`) como Secrets. O token de deploy é exclusivo no painel; `write` é amplo no escopo da equipe. Não usar `root` nem `read:sensitive`. Segredos runtime de produção ficam no recurso Coolify, nunca na imagem.

### 8.10 Repositório

O repositório público `jlima004/indicio-cult` existe. A `main` terá PR e `ci.yml` obrigatórios, sem force-push ou deleção (T17). A CI procura segredos e dados de servidor no bundle. O Coolify lê o Git e constrói a imagem com `deploy/Dockerfile`; GHCR não é requisito do módulo. Registry ou build server separado exige nova decisão.

## 9. Contratos fornecidos aos módulos dependentes

Interfaces que os demais módulos podem assumir como estáveis a partir da aprovação deste spec:

| Export                  | Assinatura                                                                      | Uso previsto                        |
| ----------------------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| `@/lib/env`             | `env`, `publicEnv` (tipados; `server-only`)                                     | código de servidor                  |
| `@/lib/env/public`      | `publicEnv` (tipado)                                                            | componentes cliente                 |
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

1. `npm ci && npm run check` passa em máquina limpa com Node `>=22.22.2 <23`; `.nvmrc` e `.node-version` pinam `22.23.1`; `.env` local segue `.env.example`.
2. `npm run build` gera `.next/standalone`; `npm run start` responde `GET /api/health` com `supabase: 'ok'`.
3. `npm run test:e2e` passa nos quatro cenários em viewport mobile e desktop.
4. Variável obrigatória ausente faz build/start falhar de forma clara, sem falha tardia em produção.
5. `deploy/Dockerfile` constrói na CI, roda como `node`, escuta `0.0.0.0:3000` e tem `HEALTHCHECK` saudável; nenhuma porta host da aplicação é publicada.
6. Push/merge na `main` executa CI; somente CI verde aciona `deploy.yml` e pin/deploy por API, com Auto Deploy OFF. O domínio configurado no Coolify responde Home 200, 404 da marca e TLS público válido via Traefik.
7. Evidência mostra `candidate_sha` aprovado na CI igual a `git_commit_sha` configurado antes do deploy, commit registrado no deployment, `SOURCE_COMMIT`, `APP_VERSION` e `GET /api/health.version`; health responde `status: 'ok'` e `supabase: 'ok'`. Erro forçado de desenvolvimento aparece no Sentry com `release` igual ao SHA.
8. Lighthouse mobile na Home placeholder ≥ 95 em Performance, Acessibilidade e Boas práticas.
9. `MAINTENANCE_MODE=true` no recurso Coolify e redeploy controlado → vitrine em 503 com página de manutenção; `/api/health` continua 200; depois restaurar `false`.
10. Gitleaks na CI sem achados e nenhuma ocorrência do valor de `SUPABASE_SERVICE_ROLE_KEY` em bundles do cliente; segredos de servidor ausentes dos build args/layers.
11. `README.md` e `deploy/README.md` permitem a outro desenvolvedor rodar localmente e à operadora reproduzir a configuração da aplicação no Coolify. Security headers e estado real dos access logs são verificados; rollback Coolify foi testado.

---

## 11. Riscos e mitigações

| Risco                                                       | Mitigação                                                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `cacheComponents` muda semântica de rotas dinâmicas         | Fundação entrega `Suspense` e regra de fronteira antes de `catalog`                                       |
| Cache do Next em Persistent Storage cresce                  | Monitorar e gerir volume com referência inicial ~1 GB; cache pode ser descartado/reconstruído             |
| Coolify/API indisponível ou deploy aceito com app degradada | T16 falha se deployment, saúde, Supabase e SHA não confirmarem; monitor externo e rollback Coolify        |
| Branch móvel avança entre check e checkout                  | Fixar e reler `git_commit_sha` antes do deploy; serializar produção; conferir deployment e health         |
| `SOURCE_COMMIT` não chega ao build ou cache mascara release | Habilitar Include Source Commit in Build; exigir `SOURCE_COMMIT=APP_VERSION=health.version=candidate_sha` |
| Domínio ou TLS aponta à porta errada                        | Configurar domínio com alvo interno 3000 e testar certificado/rotas reais em T15/T17                      |
| Traefik compartilhado e alteração de labels                 | Middleware específico, preservar labels geradas; mudanças globais exigem decisão humana                   |
| VPS permanece ponto único de falha                          | Monitor externo, procedimento de recuperação e rollback                                                   |
| Docker local indisponível                                   | `ci.yml` constrói a imagem em PR antes de qualquer deploy                                                 |
| Playwright depende do Supabase real na CI                   | Probe somente leitura; falha ruidosa se o serviço estiver indisponível                                    |

---

## 12. Questões abertas

1. **Provedor de analytics** (GA4, Plausible, Umami self-hosted?) — decide o que `track()` faz e se há script de terceiros (impacta CSP e consent).
2. **Domínio definitivo** — quando existir, configurar DNS e domínio no Coolify, atualizar `NEXT_PUBLIC_SITE_URL` e o redirect URL do Supabase Auth.
3. **Monitor externo de uptime** (UptimeRobot, Better Stack, healthchecks.io?) — ADR-001 exige antes do lançamento suave; a fundação só garante o endpoint.
4. **Fonte tipográfica provisória** — sistema (`system-ui`) ou já uma fonte candidata via `next/font`?
5. ~~Owner do GitHub~~ — **fechada em 2026-09-16:** repositório público em `jlima004/indicio-cult`.
6. **Recursos do KVM 2** — confirmar vCPU/RAM/disco contra o build e runtime no Coolify; T14 valida a imagem na CI, mas Coolify também constrói na VPS.
7. **Access logs do Traefik** — estado atual não comprovado; T15/T17 registram evidência e eventual decisão humana sobre configuração global.

---

## Referências

- [Mapa de capacidades](./CAPABILITY-MAP.md)
- [PRD — §8 Mapa do site, §14 Requisitos não funcionais](../PRD.md)
- [ADR-001 — Stack, cache, estado e deploy](../decisions/ADR-001-stack-frontend-cache-estado-e-deploy.md)
- [Next.js — instrumentation e código específico por runtime](https://nextjs.org/docs/app/guides/instrumentation#importing-runtime-specific-code), [Cache Components](https://nextjs.org/docs/app/getting-started/cache-components), [`proxy.ts`](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [`output: 'standalone'`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Supabase — Server-Side Auth para Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [ADR-002 — Deploy Coolify/Traefik](../decisions/ADR-002-coolify-traefik-deploy.md)
- [Coolify — Dockerfile](https://coolify.io/docs/applications/builds/dockerfile), [Environment Variables](https://coolify.io/docs/applications/configuration/environment-variables), [API Update Application](https://coolify.io/docs/api/endpoints/applications/update-application-by-uuid), [API Deploy](https://coolify.io/docs/api/endpoints/deployments/deploy-by-tag-or-uuid), [Traefik Dynamic Configuration](https://coolify.io/docs/core/networking/proxy/traefik/dynamic-config)
