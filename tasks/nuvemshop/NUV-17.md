# NUV-17 — recuperação de trabalhos duráveis

**Resultado local — 2026-11-05: `NUV17_LOCAL_PASS`.** Tecnicamente apto para
PR Draft; não equivale a merge, deploy, ativação operacional ou FULL_COMPLETE.

Implementação local autorizada pelo owner em 2026-11-04, baseada em
`main@521f2ca83f76a535668d9969b96705c5285a5651`. O pedido aceita
`NUV16_MVP_SMOKE_R2_PASS` como encerramento do gate funcional mínimo de
durabilidade para o MVP. Essa decisão posterior prevalece sobre o bloqueio
histórico de NUV-17 no TODO; não conclui integralmente NUV-16 nem reabre H5-B,
T10 ou TEST-BOUNDARY-01. HR-07, ADR-004 e os demais gates permanecem preservados.

## Mecanismo

A migration incremental `20261105022142_nuvemshop_recovery.sql` preserva a
migration NUV-16 e suas FKs, receipts e projections. O PostgreSQL seleciona e
reivindica trabalho em uma transação, com `FOR UPDATE SKIP LOCKED`. Cada claim
tem UUID, geração crescente e lease. As transições adquirem o lock da linha
antes de conferir propriedade e prazo pelo relógio do banco, inclusive quando
esperaram por outro lock.

| Origem                   | Condição                                                   | Destino                      |
| ------------------------ | ---------------------------------------------------------- | ---------------------------- |
| `received`               | Claim concedido                                            | `claimed`                    |
| `claimed`                | Proprietário vigente inicia                                | `processing`                 |
| `claimed`                | Lease expirado, tentativas disponíveis                     | Novo `claimed`, nova geração |
| `claimed`                | Lease expirado na última tentativa                         | `quarantined`                |
| `processing`             | Conclusão confirmada pelo proprietário vigente             | `succeeded`                  |
| `claimed` / `processing` | Falha explicitamente segura para repetir, abaixo do limite | `retryable`                  |
| `retryable`              | Prazo de backoff atingido                                  | `claimed`                    |
| `claimed` / `processing` | Falha não recuperável ou limite atingido                   | `quarantined`                |
| `processing`             | Lease expirado, resultado dos efeitos incerto              | `quarantined`                |
| `quarantined`            | Replay por operador, até sete dias desde intake            | `received`                   |

Expirar `processing` não repete automaticamente efeitos que podem ter ocorrido.
O operador investiga e decide pelo replay. O futuro dispatcher deve distinguir
falhas seguramente repetíveis de efeitos de resultado incerto. Não há garantia
de exactly-once.

O worker é serial, com lease de 60 s, heartbeat de 20 s e polling de 5 s por
default. Os valores são configuráveis e iniciais, sem garantia de produção.
O limite de tentativas é persistido no primeiro claim de cada ciclo; replay
explícito inicia outro ciclo limitado e mantém a geração crescente. A política
inicial de retry usa backoff fixo de 30 s e cinco tentativas totais. Somente
`SafeRetryError` autoriza retry automático; erros genéricos vão para quarentena.
Nenhuma falha armazena mensagem arbitrária, SQL, credenciais ou payload bruto.

## Privilégios e retenção

`SECURITY DEFINER` é necessário para oferecer transições atômicas sem conceder
`UPDATE` livre ao runtime. As funções ficam no schema privado, pertencem ao
owner NOLOGIN sem privilégios administrativos/BYPASSRLS, fixam
`search_path = pg_catalog` e qualificam as tabelas. `EXECUTE` de PUBLIC é
revogado, inclusive nos defaults globais do owner dedicado antes de criar as
funções, evitando a janela de concessão padrão em aplicadores autocommit.
RLS e FORCE RLS permanecem ativos, com políticas explícitas para as
leituras e atualizações de work pelo owner. Runtime mantém o intake NUV-16 e
recebe apenas EXECUTE das transições; não pode alterar receipts ou
`incident_hold`, fazer DDL ou executar replay.

`nuvemshop_intake_operator` é uma role NOLOGIN separada, com USAGE do schema e
EXECUTE apenas de `replay_work(uuid)`. Nenhum login ou membership operacional é
provisionado. Um operador autorizado chama a função por SQL em conexão própria;
`false` indica trabalho inelegível. Apenas quarentena dentro de sete dias desde
intake é elegível; trabalho ativo ou concluído não é reiniciado.

`terminal_at` é registrado em sucesso/quarentena e limpo no replay. Preservar o
registro até a data mais tardia entre intake + 14 dias e terminal + 14 dias.
Pending, in-flight, quarentena e incident hold nunca são expurgados. Hold não
é alterado por nenhuma transição. Não há serviço de expurgo nem regra privacy.

## Execução independente

`worker.ts` define o processador injetável; `recovery-store.ts` implementa o
adapter SQL. O mecanismo preserva a projection business/lifecycle, incluindo
uninstall com App ID e suspended/resumed sem `resourceId`. Não decide retomada
de consumers ou efeitos de negócio.

```bash
npm run worker:build
npm run worker:start -- /caminho/absoluto/configuracao.mjs
```

O módulo de configuração é código confiável fornecido explicitamente pelo
integrador e exporta `poolConfig`, `processor` e, opcionalmente, `options`.
`poolConfig` segue `IntakePoolConfig`: endpoint/usuário fornecidos pelo Connect,
Session Pooler 5432, TLS verificado e role runtime. Não carregar credenciais de
ensaios anteriores. O processador é obrigatório: não existe implementação padrão
que conclua trabalhos sem realizar o processamento correspondente. Nenhum
dispatcher de negócio é entregue nesta task.

O comando usa `--conditions=react-server` para respeitar o marcador `server-only`
fora do Next.js. Import/build não iniciam polling. SIGINT/SIGTERM interrompem o
worker e o pool é fechado. O processador deve respeitar `AbortSignal`; após
abort, a espera tem tolerância configurável de cinco segundos. Um processador
que ignora abort pode continuar seus próprios efeitos: fencing protege as
transições SQL, sem cancelar efeitos externos já iniciados.
Perda de ownership ou comunicação interrompe a
execução sem concluir como sucesso. Uma resposta perdida de claim é reconciliada
pela mesma identidade no primário; nenhuma nova identidade substitui um claim
incerto. Falhas de resposta das transições são reconciliadas por leitura da
mesma identidade; a exceção carrega a identidade e o snapshot observado, sem
inferir sucesso ou repetir a mutação. Resultados incertos de efeitos não são
repetidos automaticamente. O CLI imprime apenas uma mensagem sanitizada; a
captura operacional dessas exceções e alertas pertence à integração NUV-21.
Se a execução e o encerramento falharem juntos, um `AggregateError` preserva o
erro original com identidade/snapshot e sinaliza `CLOSE_FAILED` separadamente.

## Verificação e limites

Os testes unitários estão em
`tests/unit/modules/nuvemshop/durability-worker.test.ts`. A prova de concorrência
real está em `tests/integration/nuvemshop-recovery.test.mjs`, com duas conexões
independentes e roles SQL. Ela exige um cluster novo, descartável, sem listener
TCP, com ambas as migrations previamente aplicadas; não usar banco existente.

```bash
NUV17_TEST_SOCKET=/caminho/socket-local \
NUV17_TEST_PORT=55477 NUV17_TEST_DATABASE=nuv17_test \
node --test tests/integration/nuvemshop-recovery.test.mjs
```

Esta entrega não aplica migrations ao Supabase, não ativa workers, webhooks,
consumers ou privacy, e não fecha NUV-18–21/24/25. Compatibilidade e autorização
de implantação remota, release por candidate HEAD, dispatcher real, canais de
alerta/runbook e ensaio operacional continuam sujeitos aos gates próprios.
Node local segue `.nvmrc` 22.23.1; HR-07-Node permanece uma pendência histórica.

## Harness utilizado

- Orquestração técnica: GPT-6.1 Sol Alto, em subagent dedicado à coordenação,
  integração dos contratos e avaliação dos gates; agente principal mantém
  a worktree, documentação e publicação Git.
- PostgreSQL, concorrência e testes reais: GPT-6.1 Terra Alto.
- Worker TypeScript, adapter SQL, CLI e testes unitários: GPT-6.1 Terra Médio.
- Revisão independente, sem autoria das alterações: GPT-6 Luna Extra alto.

## Resultado da validação local

Node 22.23.1 e dependências exatas do lockfile, instaladas com `npm ci` na
worktree isolada, sem alterar o checkout principal, pacotes ou lock.

| Verificação                               | Resultado                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Comando unitário obrigatório              | PASS — 26 testes                                                                                                                |
| `npm run check`                           | PASS — 41 arquivos e 2.959 testes Vitest, além dos gates estáticos e testes de tooling                                          |
| `npm run build`                           | PASS — Next.js 16.4.1, Turbopack                                                                                                |
| `npm run worker:build`                    | PASS                                                                                                                            |
| PostgreSQL 17.11 local                    | PASS — concorrência real, leases após espera por lock, fencing, backoff, limite persistido, quarentena, replay, ACLs/RLS e hold |
| Adapter TypeScript compilado → PostgreSQL | PASS — transições sintéticas, sem efeitos de negócio                                                                            |
| CLI                                       | PASS — import sem execução e configuração ausente rejeitada antes de abrir o pool                                               |

As falhas iniciais de lint de artefatos gerados e dos marcadores server-only
foram corrigidas. Uma execução integral e um build anteriores falharam pelo
link de dependências para fora da worktree; a cópia local revelou versões
divergentes do lock, resolvidas por `npm ci` antes das provas finais acima.
Nenhuma falha anterior ou execução interrompida foi convertida em PASS. Os dois
avisos de lint de `_source` em `boundary.test.ts` já existiam no baseline.

A revisão independente identificou um P2: falha de fechamento podia ocultar
o erro primário de resultado indeterminado. Corrigido com preservação do objeto
original em `AggregateError`, erro secundário sanitizado e teste de regressão;
o revisor verificou o fechamento e concluiu sem P0/P1/P2 materiais abertos no
escopo. Não houve acesso a banco remoto, alteração de roles remotas, chamada
real à Nuvemshop, ativação de worker, merge ou deploy.

## Arquivos do candidato

| Grupo                 | Arquivos                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Migration             | `supabase/migrations/20261105022142_nuvemshop_recovery.sql` (novo)                                                |
| Engine e interfaces   | `src/modules/nuvemshop/server/durability/worker.ts` e `recovery-store.ts` (novos)                                 |
| Processo independente | `scripts/nuvemshop-worker.mjs`, `tsconfig.worker.json` (novos); `package.json` (scripts)                          |
| Pool existente        | `src/lib/server/nuvemshop-intake-pool.ts` (imports relativos e interface SQL compatível)                          |
| Testes                | `tests/unit/modules/nuvemshop/durability-worker.test.ts`, `tests/integration/nuvemshop-recovery.test.mjs` (novos) |
| Artefatos gerados     | `.gitignore`, `.prettierignore`, `eslint.config.mjs`, `tsconfig.json` (exclusão de `.worker-build`)               |
| Rastreabilidade       | Este documento (novo); `tasks/nuvemshop/todo.md` (nota datada, preservando snapshot histórico)                    |
