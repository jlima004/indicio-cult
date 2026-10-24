# NUV-13 — Descoberta de candidatos a pedidos por e-mail

Data: 2026-10-23 (America/Sao_Paulo). Evidência local/sintética e publicação em Draft. Este relatório não altera SPEC, PLAN, TODO, ADRs, workflows ou HRs.

Estado fotografado antes do push: **LOCAL_TECHNICAL_PASS / PUBLICATION_PENDING / REMOTE_PENDING / MERGE_NOT_AUTHORIZED**. Recibos de commit, PR, HEAD e CI ficam no corpo da PR, no SHA publicado, sem commit autorreferencial.

## A — Executive Summary

O adapter server-only passa a expor `discoverOrdersByEmail`: uma página explícita de `listOrders` com `q` igual ao e-mail validado, candidatos restritos a `contactEmail === email`, e `coverage: 'unproven'` em toda observação bem-sucedida. `nextPage` ausente não é fim da busca nem ausência. Não há loop, índice, consumer, flag de identidade nem classe de erro nova.

Limitações: NUV-12-FULL, T03-GENERAL e ausência global continuam pendentes. `identity` e `orders` não foram implementados. A comparação é exata; não existe política de normalização materializada para aplicar. `totalCount` continua visível como observação e não prova ausência.

## B — Baseline

| Campo                                           | Evidência                                                                                                                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório                                     | jlima004/indicio-cult                                                                                                                                                                                     |
| Baseline local e `origin/main` após `git fetch` | `42bb6e4f21254854d232ae8e8422c949234e3c0f`                                                                                                                                                                |
| Ahead/behind                                    | 0 / 0                                                                                                                                                                                                     |
| Checkout original                               | `/home/jlima/Projetos/indicioCult`, `main`, limpo no preflight                                                                                                                                            |
| Worktree                                        | `/home/jlima/Projetos/indicio-cult-nuv-13`                                                                                                                                                                |
| Branch                                          | `feat/nuv-13-order-email-search`                                                                                                                                                                          |
| PR ou branch remota NUV-13 no preflight         | nenhuma                                                                                                                                                                                                   |
| Predecessores no código                         | NUV-06 (`pagination.ts`) e NUV-11 (`listOrders` / `Order.contactEmail`). Sem aresta NUV-12 → NUV-13                                                                                                       |
| Runtime                                         | Node v22.23.1; npm 10.9.8; Next 16.4.1                                                                                                                                                                    |
| Dependências                                    | Nenhuma instalação. `node_modules` da worktree foi primeiro um symlink e depois uma cópia por hardlink do install já existente, para o teste de boundary resolver `@types/node` sob o prefixo da worktree |
| Segredos                                        | `.env` e `.env.sentry-build-plugin` apenas ligados por symlink ao checkout principal, gitignored, fora do commit                                                                                          |
| Preservação                                     | Sem reset, clean, stash, amend, rebase ou force-push                                                                                                                                                      |

## C — Subagents

Slugs solicitados ao harness. Esta sessão não atesta o backend de modelo além do slug pedido.

| Papel                                | Modelo solicitado                                | Resultado                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Contract & Architecture Auditor  | Grok 4.6 High Fast (`cursor-grok-4.6-high-fast`) | Parecer escrito antes do GREEN. API provisória aprovada. Sem edição de arquivos. Sessão `d6406505-7e87-48fd-9700-d9a1f0361ee4`                              |
| B — RED Test Engineer                | Composer 2.5 Fast (`composer-2.5-fast`)          | Só criou o teste. RED 32 failed / 6 passed. Sessão `eb535aca-02ac-4f36-9a23-daf504232c13`                                                                   |
| C — Implementation Engineer          | Orquestrador Grok 4.7 High Fast                  | GREEN mínimo após o RED. Sem alteração de `pagination.ts`                                                                                                   |
| D — Independent Adversarial Reviewer | Grok 4.6 High Fast, sessão nova, sem autoria     | **APPROVE**. Zero P0/P1/P2. Três notas P3. Sessão `524fe239-ea45-41b4-9315-68338a543319`                                                                    |
| E — Release & Evidence Auditor       | Composer 2.5 Fast (`composer-2.5-fast`)          | **APPROVE** local antes do commit. Suíte focada reexecutada: 38 passed. Sem edição. Sessão `bff75ed0-4093-493b-9606-1c9bffa0a069`. CI remota no corpo da PR |

A e B rodaram em paralelo e não editaram os mesmos arquivos. GREEN só começou depois do RED verificável. D não escreveu a implementação.

## D — Contract Audit

Fontes lidas pelo auditor A, sem reescrevê-las: `docs/specs/SPEC-nuvemshop.md`, `tasks/nuvemshop/plan.md`, `tasks/nuvemshop/todo.md` (NUV-13), `NUV-READINESS-01-evidence.md`, `NUV-DAG-01-amendments.md`, `NUV-DAG-02-evidence.md`, ADR-003, ADR-004, e os módulos `orders`, `pagination`, `order-query`, `types`, schemas de order/text, `errors`, `index`, mais `order-lookup.test.ts`.

Invariantes adotados:

- Dependências técnicas: somente NUV-06 e NUV-11. D1–D5, materializados na PR #53, não criam aresta NUV-12 → NUV-13.
- `q` descobre candidatos. Não prova identidade, posse, ausência nem cobertura integral do índice.
- `coverage` é sempre `'unproven'`. Página vazia, página curta, `totalCount`, `nextPage` ausente, `last > 1` sem `next` e HTTP 200 não esgotam a busca.
- O consumer `orders` é quem percorre páginas finitas, aplica normalização de `identity` se ela existir, compara `contactEmail` e decide vínculo, cobertura e projeção durável.
- `NuvemshopLookupIncompleteError` permanece exclusivo de `findOrderByNumber`. Descoberta bem-sucedida não vira esse erro.
- Nenhuma mudança em `pagination.ts`. Reuso de `listOrders` e do pager já validado. Sem `listAll`, sem fetch de URL do header `Link`.

Contradição registrada e não “corrigida”: o TODO ainda sugere o título de PR `feat(nuvemshop): report complete order search`. O aceite da task proíbe declarar busca completa. O título usado na publicação descreve descoberta de candidatos.

## E — RED

Comando: `npm run test -- tests/unit/modules/nuvemshop/order-email-search.test.ts` na baseline, antes de código de produção.

Resultado: **1 file failed; 32 failed / 6 passed (38)**. Exit não zero.

Passaram na baseline: três regressões mínimas de `listOrders`, `getOrder` e `findOrderByNumber`, mais três guardas estáticas (`read_customers`, `import 'server-only'`, ausência da função em `src/app`).

Falharam os 32 cenários de descoberta e de `orderContactEmailMatches`. A causa observada foi `CONTRACT_GAP` por export ausente (`discoverOrdersByEmail`, `orderContactEmailMatches`, `ORDER_EMAIL_DISCOVERY_HANDOFF`), antes das asserções de comportamento. Isso é ausência real do contrato, não um mock que devolve o que recebeu. Limitação: as asserções de pager, PII, Link hostil e comparação exata só executaram no GREEN, quando o export passou a existir. A suíte não foi enfraquecida para obter o RED.

## F — GREEN / REFACTOR

Allowlist:

- `src/modules/nuvemshop/server/orders.ts`
- `src/modules/nuvemshop/server/index.ts` (reexport server-only da superfície nova; indispensável para o barrel já usado pelos testes de orders)
- `tests/unit/modules/nuvemshop/order-email-search.test.ts`
- `tasks/nuvemshop/NUV-13-evidence.md`

`discoverOrdersByEmail` valida o objeto fechado, o e-mail pela mesma regra estrutural de `readContactEmail` (sem lowercase, trim ou alias) e `page`/`perPage` (`page >= 1`, `perPage` 1..200) antes de chamar `listOrders` uma vez. Candidatos são o filtro exato da página observada. Erros de validação, protocolo, rede e rate limit propagam as classes já existentes.

`orderContactEmailMatches` lê só o valor próprio de `contactEmail`. Accessor ou exceção não é match. Objeto com protótipo nulo é recusado neste input; `listOrders` não foi alterado e continua com a regra anterior.

Não houve refactor que unificasse o leitor de input com `listOrders`, para não apertar nem afrouxar o contrato NUV-11.

GREEN focado: **38 passed**. Regressões de orders, paginação, NUV-12, schemas, request, order-query e errors: **8 files, 1301 passed**, incluindo a suíte NUV-13.

## G — Security & Privacy

- `contactEmail` e `q` permanecem no módulo `server-only`. Nenhum route em `src/app`. Nenhum `NEXT_PUBLIC_NUVEMSHOP_*`. Nenhum `read_customers`.
- Input com `verified` ou `trusted` falha como `NuvemshopValidationError` antes do fetch.
- Erros usam `failValidation('order')` / transporte existente. Mensagem e `toJSON` não recebem e-mail, query ou token.
- Não há `console` novo. Fixtures sintéticas (`@example.test`, `SYNTHETIC-*`, `HUGE_ID`).
- Link externo, `q` alterado ou rota errada continuam `NuvemshopProtocolError` via pager existente.
- O resultado não devolve URL de Link nem body cru. Não há campo de posse ou identidade.
- Duas chamadas permanecem duas observações.

## H — Validation

| Comando                                                               | Resultado                                                                                         | Classificação                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED focado                                                            | 32 failed / 6 passed                                                                              | Esperado, pré-GREEN                                                                                                                                                                                                                                                                                                             |
| GREEN focado                                                          | 38 passed                                                                                         | Diff                                                                                                                                                                                                                                                                                                                            |
| Regressões orders/paginação/NUV-12/schemas/request/order-query/errors | 1301 passed                                                                                       | Diff                                                                                                                                                                                                                                                                                                                            |
| `npm run check` #1                                                    | 10 failed / 2730 passed em `boundary.test.ts`: `Installed Node declarations are required`         | Infraestrutura da worktree: symlink de `node_modules` fazia o TypeScript resolver `@types/node` fora do prefixo do teste. Não é efeito do diff. Corrigido com hardlink, sem `npm install`                                                                                                                                       |
| `npm run check` #2                                                    | 3 failed / 2737 passed: timeouts de 5s em `JSDOC-13-ROOT`, `JSDOC-13-GUARDED`, `TSTYPES-CONSUMER` | Mesma classe do baseline. No `main` @ `42bb6e4`, a suíte completa de boundary falhou outro teste por timeout (`resolves adapter server-to-root reference paths…`, 5456ms). `TSTYPES-CONSUMER` isolado estoura 5s na worktree (6379ms) e no main (6283ms). Não introduzido pela NUV-13. Não foi mascarado com mudança de timeout |
| `npm run check` #3                                                    | **exit 0**. Lint, format, typecheck, tooling e Vitest **37 files / 2740 passed**                  | Gate local PASS. ESLint mostrou 2 warnings pré-existentes em `boundary.test.ts` e não falhou o script                                                                                                                                                                                                                           |
| `npm run build` #1                                                    | Falha ao coletar `/robots.txt` por env público ausente na worktree, e Sentry 401 sem o plugin env | Infraestrutura local. Arquivos gitignored não vieram com a worktree                                                                                                                                                                                                                                                             |
| `npm run build` #2                                                    | **exit 0** com `.env` gitignored apenas symlinkado                                                | Build PASS. Warning pré-existente de `partialPrefetching`                                                                                                                                                                                                                                                                       |
| `db-types`                                                            | não executado                                                                                     | SKIPPED. Não é PASS                                                                                                                                                                                                                                                                                                             |
| E2E / Docker / scan remoto                                            | não executados nesta sessão                                                                       | REMOTE_PENDING                                                                                                                                                                                                                                                                                                                  |

Nenhum teste foi removido, desabilitado ou flexibilizado.

## I — Independent Review

Reviewer D, sem autoria, leu o diff e rodou a suíte focada (38 passed). Não editou arquivos.

| Severidade | Achados                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0         | nenhum                                                                                                                                                                   |
| P1         | nenhum                                                                                                                                                                   |
| P2         | nenhum                                                                                                                                                                   |
| P3         | `totalCount` segue na página e um consumer descuidado poderia lê-lo como ausência; o contrato mantém `coverage: 'unproven'` e o handoff lista `absence` como não provado |
| P3         | O teste do `rel=last` sem `next` não afirma `not.toHaveProperty('lastPage')`; a implementação não copia `lastPage`, e `pagination.ts` está intacto                       |
| P3         | A guarda de `src/app` zera o texto se a leitura falhar; hoje `src/app` existe e não referencia a função                                                                  |

Sem remediação de código: as notas P3 não alteram o contrato. Parecer final: **APPROVE**.

## J — Publication

Pendente neste arquivo versionado. O commit, a PR Draft e o CI serão registrados no corpo da PR para o HEAD exato, sem novo commit só para atualizar SHAs.

Allowlist conferida no worktree antes do commit: os quatro arquivos desta seção F. `node_modules`, `.env` e `.env.sentry-build-plugin` permanecem de fora.

## K — Release Recommendation

Elegibilidade técnica local da NUV-13: o contrato de descoberta, a comparação exata, a incompletude explícita e os gates locais finais estão satisfeitos, com zero P0/P1/P2 abertos.

Bloqueios residuais: CI remota e revisão de código da PR ainda não existem neste relatório. NUV-12-FULL, T03-GENERAL, ausência global, `identity`, `orders`, OTP, `/rastreio` e `/conta/pedidos` continuam fora.

Risco: um caller pode tratar `totalCount === 0` ou `nextPage === undefined` como lista final se ignorar `coverage`. O tipo não oferece `'complete'` nem `'absent'`.

Próxima decisão humana: revisar a Draft. **Merge não autorizado. Deploy não autorizado. Ready for Review não autorizado.**

Saída máxima desta execução, após CI e review remotos verificados no mesmo HEAD: `NUV-13 / READY_FOR_HUMAN_REVIEW / MERGE_NOT_AUTHORIZED`. Sem esses recibos, o estado remoto permanece `REMOTE_PENDING`.
