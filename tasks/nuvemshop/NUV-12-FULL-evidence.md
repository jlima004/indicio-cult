# NUV-12-FULL — evidência da retomada integral

Data: 2026-10-20. Registro novo. Não substitui [NUV-12-evidence.md](./NUV-12-evidence.md), [NUV-12-COVERAGE-PARTIAL.md](./NUV-12-COVERAGE-PARTIAL.md), [NUV-12-COVERAGE-PARTIAL-evidence.md](./NUV-12-COVERAGE-PARTIAL-evidence.md) nem [NUV-12-PARTIAL-evidence.md](./NUV-12-PARTIAL-evidence.md).

Estado: **NUV-12-FULL / ARCHITECTURAL_ADJUDICATION_REQUIRED**.

Não declara `NUV-12 COMPLETE`, `T03-GENERAL PASS`, `DIRECT_API_COVERAGE_PROVEN`, `NUV-22/23 UNBLOCKED`, `ADAPTER OPERATIONAL` ou `RELEASE APPROVED`.

## A — Resultado executivo

A API Order `2025-03` não fornece garantia verificável de cobertura sob mutação de membership. A busca direta não pode devolver `Order` ou `null` no caso geral sem fabricar essa garantia.

A SPEC nomeia uma projeção durável em `orders`. Ela não existe e, mesmo como desenho, não prova ausência: backfill e webhook não eliminam o contraexemplo. Presença pode ser registrada depois de `getOrder`; ausência permanece `BLOCKED_COVERAGE_EVIDENCE`. A proposta está em [ADR-003](../../docs/decisions/ADR-003-nuv-12-cobertura-integral.md), com status proposto.

O comportamento da PR #50 permanece intacto. O `null` desse subset é política de uma resposta, não ausência geral.

## B — Baseline

| Item                                      | Valor                                                 |
| ----------------------------------------- | ----------------------------------------------------- |
| Checkout original                         | `/home/jlima/Projetos/indicioCult`, `main`, limpo     |
| `HEAD` inicial e `origin/main` após fetch | `243cf7786a76759cfdedfbeeb0fbebb1adb6a776`            |
| Worktree desta execução                   | `/home/jlima/Projetos/indicio-cult-nuv-12-full`       |
| Branch                                    | `feat/nuv-12-full-coverage`                           |
| HEAD de código                            | O mesmo baseline; nenhum commit de produto            |
| Worktrees históricas                      | Preservadas; nenhum reset, clean, stash ou force-push |

## C — Subagents

Orquestrador: Grok 4.7 High Fast. Modelos abaixo são os slugs configurados no spawn. Nenhum resultado foi inventado.

| Papel                            | Modelo                      | Delegação                                                    | Resultado                                                                                            |
| -------------------------------- | --------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| A — Contract & Provider Research | `cursor-grok-4.6-high-fast` | [Cobertura oficial](d6dbdb43-d6f0-4660-aa8d-2963bc257418)    | `BLOCKED`. Sem snapshot, cursor, lookup exato por número ou semântica de mutação.                    |
| B — Architecture & Consistency   | `cursor-grok-4.6-high-fast` | [Rotas de arquitetura](cacb3a21-f3b4-44f0-ae25-ec1b1ccfa847) | `ARCHITECTURAL_ADJUDICATION_REQUIRED`. Índice em `orders`; adapter não é owner.                      |
| C — RED                          | não executado               | Gate A não aprovou rota direta                               | NOT RUN                                                                                              |
| D — Implementação                | não executado               | Persistência não autorizada                                  | NOT STARTED                                                                                          |
| E — Revisão independente         | `cursor-grok-4.6-high-fast` | [Revisão do ADR](a030cf59-3236-40b3-8768-a637c7cfeeff)       | Primeiro parecer `CHANGES_REQUIRED`. Releitura do texto corrigido: `APPROVE`. Zero P0/P1/P2 abertos. |

A e B rodaram em paralelo, só leitura, sem edição concorrente. O orquestrador releu a Order API 2025-03, a paginação oficial e o overview de ERP e confirmou as citações usadas no ADR-003. Não houve resposta oficial de suporte com garantia de completude.

## D — Contrato

Garantias oficiais: `id` diferente de `number`; `number` único e sequencial a partir de 100; `q` casa número ou texto de nome/e-mail; paginação por `page`/`per_page` até 200, `x-total-count` e `Link`; `since_id` e filtros de data existem como restrição; acima de 10.000 a consulta erra; NUMBER não é identificador de integração.

Hipóteses não comprovadas: contagem constante, IDs distintos, Links consecutivos, ausência de `next`, repetição até estabilidade, varredura até 10.000, `since_id` como cursor completo, janela temporal como partição estável, webhook como prova de ausência.

Critério verificável de completude multi-page na API: inexistente nas fontes consultadas.

Parecer do Gate A: `BLOCKED`.

## E — RED

Não executado. Não há contrato integral comprovado contra o qual escrever falhas da implementação atual. Os 56 testes da NUV-12 parcial não foram removidos nem enfraquecidos. A matriz F01–F18 fica registrada no ADR-003 como prova futura, `NOT RUN`.

O contraexemplo `[A, B, T, C] → [B, T, C, D]` continua possível sob o contrato oficial. Uma implementação que devolvesse `null` nesse histórico estaria errada. A implementação parcial não percorre a página 2; ela lança `NuvemshopLookupIncompleteError` quando `next` ou `last>1` aparecem.

## F — Arquitetura

Rota direta: incompatível com o aceite integral. Custo de uma varredura de 10.000 itens também estoura o ritmo documentado de 2 req/s e o prazo de 9 s por GET lógico, e o erro de teto não é ausência.

Rota durável: a SPEC atribui o owner a `orders`, e o repositório não tem a projeção. Supabase tem clientes e tipos `public.Tables: never`. Não há migration de domínio, consumer `orders`, rota `/rastreio` nem webhook. NUV-15 a NUV-19 estão bloqueadas por HR-07 e persistem recibo genérico, não o índice. Guardar presença observada não certifica a chave ausente.

Recomendação: parar para adjudicação humana de ownership, sem implementar tabela, fila, cron ou handler, e sem tratar a projeção como prova de ausência.

## G — Revisão adversarial

Gate E de código: não aplicável; não há diff de produção. [Revisão do ADR](a030cf59-3236-40b3-8768-a637c7cfeeff) não participou da redação. O primeiro parecer foi `CHANGES_REQUIRED`.

Pergunta obrigatória: **sim**. Existe histórico permitido pelo contrato oficial em que a implementação vigente devolve `Order` ou `null` sem cobertura suficiente.

1. A PR #50 devolve `Order` ou `null` quando uma única resposta tem `page=1`, `totalCount = items.length = IDs únicos`, sem `next`, sem `previous` e com `last` ausente ou `1`. Isso é política do projeto para uma resposta. A API não garante que essa página seja o conjunto real de quem casa com o número. `Order.number` exato prova presença do candidato visto. O `null` desse ramo não prova que T esteja ausente da loja. Fora dessa resposta, o subset lança `NuvemshopLookupIncompleteError` e não percorre outra página.
2. A primeira redação do ADR-003 ligava `ready_for_absence` a ausência comprovada. Esse caminho foi removido. Backfill, webhook, contagem e falta de linha não devolvem `null`. Ausência comprovada continua bloqueada até primitiva oficial.

Achados do primeiro parecer e o tratamento neste texto:

| ID  | Severidade | Tratamento                                                                     |
| --- | ---------- | ------------------------------------------------------------------------------ |
| E1  | P1         | Esta seção passa a responder sim.                                              |
| E2  | P1         | `ready_for_absence` deixa de autorizar `null`. Ausência permanece bloqueada.   |
| E3  | P1         | O diagrama não tem mais ramo de ausência pelo índice.                          |
| E4  | P2         | O `null` da página 1 está marcado como subset, não como ausência geral.        |
| E5  | P3         | O resumo da PR #50 inclui `page=1` e `previousPage` ausente.                   |
| E6  | P3         | O subset é descrito como fail-closed vigente, sem reaceite da cobertura geral. |

P0 de código: nenhum. A releitura independente deu `APPROVE`, com zero P0/P1/P2 abertos. A pergunta obrigatória permanece **sim** para o subset já mergeado. Observação não bloqueante, deixada no ADR aprovado: o passo 2 do plano ainda diz “sinal de cobertura”; o restante do registro não promove esse sinal a ausência. O ADR não foi editado depois do `APPROVE`. Este parágrafo só registra o parecer.

## H — Validação

Não houve alteração de `src/` nem de testes. Não foi executada suíte nova, `npm run check` ou `npm run build` para um diff vazio de produto. `git diff --check` aplica-se ao markdown novo antes do commit.

Nenhum token real, `.env`, escopo OAuth ou timeout foi alterado.

## I — Integridade

Arquivos novos previstos: este relatório e `docs/decisions/ADR-003-nuv-12-cobertura-integral.md`. SPEC, PLAN, TODO, evidências históricas e código da PR #50 sem edição. Nenhuma migration. Worktrees históricas intocadas.

## J — GitHub

Branch isolada `feat/nuv-12-full-coverage`. Depois do `APPROVE`, a publicação é um Draft somente destes dois arquivos, sem merge e sem deploy. CI de produto não é critério de aceite desta retomada porque não há mudança de runtime. O endereço da PR fica no corpo dela, para não gravar aqui uma referência ainda inexistente.

## K — Pendências e decisão humana

1. Aceitar ou recusar o ADR-003.
2. Se aceitar, emendar o significado de `12` no DAG sem marcar T03 como PASS e sem mover o índice para o adapter.
3. Manter HR-02, HR-07, legado fiscal e CI-FONT-01 abertos.
4. Não iniciar NUV-13, NUV-22, NUV-23, NUV-24, NUV-25, `identity`, `/rastreio`, OTP ou disclosure a partir desta evidência.

Próximo gate: decisão humana de arquitetura. Sem ela, a NUV-12 integral não avança para RED nem para persistência.
