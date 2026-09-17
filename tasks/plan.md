# Plano de implementação: módulo `foundation`

| Campo            | Valor                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| Spec             | [`docs/specs/SPEC-foundation.md`](../docs/specs/SPEC-foundation.md) (aprovado em 2026-09-16) |
| Mapa             | [`docs/specs/CAPABILITY-MAP.md`](../docs/specs/CAPABILITY-MAP.md) — etapa 1                  |
| Lista de tarefas | [`tasks/todo.md`](./todo.md)                                                                 |
| Status           | Aprovado (2026-09-16)                                                                        |

## Visão geral

Construir a base técnica da vitrine — Next.js 16 (App Router), Supabase, Docker + Caddy, CI/CD no GitHub Actions, observabilidade e tokens provisórios — até que um `git push` na `main` resulte em deploy automático no VPS respondendo HTTPS com a 404 da marca e `GET /api/health` confirmando o Supabase. Nenhuma feature de produto.

## Decisões de arquitetura do plano

- **Código primeiro, entrega depois (decisão da operadora).** A Fase A constrói a aplicação completa localmente (tooling, env, Supabase, páginas, proxy, observabilidade, testes); a Fase B empacota e entrega (Docker, CI, VPS, deploy). Vantagens: nenhum artefato provisório (o `/api/health` nasce real; o `ci.yml` nasce completo), e a operadora só precisa provisionar VPS e segredos quando há algo pronto para subir. **Trade-off aceito:** o risco da cadeia de deploy (TLS em `sslip.io`, GHCR, SSH) só aparece na Fase B; mitigado por T13 validar `docker compose config` e o build da imagem na CI antes de qualquer deploy, e por T15 poder ser feito em paralelo desde o início.
- **Sem CI durante a Fase A.** O gate de qualidade é `npm run check` local antes de cada PR; a proteção da `main` com status check obrigatório entra em T17. Os PRs da Fase A são revisados manualmente.
- **Fatias verticais.** Cada tarefa entrega algo observável (uma rota, um teste passando, um job verde), não uma camada horizontal.
- **Tarefas humanas explícitas.** Token do Supabase CLI, DSN do Sentry, provisionamento do VPS e segredos do GitHub exigem credenciais que o agente não tem. Estão marcadas com `[humano]` e posicionadas para não bloquear o trabalho anterior.
- **Logo vetorial.** Só existe `docs/logo.png` (1,2 MB). Até haver SVG, `Wordmark` é tipográfico e `Symbol` é um SVG simples desenhado à mão (quadrado com falha) — a substituição pelo arquivo oficial é troca de asset, não de componente.
- **Dependências de runtime adicionadas pelo plano:** `zod` (validação de env, já implícito no exemplo do spec §5), `@sentry/nextjs`, `@supabase/supabase-js`, `@supabase/ssr`, `zustand` (fixar versão, sem uso). Qualquer outra passa por "Perguntar antes".

## Grafo de dependências

```
T1 repo ─→ T2 scaffold ─┬─→ T3 Vitest ─→ T4 env.ts ─→ T5 Supabase ─→ T6 health + http + rate-limit ─┐
                        │                                                                           │
                        ├─→ T7 tokens + copy + brand ─→ T8 páginas de sistema ─→ T9 proxy + grupos ──┤
                        │                                        │                                  │
                        │                                        ├─→ T10 metadata/robots/sitemap/track
                        │                                        └─→ T11 Sentry (precisa de T4)     │
                        │                                                                           ▼
                        │                                                              T12 Playwright (T6, T8, T9)
                        │                                                                           │
                        └─→ T13 Docker/Compose/Caddy ─→ T14 ci.yml completo (precisa de T12) ─→ T16 deploy.yml ─→ T17 proteção da main ─→ T18 validação
                                                                    ▲
                                                 T15 [humano] VPS + segredos (paralelo desde T1)
```

## Lista de tarefas (índice; detalhes em `todo.md`)

### Fase A — Núcleo da aplicação (local)

- [x] T1 · Repositório público `jlima004/indicio-cult` e push da `main`
- [x] T2 · Scaffold Next.js 16 + TS strict + Tailwind 4 + ESLint/Prettier + scripts npm
- [ ] T3 · Vitest + Testing Library, primeiro teste, `check` inclui `test`
- [ ] T4 · `src/lib/env.ts` (zod) + `.env.example` + teste de sincronia + falha rápida
- [ ] T5 · Clientes Supabase (server/client/admin), `supabase/config.toml`, `db:types`, `database.types.ts` — inclui `[humano]` token do CLI
- [ ] T6 · `GET /api/health` + `lib/http` + `lib/rate-limit` com testes
- [ ] T7 · Tokens provisórios, `lib/copy.ts`, `Wordmark`/`Symbol`/`EmptyState`
- [ ] T8 · Páginas de sistema: layout raiz, Home placeholder, 404, 500, manutenção
- [ ] T9 · `proxy.ts` (manutenção, sessão, proteção) + layouts `(vitrine)`/`(conta)`/`admin`
- [ ] T10 · Metadata padrão, Open Graph, `robots.ts`, `sitemap.ts`, `lib/analytics/track`
- [ ] T11 · Sentry (`instrumentation*.ts`, `error.tsx`, `release` = sha) — inclui `[humano]` criar projeto/DSN
- [ ] T12 · Playwright: 4 cenários × mobile/desktop contra `next start`

### Checkpoint A — "Aplicação completa localmente"

- [ ] `npm run check` verde; `npm run build && npm run start` → health `supabase: 'ok'`
- [ ] `npm run test:e2e` verde nos 8 casos
- [ ] Home, 404, erro e manutenção com copy da marca; `(conta)`/`admin` redirecionam
- [ ] Revisão com a operadora antes de empacotar

### Fase B — Empacotamento e entrega

- [ ] T13 · Dockerfile multi-stage, `docker-compose.yml`, `Caddyfile`, `deploy/README.md`
- [ ] T14 · `ci.yml` completo: `check`, `build`, e2e, `db:types` diff, gitleaks, varredura do bundle, `compose config`, build da imagem
- [ ] T15 · `[humano]` Provisionamento do VPS e segredos no GitHub (pode começar após T1)
- [ ] T16 · `deploy.yml`: GHCR → SSH → Compose → espera do health → aquecimento
- [ ] T17 · Proteção da `main` (PR + `ci` obrigatórios) e troca do Let's Encrypt de staging para produção

### Checkpoint B — "Está no ar"

- [ ] `https://$SITE_HOST/`, `/qualquer-coisa` (404) e `/api/health` respondem via pipeline, certificado válido
- [ ] Push na `main` redeploya sem intervenção; rollback por tag testado uma vez
- [ ] Revisão com a operadora: o que o pipeline faz, onde ficam segredos, como fazer rollback

### Fase C — Fechamento

- [ ] T18 · Validação dos 11 critérios do spec §10 com evidências, README "Como rodar", Lighthouse baseline, manutenção testada no VPS

### Checkpoint C — "Fundação pronta"

- [ ] Todos os critérios do spec §10 verdadeiros em produção
- [ ] `SPEC-foundation.md` reflete o que foi construído (contratos §9 inalterados ou spec atualizado antes do código)
- [ ] Questões abertas revistas; próximo módulo (`nuvemshop`) liberado

## Paralelização

- **Após T2**, as duas trilhas da Fase A são independentes: T3→T4→T5→T6 (dados/servidor) e T7→T8→T9 (UI/rotas). Podem correr em sessões distintas; T9 precisa de T5 (cliente Supabase no proxy).
- **T15 `[humano]`** pode começar logo após T1 e correr durante toda a Fase A.
- **T13 (Docker)** não depende de nada da Fase A além do scaffold; se a operadora quiser adiantar, pode ser feito em paralelo — mas só será validado na CI em T14.
- **Sequencial obrigatório:** T1 → T2; T4 → T5 → T6; T7 → T8 → T9; T12 → T14 → T16 → T17 → T18.

## Riscos e mitigações

| Risco                                                                                                                           | Impacto                        | Mitigação                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadeia de deploy só é exercitada na Fase B; problemas de TLS/GHCR/SSH aparecem tarde                                            | Médio                          | T13 valida `compose config` e build da imagem na CI (T14) antes de T16; T15 pode ser adiantado; Fase A não produz nada que dependa da forma de entrega                                             |
| Let's Encrypt limita emissões para `*.sslip.io` (domínio compartilhado)                                                         | Alto — bloqueia o Checkpoint B | Emissor de staging no `Caddyfile` até o pipeline estabilizar (troca em T17); volume `caddy_data` persiste o certificado. Plano B: ZeroSSL (Caddy alterna sozinho) ou domínio definitivo antecipado |
| Deploy via SSH falha silenciosamente (`up -d` sobe container quebrado)                                                          | Médio                          | `deploy.yml` espera `/api/health` 200 em ≤ 90s e falha o job; `HEALTHCHECK` no Dockerfile                                                                                                          |
| `create-next-app` gera estrutura divergente do spec                                                                             | Baixo                          | T2 ajusta a árvore antes de qualquer outra tarefa; spec §4 é o critério de aceite                                                                                                                  |
| `cacheComponents: true` exige `Suspense` em tudo que lê `cookies()`; `proxy.ts` + Supabase SSR podem gerar erro de build tardio | Médio                          | T8 já entrega `Suspense` no slot do layout; T9 é a primeira tarefa a tocar `cookies()` e valida `npm run build`                                                                                    |
| Sem CI na Fase A, um PR pode entrar com `check` vermelho                                                                        | Baixo                          | Regra explícita em `todo.md`: `npm run check` local antes do PR; T17 torna isso obrigatório                                                                                                        |
| Supabase CLI precisa de `SUPABASE_ACCESS_TOKEN` e projeto ativo                                                                 | Baixo                          | Falha ruidosa é desejável; `deploy/README.md` documenta                                                                                                                                            |
| PNG do logo sem versão vetorial                                                                                                 | Baixo                          | `Wordmark` tipográfico e `Symbol` SVG provisórios                                                                                                                                                  |

## Questões abertas

1. **Logo vetorial:** existe SVG do wordmark e do símbolo? Sem ele, favicon e `Symbol` ficam provisórios.
2. **Provedor de analytics, monitor de uptime, fonte provisória, recursos do KVM 2** — herdadas do spec §12; nenhuma bloqueia este plano.
3. **Acesso ao VPS:** IP público, usuário inicial e método de acesso (senha ou chave) — necessários em T15.
