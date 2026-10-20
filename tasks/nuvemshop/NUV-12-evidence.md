# NUV-12 — auditoria contratual e bloqueio de cobertura

Data: 2026-10-20. Registro local de execução; não altera a SPEC, o PLAN, o TODO ou a NUV-11. Nenhum aceite de implementação, release, merge ou deploy é concedido por este documento.

## A — Resultado executivo

**BLOCKED — Gate A: cobertura multi-page não reconciliada.** O contrato exige ausência comprovada e exclusão de ambiguidades antes do retorno. As fontes e primitivas atuais permitem navegar pelos resultados de `q`, mas não demonstram cobertura de uma coleção filtrada mutável entre requests. O caso positivo geral T03 permanece sem critério de prova suportado.

Não foi demonstrada contradição interna da SPEC. A incompatibilidade é entre exigir o aceite positivo multi-page usando somente as observações atuais e, simultaneamente, proibir que essas observações sejam promovidas a uma prova que não fornecem. Se o aceite exigir essa promoção, aplica-se `BLOCKED_SPEC_CONTRADICTION`; não se modifica silenciosamente a norma para liberar o gate.

Isso não implica que toda resposta única seja insuficiente: primeira página cujo corpo inteiro corresponde a um total válido/coerente, dentro de `perPage`, sem navegação contraditória e sem ambiguidade pode ser admissível sob a semântica normal do endpoint. Não se exige snapshot perpétuo ou linearizabilidade nova. Essa possibilidade não prova o caso geral com resultados distribuídos entre requests.

## B — Baseline e proteção do ambiente

| Item                                    | Evidência observada                                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Checkout original                       | `/home/jlima/Projetos/indicioCult`, branch `main`, status inicial limpo                                    |
| HEAD inicial e `origin/main` após fetch | `6bd549e8013abc5f611f4361746c826737db21ac`                                                                 |
| Dependências                            | NUV-06 `c8940d4` e NUV-11 `6656ea2` são ancestrais de `origin/main`                                        |
| PR #48                                  | MERGED, merge commit `6bd549e8013abc5f611f4361746c826737db21ac`, confirmado pelo GitHub                    |
| Trabalho NUV-12 anterior                | Nenhuma branch local/remota com `nuv-12`; nenhuma PR com head `codex/nuv-12-order-number`                  |
| Worktree isolada                        | `/home/jlima/.codex/worktrees/nuv-12-order-number/indicioCult`                                             |
| Branch criada                           | `codex/nuv-12-order-number`, a partir de `origin/main`                                                     |
| HEAD final de código                    | Mesmo baseline; nenhum commit criado                                                                       |
| Ambiente dos controles                  | Node `v22.23.1`, npm `10.9.8`; dependências instaladas existentes, sem instalação ou alteração de lockfile |

As worktrees existentes foram inspecionadas e preservadas. A worktree nova foi criada/anexada pelo mecanismo do app; o checkout original permaneceu em `main`. Nenhum reset, clean, stash, descarte, amend, rebase ou atualização forçada foi executado.

## C — Subagents reais

Configurações abaixo são comprovadas pelos argumentos dos spawns do harness; não se afirma identificação independente do modelo backend. O harness não oferece troca ou confirmação independente do modelo deste orquestrador, portanto a exigência de identidade do orquestrador não foi atestada.

| Papel / tarefa real          | Configuração solicitada ao harness           | Execução e resultado                                                                                            |
| ---------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| A — `/root/contract_a`       | `gpt-6.1-sol`, `high`                        | Auditoria de SPEC/contratos/fontes; Gate A BLOCKED; nenhuma autoria                                             |
| B — `/root/red_b`            | `gpt-6-luna`, `xhigh`                        | Desenho fetch-only e matriz T01–T16; não escreveu/executou RED antes de reconciliar Gate A                      |
| C — `/root/implementation_c` | `gpt-6.1-sol`, `medium`                      | Avaliou viabilidade; retirou proposta de certificado por contagem/IDs após contraexemplo; nenhum código escrito |
| D — `/root/adversarial_d`    | `gpt-6.1-sol`, `high`, contexto independente | Revisão independente do bloqueio contratual; parecer final registrado abaixo                                    |

O papel D não participou da autoria de implementação; não existe implementação candidata para revisão final de código. Nenhum subagent reutilizou aprovação histórica como aceite da NUV-12.

## D — Contrato, matriz e limites

Fontes oficiais consultadas em 2026-10-20: [Order API 2025-03](https://nuvemshop.dev/en-US/api/resources/2025-03/order) e [Introdução — paginação](https://tiendanube.github.io/api-documentation/intro#pagination). A referência histórica de Order aponta para a primeira fonte.

- **Fatos documentados pelo provedor:** `id` difere de `number`; `q` busca número ou texto em nome/e-mail; `number` é único/sequencial; consulta tem teto de 10.000 resultados; paginação usa `page`, `per_page`, contagem e Links, com até 200 itens por página.
- **Regra normativa do projeto:** comparação decimal canônica exata; busca server-only; cobertura necessária antes de ausência/retorno; ambiguidade/incompletude não são `null`.
- **Política defensiva possível:** limites globais de lookup, rejeição de inconsistências, IDs duplicados e cobertura insuficiente. Os limites precisam de justificativa explícita e testes.
- **Hipótese não comprovada:** contagem constante, IDs distintos e navegação coerente certificam que todos os candidatos foram vistos. O contraexemplo abaixo refuta essa inferência.

Não se encontrou nas fontes consultadas garantia de estabilidade de membership entre páginas ou outro certificado que elimine o contraexemplo. Isso é uma lacuna da evidência disponível; não se afirma que nenhuma fonte adicional do provedor possa existir.

| Requisito                               | Código atual                                            | Lacuna / teste exigido                                                                 |
| --------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Superfície pública server-only          | `orders.ts:1,382`; `index.ts:1,5`                       | Método/export ausentes; testar export e boundary após Gate A                           |
| Validar antes de I/O                    | `orders.ts:51–86`                                       | Reutilizar leitura de own data descriptors; T12 getters/proxies/tipos/zero fetch       |
| Decimal exato                           | `schemas/ids.ts:34–53`; `types.ts:9–10`                 | Reutilizar `readOrderNumber`, até 40 caracteres; T10/T11/overflow/unsafe numbers       |
| Descoberta q e comparação por number    | `orders.ts:382–402`; `order-query.ts`                   | T02: falso positivo/ID igual não é match; nenhum request não filtrado                  |
| Parser de Order único                   | `orders.ts:400`                                         | Reutilizar `parseOrderList`; não chamar Product/getOrder/FO/fiscal para candidatos     |
| Navegação posterior/vazio intermediário | `pagination.ts:214–219`                                 | T03/T04 seguem next; retorno final exige prova suficiente                              |
| Ausência versus incompletude            | `pagination.ts:234–240`; SPEC Orders; TODO NUV-12       | T05/T06; cobertura multi-page continua sem certificado                                 |
| Match sem excluir ambiguidade           | `errors.ts:207–210`                                     | T07/T08; não escolher primeiro match; dois IDs exatos falham fechado                   |
| Orçamento finito agregado               | `rate-budget.ts:27–30,489,610`                          | T09: deadline/páginas/registros/dispatches globais; não herdar teto FO                 |
| Links íntegros                          | `order-query.ts:140–151`; pager                         | T13: host/rota/store/q alterados falham antes de novo egress                           |
| Metadata inconsistente                  | `pagination.test.ts:107–129`                            | T14; pager genérico admite contagem/navegação independentes, sem claim de cobertura    |
| Erros/cancelamento                      | `errors.ts`; `rate-budget.ts`                           | T15: preservar Network/Rate/Auth/Protocol; insuficiência de prova usa LookupIncomplete |
| Privacidade                             | identidade opaca de `order-query.ts`; erros sanitizados | T16: nenhum q/PII/token/payload em logs, erros, analytics, Sentry/cache compartilhado  |

### Contraexemplo de ausência falsa

O exemplo é sintético e lógico, não uma chamada observada à Nuvemshop:

1. `q` é o número de T. Resultado filtrado inicial `[A, B, T, C]`, `perPage=2`, contagem 4. Página 1 retorna `[A, B]`, next=2, last=2.
2. Entre requests, A deixa de corresponder ao texto em nome/e-mail e D passa a corresponder. Resultado passa a `[B, T, C, D]`, contagem ainda 4.
3. Página 2 retorna `[C, D]`, prev=1, last=2, sem next.
4. Foram observados quatro IDs distintos e todos os Links consecutivos, com contagem constante. T permaneceu presente durante toda a consulta e nunca foi lido.

Um algoritmo que retorne `null` por essa combinação declara ausência falsa. A mera projeção de `last` no pager não resolveria a lacuna. Repetir scans finitos também não cria uma garantia de estabilidade. A unicidade documentada de `number` não dispensa os controles defensivos de cobertura/ambiguidade exigidos pelo prompt.

### Limites existentes e regressões

`Page` expõe somente itens/posição/contagem/next/prev; não expõe certificado de completude. O pager valida `last` internamente e o descarta. Seu comentário em `pagination.ts:234` adverte contra usar contagem e ausência de Links como prova de cobertura de lista mutável.

NUV-05 mantém GET/HEAD em até duas tentativas, quatro segundos por tentativa, nove segundos por request lógico, espaçamento mínimo de 500 ms e concorrência local até dois por loja/app. Nove segundos não é um deadline global já disponível para toda lookup. Cinquenta páginas de 200 derivam do teto de 10.000; esse cálculo não constitui prova de cobertura nem política global completa de tempo/requests.

Input inválido deve gerar ValidationError; resposta estrutural inválida, ProtocolError; 429, RateLimitError; rede/abort, NetworkError; falta de prova, LookupIncompleteError. As fontes consultadas não fornecem assinatura segura suficiente para reclassificar qualquer 400/422 como teto de consulta; não se deve inspecionar texto sensível ou remapear falhas indiscriminadamente.

NUV-11 permanece intacta, inclusive fiscal modern-only `incomplete`, legado diferido, endereço/fulfillments e gates operacionais. O lookup futuro deve compor `listOrders` para evitar enrichment fiscal/fulfillment desnecessário de candidatos. Nenhuma mudança shared tem necessidade comprovada: adicionar metadata de navegação não acrescentaria estabilidade.

## E — RED

**NOT RUN — Gate A não reconciliado.** B produziu a matriz adversarial fetch-only T01–T16 e analisou o contraexemplo; não escreveu uma fixture que inventa cobertura. Não se chama de RED a mera ausência do símbolo `findOrderByNumber`, nem se chama o contraexemplo lógico de execução do helper inexistente.

T01/T05 podem receber fixtures de resposta única sob critério suficiente explicitamente definido. T03 geral, com conclusão dependente de mais de uma resposta, permanece sem prova disponível. T02/T04/T06–T16 continuam necessários quando a implementação for liberada; nenhum assert foi reduzido, nenhum teste foi removido ou marcado skip.

## F — GREEN / implementação

**NOT STARTED.** Não há método, export, parser, transporte ou teste novo. Um método que sempre lança LookupIncompleteError não seria apresentado como conclusão da NUV-12 ou como aprovação dos casos positivos obrigatórios.

O escopo mínimo após reconciliação continua: `orders.ts`, `index.ts`, `order-lookup.test.ts` e evidência. Não foram autorizados implicitamente NUV-13, consumer/identity/OTP, índice persistente ou mudanças de shared boundary.

## G — Revisão adversarial independente

**Gate A BLOCKED confirmado independentemente por D.** A revisão é sobre a validade do bloqueio contratual; não é aprovação final de código NUV-12.

| Finding                                                     | Severidade / estado     | Resultado                                                                                                     |
| ----------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| D-A01 — prova de cobertura multi-page ausente               | P2 material OPEN        | Impede aceite completo T03; count/IDs/Links coerentes não excluem omissão                                     |
| D-A02 — parcial/falha fechada não equivale a GREEN integral | P2 se usado como aceite | Risco evitado: não há implementação parcial apresentada como completa                                         |
| D-A03 — bloqueio excessivo de toda resposta única           | P3 RESOLVED             | Relatório distingue casos de uma resposta; não impõe snapshot absoluto nem afirma contradição interna da SPEC |

Nenhum P0/P1 foi identificado na auditoria contratual. Há um P2 material de prova aberto; o Gate E de revisão final de código não foi executado e não recebeu PASS.

D exercitou duas respostas com `listOrders`, transporte, budget, parser lossless/schema e pager reais, substituindo apenas `fetch` por fixtures sintéticas. A sequência do contraexemplo é admitida pelo stack. Um controle adicional com quatro candidatos e um match, todos presentes na primeira resposta com total 4 e `perPage=200`, confirma a representação de um caso limitado útil. **2/2 probes de viabilidade PASS**, sem testar um método de lookup existente ou constituir RED/GREEN NUV-12.

Artefatos externos: `/tmp/nuv12-independent-review-d.md`, `/tmp/nuv12-d-probe/completeness.test.ts`, `/tmp/nuv12-independent-probe-d.log`. A primeira tentativa de configuração externa falhou antes de coletar testes por allowlist do Vite; a configuração externa foi corrigida e o arquivo completo passou. Antes de congelar a evidência, o orquestrador identificou números repetidos entre os falsos positivos da primeira fixture; D corrigiu os números para valores únicos e garantiu o match textual de `q` nos dois cenários. O arquivo completo final passou **2/2, exit 0, 2,84 s**, sem alteração da conclusão. O histórico oculto da coleção é a construção lógica do contraexemplo; o probe executável comprova que o stack admite as respostas observáveis dessa construção. Nenhuma configuração do produto foi alterada.

| Artefato externo                | SHA-256 final                                                      |
| ------------------------------- | ------------------------------------------------------------------ |
| Auditoria A                     | `8ea9f2ee5e60058661c62a53630f7bed0c7d8d687c0c4decbf7dde77145f5d06` |
| Viabilidade RED B               | `203cf9d1cebf0a479c56c97c03b8ca81e4360347c6e9d67ad775ca8d04f76ed4` |
| Parecer independente D          | `e4a0dba50b418510949a59053fe2d0142f1232119f4e561d8ab196a56db9c7c1` |
| Probe independente D            | `b7b946de8209512355ebc380e4064139566ca6a110e0685d42cb645593342d67` |
| Log final do probe D            | `131267bb7ca7a4a5570ed19cce5b616247845a5422ff45cc0bd5c053d0f94d27` |
| Configuração externa do probe D | `d82fa0f6803a588b5412d058a0d3e4bcd558a73549984d771cd454ae90e54f1f` |

D revisou também este relatório principal e não identificou novo P0/P1/P2 documental. Isso não encerra D-A01 nem substitui Gate E de código.

## H — Validação local

| Comando / gate                                                                                                                                                 | Resultado observado                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run test -- tests/unit/modules/nuvemshop/pagination.test.ts tests/unit/modules/nuvemshop/order-query.test.ts tests/unit/modules/nuvemshop/orders.test.ts` | **PASS baseline**, exit 0, 3 arquivos, 312/312 testes, 5,95 s, nenhum skip reportado                                  |
| Vitest com configuração externa `/tmp/nuv12-d-probe/vitest.config.mjs`                                                                                         | **PASS probes independentes**, exit 0, 1 arquivo, 2/2 casos; viabilidade/insuficiência de cobertura, sem GREEN NUV-12 |
| `git diff --check`                                                                                                                                             | PASS antes e depois do relatório                                                                                      |
| Testes dedicados NUV-12                                                                                                                                        | NOT RUN; arquivo não criado                                                                                           |
| Regressões request/retry/schemas completas                                                                                                                     | NOT RUN; nenhum candidato implementado                                                                                |
| `npm run check`                                                                                                                                                | NOT RUN; Gate A bloqueado                                                                                             |
| `npm run build`                                                                                                                                                | NOT RUN; Gate A bloqueado                                                                                             |
| Boundary/export novos                                                                                                                                          | NOT RUN; nenhuma API nova                                                                                             |

Prettier do relatório e `git diff --no-index --check /dev/null tasks/nuvemshop/NUV-12-evidence.md`: PASS; a verificação inclui o arquivo ainda não rastreado.

Os 312 testes são controles do baseline `6bd549e…`, não RED/GREEN ou aceite local de NUV-12. Durante os controles, foi criado um symlink temporário às dependências existentes do checkout original; somente esse symlink criado pela execução foi removido em seguida. Não houve leitura/cópia de `.env` ou uso de credenciais reais.

Log externo: `/tmp/nuv12-baseline-controls.log`, SHA-256 `4da61e529e2c6962d2c62324717781d1254968845cf156e296bfd60d2281d806`. Prompt recebido: SHA-256 `9ef0515204ef0a2ddf5633d2524ef76fab9a7d84a4f1aaef663544ceeb3c7247`.

## I — Integridade

Único arquivo novo esperado na worktree: este relatório. Fontes, testes, SPEC, PLAN, TODO, workflows, Dockerfile, dependências e lockfile sem alteração. Checkout original preservado, sem alterações tracked/untracked. Nenhuma chamada autenticada Nuvemshop, mudança de segredo/configuração, banco, migration, cache ou egress fiscal/Product. Dados dos controles são as fixtures sintéticas existentes e os probes externos derivados delas, com configuração sintética restrita ao processo de teste.

## J — GitHub

Branch somente local: `codex/nuv-12-order-number`; HEAD `6bd549e8013abc5f611f4361746c826737db21ac`. Nenhum commit, push, PR, comentário ou solicitação remota de review. Os gates que precedem a publicação não passaram; não se publica candidato como aprovado.

CI NUV-12: **NOT REQUESTED**. Codex Review NUV-12: **NOT REQUESTED**. Não há observação de indisponibilidade de cota a classificar como REVIEW_UNAVAILABLE. PR #48 foi lida para preflight, sem mutação. Merge/deploy não executados.

## K — Pendência e próxima decisão humana

É necessário reconciliar o critério de cobertura antes da implementação completa:

1. Fornecer evidência oficial verificável de uma garantia que exclua o contraexemplo, permitindo derivar o critério e as fixtures positivas; ou
2. Adjudicar um escopo parcial que retorne somente quando uma resposta suficiente comprovar a busca e falhe fechado nos casos multi-page sem prova, preservando T03 geral e NUV-12 completa como pendentes; ou
3. Adjudicar expressamente outro contrato de cobertura observada e seu risco de ausência falsa. Isso muda a garantia atual e requer decisão normativa própria; não é correção silenciosa dentro desta implementação.

Não se solicita permissão genérica para trabalhar: a execução, commit, push e PR já foram autorizados. Falta uma decisão material sobre a garantia funcional, pois o prompt §7 exige Gate A reconciliado antes de implementar e proíbe editar a SPEC silenciosamente. HR-02, CI-FONT-01 e legado fiscal permanecem abertos. Release, merge e deploy continuam sem autorização.
