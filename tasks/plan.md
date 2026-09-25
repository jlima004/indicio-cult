# Plano de implementação: módulo `foundation`

| Campo            | Valor                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Spec             | [`docs/specs/SPEC-foundation.md`](../docs/specs/SPEC-foundation.md) (aprovado em 2026-09-16; deploy readjudicado em 2026-09-24) |
| Mapa             | [`docs/specs/CAPABILITY-MAP.md`](../docs/specs/CAPABILITY-MAP.md) — etapa 1                                                     |
| Lista de tarefas | [`tasks/todo.md`](./todo.md)                                                                                                    |
| Status           | Em execução — T15 concluída e aprovada; T16 é o próximo gate                                                                    |

## Visão geral

Construir a base técnica da vitrine — Next.js 16, Supabase, Dockerfile `standalone`, Coolify na VPS Hostinger, Traefik compartilhado, CI/CD no GitHub Actions, observabilidade e tokens — até que a `main` passe pela CI e o workflow fixe o SHA aprovado no recurso Coolify antes do deployment por API, com saúde confirmada sobre HTTPS. Nenhuma feature de produto. A arquitetura de deploy atual é o [ADR-002](../docs/decisions/ADR-002-coolify-traefik-deploy.md).

## Decisões de arquitetura do plano

- **Código primeiro, entrega depois.** A Fase A constrói a aplicação localmente; a Fase B empacota, valida e configura o recurso Coolify. Checkpoint A passou; T13–T15 foram revisadas e validadas; T16 é o próximo gate.
- **Sem CI durante a Fase A.** `npm run check` local precede PR; T14 instalou a CI para PRs e pushes em `main`, e T17 exigirá o status check na proteção da `main`.
- **Uma camada pública.** Coolify gerencia o recurso Git com Dockerfile e Traefik gerencia domínio/TLS. O Next escuta apenas na porta interna 3000; não há proxy próprio nem porta host da aplicação.
- **Deploy após CI.** Auto Deploy no Coolify fica **OFF**. T16 recebe o SHA da CI verde, descarta candidato obsoleto, fixa e relê `git_commit_sha` no recurso, aciona deployment por API e valida commit/saúde/SHA. A serialização exclusiva cobre a mutação; resposta HTTP 2xx não comprova saúde.
- **Tarefas humanas explícitas.** T15 configurou o recurso, domínio, variáveis, storage, middleware e segredos de automação sem disparar o primeiro deploy. Nenhuma mudança global no Traefik é automática; os access logs globais foram verificados como DISABLED e permaneceram inalterados.
- **Logo vetorial.** A T10 exportou o SVG oficial Hero e o Open Graph PNG. `Wordmark`, `Symbol` e favicon continuam provisórios.
- **Dependências de runtime:** `zod`, `@sentry/nextjs`, `@supabase/supabase-js`, `@supabase/ssr`, `zustand`. Outras passam por “Perguntar antes”.

## Grafo de dependências

```text
T1–T15 concluídas → T16 pin + deploy API pós-CI → T17 proteção/TLS/rollback → T18 validação
```

## Lista de tarefas (índice; detalhes em `todo.md`)

### Fase A — Núcleo da aplicação (local)

- [x] T1 · Repositório público e `main`
- [x] T2 · Scaffold Next.js 16 + TS + tooling
- [x] T3 · Vitest + Testing Library
- [x] T4 · `src/lib/env/` + `.env.example`
- [x] T5 · Clientes Supabase + CLI + tipos
- [x] T6 · Health + HTTP + rate limit
- [x] T7 · Tokens, copy e marca
- [x] T8 · Páginas de sistema
- [x] T9 · Proxy e grupos de rotas
- [x] T10 · Metadata, robots, sitemap e analytics
- [x] T11 · Sentry
- [x] T12 · Playwright

### Checkpoint A — Aplicação completa localmente

- [x] `npm run check`, build, health e E2E verdes
- [x] Home, 404, erro e manutenção com copy da marca
- [x] Revisão com a operadora antes do empacotamento

**Próximo gate:** T16 · `deploy.yml`: CI verde → pin SHA via API → verificar pin → deploy por UUID → validar deployment/health → aquecer Home. Execução bloqueada até autorização humana explícita.

### Fase B — Empacotamento e entrega

- [x] T13 · Dockerfile multi-stage, `.dockerignore` e runbook Coolify/Traefik; sem Compose/Caddy próprios
- [x] T14 · `ci.yml`: `check`, build, E2E, `db:types` diff, gitleaks, varredura de bundle e build da imagem sem publicação
- [x] T15 · `[humano]` Configuração do recurso Coolify/API/UUID, domínio/TLS, variáveis, storage, headers, tokens, GitHub secrets e evidência dos access logs — configuração PASS; runtime evidence deferida à T16
- [ ] T16 · `deploy.yml`: CI verde → pin SHA via API → verificar pin → deploy por UUID → validar deployment/health → aquecer Home
- [ ] T17 · Proteção da `main`, certificado público, security headers, access logs e rollback Coolify testado

### Checkpoint B — Está no ar

- [ ] Domínio público responde via Coolify/Traefik com TLS válido; Home e 404 da marca corretas
- [ ] CI e deploy workflow verdes; evidência de `candidate_sha == git_commit_sha` antes do trigger e `deployment.commit == SOURCE_COMMIT == APP_VERSION == health.version == candidate_sha`
- [ ] Push/merge na `main` só aciona produção após CI e pin confirmado; Auto Deploy OFF; rollback Coolify testado
- [ ] Operadora revisou configuração do recurso, secrets, headers e estado dos access logs

### Fase C — Fechamento

- [ ] T18 · Evidências dos 11 critérios do spec, README “Como rodar”, Lighthouse e manutenção testada no recurso Coolify

### Checkpoint C — Fundação pronta

- [ ] Critérios do spec §10 verdadeiros em produção
- [ ] Spec registra evidências; questões abertas revistas; módulo `nuvemshop` liberado

## Paralelização

- T1–T15 estão concluídas. T16 é o próximo gate e permanece bloqueado até autorização humana explícita.
- T16 depende de T14 e T15; ambas estão concluídas. T17 depende de T16, e T18 fecha as evidências.

## Riscos e mitigações

| Risco                                                     | Impacto                          | Mitigação                                                                                                           |
| --------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Coolify ou API indisponível                               | Deploy bloqueado                 | Monitorar estado; falha de API bloqueia workflow; nenhum bypass por Auto Deploy                                     |
| Deploy aceito, deployment degradado                       | Produção incorreta               | T16 aguarda e consulta deployment, health público, Supabase e SHA esperado                                          |
| Branch móvel avança entre check e checkout                | SHA sem CI entra em produção     | Pin `git_commit_sha` antes do deployment, reler pin, serializar produção e conferir deployment/health               |
| Proxy Traefik é compartilhado; labels geradas podem mudar | Outras rotas ou headers afetados | T15 aplica middleware específico com revisão humana; preserva labels existentes; mudança global requer gate próprio |
| `SOURCE_COMMIT` fora do build ou cache reutilizado        | `APP_VERSION` divergente         | Habilitar Include Source Commit in Build; exigir `SOURCE_COMMIT=APP_VERSION=health.version=candidate_sha`           |
| Domínio/TLS não roteia para porta 3000                    | Site indisponível                | T15 validou DNS e porta; T16 valida processo, TLS e roteamento públicos via Traefik                                 |
| VPS único continua ponto único de falha                   | Indisponibilidade                | Monitor externo e procedimento de rollback/recuperação Coolify                                                      |
| Docker local indisponível                                 | Imagem só validada em T14        | CI constrói o Dockerfile em PR antes de deployment                                                                  |
| Sem CI na Fase A                                          | PR defeituoso                    | `npm run check` local; T17 exige CI na `main`                                                                       |

## Questões abertas

1. Integrar variantes vetoriais oficiais ao `Wordmark`, `Symbol` e favicon.
2. Provedor de analytics, monitor de uptime, fonte provisória e recursos do KVM 2, conforme spec §12.
3. Estado/política futura dos access logs do Traefik compartilhado — T15 confirmou `DISABLED` e não fez alteração global; qualquer ativação continua exigindo decisão humana em T17.
