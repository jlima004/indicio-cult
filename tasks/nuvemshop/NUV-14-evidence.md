# NUV-14 — Raw webhook HMAC verification

Data: 2026-10-21 (America/Sao_Paulo). Evidência exclusivamente local/sintética. Este relatório não altera SPEC, PLAN, TODO, ADRs ou HRs.

## A — Executive Summary

Implementação do verifier de bytes brutos com o `client_secret` atual, HMAC-SHA256, header hexadecimal estrito, comparação criptográfica dos digests e leitura bounded de até 1.048.576 bytes. A autenticação entrega somente bytes; parsing, validação da loja, HTTP/ACK, persistência e operação real pertencem às tasks seguintes.

Fotografia de preparação: **LOCAL_CHECKS_PASS / FINAL_BINDING_PENDING / PUBLICATION_PENDING / REMOTE_PENDING**. Os recibos posteriores de commit, PR, HEAD, CI e Codex Review ficarão no corpo/comentários da PR, vinculados ao SHA integral, para evitar autorreferência e novo commit que invalide os próprios checks. Nenhum estado pendente equivale a PASS.

## B — Baseline

| Campo                                   | Evidência                                                                                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositório                             | jlima004/indicio-cult                                                                                                                                             |
| Baseline local e origin/main após fetch | ab70a3a6262ebcfc020a2790d9179148356dae35                                                                                                                          |
| Baseline upstream                       | PR #54 mergeada; verifier ausente no código antes desta execução                                                                                                  |
| Checkout original                       | /home/jlima/Projetos/indicioCult, main, limpo no preflight                                                                                                        |
| Worktree isolada                        | /home/jlima/.codex/worktrees/nuv-14-raw-hmac/indicioCult                                                                                                          |
| Branch                                  | feat/nuv-14-raw-hmac                                                                                                                                              |
| Preflight                               | pwd, status --short, branch --show-current, rev-parse HEAD, fetch origin, rev-parse origin/main, worktree list                                                    |
| Allowlist                               | server/webhook-auth.ts, tests/unit/modules/nuvemshop/webhook-auth.test.ts e este relatório; exceção necessária: tests/unit/modules/nuvemshop/boundary.test.ts (I) |
| Runtime                                 | Node v22.23.1; npm 10.9.8; Next 16.4.1                                                                                                                            |
| Dependências                            | Cópia materializada do node_modules já instalado, sem instalação ou alteração de dependências; nenhum .env copiado                                                |
| Lockfile baseline                       | SHA-256 2a6e6077d46d953ee4fbeac8a776d3e0d0c79f996edcca7e3c045c740bf8d14b                                                                                          |
| Preservação                             | Checkouts existentes preservados; sem reset, clean, stash, discard, amend, rebase ou force-push                                                                   |

## C — Subagents

Configurações solicitadas ao harness, sem atestar o backend efetivamente servido. Orquestrador solicitado pelo usuário: GPT-6.1 Sol Alto; esta sessão não oferece atestação independente da sua identidade.

| Papel                                | Modelo / esforço solicitados | Entrega                                                                  |
| ------------------------------------ | ---------------------------- | ------------------------------------------------------------------------ |
| A — Contract & Security Auditor      | gpt-6.1-sol / high           | Contrato/threat model e segurança final APPROVE; P2 de aborto corrigido  |
| B — RED Test Engineer                | gpt-6.1-sol / medium         | Matriz própria e RED antes de implementação                              |
| C — HMAC Implementation Engineer     | gpt-6.1-sol / high           | GREEN 62/62; correções precedidas por RED real                           |
| D — Independent Adversarial Reviewer | gpt-6-luna / xhigh           | APPROVE nos hashes de código/testes; sem autoria; vínculo final pendente |
| E — Release & Evidence Auditor       | gpt-6.1-sol / medium         | Pendente; auditoria do pacote e gates                                    |

A e investigação de B ocorreram em paralelo. C só recebeu autorização para escrever produção após RED comprovado. Os autores não escrevem concorrentemente no mesmo arquivo. O orquestrador consolida evidências; D mantém independência da autoria. E foi interrompido por limite de uso do serviço antes de concluir seu primeiro turno; após o usuário pedir Continue, o mesmo agente retomou e produziu auditoria real. Nenhum parecer foi inventado para o turno interrompido.

## D — Contract Audit

Fontes normativas lidas: [SPEC §11](../../docs/specs/SPEC-nuvemshop.md#11-webhooks), [TODO NUV-14](todo.md#nuv-14--verificador-hmac-de-bytes-brutos), [PLAN](plan.md), [readiness](NUV-READINESS-01-evidence.md), [ADR-003](../../docs/decisions/ADR-003-nuv-12-cobertura-integral.md), [ADR-004](../../docs/decisions/ADR-004-nuvemshop-dag-consumer-boundaries.md) e [HR-01](HR-01.md). NUV-01/02/03 têm código upstream; não existe verifier prévio. A materialização posterior governa os snapshots históricos de DAG/autorizações; nenhuma mudança normativa é necessária aqui.

Não há arquivo HR-03 separado. PLAN Human checkpoints, TODO NUV-14 e readiness preservam **HR-03 OPEN**: permite implementação sintética single-secret, bloqueia HMAC operacional até decisão factual e eventual reconciliação autorizada NUV-02/14. HR-01 CLOSED não substitui autorização de release. NUV-13 é independente; NUV-15 não é implementada nesta execução.

Fontes primárias consultadas em **2026-10-21**:

- [Nuvemshop Webhook API 2025-03](https://nuvemshop.dev/en-US/api/resources/2025-03/webhook), seção Verifying a webhook: header `x-linkedstore-hmac-sha256`, chave `client_secret` da aplicação, corpo original antes de parsing/modificação; access token da loja não é a chave. O exemplo usa `hash_hmac('sha256', ...)`.
- [PHP hash_hmac](https://www.php.net/manual/en/function.hash-hmac.php): saída padrão hexadecimal quando binary=false. Isso fundamenta 64 hex/32 bytes, sem reproduzir a comparação simples do exemplo PHP.
- [Node 22 Crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html): createHmac/update/digest e timingSafeEqual, com entradas de mesmo tamanho. O tempo constante aplica-se à comparação dos digests, não a toda a operação.
- [Node 22 Web Streams](https://nodejs.org/docs/latest-v22.x/api/webstreams.html): getReader/read/cancel/releaseLock públicos. Nenhum estado interno de stream é inspecionado.
- Guia local Next instalado: node_modules/next/dist/docs/01-app/02-guides/server-and-client-boundary.md e seção Preventing environment poisoning de 01-app/01-getting-started/05-server-and-client-components.md. `server-only` impede entrada no grafo cliente.

A documentação do provider prova contrato documentado para subscriptions API; não comprova entrega da app específica, rotação ou autenticação real de callbacks privacy. HR-02/03/06/08 e NUV-24 permanecem próprios.

## E — RED Matrix

Comando: `npm run test -- tests/unit/modules/nuvemshop/webhook-auth.test.ts`.

Referência: baseline ab70a3a6262ebcfc020a2790d9179148356dae35, sem arquivo de implementação. Teste final RED SHA-256 6fc7dd723b0dad2782cb7ee9e4b35170d00184f7685759ef1654ffda8a729f16 (após ajuste apenas de tipos/formato, ainda sem implementação). **52 cenários: 49 FAIL esperados, 3 PASS de controles**, duração 739 ms. A suíte foi coletada e executada; não houve erro artificial de resolução/importação.

O loader verifica existência antes do import dinâmico e cada cenário dependente exige a capacidade exportada. Os negativos iniciais falham nessa asserção de funcionalidade ausente, inclusive H27 pela ausência do módulo; não se apresentam como execução de um algoritmo anterior existente. Os três controles positivos independentes exercitam WebCrypto/RFC 4231 case 2, configuração HMAC upstream e projeção de WebhookError. Não houve stub de produção durante RED.

| IDs     | Comportamento exigido                                                                                                                                                              | Resultado GREEN |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| H01     | Bytes originais + assinatura hex correta                                                                                                                                           | PASS            |
| H02–H09 | Ausente/vazio/duplicado/combinado/Base64/comprimento incorreto/não hex                                                                                                             | PASS            |
| H10–H12 | Outro corpo, um byte alterado, JSON equivalente reserializado                                                                                                                      | PASS            |
| H13–H14 | UTF-8 fragmentado e view com offset/comprimento próprios                                                                                                                           | PASS            |
| H15–H19 | Exatamente 1 MiB, +1 byte, Content-Length ausente/enganoso, fragmentação                                                                                                           | PASS            |
| H20–H21 | Falha de leitura, consumo repetido e lock externo                                                                                                                                  | PASS            |
| H22–H24 | Configuração ausente/inválida, access token irrelevante, secret incorreto                                                                                                          | PASS            |
| H25–H26 | Non-JSON autenticado sem parse; erros/logs sem dados sensíveis                                                                                                                     | PASS            |
| H27–H28 | Server-only real; configuração current por operação, sem fallback                                                                                                                  | PASS            |
| H29–H30 | Whitespace/CRLF divergentes rejeitados; bytes binários preservados                                                                                                                 | PASS            |
| Extras  | Prefixo/sufixo/whitespace do header, hex maiúsculo, chunks vazios, buffer reutilizado, cancelamento que lança/rejeita/não resolve, aborto pendente, stream vazio, Request sem body | PASS            |

Oracle independente: fixtures assinadas por WebCrypto importKey/sign; produção usa createHmac. Um vetor fixo RFC 4231 verifica o oracle. Apenas fixtures sintéticas; nenhuma assinatura, payload ou secret real é incluído neste relatório.

## F — GREEN / REFACTOR

Interface interna aprovada: `verifyNuvemshopWebhook(request: Request, signatureValues: readonly string[]): Promise<Uint8Array>` em [webhook-auth.ts](../../src/modules/nuvemshop/server/webhook-auth.ts), importável diretamente no boundary servidor futuro. Nenhum export adicional em barrels root/server.

O caller fornece valores obtidos de representação confiável do ingress. Exatamente um valor primitivo de 64 hex deve ser aceito. Helpers privados separam validação de assinatura, leitura bounded e autenticação. Somente após EOF sem falha/aborto o corpo pode ser devolvido como bytes autenticados; o retorno não é VerifiedWebhookEvent, AuthorizedStore ou evidência de persistência.

GREEN inicial: **52/52 PASS**. Durante a revisão mínima do reader, foi reproduzido um defeito real: uma subclasse Uint8Array sobrescrevia byteLength com 0 ou 1, fazendo a contagem autenticar um prefixo em vez dos bytes originais. B acrescentou quatro controles comportamentais antes da correção de C: **RED 4 FAIL / 57 PASS / 61 total**, 1,25 s, implementação inicial SHA-256 af198a0c513bcadf2b3a050256dbac4fc10de721dbaec50573cc7fee6378e0c2. Não são apenas guardas de capacidade ausente: assinatura truncada era indevidamente aceita e assinatura integral indevidamente rejeitada.

A correção mínima lê o tamanho intrínseco com `Reflect.get(Uint8Array.prototype, 'byteLength', value)` e o usa antes de copiar e na contagem cumulativa. O mesmo arquivo de testes congelado passou **61/61**, 1,19 s, sem nova API/abstração ou alteração de timeout. A cópia TypedArray preserva o comprimento real e o offset da view. Consumo parcial com lock liberado, concorrência, aborto prévio, chunk não byte e aborto junto ao EOF acrescentam cobertura; já passavam antes dessa correção, sem alegação de outro defeito demonstrado.

Uma tentativa intermediária registrou os quatro negativos reais e um timeout H15: a asserção recursiva de igualdade de 1 MiB levou 7.313 ms contra o limite existente de 5.000 ms. O teste passou a conferir comprimento exato e igualdade de todos os bytes com Buffer.equals nativo, mantendo a mesma obrigação e o timeout. Essa comparação existe apenas no teste do corpo, nunca no comparador HMAC de produção. O RED completo após essa otimização manteve somente as quatro falhas reais; não houve skip, timeout aumentado ou teste removido.

REFACTOR mínimo: três funções, um único export; validação de assinatura, reader e orquestração criptográfica separados. O storage fixo evita retenção proporcional ao número de chunks, inclusive vazios. Request sem body é rejeitado conservadoramente; stream não nulo vazio aceita HMAC correspondente. Não há reserialização, decodificação textual ou normalização.

## G — Security Evidence

Threat model aprovado por A: spoofing/tampering em assinatura/corpo; DoS por corpo/fragmentação/cancelamento; disclosure de secret/header/payload via erros; confusão entre autenticidade, autorização da loja e frescor.

Critérios: chave obtida exclusivamente de getNuvemshopHmacConfig por operação; sem leitura eager, access token, credenciais API ou previous secret. Erros de input/leitura/autenticidade usam NuvemshopWebhookError sem cause não sanitizada. Configuração mantém a falha segura já existente em NUV-02 (Error genérico sem valores), sem inventar taxonomia nova.

O reader retém um storage fixo de 1.048.576 bytes, mede o comprimento intrínseco e rejeita excesso antes de copiar; preserva somente a view recebida e copia antes do próximo await. Nenhuma coleção ilimitada de chunks. Cancelamento/abort não devolvem prefixo autenticado e não expõem motivo externo. Request.bodyUsed/locked garantem uma leitura sem consultar propriedades internas.

**Limite de headers:** a lista preservada permite rejeitar multiplicidade observável; vírgulas/valores combinados falham estritamente. Headers nativo pode juntar duplicatas e remover whitespace antes da chamada. Este verifier não recupera informação perdida nem prova duplicatas no transporte. NUV-19 deve provar extração e ingress HTTP reais, vinculando assinatura ao Request correto. Essa obrigação de integração não é preenchida por fixtures locais.

Provas executáveis: a matriz GREEN cobre originais e negativos de autenticidade; assinatura estrita tem comprimento explícito + regex, decode hex de 32 bytes por construção, createHmac SHA256 sem encoding textual do corpo e timingSafeEqual entre digests de 32 bytes. Não se mede wall-clock para alegar tempo constante. EOF sem falha é necessário; aborto cancela a leitura pendente, nunca retorna prefixo, remove listener e libera lock em finally. Cancelamento idempotente não é aguardado e contém throws/rejections, inclusive cleanup que nunca resolve; o leitor externo de stream locked não é cancelado.

A checagem de aborto existe também após o await do reader, fechando a janela assíncrona antes da aceitação. Nenhum JSON.parse/request.json/arrayBuffer ilimitado, fetch, log, persistência ou fallback de secret no módulo. Testes verificam projeções String/stack/JSON/toJSON sem dados sintéticos sensíveis e ausência de console/rede. O getter real de HMAC e o marker server-only real são exercitados, sem mock do contrato de configuração.

| Artefato congelado                           | SHA-256                                                          |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Implementação final pós-correção de aborto   | e7049a8fe8173cdd44e7eb0280a198b42532840e2b4f3a9d3e8d52a2fba5e166 |
| Testes finais usados no terceiro RED e GREEN | 37eed766c12b219027dff31454f70dde8feff2f579f9e9fbbe3f01df3959e171 |
| Boundary final (exceção de diagnóstico)      | 7e743bc104720fd6b6805d75310fa82ff75b4afc84c99b7d80d43c26b1ff5d50 |

Os resultados, comandos e hashes estão transcritos aqui para que os recibos não dependam dos logs temporários locais de A/B/C.

## H — Independent Review

D não participa da autoria. Recebeu contrato, diff completo, RED/GREEN, configuração, limites e resultados e respondeu às 30 perguntas do pedido. O parecer inicial foi **CHANGES_REQUIRED**, com um P2: aborto após a resolução de readBody, mas antes da continuação externa que calcula HMAC, ainda podia terminar em aceitação. A auditoria específica A descobriu a janela; D a reproduziu independentemente com Request/ReadableStream/AbortController nativos contra o código transpilado fielmente. Nenhum P0/P1 identificado.

B acrescentou reprodução contra o módulo real: carrega verifier e prepara oracle antes de construir o Request; stream highWaterMark=0 fecha no segundo pull e agenda abort em queueMicrotask; a chamada direta evita um await de helper que escondia a janela. **RED 1 FAIL / 61 PASS / 62 total**, 1,04 s, implementação SHA-256 7ffefdd56533834b32f7ac57a2bf12771760b139fa60d51ca1994506cef64ff0; testes congelados SHA-256 37eed766c12b219027dff31454f70dde8feff2f579f9e9fbbe3f01df3959e171. O teste anterior de EOF já passava e não reproduzia essa janela específica; não se usa sua existência como prova universal.

C acrescentou somente `if (signal.aborted) throw new NuvemshopWebhookError()` imediatamente após o await readBody, antes de HMAC/comparação/retorno síncronos. Mesmo teste congelado: **GREEN 62/62**, 1,14 s; ESLint, Prettier e typecheck oficiais PASS. A reexecutou o probe nativo original: aborto agora é rejeitado antes de HMAC/comparação. **A segurança final: APPROVE, zero P0/P1/P2 materiais**, vinculada aos hashes finais em G.

Reavaliação independente D: **APPROVE**, zero P0/P1/P2 materiais nos hashes finais de código/testes. O probe original passou a rejeitar antes do HMAC. Parecer completo D SHA-256 a562fd6950b69897c97f3ac896de15a286baf51b8476e10817e02b82907b3d47. Um P3 informativo permanece: sequência infinita de chunks vazios não atinge o cap e exige lifetime bounded no ingress NUV-19. É residual explícito, sem afirmar limite temporal local. O vínculo do relatório final e do HEAD será reconferido por D e registrado externamente antes de declarar conclusão. O check completo iniciado antes desse finding foi interrompido deliberadamente (exit -15) durante Vitest; os logs foram preservados e ele não é contado como PASS. O check completo do candidato corrigido foi reiniciado com os mesmos limites e sem skips. Resultados finais em I.

Respostas da revisão independente às 30 perguntas obrigatórias (fonte: parecer D, sem autoria de produção/testes):

| #   | Verificação        | Conclusão                                                                      |
| --- | ------------------ | ------------------------------------------------------------------------------ |
| 1   | SPEC §11           | Conforme no escopo local/sintético; retorna bytes antes de interpretação       |
| 2   | Chave              | Somente clientSecret do getter existente; access token irrelevante             |
| 3   | Mensagem HMAC      | Bytes originais, sem conversão textual                                         |
| 4   | Views/offsets      | Preservados; contagem usa accessor intrínseco                                  |
| 5   | Header             | Um valor primitivo, exatamente 64 ASCII hex, sem trim/coerção                  |
| 6   | Decode             | 64 hex estritos produzem 32 bytes                                              |
| 7   | Comparação         | timingSafeEqual nativo entre dois digests de 32 bytes                          |
| 8   | Adulteração        | Digest de outro corpo/um byte alterado é rejeitado                             |
| 9   | Base64             | Rejeitado pela gramática hex                                                   |
| 10  | Duplicatas         | Multiplicidade preservada e vírgulas observáveis rejeitadas                    |
| 11  | Headers            | Perda por normalização documentada; integração real em NUV-19                  |
| 12  | Cap                | Exato 1.048.576 aceito; byte extra rejeitado antes da cópia                    |
| 13  | Buffering          | Storage fixo; alocação upstream/lifetime continuam próprios                    |
| 14  | Content-Length     | Nunca é autoridade; contagem dos bytes efetivos                                |
| 15  | Consumo            | Used/locked/concorrente rejeitados; um reader e liberação do lock              |
| 16  | Aborto/truncamento | Falhas e abortos rejeitados; gap pós-EOF reproduzido e corrigido               |
| 17  | JSON antes HMAC    | Nenhum parser; non-JSON assinado pode autenticar                               |
| 18  | Loja/evento        | Nenhuma validação prematura; responsabilidade NUV-15                           |
| 19  | Redaction          | Erro genérico e config segura; sem payload/header/secret/cause ou logs         |
| 20  | Taxonomia          | WebhookError existente e contrato seguro de configuração preservados           |
| 21  | Browser            | server-only ativo, sem novos exports root/server; boundary adjacente separado  |
| 22  | Rotação            | Nenhum previous/fallback/janela especulativos                                  |
| 23  | HR-03              | OPEN preservado                                                                |
| 24  | Privacy            | Nenhuma alegação operacional; UNPROVEN/HR-08                                   |
| 25  | Escopo             | Sem rota/ACK/ledger/dispatcher ou outras tasks                                 |
| 26  | RED antes GREEN    | Baseline ausente + quatro defeitos de length + corrida de aborto comprovados   |
| 27  | Oracle             | WebCrypto independente e vetor RFC 4231; produção createHmac                   |
| 28  | Lacunas            | P3 lifetime de chunks vazios explícito para NUV-19; zero material identificado |
| 29  | Allowlist          | Verifier, teste e relatório; exceção boundary necessária/revisada em I         |
| 30  | Upstream           | Nenhum contrato01/02/03 alterado; regressões executáveis no check em I         |

## I — Local Validation

| Gate                                                                   | Resultado                                                                                                               |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Focado GREEN                                                           | 62/62 PASS; matriz H01–H30 e adicionais                                                                                 |
| Adjacentes env/errors/boundary                                         | PASS no check completo: suites reais de env/errors e 598 casos de boundary                                              |
| npm run format:check                                                   | PASS; reconferência do relatório final antes de stage/publicação                                                        |
| npm run check (lint/runtime/tokens/format/typecheck/tooling/unitários) | PASS exit0; 36 arquivos/2.702 unitários, 6 runtime +135 tokens; zero falhas/skips; lint0erros/2warnings históricos      |
| npm run build                                                          | PASS exit0; compile10,6s/typecheck9,0s; 8/8 páginas, configuração sintética e sem secret Nuvemshop                      |
| git diff --check, allowlist e ausência de secrets                      | PASS no diff/quatro paths; A/D redaction/sintéticos e scan local de bundle; Gitleaks remoto pendente                    |
| Integridade package/lockfile/dependências                              | PASS; package/lock idênticos ao baseline; comparação dos bytes de pacotes instalada passa, excluindo apenas cache .vite |

Primeiro check completo finalizado sobre o verifier corrigido: **FAIL**, exit1, 36 arquivos, **9 FAIL / 2.690 PASS / 2.699 testes**, 619,54 s; os 62 testes HMAC passaram. Todos os nove negativos são fixtures de diagnóstico TypeScript em boundary.test.ts que compilam a árvore inteira do adapter com `types: []`: o novo node:crypto e Buffer não têm declarações nesse programa sintético. Lint (zero erros, dois warnings históricos em boundary:4817–4818), runtime, tokens, formato, typecheck e 141 testes de tooling passaram antes dessa falha. Isso é uma incompatibilidade introduzida pela nova dependência nativa; não se apresenta como gate verde nem se atribui a regressão preexistente.

**Exceção justificada da allowlist — boundary.test.ts:** o contrato NUV-14 exige createHmac/timingSafeEqual nativos. A e D auditaram a causa separadamente e recomendaram uma alteração exclusiva dos programas de diagnóstico que compilam o adapter completo: resolver e acrescentar como root explícito as declarações reais já instaladas de @types/node. Os nove cenários são TSTYPES-09-ROOT/MARKER/15, TSTYPES-CONSUMER, TSTYPES-ADAPTER-MISSING, TSREF-10-ROOT/MARKER/GUARDED e server-to-root. As opções `types: []`/skipLibCheck, os roots do projeto, as expectativas de diagnóstico, as regras de segurança, os programas client-only/noLib/cache e os timeouts permanecem intactos. Nenhuma declaração fake, diagnóstico filtrado, tipo any ou referência Node em produção é introduzida. Controles adicionais devem provar a presença dos tipos reais somente no caminho de diagnóstico completo e sua ausência nos caminhos sintéticos/binding. D aprovou o diff extra concretamente e o check/build completos passaram; E e o vínculo final ainda são gates antes da publicação. A mudança não altera a política de boundary.

B acrescentou três controles no harness antes da implementação do helper: tipos reais e rejeição de argumento nativo inválido no programa completo; programa client-only sem tipos/globais Node; binding noLib/types-empty sem declaração Node nem símbolos process/Buffer/require/module/global. No RED focado, **10 FAIL / 2 PASS / 12 selecionados**, 31,09 s: nove falhas reais anteriores + helper ausente, com os dois controles de isolamento já passando. Os outros 586 casos ficaram apenas não selecionados por `-t`, sem novos skips no código e sem dispensar o check completo. Boundary antes da mudança SHA-256 3c2f9b9d82b8f267f490e56684e4430d679ca2d6b6f7c439392b7f8cd0e25df3; boundary RED SHA-256 afff116db129fc557eaeca4f00c62ea4e7c0e25a5e6d4aaf5a6dd23dc41438dc. Um código diagnóstico esperado no novo controle foi corrigido de 2580 para o 2591 efetivamente observado antes desse RED final; nenhuma expectativa antiga mudou.

C implementou `createAdapterDiagnosticProgram`: resolve declarações reais de Node no diretório instalado via API pública TypeScript, exige caminho existente sob node_modules/@types/node, acrescenta esse root e delega ao factory original com todas as opções preservadas. Apenas cinco grupos de chamada/nove cenários completos usam esse opt-in. Fonte de produção e testes HMAC permaneceram byte-idênticos. Boundary candidato SHA-256 7e743bc104720fd6b6805d75310fa82ff75b4afc84c99b7d80d43c26b1ff5d50.

A primeira rodada focada após a alteração **não foi GREEN**: **10 PASS / 2 FAIL por timeout**, 45,42 s, nos limites existentes de 5 s (TSTYPES-09-ROOT: 6,522 s; TSTYPES-15: 5,021 s). Os erros de tipos nativos foram eliminados e os três novos controles passaram; isso não dispensa o gate temporal. Lint/formato rodaram brevemente em paralelo nessa rodada, possível carga adicional sem diagnóstico causal comprovado. Lint do arquivo: zero erros e dois warnings _source históricos, agora linhas4845/4846; formato e typecheck oficiais PASS. Nenhum timeout foi aumentado.

Controle baseline no main original inalterado, mesmo runtime/dependências e seleção dos nove cenários: **8 PASS / 1 timeout**, 33,65 s; TSTYPES-09-ROOT levou 5,059 s contra 5 s, baseline SHA ab70a3a6262ebcfc020a2790d9179148356dae35. O negativo demonstra que a seleção fria também pode atingir o limite na baseline, sem provar causalidade exclusiva ou aprovar o candidato. Não é PASS e não dispensa sua suíte completa.

D revisou o diff concreto do quarto arquivo: **APPROVE estático, zero P0/P1/P2/P3 novos**, parecer SHA-256 a44eb44d181051e430b7255b30f91d8d365941d760468e3241366a299cceb5ba; não dispensou os gates temporais. Conferência do diff contra baseline também confirma mesmos literais de timeout, nenhum skip adicionado e nenhuma linha de expectativa/assertion removida. O check completo do candidato byte-idêntico foi reiniciado sem outro trabalho pesado concorrente e **PASSOU**: exit0, 36 arquivos, **2.702/2.702 unitários**, 620,98 s, zero falhas/skips. Os nove cenários e três controles passaram na suíte inteira. Foram acrescentados 65 testes ao baseline: 62 no novo arquivo HMAC e três de diagnóstico. Não se afirma que a causa da intermitência fria foi eliminada nem se reclassificam os negativos anteriores como PASS. O negativo e a necessidade de revisão do quarto arquivo estão preservados; não se declara PASS por testes não selecionados ou por tentativa incompleta.

Configuração de build/check é sintética e limitada ao processo, sem arquivo .env ou credenciais Nuvemshop reais; nenhuma variável/configuração persistente foi alterada. O build passou sem exigir material HMAC no ambiente. Scan local de .next/static: nenhum dos quatro marcadores de servidor/fixture selecionados presente (chave do client secret, erro webhook, nome do header e sentinela de servidor). É evidência específica desses marcadores, não scanner universal de secrets. Docker/E2E/scans remotos devem ser reportados pelo CI efetivamente executado, separadamente dos gates locais. O relatório foi consolidado durante/depois do check; código/testes permaneceram congelados nos mesmos hashes durante toda a rodada. As alterações posteriores se restringem a este Markdown, com formato/diff/allowlist e vínculo final reconferidos antes de publicar; CI/review remotos ainda devem aprovar o HEAD integral.

## J — GitHub

Commit/push/PR Draft: **PENDING**. Título previsto: `feat(nuvemshop): implement NUV-14 raw HMAC verifier`. Commit previsto: `feat(nuvemshop): verify raw webhook HMAC`.

Publicação exige revisão independente APPROVE, zero P0/P1/P2 materiais, auditoria E e checks/build locais aprovados. O recibo externo vinculará HEAD local/remoto/PR, hashes dos arquivos, CI no SHA exato e uma única solicitação manual de Codex Review. Nenhum CI anterior será reutilizado se o candidato mudar. db-types SKIPPED em evento PR não é PASS nem validação privilegiada de main.

## K — Human Gate & Residual Risks

**HR-03 permanece OPEN. HMAC operacional NOT AUTHORIZED.** Apenas current client secret, synthetic fixtures e testes locais. Nenhuma alteração de ambiente, OAuth, produção, secrets, rota, ACK, subscription, banco, ledger, fila, worker, dispatcher ou consumer. Não houve webhook real nem payload de cliente. Nenhuma task NUV-15–20 foi implementada.

- HMAC válido comprova autenticidade/integridade sob esse contrato, sem frescor/unicidade ou proteção contra replay; durabilidade/reconciliação posteriores são próprias.
- JSON malformado pode ter HMAC válido; NUV-15 deve interpretar/validar envelope e loja depois da autenticação.
- Cap de 1 MiB é política provisória local, não limite operacional comprovado do provider. Produtor/ingress pode pré-alocar ou enfileirar chunks antes da chamada; o reader limita o que retém/copia, não controla alocação anterior.
- Timeouts, limites de concorrência/ingress e semântica HTTP real ficam para integração autorizada posterior. Não se afirma limite temporal de streams que nunca terminam e nunca são abortados, inclusive sequência infinita de chunks vazios (P3 informativo de D).
- HR-03 decide coexistência sim/não antes da operação; eventual reconciliação NUV-02/14 exige execução posterior autorizada. Nenhuma janela/previous é antecipada. Privacy permanece UNPROVEN/HR-08, e HR-02/06/08/NUV-24 não são fechados por este trabalho.
- Merge/release exigem autorização humana específica vinculada ao HEAD técnico final. **Nenhum merge ou deploy nesta execução.**

Somente após CI SUCCESS e Codex Review concluído sem findings materiais no HEAD final, threads materiais inexistentes/resolvidas, revisão independente APPROVE e integridade de escopo, o recibo poderá declarar `NUV-14 / REMOTE_PASS / READY_FOR_HUMAN_REVIEW`. Este documento de preparação não antecipa tal estado.
