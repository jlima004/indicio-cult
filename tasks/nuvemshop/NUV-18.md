# NUV-18 — dispatcher e sinais reconciliáveis

**Resultado local — 2026-11-05: `NUV18_LOCAL_PARTIAL`.** Implementação funcional
e revisão concluídas; o check global não passou por timeout preexistente
reproduzido no baseline. Sem waiver, merge, deploy ou ativação.

Implementação local autorizada em 2026-11-05, sobre
`c1dafee4eb954f6ffae7c38612b7e74e5f3fc666` (NUV-17 integrada), na branch
`codex/nuv-18-dispatch`. O pedido aceita o gate MVP NUV-16 e prevalece sobre o
snapshot histórico BLOCKED desta task. Não altera HR-02/06, o DAG nem as provas
diferidas H5-B/T10/TEST-BOUNDARY-01.

## Contrato implementado

`createDispatcher` compõe `createRecoveryWorker` como processor explícito.
Recebe a projection normalizada NUV-16 e a identidade receipt/token/generation
do claim NUV-17; não autentica HTTP, interpreta raw body ou executa no import.
O registry exige identidade estável, topics explícitos, `handle` e `reconcile`.
Não há consumers reais de catalog/orders nem handler padrão de sucesso.

A migration incremental `20261105141754_nuvemshop_dispatch.sql` usa o schema
privado existente. Cada receipt contribui uma vez por consumer para um destino
`(store, consumer, product|order, resource)`, com geração pendente separada da
concluída. Todas as entregas distintas conservam seu receipt; payload idêntico
não é deduplicado globalmente. Eventos de pedido compartilham o recurso, sem
presumir ordering ou transição de domínio. Geração recebida durante processamento
permanece pendente após a conclusão anterior.

Ausência de consumer, pausa e disputa devolvem adiamento durável com backoff,
sem consumir tentativas de efeito. `succeeded` exige confirmação do resultado
exigido; receipt, intenção, despacho e efeito do consumer são fatos distintos.
Somente `retry-safe` permite retry limitado NUV-17. Erro/resultado incerto
preserva o destino e leva o work à quarentena, sem exactly-once externo.

## Lifecycle e recuperação

O PostgreSQL mantém `paused`, `reconciling`, `active`, `disconnected`, epoch,
pedido de retomada, acesso/configuração comprovados e pendência por consumer.
Suspensão bloqueia operação; uninstall desconecta e exige intervenção humana,
sem redact. Resumed apenas solicita probe e reconciliação, nunca desfaz uninstall.
O lifecycle pode concluir como aplicação durável dessa condição ou solicitação;
isso não declara concluída a reconciliação pendente dos consumers.

O probe é uma interface canônica injetável: `ready` deve comprovar acesso e
configuração operacional aplicável. Sem operação canônica documentada e provada
para esse fim, não há implementação real/default, endpoint inventado ou chamada
ao provedor. Prazo padrão 5 s (configurável até 30 s), com AbortSignal; futuro
adapter de probe deve usar NUV-04/05 e seus budgets, sem bypass. Erros tipados
401/402 do transporte viram diagnóstico durável de acesso/suspensão. Resultado
incerto nunca libera operação, e epoch invalida confirmações anteriores.

Cada consumer novo exige sincronização inicial antes do primeiro sinal, mesmo
com loja ativa. Consumers já conhecidos e ausentes do registry continuam
pendentes no banco; consumers futuros ainda não registrados não são inventados.
Um consumer comprovado pode operar enquanto outro permanece em reconciliação.
O callback `reconcile` usa exclusão mútua durável por consumer, fenced pelo claim
NUV-17 e epoch. Crash/efeito incerto bloqueia nova execução até resolução
autorizada. O monitor cooperativo consulta o estado a cada segundo durante
callbacks; AbortSignal e fencing não desfazem efeitos externos já iniciados.

Somente a role NOLOGIN de operador pode executar `resolve_dispatch_signal` ou
`resolve_dispatch_reconciliation`: exigir prova canônica do resultado aplicado
ou de repetição segura, geração/epoch exatos e claim anterior sem vigência.
Replay de work em quarentena é separado, por `replay_work`, dentro dos limites
NUV-17. `authorize_dispatch_reinstallation(store, expected_epoch)` registra
autorização de reinstalação já decidida fora deste mecanismo; mantém pausa,
exige novo probe e reconciliação e não resolve efeitos incertos. O próximo
work business pendente pode executar esse fluxo sem depender de resumed futuro.
Canal, credenciais operacionais e runbook de execução continuam em NUV-21/24.

FORCE RLS, owner técnico NOLOGIN, search_path fixo, objetos qualificados e
EXECUTE sem PUBLIC permanecem obrigatórios. Runtime não recebe UPDATE livre,
DDL, replay ou autorização de reinstalação. A confirmação de reconciliação
interna não é exposta ao runtime sem o latch. Falha de resposta SQL preserva
indeterminação e identidade; o adapter não repete a mutação nem revela sua causa.

## Verificação e revisão

Testes focados: dispatcher (24), adapter SQL (7), worker compatível (34):
**65 PASS**. PostgreSQL 17.11 local descartável, sem TCP: **3 testes PASS**
de transições/concorrência/ACL, mais **1 PASS** integrando dispatcher compilado,
adapter real e worker. A prova inclui conexões independentes, espera por lock
além da lease, geração posterior, reinício/reconciliação pendente, 401/402,
uninstall, reinstalação autorizada e resolução explícita de incerteza.

Comandos PostgreSQL usam `NUV18_TEST_SOCKET`, `NUV18_TEST_PORT` e
`NUV18_TEST_DATABASE` com clusters novos e migrations 16–18. O teste
`nuvemshop-dispatch-runtime.test.mjs` exige database `nuv18_test_runtime`,
`npm run worker:build` e `node --conditions=react-server --test`.

| Gate                                                      | Resultado real                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Testes focados                                            | PASS — 65 testes                                                                      |
| PostgreSQL 17.11 local                                    | PASS — 3 testes de transições + 1 integrado compilado                                 |
| `npm run check`, primeira execução                        | FAIL — 2.991 PASS e seis timeouts em boundary; 43 arquivos                            |
| `npm run check`, repetição integral sem build concorrente | FAIL — 2.997 PASS e um timeout de 5 s em `TSTYPES-09-ROOT`; 2.998 testes, 43 arquivos |
| `npm run build`                                           | PASS — Next.js 16.4.1, configuração sintética local, sem credenciais Nuvemshop        |
| `npm run worker:build`                                    | PASS; import dos módulos compilados sem iniciar processamento                         |
| Revisão independente                                      | PASS — sem P0/P1/P2 materiais abertos após correções                                  |

A comparação usa worktree separada em `c1dafee`, Node 22.23.1 e `npm ci
--ignore-scripts`, com lockfiles idênticos. Os seis casos da primeira falha
foram selecionados para reprodução: baseline e candidato reproduziram os
mesmos dois timeouts (`TSTYPES-CONSUMER`, referência server→root); os outros
quatro passaram isoladamente. A falha restante da repetição integral,
`TSTYPES-09-ROOT`, também reproduziu por timeout tanto no baseline (7.738 ms)
quanto no candidato (7.155 ms). Esses filtros são reproduções diagnósticas,
nunca substituem a suíte global. Nenhum timeout, teste, threshold ou workflow
foi alterado; não há prova de check integral PASS e não se declara LOCAL_PASS.

Harness: coordenação técnica GPT-6.1 Sol Alto; SQL/concorrência GPT-6.1 Terra
Alto; dispatcher/testes GPT-6.1 Terra Médio; revisão independente sem autoria
GPT-6 Luna Extra alto. A revisão encontrou três P2: inicialização de consumer
novo, reinstalação autorizada e concorrência de reconciliação. As correções
incluem caminhos concretos, latch durável e regressões; revisão dirigida final
sem P0/P1/P2 materiais abertos. Regressões adicionais cobrem cancelamento antes
do probe e interrupção do polling quando um callback ignora AbortSignal.

Nenhuma migration, role ou dado remoto foi acessado/alterado. Nenhum worker,
webhook, probe real, consumer de domínio ou privacy foi ativado. A publicação
GitHub autorizada não equivale a merge/deploy ou prontidão operacional.
