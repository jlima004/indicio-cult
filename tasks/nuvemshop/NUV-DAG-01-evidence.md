# NUV-DAG-01 — relatório A–K e recibo documental

Data de referência: 2026-10-20; retomada e verificação em 2026-10-21 (America/Sao_Paulo). **Proposta: PROPOSED / PENDING HUMAN ADJUDICATION.** Os estados de execução abaixo não aprovam mérito normativo, implementação ou release.

## A — Resultado executivo

Recomendação: alternativa B (separar capacidades/evidências), reutilizando os marcos existentes NUV-24 e NUV-25 da alternativa C. Trocar, somente depois da adjudicação/materialização humana, três dependências integrais por provas da NUV-12-PARTIAL nas suítes 22/23 e entrada de NUV-24. Conservar FULL, T03-GENERAL e ausência global como obrigações integrais bloqueadas para NUV-25; presença não as satisfaz. A alternativa A mantém o bloqueio vigente e permanece opção humana válida.

Estratégia: [ADR-004](../../docs/decisions/ADR-004-nuvemshop-dag-consumer-boundaries.md) + [emendas exatas propostas](./NUV-DAG-01-amendments.md) + [inventário/diagramas/validador](./NUV-DAG-01-graph.md). Nenhuma edição dos canônicos SPEC/PLAN/TODO, ADR-003 ou evidências históricas. ADR-004 estava disponível: só ADR-001–003 existiam no baseline. Essa estratégia preserva a distinção entre a norma vigente e uma proposta publicável, sem reaprovar o ADR-003.

Estado de execução nesta fotografia local: o primeiro candidato foi publicado em Draft PR #52 como `bc7e0cd`; o review remoto encontrou P2 material de status na materialização. A remediação documental recebeu APPROVE independente e a repetição integral inalterada do check passou; não se reutiliza a aprovação do primeiro SHA como aceite do candidato corrigido. A publicação da R1 e seus gates remotos ficam no recibo externo. O estado final `NUV-DAG-01 / DOCUMENTAL_PASS / HUMAN_ADJUDICATION_PENDING` exige também a publicação comprovada. CI/review remoto e eficácia normativa continuam separados.

## B — Baseline e preservação

| Item                             | Evidência                                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout original                | `/home/jlima/Projetos/indicioCult`, `main`, limpo no Gate 0                                                                            |
| HEAD original                    | `243cf7786a76759cfdedfbeeb0fbebb1adb6a776`                                                                                             |
| Fetch e origin/main              | `43a41ca51f0732d1a918e677bdd9e8d2bef29f13`, exatamente o baseline pedido                                                               |
| PR de referência                 | PR #51 MERGED; merge SHA `43a41ca51f0732d1a918e677bdd9e8d2bef29f13`, confirmado pelo conector GitHub                                   |
| Worktree criada/anexada pelo app | `/home/jlima/.codex/worktrees/nuv-dag-01-adjudication/indicioCult`                                                                     |
| Branch                           | `docs/nuv-dag-01-adjudication`                                                                                                         |
| HEAD inicial da proposta         | `43a41ca51f0732d1a918e677bdd9e8d2bef29f13`                                                                                             |
| HEAD final                       | Registrado pelo commit que contém estes bytes e pelo recibo GitHub, evitando SHA autorreferencial                                      |
| Históricas                       | Todas as worktrees anteriores preservadas; comparação dos registros HEAD/branch antes/depois, excluída apenas esta nova worktree, PASS |

O checkout original não foi atualizado. O app criou inicialmente a worktree em detached HEAD; `git branch -m` não se aplicou e retornou erro sem alteração. A branch pedida foi criada com `git switch -c`. Nenhum reset, clean, stash, descarte, amend, rebase, force-push ou remoção de worktree. A diferença local original→origin/main é a PR documental #51 já solicitada como baseline; a seleção usa o SHA remoto confirmado, sem misturar trabalho histórico.

## C — Delegações reais

O harness recebeu as seguintes configurações explícitas. Isso comprova os argumentos dos spawns e suas execuções, não uma atestação independente da identidade do backend. A identidade/esforço do orquestrador solicitado (`GPT-6.1 Sol Alto`) não é exposta nem alterável pelas ferramentas desta sessão; não foi atestada. Não se declara essa exigência comprovada.

| Papel                                | Agente real                    | Modelo/esforço configurados | Escopo e resultado                                                                                                       |
| ------------------------------------ | ------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| A — Contract & Governance Auditor    | `/root/a_contract_governance`  | `gpt-6.1-sol / medium`      | Auditoria somente leitura; precedência, snapshots, HR, SPEC21 e estados por nó; concluída                                |
| B — Dependency Graph Architect       | `/root/b_dependency_architect` | `gpt-6.1-sol / high`        | Auditoria paralela somente leitura; todas as arestas, ciclo potencial, 13 critérios, recomendação B + fases24; concluída |
| C — Consumer & Security Architect    | `/root/c_consumer_security`    | `gpt-6-luna / xhigh`        | Auditoria paralela somente leitura; taxonomia ortogonal, privacidade, posse, fiscal e cobertura por e-mail; concluída    |
| D — Normative Documentation Engineer | `/root/d_normative_docs`       | `gpt-6-luna / medium`       | Autoria exclusiva ADR/emendas após consolidação; revisão de ambiguidades por solicitação do orquestrador                 |
| E — Independent Adversarial Reviewer | `/root/e_independent_resume`   | `gpt-6.1-sol / high`        | Revisão independente retomada; resultado registrado na seção H                                                           |

A/B/C trabalharam sem edição concorrente. D foi o único autor inicial de ADR/emendas; orquestrador integrou e escreveu grafo/evidência. E recebe contexto independente e o pedido original para revisar o candidato, sem assumir aprovação dos autores. Evidências das delegações são as mensagens/argumentos do harness nesta sessão; seus resultados e eventuais rodadas E constam abaixo.

## D — Auditoria do DAG vigente

A matriz de todos os nós e as arestas completas estão no [artefato formal](./NUV-DAG-01-graph.md). O grafo literal do PLAN é acíclico, mas bloqueia NUV-22/23/24 por FULL. A ligação hipotética de conclusão FULL à futura presença em `orders` criaria ciclo; ela não é aresta aprovada e é semanticamente inválida sob ADR-003.

As âncoras de 2026-10-09 são snapshots. Ancestralidade em Git confirma incorporações posteriores de NUV-04/05/06/08/09; isso comprova merge, sem inferir deploy/aceite completo. NUV-11 tem registro posterior `TECHNICAL_COMPLETE / MERGED / DEPLOYED`. NUV-12 parcial entregue permanece distinta de FULL. O ADR-003 e a ratificação posterior da opção 2 prevalecem sobre rótulos históricos pendentes, sem reescrever seus bytes.

NUV-13 mantém NUV-06/11 e prova local própria, sem NUV-12→NUV-13; a cobertura final por e-mail permanece consumer-owned. Capability Map mantém NUV-24→catalog→identity→orders, sem NUV-25→consumers. Ledger NUV-16/17 não vira índice de pedidos.

## E — Alternativas

A comparação dos 13 critérios está no ADR. A preservação integral do DAG mantém prudência e rastreabilidade, mas não oferece caminho atual até NUV-24. B permite provas limitadas honestas, conservando obrigação geral explicitamente em NUV-25. C com um milestone novo duplicaria a distinção operacional/closure existente; reutilizar as fases de NUV-24 resolve a cronologia sem mais uma task. Nenhuma alternativa foi implementada nem aprovada por esta análise.

## F — Proposta e verificação formal

O manifesto, dois Mermaid completos, tabelas de arestas e script Python stdlib reproduzível estão em `NUV-DAG-01-graph.md`. O script é extraído para fora do Git; não há nova dependência npm, script de produto ou alteração CI.

Validação preliminar do modelo expandido: vigente 59 nós/145 arestas; proposto 74 nós/174 arestas, ambos acíclicos com ordenação topológica. Os números são do manifesto expandido e não se confundem com contagem das 25 tasks ou com o modelo ilustrativo de B. O script compara cada aresta Mermaid/tabela/manifesto e verifica HR, independência de NUV-13, separação de NUV-24/consumers, FULL/T03/ausência/18 critérios/closure humano em NUV-25. Controles negativos rejeitam ciclo de presença→FULL no grafo original, nó inexistente e HR-07 dependente de NUV-16. Com toda evidência geral retida artificialmente, NUV-24 permanece estruturalmente alcançável e NUV-25 continua bloqueada. Isso prova estrutura, não disponibilidade das provas nem readiness operacional.

## G — Contratos de consumers

Os estados de evidência e da tentativa são ortogonais. Match exato do subset tem origem distinguível de presença durável revalidada por `getOrder`. `null` restrito, chave sem linha e lacuna de reconciliação não provam inexistência. Erros locais, incompletude e falhas de protocolo/transporte conservam suas classificações.

`orders` possui projeção, reconciliação, isolamento por loja, identificadores exatos, quarentena, idempotência, retenção/RLS e autorização. Schema/infraestrutura/retention não foram aprovados. `identity` possui e-mail verificado, sessão ou desafio de posse, vínculo e autorização; número não prova posse. `/rastreio` só fornece resumo/timeline/tracking autorizado por remessa, sem endereço/e-mail/itens/valores/pagamento/NF-e/raw. `/conta/pedidos` distingue lista parcial/incompleta/índice não reconciliado de lista completa; número não certifica e-mail.

Modern-only fiscal permanece `incomplete`, inclusive vazio; `not_consulted` e malformado são distintos. A pendência legada permanece `DEFERRED_PROVIDER_EVIDENCE_REQUIRED`. NUV-23 prova integração e25 exige comportamento efetivo dos consumers. CI-FONT-01 permanece acompanhamento externo, sem mudança de escopo.

## H — Revisão adversarial independente

A primeira execução E (`/root/e_independent_review`, `gpt-6.1-sol / high`) iniciou e reportou progresso sem parecer final antes da perda dos processos da sessão. Não recebeu APPROVE presumido. Na retomada, o harness não listou agentes anteriores ativos; E foi novamente delegado em contexto independente a `/root/e_independent_resume`, na mesma configuração.

Parecer final de E retomado: **APPROVE**, P0=0, P1=0, P2=0 materiais; nenhum P3 acionável. Nenhuma remediação foi requerida por E naquele primeiro candidato; a revisão remota posterior encontrou o P2 descrito abaixo. O revisor não participou da autoria e comparou todas as 25 tasks e fontes obrigatórias; sua extração independente confirmou que somente `N12→N22`, `N12→N23` e `N12→ENTRY24` são removidas. As adições explicitam substitutos, ativação e obrigações integrais retidas.

Parecer completo: `/home/jlima/.codex/evidence/nuv-dag-01-20261020/review-e-resume.md`, SHA-256 `0a972f4cf807b0cafbe6fef11aa86421903416eaa7753c23acaaa74f5c15d08d`. Respostas às 18 perguntas obrigatórias:

| Perguntas                               | Resultado independente                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| 1–2: ciclos/gates humanos               | Nenhum ciclo; decisões precedem as implementações autorizadas                  |
| 3–6: parcial/FULL/T03/null/índice       | Nenhuma promoção a FULL ou ausência; T03 e ausência geral continuam bloqueados |
| 7–8: disclosure/NUV-13                  | Posse/autorização preservadas; 13 mantém independência 06/11                   |
| 9–11: suítes/operação/privacy/lifecycle | Todos os testes e HR mantidos; HR-06/08 real dentro de 24                      |
| 12–13: closure/fiscal                   | 18 critérios e provas efetivas dos consumers em 25; fiscal incompleto honesto  |
| 14–16: histórico/vigência/escopo        | Históricos intactos; proposta não vigente; somente quatro Markdown             |
| 17–18: consistência/desbloqueio         | Arestas e emendas concordam; nenhum bypass material de evidência               |

Hashes SHA-256 históricos do primeiro candidato revisado por E, anterior ao P2 remoto:

| Documento | Hash                                                               |
| --------- | ------------------------------------------------------------------ |
| ADR-004   | `4cba3031bd786a36a045c07f62cd3d3bf46758e541cfd9e3ed569ec0b9f9b129` |
| Emendas   | `9c34f3288d418e004da78fcca3fbb907fb80b09e2bd5ee01f2c656b7dfcdde17` |
| Grafo     | `f779da72544190134ba402e8b341290ee6b9df1ff46d10969b784d216a367ae7` |

E aprovou o conteúdo do primeiro candidato, sem dispensar validação/publicação. Esses hashes históricos não aprovam a remediação posterior.

### R1 — P2 remoto de materialização (PR #52)

[Finding P2](https://github.com/jlima004/indicio-cult/pull/52#discussion_r4337526710), Codex Review do HEAD `bc7e0cd4da7c3f8517c3e8731af0b486ba7714a1`: copiar o texto exato levaria os rótulos pendentes para a futura norma efetiva. O finding é material e foi aceito, sem redução de severidade. O pacote agora propõe duas substituições literais limitadas aos novos payloads, registro concreto de cada aprovação D1–D5 e uma verificação que proíbe marcadores pendentes nas novas inserções. Os históricos e os quatro artefatos de proposta continuam pendentes hoje; a eficácia depende do merge humano posterior autorizado. ADR-004 remete à regra. Nenhuma aresta foi alterada pela remediação. Nova revisão independente R1: **APPROVE**, zero P0/P1/P2 materiais e nenhum P3 acionável. Parecer: `/home/jlima/.codex/evidence/nuv-dag-01-20261020/review-e-r1.md`, SHA-256 `001b737a1cd2f241d24cce0795b913c08e41d6035932f8c373d6a0aa0d3d3b3a`. O revisor executou transformação e reversão independentes dos 13 blocos; a reversão recuperou todos os demais bytes, e o controle negativo sem conversão da nota de wave foi rejeitado. O dry-run do orquestrador cobriu 12 fragmentos com token pendente e uma nota de wave; cabeçalhos da proposta e canônicos/históricos permaneceram intactos. Isso não constitui aprovação D1–D5 nem executa materialização.

Hashes normativos da R1 revisada:

| Documento        | SHA-256 R1                                                         |
| ---------------- | ------------------------------------------------------------------ |
| ADR-004          | `e859a3345d1e16249f4ebd36c185d035a425846dbbf6030ad85b5dd677d5136c` |
| Emendas          | `a3522a6f74e84d81aa1c274439339d3ab44cc8e693d7489ed85baa980243156b` |
| Grafo inalterado | `f779da72544190134ba402e8b341290ee6b9df1ff46d10969b784d216a367ae7` |

Gate G da R1: a primeira checagem completa falhou no timeout registrado abaixo; após controles baseline/candidato, a repetição integral inalterada passou, com resultados próprios da R1. O build da R1 também passou (exit 0, TypeScript e 8/8 páginas); formato, materialização, grafo e integridade foram conferidos novamente antes do commit.

## I — Validação

A tabela distingue os resultados históricos do primeiro candidato e o estado corrente da R1. A falha inicial da R1 e todos os controles ficam preservados abaixo; somente a repetição integral inalterada aprova o gate completo atual.

| Gate                              | Estado observado                                                                                                                                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instalação                        | `npm ci` exit0; Node22.23.1/npm10.9.8, lockfile sem alteração; npm reportou6 high no lock instalado, sem executar audit fix ou ampliar escopo                                                                                 |
| Preparação check                  | Execução inicial sem conclusão recuperável após perda dos processos/arquivos temporários; não é PASS nem falha de teste comprovada. Reexecução integral inalterada na retomada.                                               |
| Formatação final                  | PASS: `npm run format:check`; repetida após finalizar este recibo, sem editar os três documentos normativos revisados.                                                                                                        |
| Check completo candidato          | PASS: `npm run check`, exit 0; lint/tipagem/format/runtime/tokens e 35 arquivos / 2.637 unitários + 6 runtime + 135 tokens, zero falhas/skips; unitários 625,40 s na repetição integral da R1 (primeiro candidato: 648,16 s). |
| Build local com env sintético     | PASS: `npm run build`, exit 0; R1: TypeScript e 8/8 páginas. Somente variáveis sintéticas de processo, sem `.env`, DSNs ou credenciais reais.                                                                                 |
| Grafo/controles negativos         | PASS: execução final e reprodução independente E; 59/145 vigente, 74/174 proposto, topologia e três controles negativos.                                                                                                      |
| Links/anchors/ADR/Mermaid/estados | PASS: 12 links/anchors locais, delimitadores, pontos únicos de inserção, 25 tasks e ADR-004 disponível; arestas Mermaid/tabelas/manifesto idênticas.                                                                          |
| Diff/allowlist/preservação        | PASS: staging/diff sem erro; exatamente quatro Markdown novos; canônicos/históricos byte a byte e 16 worktrees anteriores preservados.                                                                                        |
| Provider real / smoke operacional | NOT RUN; HR e autorizações próprios                                                                                                                                                                                           |

A retomada perdeu os arquivos temporários em `/tmp`, inclusive logs parciais; a interrupção é preservada como resultado inconclusivo. Os resultados completos recuperados e hashes são preservados externamente em `/home/jlima/.codex/evidence/nuv-dag-01-20261020/`, junto do validador extraído e recibo de publicação. Logs não são incluídos em Markdown como supostos testes de novas capacidades. Não houve RED/GREEN de produto porque o diff é documental. O primeiro controle de igualdade da tabela depois de Prettier detectou a célula vazia do HR-05 como uma aresta vazia; o parser do validador documental passou a ignorar células vazias, sem alterar qualquer aresta do manifesto. A nova execução passou, inclusive os controles negativos. Nenhum timeout ou configuração de testes foi alterado.

Dois warnings de lint preexistentes em `boundary.test.ts:4817–4818`, arquivo inalterado. O build avisou sobre `cacheComponents` sem `partialPrefetching` e ausência de auth token Sentry, sem criar release; nenhuma configuração foi alterada. Docker/E2E/scanners pertencem aos gates remotos existentes, não foram apresentados como prova local.

### R1 — resultado inicial e controles do timeout

A primeira execução completa da R1 (`check-r1.log`) falhou: 35 arquivos, 2.636 testes passaram e um excedeu o limite inalterado de 5.000 ms, em `boundary.test.ts:2496`, caso `resolves adapter server-to-root reference paths without module extension substitution`; duração global 681,46 s. Não houve falha de asserção reportada nesse caso.

O controle no checkout original `243cf77` é válido para runtime/testes: `git diff 243cf77..43a41ca -- src tests vitest.config.mts tsconfig.json package.json package-lock.json` é vazio. O checkout original permaneceu limpo. Nenhum timeout, teste, configuração, dependência ou parâmetro do gate completo foi alterado.

| Controle diagnóstico            | Resultado observado                                | Limite da conclusão                            |
| ------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| Caso isolado no baseline        | Timeout de 5.000 ms; um caso falhou, 594 filtrados | A falha também ocorre sem a emenda; não é PASS |
| Mesmo caso isolado no candidato | Mesmo timeout; um caso falhou, 594 filtrados       | Não é regressão exclusiva da R1 nem PASS       |
| Grupo original no baseline      | 23/23 passaram; 572 filtrados; 54,55 s             | Somente controle do grupo, não gate completo   |
| Mesmo grupo no candidato        | 23/23 passaram; 572 filtrados; 46,76 s             | Somente controle do grupo, não gate completo   |

O comportamento depende do contexto de execução; a causa técnica definitiva do timeout não foi comprovada. Os controles não autorizam ignorar a falha. A checagem completa foi reiniciada inalterada em `check-r1-repeat.log`; resultado **PASS**, exit 0: 35 arquivos, 2.637 unitários e 141 testes de tooling; zero falhas/skips, 625,40 s na etapa unitária. A primeira falha não foi removida nem reclassificada por esse PASS. Todos os resultados negativos são preservados, sem converter os casos filtrados em PASS da suíte completa. A auditoria independente dos controles está em `review-e-r1-controls.md`, SHA-256 `730dcdcbe6d5bb3cae0719f38988f6e27188cb643375a9e5a4379c81a408f85f`; seu aceite factual não substituiu a repetição integral.

## J — GitHub e candidate HEAD

Primeira publicação: Draft [PR #52](https://github.com/jlima004/indicio-cult/pull/52), HEAD `bc7e0cd4da7c3f8517c3e8731af0b486ba7714a1`. O pedido único de Codex Review foi [registrado](https://github.com/jlima004/indicio-cult/pull/52#issuecomment-6317458843) para esse SHA; a revisão terminou com o P2 de materialização, sem aprovação remota limpa. O finding foi aceito e remediado na R1, com nova revisão independente. A autorização do pedido original limita a solicitação de Codex Review a uma única vez; não será consumida outra solicitação sem nova autorização. Isso não permite reutilizar a revisão de `bc7e0cd` como revisão do novo HEAD. O recibo externo registrará o estado remoto exato do candidato corrigido; nenhum REMOTE_PASS será inferido.

Esta fotografia antecede o commit de remediação e seus checks remotos. Nenhum resultado remoto da R1 é antecipado. CI e Codex Review deverão estar vinculados ao HEAD efetivamente publicado; resultados de PR #51 ou candidatos anteriores não valem para esta proposta. SHA, URL, runs, conclusões, skips e threads serão reportados no corpo/recibo da PR sem acrescentar ao commit uma autorreferência impossível.

Sem merge/deploy ou mudança para Ready nesta execução. A eventual publicação é proposta para adjudicação, sem eficácia normativa.

## K — Decisões humanas e próximo gate

D1 (DAG), D2 (consumer), D3 (operação), D4 (closure) e D5 (textos exatos) são decisões independentes: todas permanecem **PENDING HUMAN ADJUDICATION**. A aprovação isolada de uma não efetiva as outras. Para a trilha recomendada, exige-se conjunto coerente aprovado e materialização posterior, revisão/merge humano próprios; isso não autoriza implementação dos consumers ou persistência.

HR-02/03/04/06/07/08 permanecem nos momentos exigidos; HR-06 e HR-08 real dentro de NUV-24, HR-08 decisão antes de NUV-20 e HR-07 antes de NUV-16/17. HR-05 continua próprio de cart/checkout. FULL/T03/ausência/18 critérios/evidência efetiva dos consumers/revisão/closure humano continuam necessários antes de NUV-25. Próximo gate de mérito: decisão humana D1–D5 sobre o candidato publicado; antes disso, a norma vigente e seus bloqueios continuam valendo.
