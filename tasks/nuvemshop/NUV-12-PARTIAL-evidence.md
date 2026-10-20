# NUV-12-PARTIAL — evidência da implementação técnica

Data: 2026-10-20. Execução técnica limitada da opção 2. Este arquivo não substitui [NUV-12-evidence.md](./NUV-12-evidence.md) nem reescreve o snapshot **PROPOSED / PENDING HUMAN APPROVAL** de [NUV-12-COVERAGE-PARTIAL.md](./NUV-12-COVERAGE-PARTIAL.md).

Estado desta execução: **NUV-12-PARTIAL / LOCAL_PASS / READY_FOR_HUMAN_REVIEW**.

Não declara `NUV-12 COMPLETE`, `T03-GENERAL PASS`, `NUV-22/23 UNBLOCKED`, `ADAPTER OPERATIONAL`, `IMPLEMENTATION COMPLETE` ou `RELEASE APPROVED`.

## 1. Ratificação humana

Proveniência: instrução do responsável humano pelo projeto Indicio Cult, nesta sessão Cursor, em 2026-10-20, intitulada retomada `NUV-12-PARTIAL`. Não é comentário histórico da PR #49 e não altera o texto da proposta no momento em que ela foi mergeada.

Escopo ratificado: busca exata por número cuja conclusão depende de uma única resposta suficiente da primeira página. Cobertura insuficiente ou necessidade de outra página falha fechada com `NuvemshopLookupIncompleteError`.

A ratificação autoriza auditoria, implementação do subset, RED/GREEN/REFACTOR, revisão adversarial, validação local, evidência, commit, push e PR. Não autoriza merge, deploy, API autenticada real, consumers ou `/rastreio`. Não dispensa o contrato geral da NUV-12 e não conclui T03 positivo multi-page.

## 2. Baseline e worktrees

| Item                           | Valor                                                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório                    | `jlima004/indicio-cult`                                                                                                                            |
| `origin/main` após `git fetch` | `ea9212506ac49ee998fa4a67800c9d7b4c9b0dfb` (PR #49)                                                                                                |
| Checkout original              | `/home/jlima/Projetos/indicioCult`, permaneceu em `main`                                                                                           |
| Worktree técnica histórica     | `/home/jlima/.codex/worktrees/nuv-12-order-number/indicioCult`, `codex/nuv-12-order-number` @ `6bd549e`, untracked `NUV-12-evidence.md` preservado |
| Worktree documental histórica  | `/home/jlima/.codex/worktrees/nuv-12-coverage-doc/indicioCult`, `codex/nuv-12-coverage-adjudication` @ `a28a4dd`, preservada                       |
| Worktree desta execução        | `/home/jlima/.codex/worktrees/nuv-12-partial/indicioCult`                                                                                          |
| Branch                         | `feat/nuv-12-partial-order-number`                                                                                                                 |
| HEAD inicial                   | `ea9212506ac49ee998fa4a67800c9d7b4c9b0dfb`                                                                                                         |

Não houve reset, clean, stash, force-push ou remoção de worktree. A branch histórica não continha implementação de `findOrderByNumber`; o diff contra `origin/main` era só a documentação já mergeada na PR #49.

O SHA do commit que contém este arquivo fica no corpo da PR, para não gravar uma autorreferência impossível aqui.

## 3. Subagents

Modelos configurados no harness. O orquestrador desta sessão é Grok 4.7 High Fast.

| Papel                                | Modelo configurado          | Resultado                                                                                                                                                                                                                                                                       |
| ------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Contract & Boundary Auditor      | `cursor-grok-4.6-high-fast` | [Audit NUV-12 contract](a0c8e31c-2503-4f70-9bdc-a9680b295ceb): `PASS_TO_RED`. `Page<T>` não observa `last`. Seam aditiva: uma leitura da mesma `navigation()`, sem colocar `lastPage` em `Page`.                                                                                |
| B — RED Test Engineer                | `composer-2.5-fast`         | [Write NUV-12 RED tests](9bdd2050-b271-4983-ac23-8e5e700d97bc): matriz em `order-lookup.test.ts`. Primeira execução: 54 failed, 1 passed. A falha de `findOrderByNumber` era símbolo ausente. O caso `listOrders` passou e mostrou `nextPage` ausente e ausência de `lastPage`. |
| C — Implementation Engineer          | `composer-2.5-fast`         | [Implement partial order lookup](2439217a-9c19-44a7-abf0-7069230b5921): substituiu o probe. 56/56 lookup e 116/116 pagination.                                                                                                                                                  |
| D — Independent Adversarial Reviewer | `cursor-grok-4.6-high-fast` | [Review partial order lookup](48c3c9df-723f-42a6-9c95-6b9e220de22e): `APPROVE`. Zero P0/P1/P2. P3 não material: `fail.ts` continua carimbando `operation: 'read'` em validação/protocolo do parser.                                                                             |

O orquestrador, depois do RED de símbolo ausente, inseriu um probe temporário que compunha `listOrders` e tratava `nextPage === undefined` como cobertura. Nova execução: **54 passed, 2 failed**. T03-P e T07 falharam porque o probe **devolveu o Order** com `rel=last` na página 2 e sem `next`. Esse probe foi removido antes do GREEN final. O orquestrador também unificou a leitura de navegação num único walk (`readNuvemshopLookupNavigation`) e removeu o leitor de `last` que ficaria sem uso.

D não participou da autoria.

## 4. Contrato implementado

`findOrderByNumber({ number, signal?, correlationId? })` valida o input e canonicaliza com `readOrderNumber` antes de qualquer I/O. Faz um GET lógico `GET /orders?page=1&per_page=200&q=<canônico>`, `operation: 'lookup'`. Tentativas transitórias da NUV-05 nesse mesmo GET não são páginas extras.

Retorno:

| Evidência                                                                                                              | Resultado                                 |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| C1–C5 e um `Order.number` exato                                                                                        | `Order`                                   |
| C1–C5 e zero matches                                                                                                   | `null`                                    |
| Dois IDs distintos com o mesmo número, IDs duplicados, `totalCount` ausente ou diferente do corpo, `next`, ou `last>1` | `NuvemshopLookupIncompleteError`          |
| Corpo, Order ou Link incompatível                                                                                      | `NuvemshopProtocolError`                  |
| Input inválido                                                                                                         | `NuvemshopValidationError` antes do fetch |

`last` ausente não prova cobertura sozinho. `last=1` pode ser coerente. `Page<T>` não ganhou `lastPage`. `parseNuvemshopPageNavigation` e `createNuvemshopPage` continuam omitindo `last`.

**T03-GENERAL / PENDING_COVERAGE_EVIDENCE.** Os testes T03-P são negativos do subset. Não substituem o positivo multi-page. O contraexemplo de [NUV-12-evidence.md](./NUV-12-evidence.md) permanece.

## 5. RED e GREEN

Comando: `npm run test -- tests/unit/modules/nuvemshop/order-lookup.test.ts`.

| Momento                                       | Resultado                                                     |
| --------------------------------------------- | ------------------------------------------------------------- |
| Matriz antes do símbolo                       | 54 failed, 1 passed (`T07-doc` em `listOrders`)               |
| Probe `listOrders` + `nextPage === undefined` | 54 passed, 2 failed: T03-P `last>1` e T07 devolveram o pedido |
| GREEN final                                   | 56 passed                                                     |

Arquivos de código: `pagination.ts`, `orders.ts`, `index.ts`. Teste: `tests/unit/modules/nuvemshop/order-lookup.test.ts`. Sem dependência npm nova, sem workflow, sem `.env`.

## 6. Revisão adversarial

Decisão independente: **APPROVE**. P0/P1/P2 materiais abertos: zero. P3 documentado na seção 3 e não corrigido, porque alterar `fail.ts` mudaria metadata compartilhada de todos os recursos. A classe de erro permanece a taxonomia existente.

## 7. Validação local do candidato final

| Comando                                                                                                                                                      | Resultado                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `order-lookup` + `orders` + `order-query` + `pagination`                                                                                                     | 4 files, **368 passed**                                                                                        |
| products, categories, category-projection, request, retry, schemas e boundary na mesma leva                                                                  | 6 files passed; boundary 1 timeout de 5000 ms em `JSDOC-01` sob carga de 647 s                                 |
| Reexecução isolada de `JSDOC-01`                                                                                                                             | **passed**                                                                                                     |
| `npm run check`                                                                                                                                              | lint 0 errors (2 warnings pré-existentes em `boundary.test.ts`), format, typecheck, **35 files / 2637 passed** |
| `npm run build` sem env público                                                                                                                              | falhou em `/robots.txt` por `NEXT_PUBLIC_*` ausente na worktree                                                |
| `npm run build` com env sintético (`localhost`, `https://synthetic.supabase.invalid`, chaves locais, sem token de loja, sem `.env`, sem `SENTRY_AUTH_TOKEN`) | **PASS**                                                                                                       |
| `git diff --check` no diff de código                                                                                                                         | limpo                                                                                                          |

O timeout de boundary não se repetiu no `npm run check` completo. Não foi mascarado com aumento de timeout. CI-FONT-01 permanece aberto e não foi alterado.

CI remoto deste HEAD: **PENDING** até a observação da PR. Não reutilizar PASS de HEAD anterior.

## 8. Limites que permanecem

- T03-GENERAL pendente.
- NUV-12 integral pendente.
- NUV-22, NUV-23, NUV-24 e NUV-25 bloqueadas pela NUV-12 integral. DAG inalterado.
- Nenhum consumer, `/rastreio`, índice ou migration.
- HR-02 aberto. Legado fiscal diferido. Modern-only continua incompleto.
- CI-FONT-01 aberto: https://github.com/jlima004/indicio-cult/issues/47
- Merge e deploy não autorizados. Release exige decisão humana sobre o HEAD publicado.
