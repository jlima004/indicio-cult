# NUV-15 — Business & Lifecycle Webhook Schemas

Data: 2026-10-24. Evidência local/sintética. Este documento é uma fotografia pré-publicação; recibos remotos posteriores devem ser vinculados ao candidate SHA na PR, sem commit circular para atualizar o próprio SHA.

## A — Executive Summary

**NUV-15 / LOCAL_PASS / REMOTE_PENDING — fotografia pré-publicação.** GREEN final, revisão adversarial r2, testes focados, boundary, check integral e build aprovados. Auditorias finais de identidade/publicação e recibos remotos serão anexados à PR no SHA exato. Implementação delimitada de autenticação + classificação server-only dos sete topics. Nenhuma rota, ACK, receipt, dispatcher, persistência, subscription ou efeito de lifecycle/privacy é implementado.

## B — Baseline

| Item                                         | Evidência                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Repositório                                  | `jlima004/indicio-cult`                                                                      |
| Baseline definitiva / origin/main após fetch | `bd3dc42c781b87d12170e00bbe3324d5a4b4bf8d`                                                   |
| Checkout original                            | `/home/jlima/Projetos/indicioCult`, `main`, limpo no preflight                               |
| Worktree isolada                             | `/home/jlima/.codex/worktrees/nuv-15-webhook-schema/indicioCult`                             |
| Branch                                       | `feat/nuv-15-webhook-event-schema`                                                           |
| Runtime                                      | Node `v22.23.1`, npm `10.9.8`                                                                |
| Dependências                                 | Cópia materializada do `node_modules` existente; nenhum install, pacote ou lockfile alterado |
| Candidate                                    | Commit que contém esta fotografia; SHA exato e recibos posteriores na PR                     |

`git fetch origin`, status/HEAD/branch, inventário de worktrees e consulta de PRs abertas executados antes de escrever. A confirmação live posterior está em `/tmp/nuv-15-evidence/preflight-live-receipt.json`, com fetch e consulta de PRs em recibos separados; a fase posterior é rotulada e não é apresentada como captura anterior à autoria. Nenhuma PR aberta retornada; não havia worktree NUV-15. Worktrees anteriores preservadas. NUV-07 [PR #34](https://github.com/jlima004/indicio-cult/pull/34), merge `be617b71c80c65d6621d22f966245514e97344c9`, e NUV-14 [PR #55](https://github.com/jlima004/indicio-cult/pull/55), merge `b305d8aa9771aafc8b08d73856412a8604c8f787`, confirmadas merged e ancestrais da baseline. NUV-13 [PR #59](https://github.com/jlima004/indicio-cult/pull/59) é o merge da baseline, sem se tornar predecessor adicional de NUV-15.

CI privilegiada da baseline [40053478838](https://github.com/jlima004/indicio-cult/actions/runs/40053478838): `ci` e `db-types` SUCCESS. Deploy histórico [40054187730](https://github.com/jlima004/indicio-cult/actions/runs/40054187730): SUCCESS no mesmo SHA; steps de espera do Coolify, health e identidade da release efetivamente SUCCESS. Esta consulta foi somente leitura e não comprova webhook operacional. Preflight HMAC: 62/62 PASS. AUTH GRANTED e HR-01 CLOSED corroborados no PLAN/HR-01; o NOT GRANTED histórico do fechamento de HR-01 antecede a autorização posterior.

Allowlist inicial: `server/webhook-schema.ts`, teste correspondente, este relatório e `server/index.ts` opcional. Expansão condicional justificada: `src/lib/env/nuvemshop.ts` e seu teste, para ler loja confiável sem exigir token de leitura da API, reutilizando a validação existente. Demais arquivos normativos/protegidos permanecem fora do diff.

## C — Subagents

Chamadas reais ao mecanismo nativo, com contextos separados. Configurações abaixo são as solicitadas e aceitas pelo harness, sem atestação independente da identidade interna do backend. O modelo da sessão orquestradora não é alterável por esta task.

| Papel                                | Configuração solicitada | Autoria / resultado                                                                                              |
| ------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A — Contract & Security Auditor      | `gpt-6.1-sol`, high     | Read-only, CONTRACT_COMPATIBLE; sem autoria de implementação/testes                                              |
| B — RED Test Engineer                | `gpt-6.1-sol`, medium   | Testes independentes; RED válido 143 falhas/97 controles PASS                                                    |
| C — Implementation Engineer          | `gpt-6.1-sol`, high     | GREEN final 302/302; remediações verificadas na revisão r2                                                       |
| D — Independent Adversarial Reviewer | `gpt-6-luna`, xhigh     | r1 superada; r2 APPROVE dos hashes finais, zero findings abertos, sem autoria                                    |
| E — Evidence & Release Auditor       | `gpt-6.1-sol`, medium   | Preaudit e auditoria incremental sem finding material; recibos finais do pacote local/remoto serão anexados à PR |

Sem escrita concorrente no mesmo arquivo: B possui testes; C possui implementação/env/barrel; orquestrador possui relatório/integração. D/E são read-only. A revisão com modelo diferente foi explicitamente escolhida pelo owner no pedido (D/Luna); nenhum CLI externo de revisão é necessário.

## D — Contract Audit

A leu SPEC §8/11, PLAN, TODO NUV-15, NUV-14-evidence, NUV-READINESS-01-evidence, ADR-004, HR-01, verifier/erros/IDs/decoder/tipos/barrels/env e testes existentes. Parecer: **CONTRACT_COMPATIBLE**, sem contradição material ou bloqueio de dependência local. NUV-12-FULL não é predecessor. Snapshots históricos de autorização/readiness não substituem o código e as referências atuais.

[Documentação oficial API 2025-03](https://nuvemshop.dev/en-US/api/resources/2025-03/webhook), consultada em 2026-10-24: parâmetros comuns `store_id`/`event`; `id` de produto/pedido é recurso; `id` de uninstall é App ID; não há ID adicional documentado para suspended/resumed. A página não prova configuração, assinatura, entrega real ou subscription da aplicação.

Todos os resultados conhecidos incluem somente `event`, `storeId` e `correlationId` local, acrescidos da coluna final:

| Topic             | Campo adicional requerido | Saída adicional |
| ----------------- | ------------------------- | --------------- |
| `product/updated` | `id` Product              | `resourceId`    |
| `order/paid`      | `id` Order                | `resourceId`    |
| `order/fulfilled` | `id` Order                | `resourceId`    |
| `order/cancelled` | `id` Order                | `resourceId`    |
| `app/uninstalled` | `id` App                  | `appId`         |
| `app/suspended`   | nenhum                    | nenhuma         |
| `app/resumed`     | nenhum                    | nenhuma         |

Privacy local: `store/redact`, `customers/redact`, `customers/data_request`. Nomes na fonte oficial atual: `app/store_redact`, `customer/redact`, `customers/data_request`. A união exata desses nomes é rejeitada antes da política unknown; são nomes locais/oficiais distintos, sem afirmar aliases suportados pelo provider nem adicionar tradução/parsing. Callbacks reais sem `event` também não satisfazem este envelope. Endpoints, autenticação privacy, retenção/resposta pertencem a HR-08/NUV-20.

## E — RED Matrix

B escreveu testes antes de qualquer implementação funcional. Oráculo WebCrypto independente da função Node de produção, com controle RFC 4231. Carregamento ausente usa asserção executável de capability; nenhum import inexistente fabrica o RED.

Comando: `npm run test -- tests/unit/modules/nuvemshop/webhook-schema.test.ts tests/unit/lib/env/nuvemshop.test.ts`.

**RED final: exit 1; 240 testes executados; 143 falhas esperadas, 97 PASS.** Schema: 132 total, 127 ausências do classifier, 5 controles existentes PASS. Env: 108 total, 16 ausências do getter, 92 controles anteriores PASS. Log `/tmp/nuv-15-evidence/red-final.log`, SHA-256 `42e26008b5ebe69ee5b55eb0a920d7dfc2135d2cc4bd16e2c52a357d88075635`.

Primeira tentativa teve erro sintático no teste e **não é evidência RED**; log descartado para o gate e preservado em `/tmp/nuv-15-evidence/red-tests.log`. Depois da correção de sintaxe houve RED válido; correção posterior somente de naming para lint preservou 143/97 no RED final. Nenhuma implementação foi liberada por falha de setup/import.

| Matriz                | Casos executáveis                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Positivos             | 4 business, uninstall/App ID, suspended/resumed sem ID, loja autorizada, decimal grande, unknown sob política sintética explícita                             |
| Autenticidade/leitura | HMAC ausente/inválido/duplicado/combinado, bytes alterados, JSON não interpretado antes de auth, UTF-8 inválido, excesso e limite exato, consumo único, abort |
| Envelope/identidade   | Top-level inválido, loja ausente/cruzada/malformada, resource/app ID ausente/inválido, frações/exponentes/rounding, strings não canônicas, limite de dígitos  |
| Unknown/privacy       | Default deny, false/nonboolean/Promise/throw, input de body/header não autoriza política, privacy oficial/local não consulta policy, nenhum ID fictício/ACK   |
| Projeção/segurança    | Extras descartados, correlação local, erro fixo sem secret/PII/body/HMAC, zero fetch/logs                                                                     |
| Duplicatas            | Semântica comprovada do decoder nativo last-key-wins; duas direções de store/event/id; nenhum novo requisito de rejeição inventado                            |
| Env                   | Getter mínimo sem token/secret, mesma validação de loja, leading zeros preservados no getter, leitura lazy por operação e rejeição de prefixos públicos       |

## F — GREEN / REFACTOR

GREEN inicial (fotografia anterior às remediações abaixo): 302/302 testes focados (schema 132, env 108, HMAC 62), exit 0. Log histórico `/tmp/nuv-15-evidence/green-c-final-focused.log`, SHA-256 `6ebf4e6515cde0c352f75f4042901a095d7bf3ffd0e206939ea4944a3280e898`. Getter foi validado primeiro (env 108/108), depois o fluxo integrado. O refinamento pós-GREEN para quatro membros business literais iguais à SPEC expôs TS2322 no return compartilhado. O primeiro boundary, iniciado antes do refinamento de tipos, falhou (282 falhas/316 PASS, 598 total, 597,90 s), sem relaxar o harness. O diagnóstico curto confirmou o erro de atribuição; C corrigiu somente o módulo novo com retornos por topic literal e helper privado de ID, sem casts. A assinatura e a união pública foram preservadas. Esse finding material P2 de validação foi retido no histórico e sua correção confirmada independentemente em r2.

O typecheck também encontrou TS2345 na tabela HMAC de B: linhas array eram espalhadas pelo it.each, então os sete negativos integrados do GREEN anterior apenas comprovavam rejeição de shape do argumento. B corrigiu para objetos `{ signatures }`, preservou todos os casos e acrescentou spy que chama o verifier original e comprova Request/array exatos. Essa lacuna material P2 de teste não é omitida: HMAC 62/62 existente continuava válido, mas aqueles sete negativos integrados só passam a ser comprovados após a correção. A contagem se mantém 132 schema/108 env/62 HMAC.

Final pós-remediação: `npm run test -- tests/unit/modules/nuvemshop/webhook-schema.test.ts tests/unit/modules/nuvemshop/webhook-auth.test.ts tests/unit/lib/env/nuvemshop.test.ts` → **302/302 PASS**, `/tmp/nuv-15-evidence/final-focused.log`. `npm run typecheck` (next typegen + tsc --noEmit) → **PASS**, 10,00 s. Diagnóstico tsc isolado pré-typegen com LayoutProps ausente não é chamado de PASS; o comando oficial gerou os tipos e passou.

Decisão de interface acordada antes do GREEN: único `classifyNuvemshopWebhook(Request, signatureValues, options?)` público, sem parser público de objeto/string que pudesse aparentar prova criptográfica. Policy opcional é função síncrona confiável do caller server-only, separada do webhook; somente `=== true` pode habilitar elegibilidade. Nenhuma policy operacional foi aprovada.

O fluxo delega o read/HMAC ao verifier intocado; usa TextDecoder fatal, decodeObject e readDecimalId existentes. Um brand check nativo rejeita objetos/strings na entrada pública sem consumir o body. A loja vem de getter lazy que seleciona somente a chave existente de store no schema API; configuração com zeros iniciais preserva a aceitação anterior e é comparada sem Number à identidade canônica. Correlação UUID é local e não representa deduplicação.

`server/index.ts` não precisou mudar: assim como o verifier NUV-14, o classifier possui export direto no arquivo server-only. Tipos ficaram colocados nesse módulo; não houve expansão para tipos/schemas/barrels/boundary compartilhados. C fez revisão de simplicidade e não introduziu abstrações adicionais. O limite local de topic é 256 caracteres com gramática ASCII family/action, para minimizar projeção; não é fato externo do provider.

Manifesto final dos arquivos funcionais/testes após remediação, conferido na revisão r2 de D (SHA-256):

| Arquivo                                               | SHA-256                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `src/modules/nuvemshop/server/webhook-schema.ts`      | `01bdc93b46f5b2715ba294059b68aaae701d59c3612015b144a5b9cc178ba9b0` |
| `src/lib/env/nuvemshop.ts`                            | `ccb918acc80352fa3c1fd5489ecc73cd64a9045b6c24f697934e7ba1e976e09c` |
| `tests/unit/modules/nuvemshop/webhook-schema.test.ts` | `c7689193c05289087f55db4b3701a1efb93e6391c010aa611c864d1c2c4cc019` |
| `tests/unit/lib/env/nuvemshop.test.ts`                | `14a8fc4966cb46044460bf4d6e3f016abff6cc7811e4ffd2a4ecf8bc9db603a0` |

## G — Validation

| Gate                       | Resultado atual                                                         |
| -------------------------- | ----------------------------------------------------------------------- |
| Schema + HMAC + env finais | PASS 302/302 (132 + 62 + 108)                                           |
| `npm run typecheck` final  | PASS (next typegen + tsc)                                               |
| Boundary inicial           | FAIL 282/598 por TS2322; resultado preservado, não é PASS               |
| Boundary pós-remediação    | PASS 598/598, 618,20 s, `/tmp/nuv-15-evidence/final-boundary.log`       |
| `npm run check` final      | PASS: 2.888 unitários + 141 tooling, zero skips, exit 0, 629,04 s       |
| `npm run build` final      | PASS, 8/8 páginas, 33,34 s                                              |
| Diff/escopo final          | PASS: cinco arquivos allowlisted; `git diff --check` e formatação final |

Comandos completos e logs preservados em `/tmp/nuv-15-evidence/`. `green-c-boundary.log` SHA-256 `9890f009f6013189afbff67cd93272373b76223ee6609e33f4b22eb681d7771a` retém a falha inicial; `green-c-type-diagnostic.log` e `green-c-remediation-type-diagnostic.log` retêm a causa e a eliminação de TS2322. `red-b-type-before.log`, `red-b-type-after.log` e `red-b-remediation-focused.log` retêm a remediação do teste. Nenhum erro foi filtrado, assertion removida, teste desabilitado no código ou timeout alterado. Os controles diagnósticos focados descritos abaixo selecionam somente um caso; casos não selecionados não são PASS.

Os comandos oficiais finais usam configuração somente no processo, sintética e com credenciais do provider removidas; nenhum arquivo de secrets foi criado ou copiado para a worktree. Não transferir resultados de outro HEAD nem converter SKIPPED em PASS.

Primeiro `npm run check` integral pós-remediação: **FAIL**, exit 1, 2.887 PASS e um timeout entre 2.888 unitários; tooling 6 + 135 PASS. Tempo 657,00 s. Única falha: boundary, `resolves adapter server-to-root reference paths without module extension substitution`, limite original 5.000 ms. Logs preservados em `check-initial-failed.log` e receipt correspondente. Não é convertido em PASS pelo sucesso isolado anterior.

Controle comparativo executado sequencialmente nos dois checkouts, com `npm run test -- tests/unit/modules/nuvemshop/boundary.test.ts -t 'resolves adapter server-to-root reference paths without module extension substitution'`: baseline original `bd3dc42` **FAIL timeout 5.000 ms**, candidato congelado **FAIL timeout 5.000 ms**. Cada controle executa um caso e deixa 597 fora da seleção; não é gate completo nem 597 PASS. Logs `boundary-timeout-baseline.log` e `boundary-timeout-candidate.log`. O boundary protegido é idêntico nos dois checkouts. Classificação: limite de tempo reproduzido na baseline; não é prova de eliminação de intermitência nem análise quantitativa de regressão. Nova execução integral inalterada somente depois dessa classificação, sem mudança de código/configuração/timeout e sem substituir o gate por testes focados.

Segunda execução integral, inalterada, depois dos controles baseline/candidato: **PASS**, exit 0, **2.888/2.888 unitários em 38 arquivos e 141/141 tooling**, zero falhas/skips. Tempo externo 629,043 s; Vitest 609,85 s. Não elimina a falha anterior nem comprova correção da intermitência. Dois warnings históricos de lint no boundary permanecem; zero erros. Nenhuma otimização, fixture reduzida, worker/timeout alterado ou teste desabilitado.

Logs finais, SHA-256:

| Log                              | SHA-256                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `final-focused.log`              | `c48326216e5f000fc66cd14ff25d6ea7eac387f1b512d3596dbf519de871e0ec` |
| `final-typecheck.log`            | `66820daf428d07421edaeb2bf57881a2e749e8b8f2e5a4029e999bd43d9b5a7a` |
| `final-boundary.log`             | `c69352b33e96f625b9d66871ce78fa78b5abff6449875eaad37bdaf5b0601d98` |
| `final-check.log`                | `1eabbcd3e6813d803f6d65f89c201670e96d514c5fb3dcb8ad1257dc7dd7a0cb` |
| `final-build.log`                | `c96763daa0b557b22c0a37257f7057d0b167206a0e2d526c6601fd59fca68b66` |
| `check-initial-failed.log`       | `972b0fb0faa12dbaef6fd506b461d9bd68575f9d409aef5e2c57f031cac5c4da` |
| `boundary-timeout-baseline.log`  | `2024cc391dd03fe94424c4d5357691723f52a1bf6d3cdbca270e9acccf0e5287` |
| `boundary-timeout-candidate.log` | `d4958b3d0c5e521d56134a48799c3df24c2be30a1ac827cf0fe1768eb80d206a` |

Build final: exit 0, 8/8 páginas, `/tmp/nuv-15-evidence/final-build.log` e receipt com 33,336 s. Scan local de quatro marcadores de servidor selecionados em 15 arquivos JavaScript de `.next/static`: PASS, `/tmp/nuv-15-evidence/client-bundle-scan.log`. Esse scan delimitado não é prova exaustiva de ausência de todo secret.

## H — Independent Review

D (`gpt-6-luna`, xhigh, contexto novo e sem autoria) inicialmente aprovou implementação/testes em r1, zero findings naquele parecer. Esse parecer (`/tmp/nuv-15-evidence/review-d.md`, SHA-256 `273b9540ea76b751ae0d2937fbe6d209cb3f6cb56e71ddba9d281eb3c7bfd2da`) é **SUPERSEDED** para o candidato após as remediações de tipo/teste. Não se transfere aprovação de hash anterior. Os dois P2 encontrados pela validação foram submetidos a nova revisão independente dos bytes finais: r2 **APPROVE** dos novos hashes de source/teste, zero findings P0/P1/P2/P3 abertos. Parecer `/tmp/nuv-15-evidence/review-d-r2.md`, SHA-256 `1f349596361b61cdca861ffd6df5370f855a2b8e426ddc3dde52070d819151e9`. D releu o diff completo, verificou os diagnósticos antes/depois, o typecheck oficial PASS e os negativos corrigidos que chegam ao verifier original. Os dois P2 históricos estão resolvidos; não se apaga sua ocorrência. O documento/manifesto é congelado após as validações; a confirmação final de identidade por D será registrada fora do commit, junto aos recibos da PR, preservando a identidade do candidato.

E conferiu RED canônico, escopo e arquivos protegidos: preaudit sem finding material, `/tmp/nuv-15-evidence/preaudit-e.md`. As auditorias finais do pacote congelado e dos resultados remotos serão registradas em recibos externos vinculados à PR/candidate, sem alterar este documento para inserir seu próprio SHA. Nenhum parecer pré-publicação é apresentado como revisão de CI/review remoto ainda inexistente.

## I — Security & Privacy

Threat model: tampering/HMAC, confused deputy entre lojas, perda numérica, privacy capturado por unknown, disclosure de extras/erros, SSRF/efeitos externos, recursos/consumo de stream e importação client-side. Critérios: autenticar bytes originais pelo verifier NUV-14 intocado; fatal UTF-8/JSON somente depois; loja confiável independente de access token; IDs via decoder/readDecimalId existentes; saída mínima; unknown fail-closed; privacy separado; nenhum ACK/intenção/receipt/probe/lifecycle operacional.

Limitações herdadas: a API recebe multiplicidade de assinatura preservada pelo caller; não recupera headers já combinados/normalizados nem prova transporte HTTP real. Lifetime de ingress/chunks intermináveis continua NUV-19. `id` nunca é delivery ID, e classificação não prova frescor, ordering, deduplicação, completude ou persistência. Duplicatas seguem o decoder contratado; política de topic/length é segurança local, sem promessa de formato do provider.

## J — Publication / Remote CI

**PENDING pré-publicação.** Nenhum commit, push, PR, CI/review remoto da NUV-15 é declarado concluído nesta fotografia pré-publicação. Após LOCAL_PASS e revisão independente: commit convencional, push da branch isolada, PR Draft contra main, identidade remota e uma solicitação Codex Review se ainda necessária. Recibos remotos na PR vinculados ao SHA; `db-types` em PR pode ser SKIPPED e não equivale ao gate privilegiado em main.

## K — PM Handoff

Estado desta fotografia: **NUV-15 / LOCAL_PASS / REMOTE_PENDING**. A recomendação técnica final depende dos recibos remotos e da auditoria final do pacote; não equivale a Ready for Review no GitHub. Dois P2 históricos foram corrigidos e revistos; zero P0/P1/P2/P3 abertos no parecer r2. O timeout reproduzido na baseline permanece risco de validação, sem alegação de eliminação. HR-02/03/06/07/08 permanecem OPEN; HR-04 e NUV-12-FULL/T03-GENERAL também não são fechados por esta task. NUV-16/17/18/19/20/24 continuam com escopos/gates próprios.

Merge e deploy exigem autorização humana posterior específica no HEAD aprovado. Não converter Draft em Ready automaticamente. Nenhuma atividade real autenticada da Nuvemshop, configuração, secret, webhook real ou infraestrutura/DB de produção é autorizada. Rollback futuro, se release for aprovada, pode reverter esta adição isolada; não há migração, dados ou rota operacional para desfazer nesta entrega.
