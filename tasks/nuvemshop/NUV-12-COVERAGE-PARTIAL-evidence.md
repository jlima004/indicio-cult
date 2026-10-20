# NUV-12-COVERAGE-PARTIAL — evidência da proposta documental

Data: 2026-10-20. Decisão normativa: **PROPOSED / PENDING HUMAN APPROVAL**. Esta execução prepara uma emenda; a seleção da opção 2 pelo PM não ratifica a emenda. A implementação parcial exige aprovação humana e merge da emenda, seguidos dos gates técnicos próprios.

## 1. Escopo, baseline e preservação

- Baseline após `git fetch origin`: `origin/main = 6bd549e8013abc5f611f4361746c826737db21ac`, igual ao histórico auditado e ao HEAD do checkout original em `main`.
- Checkout original: `/home/jlima/Projetos/indicioCult`, preservado sem alterações.
- Worktree técnica preservada: `/home/jlima/.codex/worktrees/nuv-12-order-number/indicioCult`, branch `codex/nuv-12-order-number`; relatório A–K não rastreado conservado byte a byte.
- Worktree documental: `/home/jlima/.codex/worktrees/nuv-12-coverage-doc/indicioCult`; branch `codex/nuv-12-coverage-adjudication`, criada isoladamente a partir de `origin/main`.
- O relatório histórico [NUV-12-evidence.md](./NUV-12-evidence.md) foi copiado integralmente para esta PR, sem reescrever o estado histórico BLOCKED, os resultados anteriores ou suas pendências. SHA-256 preservado: `9ef060d1f12a31f8b853f2077ce689c3e64cab3c3cd406ca216320560cf6a416`.
- Oito artefatos históricos foram também preservados fora do Git em `/home/jlima/.codex/evidence/nuv12-doc-adjudication-20261020/historical/`; o manifesto `preservation.json` no diretório pai registra origem, destino e hash. A cópia excluiu dependências e não substituiu os originais.
- Prompt desta execução: SHA-256 `28642c4897489735a09b2004ff5304a96be49a89a19d354c1e723d9902753b35`.

Não houve reset, clean, stash, descarte, amend, rebase, force-push ou alteração da branch técnica. Nenhum código, teste RED/GREEN, workflow, Dockerfile, dependência, lockfile, segredo, scope, OAuth, banco ou consumer é alterado nesta lane.

## 2. Arquivos e seções

Allowlist documental da proposta:

| Arquivo                                               | Papel                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `docs/specs/SPEC-nuvemshop.md`                        | Proposta em Orders e remissões em testes, handoff e critérios de aceite      |
| `tasks/nuvemshop/plan.md`                             | Proposta, interpretação do DAG preservado e impacto nos critérios/downstream |
| `tasks/nuvemshop/todo.md`                             | Notas nas tasks NUV-12/13/22/23/24/25, sem marcar tarefas concluídas         |
| `tasks/nuvemshop/NUV-12-COVERAGE-PARTIAL.md`          | Registro da decisão proposta, contraexemplo, critérios e matriz futura       |
| `tasks/nuvemshop/NUV-12-evidence.md`                  | Relatório A–K histórico preservado integralmente                             |
| `tasks/nuvemshop/NUV-12-COVERAGE-PARTIAL-evidence.md` | Evidência desta execução documental                                          |

## 3. Proposta e matriz de requisitos

O critério proposto aceita apenas uma resposta válida de coleção da primeira página, com `q` canônico, contagem explícita válida igual ao número de registros e IDs únicos observados, dentro de `perPage <= 200`, todos os candidatos validados e nenhuma navegação contraditória. Um match exato permite Order e ausência comprovada permite `null`; ambiguidade ou necessidade de mais respostas impede ambos. Todas as relações Link presentes, inclusive `last>1` sem `next`, precisam ser consideradas pela implementação futura.

Isso é política de aceitação proposta pelo projeto sob a semântica normal de uma resposta; não é garantia de snapshot do provedor. O critério não se reduz a count ou ausência de next. Retry NUV-05 não vira agregação de páginas para provar cobertura e não recebe novos limites nesta emenda. O pager atual descarta `last`; eventual adequação futura exige demonstração RED, análise de impacto e revisão próprias, sem autorização implícita de mudança shared nesta PR.

As fontes oficiais [Order 2025-03](https://nuvemshop.dev/en-US/api/resources/2025-03/order) e [paginação](https://tiendanube.github.io/api-documentation/intro#pagination) foram consultadas publicamente em 2026-10-20. Elas descrevem descoberta por número/texto e navegação/contagem; não foi identificada garantia que exclua o contraexemplo entre respostas. Não houve API de loja autenticada.

O [registro proposto](./NUV-12-COVERAGE-PARTIAL.md) contém a matriz de requisitos/testes futuros. Esses casos não foram escritos ou executados nesta lane. T03 geral multi-page permanece obrigação pendente: o teste negativo parcial não substitui seu aceite positivo. A sequência `[A,B,T,C] → [B,T,C,D]`, com contagem 4 e quatro IDs observados sem T continuamente presente, permanece registrada no A–K e na decisão.

NUV-12 parcial não significa NUV-12 completa. As arestas `12→22`, `12→23`, `01…23→24` e `24→25`, as 25 tasks e os gates do plano permanecem. A emenda não autoriza NUV-13, consumer `orders`, identidade/OTP, `/rastreio`, índice durável ou API real. HR-02, legado fiscal e CI-FONT-01 continuam com seus estados e owners existentes.

## 4. Delegações reais e revisão

Os modelos abaixo são configurações dos spawns do harness, sem atestação independente do backend. O harness não permite alterar ou verificar independentemente a identidade do modelo do orquestrador.

| Papel                    | Tarefa real          | Modelo / esforço configurados | Resultado                                                                                            |
| ------------------------ | -------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| A — auditoria contratual | `/root/doc_audit_a`  | `gpt-6.1-sol` / `high`        | Auditoria de impacto concluída antes da autoria                                                      |
| B — autoria              | `/root/doc_author_b` | `gpt-6.1-sol` / `medium`      | Quatro documentos normativos concluídos; somente inserções nos três existentes                       |
| C — revisão independente | `/root/doc_review_c` | `gpt-6.1-sol` / `high`        | PASS documental normativo: zero P0/P1/P2 material e nenhum P3 acionável; sem participação na autoria |

A não aprovou um diff inexistente: o aceite documental foi dado por C sobre o candidato. C confirmou ausência de falsa completude, preservação de T03 geral, DAG/downstream e coerência SPEC/PLAN/TODO, com gates humanos/HR-02/fiscal/CI-FONT-01 intactos. Link ausente por si só não impede suficiência quando o critério conjunto está demonstrado; ausência de metadata necessária, como totalCount, impede. Não se exige Link ou rate-limit opcional como novo certificado.

Parecer A: `/tmp/nuv12-doc-audit-a.md`, SHA-256 `31d2e241dd2cfd802e38a6402689073e5b580f12042efd48d4075df886d98b00`. Parecer normativo C: `/tmp/nuv12-doc-review-c.md`, SHA-256 `4ad863f446d4845c355dd1a71932ebadbc18d9abb92f5edfec7c2e46ea6b2355`. Cópias preservadas em `current/` no diretório externo de evidências. O suplemento final de evidência será vinculado ao hash deste arquivo no recibo externo, sem inserir hash autorreferencial neste relatório.

O PASS desta proposta não fecha o P2 histórico da prova geral multi-page, nem constitui aprovação humana da emenda, revisão de código de lookup, release ou autorização operacional.

## 5. Validação local

| Gate executado                                    | Resultado observado                                                                                                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integridade documental/allowlist/links relativos  | PASS: exatamente seis documentos, todos os destinos locais existem                                                                                                                |
| DAG e tasks                                       | PASS: arestas literais e linhas de dependências/gates intactas, 25 tasks, zero novo checkbox concluído                                                                            |
| Preservação                                       | PASS: checkout original limpo, worktree técnica com o mesmo relatório não rastreado, histórico byte a byte igual e oito snapshots/originais com hashes preservados                |
| Prettier e diff check, inclusive novos documentos | PASS; arquivos novos também examinados com `git diff --cached --check` após staging explícito da allowlist                                                                        |
| `npm run check`                                   | PASS, exit 0; lint, runtime/token lint, Prettier, TypeScript, 6 testes runtime + 135 tokens e 2.581/2.581 unitários em 34 arquivos, zero skip reportado; runner unitário 660,75 s |
| `npm run build`                                   | PASS, exit 0; TypeScript e 8/8 páginas                                                                                                                                            |
| RED/GREEN do lookup parcial                       | NOT RUN / NOT IMPLEMENTED; nenhuma fixture/teste/helper novo nesta lane                                                                                                           |
| Docker local/provider smoke                       | NOT RUN; CI existente e operação humana mantêm gates próprios                                                                                                                     |
| Gitleaks local                                    | UNAVAILABLE no PATH; nenhum scanner/dependência instalado; scanners existentes continuam gates do CI remoto                                                                       |

Os comandos de check/build foram executados com `env -i`, PATH preservado e configuração somente sintética: site localhost, URL pública de serviço em domínio `.invalid`, chaves sintéticas, manutenção false, `APP_VERSION` do baseline e telemetria Next desabilitada. Sem DSN/token Sentry, credenciais de loja ou `.env` privado. As 27 dependências diretas físicas copiadas coincidem com o lockfile; Node 22.23.1/npm 10.9.8. Nenhuma dependência ou configuração do projeto foi alterada.

Warnings observados: lint tem dois `_source` não usados em `boundary.test.ts:4817–4818`, arquivo idêntico ao baseline; testes existentes emitiram avisos GoTrue de múltiplas instâncias em fixtures sintéticas. Build avisou `cacheComponents` sem `partialPrefetching` e ausência de auth token Sentry, sem criar release. Não houve correção de runtime/fontes/Next/lockfile/Docker/workflows nesta emenda.

Check/build validam a árvore de runtime inalterada e os documentos normativos identificados abaixo. Este recibo foi atualizado posteriormente apenas com os resultados e conferido novamente por formato/integridade; não se reutiliza resultado histórico da NUV-11 ou do relatório A–K como gate novo. Os testes são controles existentes, não RED/GREEN da NUV-12.

| Artefato externo em `/home/jlima/.codex/evidence/nuv12-doc-adjudication-20261020/` | SHA-256                                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `check.log`                                                                        | `b07cea4f6634874ea89847561d86a35f22b5df82d1ea5fe010f5538a07af8998` |
| `build.log`                                                                        | `8b63ea29803ea5dd635c9e46d16322caf2a978a7f3cd7f351b27c4f6af3b77b7` |
| `integrity.json`                                                                   | `cb2c4b82e784c7761c026eae02a5f026a4ad061a9c94097c9f7ddb3cb77b29c7` |

## 6. Fingerprint revisado, commit e publicação

| Documento normativo     | SHA-256 revisado por C e validado localmente                       |
| ----------------------- | ------------------------------------------------------------------ |
| SPEC                    | `51f5df066630becb987be94a9341c7e53c89f57a3e3be6d9264f2c3bff096a8b` |
| PLAN                    | `6ed1fca793a4f4967be1db7c9d90629f7e094f25e3c3388a9436cbafcd5ec419` |
| TODO                    | `550b134b3f786ebd64d7aca68042dff1368d0c8d13d535570751e582fb76a7ec` |
| NUV-12-COVERAGE-PARTIAL | `5b8a3bd9b897c562e9e603183aaf6a836fe3eb5d909d9ed36718b36625838aba` |

Branch documental: `codex/nuv-12-coverage-adjudication`. Este registro é a fotografia local anterior ao commit/push: o commit que o contém identifica seus bytes. A publicação autorizada será uma PR **Draft**, base main, título `docs(nuvemshop): adjudicate partial NUV-12 lookup coverage`; não promove Ready nem altera a PR técnica.

SHA do commit/árvore publicada, número/URL da PR e observações de CI do HEAD exato serão comprovados no corpo da PR e no recibo externo `publication.json`. Isso evita autorreferência impossível do SHA dentro deste arquivo. Nesta fotografia, CI e revisão remota são NOT REQUESTED; após a publicação, consultar os estados efetivamente observados, sem promover pending/skipped a PASS. `db-types` é exclusivo do push em main pela política atual e não pode ser contado como PASS no evento PR.

## 7. Limites e pendências

- Decisão permanece **PROPOSED / PENDING HUMAN APPROVAL** mesmo após publicação e CI verde.
- Aprovação humana explícita e merge da emenda antecedem qualquer implementação parcial. Depois, reconciliar a branch técnica e executar RED/GREEN, regressões/boundary, revisão adversarial, gates locais/remotos e release por HEAD próprios.
- Cobertura multi-page/T03 e NUV-12 completa permanecem pendentes. Reabrir por garantia oficial verificável que exclua o contraexemplo ou índice durável com contrato próprio; nenhum dos dois é implementado aqui.
- NUV-22/23/24/25 e critérios integrais dos consumers permanecem bloqueados pelo requisito integral. Não há consumer, OTP, `/rastreio`, índice, migration ou API real nesta lane.
- HR-02 permanece OPEN; legado fiscal permanece diferido, modern-only `incomplete` inclusive vazio; CI-FONT-01 continua OPEN, confirmado na issue #47. Nenhum merge/deploy foi executado ou autorizado por este estado.

## 8. Resultado documental e próxima decisão

**DOCUMENTAL_READY_FOR_HUMAN_ADJUDICATION** quanto ao conteúdo proposto e aos gates locais documentados, condicionado à comprovação de publicação Draft no recibo externo/corpo da PR. Este estado não ratifica a proposta ou conclui a NUV-12 técnica. A decisão humana necessária é avaliar/aprovar a emenda normativa; sua implementação parcial aguarda também o merge humano da emenda. Os resultados de CI observados após o push serão apresentados separadamente.

## 9. Registro posterior — ratificação da opção 2

Data: 2026-10-20, posterior ao merge da PR #49. As seções 1–8 permanecem o snapshot histórico **PROPOSED / PENDING HUMAN APPROVAL** e não foram reescritas.

O responsável humano pelo projeto ratificou, nesta data, a opção 2 para execução técnica limitada. A ratificação não é aceite de testes, conclusão da NUV-12, T03-GENERAL, nem autorização de merge ou deploy. A evidência dessa execução está em [NUV-12-PARTIAL-evidence.md](./NUV-12-PARTIAL-evidence.md).
