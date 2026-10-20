# NUV-12-COVERAGE-PARTIAL — proposta de cobertura restrita

| Campo                                 | Valor                                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Identificador                         | `NUV-12-COVERAGE-PARTIAL`                                                                                  |
| Estado                                | **PROPOSED / PENDING HUMAN APPROVAL**                                                                      |
| Data                                  | 2026-10-20                                                                                                 |
| Alternativa selecionada para proposta | Opção 2 — entrega parcial fail-closed                                                                      |
| Baseline histórico auditado           | `6bd549e8013abc5f611f4361746c826737db21ac`                                                                 |
| Contrato vigente                      | [SPEC §10 Orders](../../docs/specs/SPEC-nuvemshop.md#orders), [PLAN](./plan.md), [TODO](./todo.md)         |
| Evidência histórica preservada        | [NUV-12-evidence.md, A–K](./NUV-12-evidence.md)                                                            |
| Ratificação                           | Pendente; nenhuma aprovação humana de mérito registrada por esta execução                                  |
| Efeito atual                          | Proposta documental; nenhum código, teste de lookup, consumer ou índice autorizado/implementado nesta lane |

## 1. Vigência e decisão humana necessária

A opção 2 foi selecionada pelo PM para preparação da emenda, sem ratificação da garantia proposta. As aprovações históricas da SPEC/PLAN e NUV-11-LEGACY-B não aprovam este texto. **A implementação parcial somente poderá prosseguir após aprovação humana explícita e merge da emenda normativa.** Antes desses dois gates, os trechos propostos não substituem as obrigações atuais. Após eles, a implementação terá seus próprios RED/GREEN, revisão independente, CI e gate humano de release vinculado ao candidate HEAD.

A proposta permitirá avaliar um subset útil com conclusões somente em uma resposta suficiente, mantendo falha fechada nos demais casos. Não declara NUV-12 completa nem dispensa sua obrigação geral multi-page. O único estado final documental permitido após revisão/validação é `DOCUMENTAL_READY_FOR_HUMAN_ADJUDICATION`; não constitui aceite técnico do lookup ou autorização operacional.

## 2. Fontes, fatos e limites da inferência

Fontes públicas oficiais consultadas em 2026-10-20, sem API autenticada da loja:

- [Order API 2025-03](https://nuvemshop.dev/en-US/api/resources/2025-03/order): ID difere do número visível; número é único/sequencial; `q` busca número ou texto em nome/e-mail; consulta limitada a 10.000 itens.
- [Introdução — paginação](https://tiendanube.github.io/api-documentation/intro#pagination): páginas base 1, `per_page` até 200, `x-total-count` e navegação `next`, `prev`, `first`, `last`.

Esses fatos permitem interpretar uma resposta do endpoint, mas não fornecem nas fontes examinadas garantia de estabilidade de membership entre respostas. Trata-se de lacuna da evidência disponível, sem afirmar inexistência universal de outra garantia oficial. O critério restrito abaixo é uma política proposta do projeto sob a semântica normal de uma resposta, não garantia atribuída ao provedor de snapshot absoluto, linearizabilidade ou imutabilidade.

## 3. Contraexemplo preservado e alternativas

Construção sintética/lógica do relatório A–K; não é tráfego observado da loja:

1. `q` é o número de T; resultado filtrado inicial `[A, B, T, C]`, `perPage=2`, total 4. Página 1 retorna `[A, B]`, `next=2`, `last=2`.
2. Entre respostas, A deixa de corresponder ao texto em nome/e-mail e D passa a corresponder. Resultado torna-se `[B, T, C, D]`, ainda total 4.
3. Página 2 retorna `[C, D]`, `prev=1`, `last=2`, sem `next`.
4. Quatro IDs distintos foram observados com contagem constante e navegação coerente. T permaneceu na coleção durante toda a consulta e nunca foi lido.

Contagem estável, quantidade de IDs e Links consecutivos não certificam cobertura multi-page. Retornar `null` nesse cenário declara ausência falsa; um match observado também não demonstra por si só exclusão defensiva de ambiguidades exigida pelo projeto. Projetar `last` ou repetir scans finitos não cria estabilidade temporal. A unicidade oficial de `number` não dispensa a defesa contra duas identidades exatas requerida na matriz.

Aguardar prova oficial mantém a implementação geral bloqueada. A opção 2 propõe o subset restrito sem abandonar essa obrigação. A alternativa de aceitar somente travessia observada com risco de ausência falsa não foi selecionada e exigiria contrato/risco próprios; esta proposta não a autoriza. Índice durável é possível caminho futuro com contrato independente, sem implementação nesta tarefa.

## 4. Critério conjunto proposto para uma resposta

**Toda esta seção é PROPOSED / PENDING HUMAN APPROVAL; eficácia somente após aprovação humana e merge da emenda.** Para justificar retorno ou ausência, exigir simultaneamente:

1. Um GET lógico filtrado da coleção Orders, página 1, `q` do número validado como inteiro decimal canônico, `1 <= perPage <= 200`; rota, host, versão, loja e filtros confiáveis preservados. Nenhuma varredura global ou filtro arbitrário do browser.
2. Uma resposta válida de coleção, cujo corpo inteiro foi observado e validado pelo contrato Order existente, sem descarte local de candidatos antes de julgar cobertura. Não consultar Product, Fulfillment Orders ou fiscal para enriquecer candidatos do lookup.
3. IDs exatos e únicos, sem coerção com perda nem deduplicação silenciosa. `totalCount` presente, inteiro válido não negativo e coerente: **`totalCount = items.length = quantidade de IDs únicos <= perPage`**. Contagem menor que itens é incompatível e não autoriza conclusão; contagem maior exige cobertura adicional não admitida pelo subset.
4. Toda navegação presente validada e compatível com coleção inteira na página 1. `next` coerente ou `last>1`, mesmo sem `next`, impedem conclusão. `prev` na página 1 é inválido; `first/last=1` podem ser coerentes se validamente representados. Ausência de `next` isolada não prova cobertura; metadata opcional ausente não pode esconder contradição presente.
5. Comparação de **todos** os candidatos por `Order.number` decimal canônico exato, sem escolher por ID, substring, nome/e-mail, `Number` inseguro ou primeiro match. Reutilizar a política decimal existente, inclusive limites e zeros à esquerda, sem criar coerção nova.

Exatamente um ID com número exato permitirá retornar o Order normalizado. Zero matches permitirá `null` somente com os cinco requisitos satisfeitos: inclui corpo vazio com total zero válido e coerente e corpo com falsos positivos textuais integralmente examinados. Dois IDs distintos com número exato gerarão `NuvemshopLookupIncompleteError`, nunca escolha arbitrária. IDs repetidos impedem fabricar suficiência por deduplicação.

Sem demonstração suficiente pela primeira resposta, a versão parcial falhará fechado. Necessidade de múltiplas páginas/respostas, count ausente, total válido maior que itens, corpo truncado ou metadata insuficiente gerarão `NuvemshopLookupIncompleteError`; um match já visto não permite retorno. Não navegar para selecionar primeiro match, repetir scans/requeries, combinar respostas anteriores, particionar filtros nem executar HEAD separado para consolidar prova.

“Uma resposta” designa uma resposta válida de coleção usada para cobertura. As até duas tentativas transitórias do mesmo GET lógico permitidas por NUV-05 permanecem sob timeout/budget/pacing existentes; isso não permite agregar duas respostas de coleção bem-sucedidas como certificado. Não alterar NUV-05, introduzir retry de escrita ou confundir nove segundos por request lógico com deadline geral multi-page já disponível.

## 5. Taxonomia e viabilidade a provar na implementação futura

Validar estrutura antes de julgar suficiência. A proposta não transforma erros existentes em ausência ou incompletude genérica:

| Observação                                                                                                   | Resultado futuro requerido                                                                    |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Input local inválido, número unsafe/tipo impróprio/getter/proxy hostil                                       | `ValidationError` antes de I/O, sem executar getter                                           |
| Corpo/Order inválido, metadata presente malformada, Link inválido/hostil, posição estruturalmente impossível | `ProtocolError` preservado; zero egress adicional                                             |
| Metadata ausente ou evidência insuficiente, total válido maior que itens, `next` coerente ou `last>1`        | `NuvemshopLookupIncompleteError`, sem `null`/primeiro match                                   |
| Total menor que itens, estrutura/posição/Links incompatíveis                                                 | Preservar `ProtocolError` quando detectado pelo contrato; nunca fabricar cobertura            |
| IDs repetidos sem violação estrutural já classificada                                                        | Falha de suficiência: `NuvemshopLookupIncompleteError`, sem deduplicação para aprovar retorno |
| Dois IDs distintos com mesmo número exato                                                                    | `NuvemshopLookupIncompleteError` por ambiguidade                                              |
| Autenticação/402/429/rede/timeout/abort/400/422 e demais erros existentes                                    | Preservar classificação; não capturar tudo como LookupIncomplete                              |

Não inferir assinatura de teto de consulta por texto remoto sensível nem remapear 400/422 indiscriminadamente. Privacidade e segurança permanecem: somente servidor, sem q/PII/token/payload em logs, erros públicos, analytics, Sentry, shared cache ou raw/tipos client-importable. O lookup não concede posse, autorização ou disclosure.

O `Page` atual não fornece certificado de completude e o pager descarta `last` após validação interna. A existência de `listOrders` não prova composição suficiente para este critério. O futuro RED deverá demonstrar acesso e validação da navegação relevante, especialmente `last>1` sem `next`. Caso seja necessária mudança de transporte/pager/shared boundary, exigir avaliação de impacto, escopo explícito e revisão próprios antes de promovê-la; esta emenda não autoriza redesign, alteração de API ou certificado fictício. Nenhum teste/helper/parser é criado aqui.

## 6. Matriz futura T01–T16 do subset

**FUTURE / NOT RUN.** Esta matriz é proposta, não RED/GREEN executado. Mantém a identidade dos casos históricos; adaptação ao subset é explícita e não renomeia a obrigação positiva geral como aprovada.

| Caso                                         | Fixture/prova futura parcial e expectativa                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01 — positivo restrito                      | Página 1 suficiente com um match exato e falsos positivos: Order somente após comparar todos os candidatos e demonstrar total/IDs/navegação; incluir `total=perPage=200`.                                                                                                                                                                                                                                           |
| T02 — falso positivo                         | `q` encontra texto em nome/e-mail e/ou ID igual ao solicitado com número diferente: não é match; `null` só se a resposta inteira cumprir o critério conjunto.                                                                                                                                                                                                                                                       |
| T03 — **positivo geral multi-page PENDENTE** | Página posterior contém match: obrigação original de descoberta/retorno com cobertura suficiente permanece sem prova e sem PASS, skip ou dispensa. O negativo do subset com `next`/`last>1` deve lançar LookupIncomplete sem segundo GET de página; isso não satisfaz T03 geral.                                                                                                                                    |
| T04 — vazio intermediário                    | Página raw vazia ou sem matches com `next` não é ausência; subset lança LookupIncomplete sem avançar. Obrigação geral de não encerrar por vazio continua pendente junto da cobertura multi-page.                                                                                                                                                                                                                    |
| T05 — ausência restrita                      | Zero matches em uma resposta suficiente, incluindo falsos positivos e vazio com total zero: `null`. Mesma coleção sem total válido suficiente jamais justifica ausência.                                                                                                                                                                                                                                            |
| T06 — incompletude                           | Count ausente, count válido maior que itens, truncamento, evidência insuficiente ou ausência de Link sem prova restante: LookupIncomplete; jamais `null`.                                                                                                                                                                                                                                                           |
| T07 — retorno prematuro                      | Match na primeira página com `next` ou `last>1` mesmo sem `next`: LookupIncomplete, sem retornar candidato nem consultar página adicional.                                                                                                                                                                                                                                                                          |
| T08 — ambiguidade/IDs                        | Dois IDs distintos com mesmo número exato: LookupIncomplete. IDs repetidos não são deduplicados para fabricar suficiência; violação estrutural já detectada preserva Protocol.                                                                                                                                                                                                                                      |
| T09 — budget/retry                           | Um GET lógico de página 1, com contagem de dispatches incluindo até duas tentativas transitórias NUV-05; nenhum scan/requery/HEAD para somar cobertura. Budget/timeout/429 mantêm limites e taxonomia existentes; nenhum dispatch após abort/fence.                                                                                                                                                                 |
| T10 — precisão                               | Número/ID raw acima de MAX_SAFE_INTEGER e int64, dentro dos limites existentes: comparação lossless por número, nunca por ID; sucesso só em resposta suficiente.                                                                                                                                                                                                                                                    |
| T11 — canonicidade                           | Zeros à esquerda conforme reader existente: `000306` normaliza para `306`; `q` é canônico e comparação exata, sem aceitar texto arbitrário.                                                                                                                                                                                                                                                                         |
| T12 — input hostil                           | Zero/negativo/fração/unsafe number/tipo impróprio/acima do limite decimal/getter/proxy: Validation e zero fetch; nenhum getter executado.                                                                                                                                                                                                                                                                           |
| T13 — Links hostis                           | Host/rota/versão/loja/q/perPage alterados, filtro ausente/duplicado ou Link malformado: Protocol antes de egress adicional, não LookupIncomplete por conveniência.                                                                                                                                                                                                                                                  |
| T14 — metadata                               | Count presente malformado, body/Order inválido, relação duplicada ou posição impossível: Protocol conforme contrato. Count válido desigual, necessidade de mais página e navegação contraditória não geram retorno; preservar Protocol já detectado, senão LookupIncomplete. Incluir `last>1` sem `next`, count zero com next e repetição finita/count constante do contraexemplo sem promover scans a certificado. |
| T15 — erros/abort                            | Auth/402/429/Network/Protocol preservados; pre-abort zero fetch e abort durante fetch/body/admissão sem retry ou página posterior indevidos.                                                                                                                                                                                                                                                                        |
| T16 — privacidade/boundary                   | Marcadores sintéticos de q/PII/endereço/token/payload ausentes de logs, erros públicos, serialização, analytics, Sentry/shared cache; exports server-only; nenhum enrichment Product/fiscal ou egress a URL de dados.                                                                                                                                                                                               |

Além de provar os retornos restritos, executar controles negativos que rejeitem igualdade de count isolada, `count<=perPage` sem igualdade ao corpo, deduplicação silenciosa e nenhum `next` ignorando `last`. Não criar fixtures multi-page estáticas e chamar sua imutabilidade de garantia disponível ao runtime.

## 7. Status, DAG e consumidores

| Obrigação                           | Efeito da proposta, mesmo após eventual aceite técnico do subset                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NUV-12 parcial                      | Somente subset; implementação e provas ainda não iniciadas. Aprovação humana+merge da emenda antecedem código.                                                                             |
| NUV-12 completa / T03 geral         | Pendentes; nenhuma dispensa ou conclusão por testes negativos parciais.                                                                                                                    |
| NUV-13                              | Dependências originais 06/11 preservadas, sem nova aresta 12→13; proposta por número não prova cobertura de `contact_email`/identidade.                                                    |
| NUV-22 / NUV-23                     | Arestas 12→22 e 12→23 exigem NUV-12 integral. O subset não libera conclusão/início indevido de integração; mock futuro preserva owners, fiscal e demais dependências.                      |
| NUV-24                              | `01…23` concluídas/testadas continua obrigatório; subset não remove bloqueio, nem concede marco operacional, API real, release ou deploy.                                                  |
| NUV-25                              | Continua dependente de 24, 18/18 e evidência efetiva dos consumers; T03/NUV-12 integral e provas fiscais permanecem pendentes.                                                             |
| `orders` / `identity` / `/rastreio` | Nenhuma implementação/liberação aqui. Número exato não é posse; vínculo, e-mail verificado, OTP/posse, authorization/disclosure, projeção/índice e UI possuem planejamento/gates próprios. |

O DAG original permanece literalmente preservado, inclusive 12→22, 12→23, 01…23→24 e 24→25. Aprovar a emenda poderá liberar somente o trabalho parcial condicionado; não satisfaz essas dependências. HR-02 permanece OPEN para API autenticada real. Legado fiscal continua `DEFERRED_PROVIDER_EVIDENCE_REQUIRED` sob sua exceção local; modern-only continua `incomplete`, inclusive vazio, com consumer responsável pela prova. CI-FONT-01 não é fechado nem reclassificado por esta decisão. Nenhum HR é fechado; workflows/Foundation/CI e segurança/privacidade não são relaxados.

## 8. Reabertura e gates seguintes

Owner da adjudicação: humano responsável pelo produto/contrato, com engenharia e revisão independente de segurança/privacidade. Reabrir cobertura multi-page geral somente com:

- Evidência oficial verificável de garantia que exclua o contraexemplo para a consulta/superfície real, com critério derivado e fixtures rastreáveis; ou
- Solução de índice durável com contrato próprio aprovado, incluindo cobertura, reconciliação, consistência, falhas, privacidade e autorização do consumer. Nenhum backend, índice, migration ou consumidor é escolhido/implementado nesta lane.

Depois da aprovação humana e merge da emenda, reconciliar a branch técnica com o contrato aprovado, delimitar o escopo, executar RED/GREEN reais sobre o helper futuro, regressões/boundary e gates atuais, revisão adversarial independente sem P0/P1/P2 material e CI no candidate HEAD. Mudança shared necessária exige sua própria avaliação e autorização de escopo. Nenhum resultado histórico é reutilizado como aprovação do novo candidato. Release/merge técnico/deploy seguem gates humanos separados.

A revisão adversarial e validação **desta emenda documental** são reportadas na evidência corrente da execução, sem alterar o relatório histórico A–K. Não há resultado de testes/build/CI, parecer final ou ratificação presumidos neste registro de decisão.
