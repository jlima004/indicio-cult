> **Retomada de 2026-10-20:** o relatório de 2026-10-19 abaixo foi preservado como histórico. O estado corrente, os novos hashes e gates estão na seção final “Retomada técnica pós-PR #45”. O bloqueio fiscal histórico foi adjudicado; isso não reaproveita aprovação técnica antiga.

# NUV-11 — implementação local e evidências

Data: 2026-10-19 (America/Sao_Paulo).
Estado: **BLOCKED_PROVIDER_LEGACY_CONTRACT_UNVERIFIED**.

## A — Baseline

- Checkout inicial: `main`, limpo; HEAD `a11ff4f0a453f33d60f922f41cc600c546a67b5f`.
- `git fetch origin` confirmou `origin/main` no mesmo SHA; sem avanço do baseline.
- NUV-04/05/06/07 incorporadas pelas PRs #35/#38/#39/#34; NUV-08/09 por #43/#44.
- Não existia branch local/remota nem PR com head `codex/nuv-11-orders`.
- Branch local criada: `codex/nuv-11-orders`; candidate ainda sem commit.
- Fingerprint final dos 13 arquivos de código/teste: `994569c4bd913fddfcc05af8ce87c31cc223249417c86f88d9ce2d7667e9b7c3` (`/tmp/nuv11-candidate-manifest.json`). O snapshot de build contém os mesmos bytes; o relatório não faz parte desse fingerprint.

## B — Contratos e fontes

Consulta pública oficial em 2026-10-19, sem autenticação e sem acesso à loja:

- [Order 2025-03](https://nuvemshop.dev/en-US/api/resources/2025-03/order): IDs/número, snapshots, criação, pagamento, aggregates, q e NF-e.
- [Fulfillment Order 2025-03](https://nuvemshop.dev/en-US/api/resources/2025-03/fulfillment-order): lista scoped em array, detalhe em objeto, ULIDs, tracking, históricos, timestamps e campos mínimos.
- [Metafields](https://nuvemshop.dev/en-US/api/resources/2025-03/metafields), [guia NF-e](https://nuvemshop.dev/en-US/apps/erp-guide/orders/invoices), [paginação](https://tiendanube.github.io/api-documentation/intro#pagination), [scopes](https://tiendanube.github.io/api-documentation/authentication#scopes) e [Multi Inventory](https://tiendanube.github.io/api-documentation/guides/multi-inventory#new-scopes).
- SPEC/PLAN/TODO, PRD, Capability Map, ADR-001/002 e guia instalado Next `node_modules/next/dist/docs/01-app/02-guides/data-security.md` orientaram a implementação. Não foram alterados contratos normativos.

O provider documenta o legado como dois metafields separados, sem identificar seus nomes e formato nas fontes consultadas. A pesquisa incluiu portais atual EN/PT, espelho histórico, v1 e guia ERP. O exemplo 201 inconsistente (`key=link` na criação moderna) não prova nomes legados. Não há contradição material demonstrada com a SPEC; há falta de evidência para um aceite obrigatório. Não foram implementados pares inferidos. O humano foi consultado sobre fonte oficial/contrato adjudicado e a resposta permanece pendente.

HR-02 continua aberto: capacidades efetivas/scopes/account-specific não foram provados. Isso permite implementação sintética e não comprova integração operacional.

## C — Subagents reais

| Papel | Identidade             | Trabalho e evidência                                                                  |
| ----- | ---------------------- | ------------------------------------------------------------------------------------- |
| A     | `a_contract_research`  | Pesquisa normativa/oficial; `/tmp/nuv11-contract-research.md`                         |
| B     | `b_schema_model`       | Reuso e desenho mínimo; `/tmp/nuv11-schema-design.md`                                 |
| C     | `c_red_tests`          | Testes adversariais e RED real; `/tmp/nuv11-red-evidence.md`                          |
| D     | `d_implementation`     | `orders.ts`, exports e remediação de merges                                           |
| E     | `e_adversarial_review` | Contexto novo, revisão completa e probes próprios; `/tmp/nuv11-adversarial-review.md` |

O harness não expôs o identificador concreto do modelo herdado aos workers. Nenhum nome foi inventado e nenhum override de modelo foi aplicado. E utilizou esforço `high` solicitado pelo orquestrador. Autores não aprovaram a própria implementação.

## D — Implementação

- `server/orders.ts`: `getOrder`, flags server-only `includeFulfillments`/`includeInvoices` (default true); `listOrders` retorna uma página explícita com `q` opcional de descoberta, sem lookup completo de NUV-12/13 ou N+1.
- Reuso do decoder lossless, parsers/tipos NUV-07, transporte NUV-04, budget/retry NUV-05, paginação NUV-06 e erros NUV-03.
- FO: até quatro páginas de 25 registros (máximo 100), até 25 detalhes; IDs ligados ao path; contagem estável/cobertura exata/sem próxima página para confirmar membership; sem metadados suficientes permanece incompleto.
- Metafields: até quatro páginas de um registro, máximo 50 referências internas; filtro fechado `owner_id`, `namespace=nfe`, `key=list`, `fields=value`. Todas as notas modernas válidas são preservadas. `invoices.completeness` fica **incomplete em todas as leituras fiscais**, inclusive list vazio, até reconciliação legacy.
- Schema preserva IDs disponíveis em transições e timestamps adicionais opcionais, sem substituir `happened_at` null. Campos malformados presentes falham. Aliases de fulfillment simultâneos são rejeitados para evitar escolha implícita.
- Projeções sucessivas da mesma remessa preservam campos omitidos de endereço/tracking; null explícito mantém autoridade. Legacy provisório nunca preenche destino de fulfillment. Históricos conflitantes que apagariam linhas/tempos fornecidos falham com ProtocolError seguro.
- Transporte aceita apenas os filtros necessários por rota; pager valida também a identidade dos filtros em Links. Texto de `q` não aparece nos metadados projetados: usa um identificador opaco por request, atribuído ao Link somente após comparar seu `q` exatamente com o original no transporte, sem servir como autorização. A identidade de coalescing inclui o filtro; não há cache de respostas após a leitura em andamento.

Limite superior do enriquecimento: 34 requests lógicos por `getOrder` (1 Order + 4 FO + 25 detalhes + 4 fiscais), cada um sujeito ao limiter/retry/timeout já existente; não foi alterada a política de retries nem criado cliente alternativo. Abort e falta de budget podem retornar erro tipado; nunca fabricar completude.

Arquivos alterados:

| Grupo        | Arquivos                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------- |
| Recurso      | `server/orders.ts`, `server/index.ts`                                                         |
| Schema/tipos | `server/schemas/order.ts`, `server/types.ts`                                                  |
| Transporte   | `server/order-query.ts`, `server/request.ts`, `server/pagination.ts`, `server/rate-budget.ts` |
| Testes       | `tests/unit/modules/nuvemshop/{orders,order-query,pagination,retry,schemas}.test.ts`          |
| Evidência    | `tasks/nuvemshop/NUV-11-evidence.md`                                                          |

## E — RED

- APIs ausentes: 72/72 testes falharam antes da implementação (`/tmp/nuv11-red.log`).
- Controles existentes NUV-07: 448/448 passaram (`/tmp/nuv11-schema-controls.log`); não foram apresentados como RED.
- Transporte: 9 falhas reais/6 controles positivos, por queries/filtros/subcoleções ainda não suportados (`/tmp/nuv11-query-red.log`).
- RED adicional comprovou descarte de ID de transição, aliases ambíguos, detalhe não consultado apesar de histórico incompleto, perdas por omissão de endereço/tracking, timestamps ignorados ou malformados aceitos e apagamento de eventos/tempos entre projeções.
- A revisão final também demonstrou em RED a rejeição de `q` válido com apóstrofo antes do fetch. O encoder canônico foi corrigido para request e Link.
- Três falhas iniciais do detector/assertions de testes foram corrigidas e explicitamente excluídas da contagem de bugs; ver relatório C. Nenhum timeout ou gate foi afrouxado.

## F — GREEN / REFACTOR

Implementação e remediações foram realizadas somente após RED correspondente ou cobertura prévia demonstrada. Refatoração limitada à leitura de records lossless, helpers de lista/projeção e reconciliação de dados fornecidos. Nenhum Product atual foi consultado para thumbnail.

## G — Validação

**PASS no fingerprint final `994569c4bd913fddfcc05af8ce87c31cc223249417c86f88d9ce2d7667e9b7c3`.**

| Comando / gate                                                                                                 | Resultado verificável                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test -- tests/unit/modules/nuvemshop/orders.test.ts` (C final)                                        | PASS, 133/133, 3,78 s; `/tmp/nuv11-apostrophe-query-green.log`                                                                                                          |
| `npm run test -- tests/unit/modules/nuvemshop/orders.test.ts tests/unit/modules/nuvemshop/order-query.test.ts` | PASS, 153/153, 4,87 s; `/tmp/nuv11-resources-final.log`                                                                                                                 |
| `npm run check`                                                                                                | PASS, exit 0; lint, runtime, tokens, format, typecheck; 6 runtime + 135 token checks; Vitest 2.525/2.525, 34/34 arquivos, 594,25 s; `/tmp/nuv11-check-opaque-final.log` |
| Boundary / server-only / imports runtime e tipo                                                                | PASS, 595 casos existentes, dentro do check global sem afrouxamento                                                                                                     |
| Regressões Order, transport, retry, pager, schemas, errors, Product e Category                                 | PASS no check global, sem skips                                                                                                                                         |
| `npm run build` no snapshot byte-identical                                                                     | PASS, exit 0; compilação 2,5 s, TypeScript 5,7 s, 8/8 páginas em 777 ms; `/tmp/nuv11-build-opaque-final.log`                                                            |
| `git diff --check` / manifesto após testes                                                                     | PASS; mesmos 13 hashes; arquivos protegidos sem mudanças                                                                                                                |

O check final não teve falhas, testes ignorados ou cancelamentos. Skips de 590 casos nos probes focados históricos decorrem somente da seleção `-t` e não substituem a execução integral final. O build teve os avisos da configuração existente de Partial Prefetching e ausência intencional de token Sentry, sem release/upload remoto.

Hashes das evidências finais:

- Check: `4f03faf5aac3665cdb32bf7f5e964bc62a82009911a308844f640dc94957a62c`.
- Build: `fbf2bf3314d5a36ce1b1a1e8658e31784df980b134cb1f1af3eb3a4c1b31c8df`.
- Recursos: `7c3653bfdd27fd05b2b689d61e84aa9f1e26fc7d2121acd64b987a33f733e635`.

Histórico de falhas preservadas, anteriores ao fingerprint final:

Uma execução completa anterior retornou FAIL: 2.514 PASS / 9 FAIL em 2.523 testes (34 arquivos), duração 605,68 s. Todas as nove falhas ocorreram em fixtures do boundary com `types: []`, que não resolviam o novo import `node:crypto`. Uma diretiva explícita de pacote Node removeu os diagnósticos mas agravou o custo e teve dois timeouts (5 s) em cinco casos focados. O mesmo controle no baseline teve um timeout cold (5.148 ms), preservado em `/tmp/nuv11-boundary-baseline.log`. O helper foi simplificado para identificador opaco e comparação exata no transporte, eliminando import/diretiva Node sem modificar o harness ou seus limites. Os 451 testes focados de Order/query/pager/retry passaram nessa implementação. O focused de cinco boundary cases sem Node apresentou dois timeouts (5.504/6.038 ms), com testes independentes concorrentes durante parte da execução; não foi tratado como PASS. O gate completo foi reiniciado sem builds/probes/testes concorrentes, mantendo todos os limites. Recursos finais: 153 PASS (133 Order + 20 queries), `/tmp/nuv11-resources-final.log`. O build final passou no snapshot dos mesmos bytes: `/tmp/nuv11-build-opaque-final.log`. A rodada integral final acima encerrou esse gate com PASS.

Duas execuções intermediárias de `npm run check` foram interrompidas quando o candidato mudou nos ciclos RED/GREEN e na remediação E-05. A primeira tinha a falha de endereço já reproduzida e posteriormente corrigida. Nenhuma representa PASS. Um build anterior passou, mas também foi substituído após E-05. O gate integral foi posteriormente reexecutado sobre o fingerprint final e passou, conforme tabela acima.

O build usou snapshot local sem arquivos privados `.env`, com dependências já instaladas e configuração sintética somente no processo. Sem Docker ou serviços externos adicionados.

## H — Revisão independente

**APPROVE técnico parcial explícito** de E para a implementação independente local no fingerprint `994569c4bd913fddfcc05af8ce87c31cc223249417c86f88d9ce2d7667e9b7c3`, com **zero P0/P1/P2 material de código aberto**. Não é aprovação de NUV-11 completa, publicação, Ready, merge ou deploy.

| Achado                                         | Classe            | Resolução verificada independentemente                                            |
| ---------------------------------------------- | ----------------- | --------------------------------------------------------------------------------- |
| E-01 perda de endereço por omissão             | P2                | Projeção presence-aware da mesma FO; null explícito preservado                    |
| E-02 histórico incompleto sem busca de detalhe | P2                | Detalhe bounded acionado para histórico não confirmado                            |
| E-03 perda de URL tracking por omissão         | P2                | Campos code/url reconciliados pela presença; null explícito preservado            |
| E-04 descarte de timestamps disponíveis        | P2                | Campos opcionais validados/preservados; conflito de retenção falha seguro         |
| E-05 apóstrofo válido rejeitado em q           | P2                | Encoder canônico compartilhado por request e Link                                 |
| Regressão de boundary por node:crypto          | Gate de regressão | Dependência Node removida; filtros opacos + igualdade exata; todos 595 casos PASS |

E inspecionou todo o diff, inclusive arquivos novos e evidência, recomputou os 13 hashes sem divergência, verificou check/build finais e executou probes próprios de endereço, tracking, histórico, timestamps, aliases, apóstrofo, privacy e callers coalescidos com Link. Evidência: `/tmp/nuv11-adversarial-review.md`, `/tmp/nuv11-e-opaque-probes.log`, `/tmp/nuv11-e-opaque-apostrophe.log`, `/tmp/nuv11-e-opaque-coalesced-link.log`. P0/P1 encontrados: nenhum. Todos os cinco P2 materiais encontrados foram remediados. Não há P3 material pendente registrado.

Houve interrupção por limite de uso do subagent; a retomada posterior foi bem-sucedida. Não foi fabricada aprovação durante a interrupção. A revisão técnica não fecha o bloqueio factual do legado fiscal.

## I — Segurança e privacidade

PII real não foi utilizada. Somente `fetch` é substituído nas integrações sintéticas; client/rate/pager/schemas reais permanecem sob teste. URLs de thumbnail/invoice/tracking são referências, não destinos de egress; somente host Nuvemshop fixo no transporte. Nenhum endpoint frontend/consumer, scope, credencial, workflow, migration, dependência ou configuração de produção foi alterado. O módulo e seus tipos continuam server-only; o guard runtime/type de Client Components passou integralmente no check final.

## J — GitHub

Sem commit, push, PR ou solicitação remota de revisão enquanto o gate obrigatório do legado estiver pendente. Candidate HEAD base: `a11ff4f0a453f33d60f922f41cc600c546a67b5f`, com diff local. CI/review remotos **NOT REQUESTED**, não PASS. Não houve merge/deploy.

## K — Decisão

**BLOCKED_PROVIDER_LEGACY_CONTRACT_UNVERIFIED**. As partes independentes foram implementadas e submetidas a testes/revisão. Falta fonte oficial ou adjudicação humana para nomes/formato/reconciliação do legado fiscal e para provar ausência fiscal total. Não se declara NUV-11 tecnicamente completa nem pronta para Ready enquanto esse aceite permanecer aberto. HR-02 segue obrigatório para qualquer uso real. Publicação depende do fechamento dos gates definidos pelo pedido; merge/deploy exigem autorização humana separada por candidate HEAD.

# Retomada técnica pós-PR #45 — 2026-10-20

## A — Baseline & Git Integrity

- Original candidate: `codex/nuv-11-orders @ a11ff4f0a453f33d60f922f41cc600c546a67b5f`, 9 tracked modificados e 5 untracked; sem staging.
- Documental adjudication: PR #45 `MERGED`, head `32d2cc0fbe22a2a6dc36da550093fe5c8ef90540`, merge `966b31b70a96b4051312d8356c05b3e7ebf5239a`, confirmado por GitHub em 2026-10-20. Nenhum avanço posterior da main no fetch inicial.
- Reconciled candidate: `codex/nuv-11-orders-resume`, worktree dedicada sobre `966b31b`. A branch original permanece ocupada pelo checkout dirty preservado; não foi feito checkout/rebase/merge nesse original.
- Preservação: snapshot externo recuperável `nuv-11-resume-20261020/original`, manifesto de 14 paths SHA-256 `e68673173ccc1e04afbb857a302a541ac51613df6085113180af16b2996c5430`, patch tracked SHA-256 `44ffc45e65ac3dd38d8ebb4753b31a232db0c63e8c6be2cf73e42feb2c91471f`. Os 5 untracked estão nas cópias, não apenas no patch. Nenhum .env privado copiado.
- B reproduziu exatamente o fingerprint histórico `994569c4bd913fddfcc05af8ce87c31cc223249417c86f88d9ce2d7667e9b7c3`; os 13 arquivos técnicos iniciais não divergiram do candidato anterior. Cópia inicial para worktree validada 14/14 byte-idêntica. Original, snapshot, status NUL e patch continuam verificáveis.
- Algoritmo do fingerprint: SHA-256 da concatenação, por path técnico ordenado, de `path UTF-8 + NUL + SHA-256 hexadecimal do arquivo + LF`; exclui somente este relatório para evitar autorreferência. A allowlist técnica é a mesma de 13 paths da seção D histórica.
- SPEC, PLAN, TODO, LEGACY-B, AGENTS, dependências/lockfile, workflows, harness e infraestrutura permanecem byte-idênticos ao baseline novo. A emenda #45 não aparece como alteração nova na PR técnica.

## B — Contract Reconciliation

`NUV-11-LEGACY-B` permite aceite técnico local sem inventar o legado fiscal. Toda leitura moderna bem-sucedida mantém `incomplete`, inclusive zero, uma ou muitas referências, resposta `[]` e `value='[]'`; não lido permanece `not_consulted`; payload fiscal presente malformado gera ProtocolError seguro. O estado histórico `DOCUMENTAL_AMENDMENT_PENDING_HUMAN_MERGE` do registro normativo é um snapshot anterior; o merge GitHub acima é a evidência corrente. Não houve nova interpretação nem alteração normativa.

A encontrou A-01/P2: o parser exportado `parseOrder`, embora `getOrder` já estivesse correto, permitia `confirmed` por default ou hint explícito para `invoiceValue` exclusivamente moderno. Essa foi a única divergência comportamental demonstrada nesta reconciliação. A correção impede confirmação fiscal global também nessa superfície pública server-only, preservando as validações e todas as referências.

| Contrato                                                                      | Implementação/teste verificável                      | Evidência atual                                 |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| IDs grandes, ID distinto de número, created_at/offset obrigatório             | lossless + schemas; orders/schemas tests             | Gates finais abaixo                             |
| Snapshot de cada item, ausência/null, malformed e nenhum lookup Product/image | mapper existente; orders tests                       | Cobertura preservada                            |
| Pagamento mínimo; contactEmail opcional e server-only                         | schemas/types; orders/schemas/boundary               | Sem identidade/OTP/disclosure                   |
| Zero/muitas FO, detalhes e timeline bounded, tempos e IDs retidos             | orders/readFulfillments; schemas; orders tests       | Até 4 páginas, 100 FO, 25 detalhes              |
| Destino por remessa e provisório com provenance, sem cópia                    | schemas/order/address e testes de retenção           | Sem raw/geolocation                             |
| Moderno fiscal 0..N, filtros exatos e association opcional                    | readInvoices, order-query, parseInvoiceListValue     | Até 4 páginas de 1 metafield e 50 refs internas |
| Modern-only nunca confirmed no parser público                                 | invoiceCollection + matriz LEGACY-B em schemas tests | A-01 RED/GREEN                                  |
| `[]` versus `value='[]'`, não lido/malformed/truncado                         | orders + schemas tests                               | Matriz fiscal abaixo                            |
| q canônico/apóstrofo, Link identity, coalescing, abort/rate/retry             | transporte/pager/budget existentes + regressões      | Sem timeout/guard relaxado                      |
| Server-only e redaction                                                       | imports/runtime/type boundary + orders/query/retry   | Gate integral obrigatório                       |

Revalidação pública oficial em 2026-10-20: [Order 2025-03](https://nuvemshop.dev/en-US/api/resources/2025-03/order), [Fulfillment Order](https://nuvemshop.dev/en-US/api/resources/2025-03/fulfillment-order), [Metafields](https://nuvemshop.dev/en-US/api/resources/2025-03/metafields) e [Invoice Management](https://nuvemshop.dev/en-US/apps/erp-guide/orders/invoices). Nenhuma mudança material demonstrada reabriu a adjudicação. A revalidação final de A encerrou A-01/P2 como REMEDIATED e concluiu **CONTRACT PASS**.

## C — Subagents reais

| Papel                             | Identidade do worker nesta execução                                          | Entrega                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A — Contract & Baseline           | `/root/a_contract_baseline`                                                  | Matriz de 25 cláusulas e descoberta A-01/P2; somente leitura                    |
| B — Preservation & Reconciliation | `/root/b_preservation`                                                       | PASS dos 14 hashes, recuperação do fingerprint e auditoria de original/worktree |
| C — RED / Test Specialist         | `/root/c_red_audit`                                                          | Matriz de 20 cenários; RED real e cobertura explícita de value vazio            |
| D — Implementation / GREEN        | `/root/d_implementation`                                                     | Correção mínima após RED; não aprova o próprio código                           |
| E — Independent Review            | `/root/e_independent_review` (revisão solicitada após todos os gates locais) | Contexto independente, diff completo, probes próprios e hashes finais           |

O harness fornece as identidades dos workers, mas não expõe identificadores concretos de modelo aos workers herdados. Nenhum modelo foi inventado e nenhum override foi usado. Os papéis são agentes reais, não simulação de revisão pelo orquestrador.

## D — Implementation

As APIs e os 13 arquivos técnicos históricos foram recuperados, sem reimplementar o recurso. `getOrder` normaliza Order e enriquece FO/fiscal bounded conforme flags; `listOrders` retorna uma página explícita, com q apenas para descoberta. O limite superior permanece 34 requests lógicos por getOrder, cada qual subordinado ao transporte/rate budget NUV-03/04/05/06 existente. Não há cache de respostas além do coalescing da leitura em andamento.

Diferenças técnicas em relação ao snapshot original: `schemas/order.ts` força incompletude de nfe/list moderno; `types.ts` documenta o hint e a ausência projetada; `schemas.test.ts` adiciona a matriz fiscal e atualiza expectativas antigas incompatíveis sem enfraquecer a validação; `orders.test.ts` cobre explicitamente value contendo array vazio. O restante dos bytes técnicos é preservado. Nenhum recurso NUV-12/13/23/24/25 ou frontend/consumer foi implementado.

## E — RED

`npm run test -- tests/unit/modules/nuvemshop/schemas.test.ts -t 'NUV-11 LEGACY-B modern-only fiscal completeness'`: exit 1, **8 falhas reais e 3 controles PASS**, 448 casos não selecionados pelo filtro. Falhas comprovam `confirmed` indevido com 0/1/2 refs e ausência projetada null, por default/hint confirmed; hint incomplete é o controle válido. Log `c-red.log` e resultado JSON preservados externamente. Não há skip novo na suite integral e nenhum teste que sempre passou foi chamado de RED.

O teste de getOrder com `value='[]'` é cobertura positiva do comportamento já atendido pelo recurso, cujo fonte permaneceu inalterado; não é RED nem comprovação de execução contra o parser anterior. As falhas e remediações da execução de 2026-10-19 permanecem somente históricas.

## F — GREEN / REFACTOR

D removeu a resolução que permitia confirmed e fixou incomplete somente após validação; not_consulted, referências, associação e erros permaneceram preservados. Comentários esclarecem o hint sem quebrar o tipo público. GREEN completo de schemas: **459/459 PASS**, exit 0. Nenhuma refatoração extra foi necessária.

| Situação fiscal                                  | Saída obrigatória e verificada pelos testes                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Uma ou muitas referências modernas               | incomplete com todas as refs e associação opcional exata                       |
| Resposta moderna [] ou value='[]'                | incomplete, items vazios; nenhuma prova de ausência global                     |
| Leitura não realizada                            | not_consulted                                                                  |
| JSON/elemento/null value raw presente malformado | NuvemshopProtocolError seguro                                                  |
| Null em OrderParseOptions.invoiceValue           | Ausência projetada consultada, incomplete; distinto de raw value null inválido |
| Limite/paginação insuficiente                    | incomplete ou erro tipado; nunca confirmed fictício                            |
| Hint confirmed no parser moderno                 | Preserva compatibilidade do input, saída incomplete                            |

## G — Validation

Ambiente isolado sem .env, configuração sintética somente no processo; Node 22.23.1/npm 10.9.8. Dependências físicas existentes foram copiadas sem reinstalar nem alterar lockfile; versões críticas instaladas conferidas contra o lock. Não houve API autenticada Nuvemshop nem necessidade de Docker/serviço externo para os gates locais.

**PASS dos gates locais no fingerprint técnico `08f7247e09b5902b6791c83711f224d4d85077956a8a9659aa2b76d091023fe3`.** Os 13 hashes técnicos antes/depois de check/build coincidem. Check inclui lint, runtime, tokens, formatação, typecheck, 6 checks runtime + 135 token checks e Vitest integral. Nenhuma falha/skip/cancelamento no gate completo; +12 testes em relação aos 2.525 históricos (11 schemas e 1 Order), baseline novo apenas documental.

| Comando                                                                                                                                                          | Resultado                                                                                                    | SHA-256 do log externo                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `npm run test -- tests/unit/modules/nuvemshop/schemas.test.ts -t NUV-11 LEGACY-B modern-only fiscal completeness`                                                | RED: 8 FAIL / 3 controles PASS, filtro exclui 448; exit 1; runner 27.31 s                                    | `1e6500e9ae79cf5fc2125bea04bfbc1336bfb623cce62d87765d9944a3280c2d` |
| `npm run test -- tests/unit/modules/nuvemshop/orders.test.ts -t keeps a modern value containing an empty JSON array incomplete without inferring fiscal absence` | Controle API value vazio: 1/1 PASS; exit 0; runner 2.81 s                                                    | `d5b31bbf3d54ab8ba3c9cee253dcf432c3ba0b7d34718dad40f92ac0e2042450` |
| `npm run test -- tests/unit/modules/nuvemshop/schemas.test.ts`                                                                                                   | Schemas: 459/459 PASS; exit 0; runner 2.54 s                                                                 | `aa8dc23180a155fa0fb24f5fbb9a884c36af2ac172a1348a0073a63b9e87edad` |
| `npm run test -- tests/unit/modules/nuvemshop/orders.test.ts`                                                                                                    | Orders: 134/134 PASS; exit 0; runner 3.64 s                                                                  | `2ca73bc8867f51d19888eca43f161eb6039bcb26b0e4800ab425fc4565581931` |
| `npm run test -- tests/unit/modules/nuvemshop/orders.test.ts tests/unit/modules/nuvemshop/order-query.test.ts`                                                   | Orders + queries: 154/154 PASS; exit 0; runner 3.73 s                                                        | `5f6078310c44598ac9157bb05f9530ee367a972134d3e369319ab77f9cbe3fc5` |
| `npm run check`                                                                                                                                                  | Check integral: 2.537/2.537, 34/34 arquivos; 141 tooling checks; boundaries 595/595; exit 0; runner 607.28 s | `66e9d49ac3962f214c8a368cce227b1f2e71224eed76ae3b7758c34095d9d5ff` |
| `npm run build`                                                                                                                                                  | Build Next 16.4.1: compilação, TypeScript e 8/8 páginas PASS; exit 0; runner 32.41 s                         | `5357a64a6c5fd91953d516b96c46147470b8aa214e24caec808ab5c5f0566a21` |

O runner mede o tempo externo de cada subprocesso; o Vitest reporta sua própria duração (631,02 s no check), sem usar esse valor como benchmark. Build: compilação 12,3 s, TypeScript 9,2 s, 8 páginas em 769 ms; avisos existentes de partialPrefetching, cache frio e ausência intencional de token Sentry, sem release/upload remoto. Nenhum timeout/guard foi alterado. `git diff --check` PASS; originais/snapshot e arquivos protegidos PASS.

Hashes do candidato técnico final, excluindo somente este relatório:

| Arquivo                                            | SHA-256                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `src/modules/nuvemshop/server/index.ts`            | `cc260b95f7f769c2dd216f2ddcdd83079bda6d583985a39cba4b93da777fc99b` |
| `src/modules/nuvemshop/server/order-query.ts`      | `f32a3d3e8a411f5d20e41117f0e4e17128e92afa34ccc86c9a81c9e56db1a83a` |
| `src/modules/nuvemshop/server/orders.ts`           | `01d05ffe2d937f7b4fa934f1296cbf4f218cb89dd3fa9b992f882b395a4338af` |
| `src/modules/nuvemshop/server/pagination.ts`       | `b3ad9c016ab916332673b3eab9ee0213ae93eff1f70362eea22cc710b02f6988` |
| `src/modules/nuvemshop/server/rate-budget.ts`      | `51a1ce5d5bfeb182056c17aa4326e50c7196eca238569b6294eb72e9303915c4` |
| `src/modules/nuvemshop/server/request.ts`          | `fe83bbf14841ab8e18b4a4cc0afe0adfd331976aaf62319ad7d99bb5ebb4de58` |
| `src/modules/nuvemshop/server/schemas/order.ts`    | `1112689e4e2267cca0dbcc9d0708b56211428119b7654aafcf0f8829c81e20b0` |
| `src/modules/nuvemshop/server/types.ts`            | `6bf7797f2cb857a96692f0540148e32e60d0a373c5c157e5dd6640bd6bc84fc8` |
| `tests/unit/modules/nuvemshop/order-query.test.ts` | `94ecfd51b218b5ade14bfea4826d30fd57ad76b43183abb2a8e5e7cd8a190a70` |
| `tests/unit/modules/nuvemshop/orders.test.ts`      | `586716f92458de2c5a7ac1b7857a51d2ca6b03634c37b137fc665b0e4741d096` |
| `tests/unit/modules/nuvemshop/pagination.test.ts`  | `3dcb622cd29d21b6e2aa0de21ce9e562afdc5be05def413cbfd60af955a2be4b` |
| `tests/unit/modules/nuvemshop/retry.test.ts`       | `257d97719ef737644d1d6b2e24f20bbc3db84c6cb42f070c94bece649ff7dfbe` |
| `tests/unit/modules/nuvemshop/schemas.test.ts`     | `8007322c4ab788ef543c6a57c30b44bfc7c43a1578c323cff2ecf7593a17beb4` |

Manifestos completos, resultados JSON, logs e relatórios A–E permanecem no conjunto externo sanitizado `nuv-11-resume-20261020`. Logs não são versionados; seus hashes permitem conferir o conjunto preservado.

## H — Independent Review

**APPROVE TÉCNICO LOCAL INDEPENDENTE** de `/root/e_independent_review`, em contexto independente, após os gates encerrados. **P0=0, P1=0, P2=0, P3=0 abertos**. E examinou todo o diff/código/testes/normativos, recalculou os 13 hashes e logs, validou original/snapshot/protegidos e confirmou o fingerprint final. A-01/C-01 P2 foi independentemente verificado como REMEDIATED.

E executou **14/14 probes próprios PASS**, exit 0, usando fonte real e somente fetch substituído: IDs/offsets/imagens, conflito/duplicação de membership, destinos parciais/null, retenção de IDs/timestamps, limite de 25 detalhes com 26 remessas, parser moderno, malformed fiscal em página posterior, q Unicode/apóstrofo/coalescing, Link duplamente codificado, input/AbortSignal hostil e fence 429. O arquivo temporário foi preservado externamente e removido da candidata. Log `e-probes.log` SHA-256 `b64571265205f9f45c9f43304ba8f556c12ee83f021ecfda3d34decf97486bcd`.

E-DOC-01/P3 identificou somente a cronologia excessivamente afirmada do controle API value vazio; a frase foi corrigida e lida por E. Não foi necessário novo RED ou correção técnica após o gate integral. Alterações documentais posteriores recebem Prettier/diff check e suplemento independente dos bytes, mantendo o fingerprint técnico.

Parecer principal externo `e-review.md`, SHA-256 `893ca282df7253bd7734cceeef459b1be7b0c5da0dd11a3b5f3260e22f3aba8b`; `e-integrity-verification.json` guarda os hashes recalculados. O suplemento E registra a árvore documental final antes de cada commit; não se tenta inserir o hash autorreferencial deste documento no próprio documento.

## I — Security & Privacy

- Trust boundary: somente inputs caller e respostas provider sintéticas entram nos parsers/transport; segredos runtime, PII mínima e integridade de IDs/tempos são os ativos. Nenhuma fixture contém cliente/pedido real.
- Endereço/recipient, contactEmail, referências fiscais e pagamento mínimo permanecem somente no servidor, sem logs/erros públicos/analytics/Sentry/shared response cache/tipos cliente/webhook evidence.
- Imagens, tracking e documentos são referências; nenhuma URL externa é alvo de fetch/proxy/download/redirect. Host/versão/store/rota/filtros e navegação são fechados pelo transporte existente.
- Metadados de q carregam identidade opaca, sem email/texto de busca; coalescing considera filtros e não persiste respostas.
- `/rastreio` continua sem endereço/NF-e/email/itens/valores/pagamento; autorização e disclosure ficam nos consumers futuros.
- Audit atual completo: **5 high, 0 critical**, na cadeia dev `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces@3.0.3`; [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) documenta DoS por padrões profundamente aninhados. Audit `--omit=dev`: **0 vulnerabilidades, exit 0**. A cadeia é tooling existente e não é chamada pelos caminhos getOrder/listOrders; não foi demonstrado impacto direto material novo na NUV-11. O risco de tooling permanece separado para acompanhamento de supply-chain antes de release, sem declarar o repositório globalmente livre de risco. Nenhuma dependência foi modificada/remediada automaticamente.
- Scan local limitado de padrões de credenciais nos 14 paths: sem achados; scan de 30 arquivos do bundle cliente: zero marcadores de segredo/contrato de endereço provisório. O scan local não substitui Gitleaks de CI remoto. B revalidou original/snapshot/protegidos e escopo final: **PRESERVATION PASS**.
- `NUV-HR-02 OPEN`. Capabilities/scopes reais e integração operacional não foram provados. `DEFERRED_PROVIDER_EVIDENCE_REQUIRED / UNVERIFIED / DEFERRED` permanece para legado fiscal, sem namespace/key/pareamento/precedência inferidos.

## J — GitHub e vínculo ao HEAD

- **Commit técnico publicado:** `9c37b64e3f888df9d60ee6ff5727ac0dc48dd892`, `feat(nuvemshop): read normalized orders`. Push normal de `codex/nuv-11-orders-resume`, sem force. Árvore `66ef3487aa6bfa4a6346922546cfa54812174fd3`, idêntica à conferida pelo suplemento E pré-commit local.
- **PR técnica única:** [#46 — feat(nuvemshop): NUV-11 normalized Order get/list](https://github.com/jlima004/indicio-cult/pull/46), base main. A PR #45 não é repetida no diff. Original dirty preservado em sua branch; nenhuma PR técnica concorrente encontrada.
- **Fotografia remota verificada após abertura, em 2026-10-20:** OPEN / DRAFT, HEAD `9c37b64e3f888df9d60ee6ff5727ac0dc48dd892`; [CI 39421526670](https://github.com/jlima004/indicio-cult/actions/runs/39421526670) **IN_PROGRESS**, sem conclusão observada; nenhum comentário/review remoto nesse instante. Isso não é CI PASS nem aprovação remota. `db-types` não é executado no evento PR por política existente, nunca contar como PASS.
- **Revisão local dos bytes publicados:** parecer principal E e suplemento `e-precommit-local.md` PASS, SHA-256 `f997ec2bbe150cb77f497e45dcc54d2c73e9d0b4f284fb70026ddc61c9f9bc7c`. Após esse commit só este relatório recebeu os fatos concretos de SHA/URL/status; os 13 técnicos conservam o fingerprint integralmente testado/revisado. O suplemento documental final confirma a nova árvore antes do commit de recibo e da promoção.
- **Solicitação remota única:** após o suplemento documental e push final, marcar Draft como Ready dispara Codex Code Review pela integração já observada na PR #45. Não enviar comentário manual duplicado. Nesta fotografia pré-promoção, Code Review remoto é **NOT REQUESTED**; depois, seu estado efetivo e o CI do HEAD final serão registrados no corpo da PR/recibo externo sem antecipar PASS.

O **Final reviewed candidate** técnico é vinculado ao SHA `9c37b64e3f888df9d60ee6ff5727ac0dc48dd892` e aos 13 hashes da seção G. O **Published PR HEAD** final inclui apenas o recibo documental posterior, sem mudança técnica. Seu SHA/árvore e hash deste relatório ficam no recibo externo final e no corpo da PR após o push; `git rev-parse HEAD` e o headRefOid da PR devem coincidir. O commit que contém este relatório incorpora seus próprios bytes, evitando autorreferência impossível do SHA dentro do arquivo. A fotografia Draft/CI acima é histórica e não substitui o estado GitHub efetivo depois da promoção.

## K — Decision

**NUV-11: LOCAL_PASS / READY_FOR_HUMAN_REVIEW quanto ao aceite técnico local.** A PR somente é promovida de Draft para Ready após o suplemento documental final E e push normal do recibo no mesmo fingerprint. CONTRACT PASS, PRESERVATION PASS, RED/GREEN PASS, CHECK PASS, BUILD PASS e parecer técnico adversarial PASS. Não há P0/P1/P2 material aberto. A decisão técnica não antecipa estados de GitHub: CI do HEAD publicado permanece pendente de conclusão observada; Codex será solicitado pelo gatilho único da promoção. O corpo da PR e o recibo externo registram os resultados posteriores realmente observados.

Nenhum merge/deploy autorizado nesta execução. Mesmo com gates positivos, **HUMAN MERGE REQUIRED**. Não se declara completude fiscal global, HR-02 CLOSED, NUV-23/25 COMPLETE ou integração operacional comprovada.

## NUV-11-R1 — Codex Review Remediation

Data: 2026-10-20 (America/Sao_Paulo).
Estado local: **LOCAL_PASS / REMEDIATION_PUBLISHED** somente depois do push deste commit. Esta seção não antecipa CI nem Code Review do novo HEAD.

### Baseline

- Checkout técnico: `/home/jlima/.codex/worktrees/nuv-11-orders-resume/indicioCult`, branch `codex/nuv-11-orders-resume`.
- HEAD inicial, igual a `origin/codex/nuv-11-orders-resume` e ao head da PR #46 antes da R1: `b1ef66224fbad7174af4e39046c68d75512893e4`.
- Base: `origin/main` `966b31b70a96b4051312d8356c05b3e7ebf5239a`.
- `git status --porcelain=v1` antes da primeira edição: vazio. Não havia alteração local posterior à publicação para snapshot.
- Checkout original `/home/jlima/Projetos/indicioCult` permanece em `main` `a11ff4f0a453f33d60f922f41cc600c546a67b5f`, com sujeira pré-existente não relacionada. Não foi lido para copiar patch, nem alterado, commitado ou limpo.
- SPEC, PLAN, TODO e `NUV-11-LEGACY-B.md` não foram modificados. `invoices.completeness` continua `incomplete`.

### Achados

| ID    | Thread                                                                  | Causa-raiz independente                                                                                                                                                                                                                                                                                                                                                               |
| ----- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-01 | https://github.com/jlima004/indicio-cult/pull/46#discussion_r4324906600 | `readOrderFilter` devolvia `undefined` com query ausente ou sem `q`/`orderId` antes de exigir GET. `prepareNuvemshopAttempt` então buscava `GET /metafields/orders` sem `owner_id`, `namespace`, `key` ou `fields`. `pagination.ts` repreparava a mesma rota só com `{ page, perPage }`, então tornar o filtro obrigatório sem reanexar o `orderId` já validado quebraria a página 2. |
| P2-02 | https://github.com/jlima004/indicio-cult/pull/46#discussion_r4324906623 | `retainedTime` falhava quando o timestamp opcional anterior existia e a projeção nova omitia o campo (`current === undefined`). `retainedHistory` ainda devolvia a coleção nova, então afrouxar só o matcher perderia o valor. `null` explícito era tratado como curinga.                                                                                                             |

### Subagents

| Papel         | Agente                                 | Modelo selecionado e aceito pelo runtime | Resultado                                                                                                                                                                                                                                    |
| ------------- | -------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — contratos | `818ae722-7163-46b4-8900-8e79488fd0e5` | Grok 4.6 High Fast                       | Os dois P2 são reproduzíveis. Paginação precisa reanexar `orderId`. Retenção tem de ser separada do matching. `null` explícito contra timestamp conhecido falha fechado.                                                                     |
| B — RED       | `6b06670c-cb98-4255-a7cc-57664354fe9e` | Composer 2.5 Fast                        | 17 falhas reais / 577 controles verdes no conjunto de quatro arquivos (594 testes), antes de qualquer correção de `src/`.                                                                                                                    |
| C — GREEN     | `4f9c82f3-ae4e-49c6-9d97-99d572fcb4b8` | Grok 4.6 High Fast                       | Diff mínimo em `order-query.ts`, `pagination.ts` e `orders.ts`. Não editou os testes RED.                                                                                                                                                    |
| D — revisão   | `28fde612-3f66-4360-b992-5b3bb2f2579f` | Grok 4.6 High Fast                       | Parecer independente PASS. 15/15 probes próprios. P0=0, P1=0, P2=0. P3 não bloqueante: curinga legado de `happenedAt` nulo no tracking, retorno fiscal morto e rejeição de chave extra em `readPagination`. O arquivo de probe foi removido. |

O orquestrador aplicou Prettier apenas nos três testes que o `format:check` rejeitou. Não houve merge nem deploy.

### RED

Comando, antes da correção: `npm run test -- tests/unit/modules/nuvemshop/order-query.test.ts tests/unit/modules/nuvemshop/orders.test.ts tests/unit/modules/nuvemshop/pagination.test.ts tests/unit/modules/nuvemshop/request.test.ts`.

Falhas materiais:

- GET fiscal sem query, com `{}`, só com página, ou com `orderId: undefined`: a promise resolvia e `fetch` era chamado.
- O mesmo GET no cliente de `request.test.ts` lia configuração e fazia fetch.
- POST/HEAD fiscais sem query não eram `ValidationError` antes do fetch.
- Metadado fiscal sem `filter` era aceito pelo pager (`nextPage: 2`).
- Quatro omissões de timestamp opcional, omissão conjunta e `happenedAt` preservado junto de `createdAt`: `NuvemshopProtocolError`.
- `null` conhecido seguido de timestamp posterior: sucesso indevido.
- `null` conhecido omitido depois: sucesso sem reter `createdAt: null`.

Controles que já passavam: filtro NF-e exato, página 2 com Link íntegro, Links mutados, orders sem `q`, paginação de fulfillment, coalescing do mesmo `orderId` e separação de `orderId`s diferentes, snapshot vazio como `ProtocolError`, timestamps idênticos e contraditórios.

### GREEN

- Filtro fiscal obrigatório antes de qualquer `return undefined`, só para `['metafields','orders']`.
- Pager rejeita metadado fiscal sem identidade `order-nfe` e revalida `{ page, perPage, orderId }` já conhecido. `orders-q` não devolve o texto de `q`.
- Identidade de evento não usa timestamps opcionais. `reconcileTime` retém omissão, distingue `null` de ausência e falha em conflito, inclusive `null` contra datetime. Evento desaparecido continua `ProtocolError`. `happenedAt` canônico não é reescrito.

GREEN do mesmo conjunto de quatro arquivos: 594/594. `retry.test.ts` + `schemas.test.ts`: 645/645.

### Gates

| Gate               | Resultado                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check`    | PASS, exit 0. Prettier limpo. `tsc` limpo. ESLint 0 erros; 2 warnings pré-existentes em `boundary.test.ts`, fora do diff.                                                                                                                                                                                                                                                            |
| Vitest integral    | 34 arquivos, 2564/2564 PASS. O HEAD `b1ef662` tinha 2537. O acréscimo são os casos R1; o único caso removido era o GET fiscal sem filtro que a suíte tratava como rota válida, substituído por rejeição.                                                                                                                                                                             |
| `npm run build`    | A primeira execução sem `.env` falhou ao coletar `/robots.txt` por `NEXT_PUBLIC_*` ausentes neste worktree. Nova execução só com valores públicos sintéticos (`http://localhost:3000`, `https://example.supabase.co`, chave publishable sintética): exit 0, 8/8 páginas. O hook do Sentry registrou 401 ao atualizar o release `dev` e não falhou o build. Nenhum segredo foi usado. |
| `git diff --check` | Limpo.                                                                                                                                                                                                                                                                                                                                                                               |

### Revisão adversarial

PASS independente. P0=0, P1=0, P2=0. Probes próprios cobriram GET fiscal sem filtro, chave `owner_id` hostil, Link íntegro e `owner_id` alterado, metadado sem identidade, página 2 reemitida com o filtro fechado, retenção dos três timestamps de tracking, conflito de `raw`, `null` retido quando omitido, `null` seguido de datetime e desaparecimento de evento.

### Hashes finais dos arquivos técnicos

| Arquivo                                            | SHA-256                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `src/modules/nuvemshop/server/order-query.ts`      | `51665a6b358f24b9f74076a7b7d64f68d3387c07557f6bfed44176b3ffd264ff` |
| `src/modules/nuvemshop/server/orders.ts`           | `ee67f2714b55c4a051c11324199a09a75b4cbad95bb829331c5871c94b943e0a` |
| `src/modules/nuvemshop/server/pagination.ts`       | `54867cd129bdff3ea95f9c3b30dc3cefe8137921e39e9369121fb9270848f9d3` |
| `tests/unit/modules/nuvemshop/order-query.test.ts` | `92cf331d15e84ef92af5149e2de57812f4cfcecc00f843f0bbfb26459df86d8b` |
| `tests/unit/modules/nuvemshop/orders.test.ts`      | `6b5b5fb5ad1d18449df6e4e97f17e81353301d4cc78c136ed1f79ad8b748f5fe` |
| `tests/unit/modules/nuvemshop/pagination.test.ts`  | `51a9be5a528e10bf3242970a3047e096fd052d181161ee6675bf8cd88117cc31` |
| `tests/unit/modules/nuvemshop/request.test.ts`     | `9ffa984414d70d655a8a676d5352ee84c2f0fd9f8c492cfa50bae919e6491e83` |

O SHA do commit que introduz esta seção é registrado no recibo imediatamente posterior, para não reescrever este commit. CI remoto e Codex Review do novo HEAD ficam pendentes até observação após o push. Threads do Codex não são marcadas resolvidas por este recibo.

### Recibo do commit

- Commit de remediação: `27ae1a6e1172d60ad4225af7797c8c69f49419a5`, mensagem `fix(nuvemshop): remediate NUV-11 order review findings`.
- Os sete hashes técnicos acima pertencem a esse commit. Este recibo não altera código nem testes.
