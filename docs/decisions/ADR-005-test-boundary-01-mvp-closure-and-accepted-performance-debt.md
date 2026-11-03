# ADR-005: TEST-BOUNDARY-01 — MVP Closure and Accepted Performance Debt

## Status

Aceito como decisão humana de encerramento da investigação. Este ADR não autoriza merge, deploy, correção causal, calibração de C4, nem retomada da matriz. A efetividade do texto no histórico de `main` depende do merge humano posterior da PR Draft. A decisão do Product Owner já foi tomada.

## Data

2026-11-02

## Contexto

O Product Owner interrompeu a investigação causal de TEST-BOUNDARY-01 para priorizar o MVP.

Estado de saída: `RUNTIME_STRUCTURE_PASS_SCOPE_LIMITED` / `CAUSAL_INFERENCE_NOT_AUTHORIZED`. `ROOT_CAUSE_UNPROVEN` permanece verdadeiro. Problemas residuais de performance são débito técnico aceito. Não são declaração de correção causal. Esta decisão substitui a exigência de continuar a investigação antes de uma PR. Não substitui controles de segurança, funcionalidade e integridade.

Baseline git: `2a5a37c2d5b8a4bf30be08e033a0e79195733c50`, igual a `origin/main`. A CI dessa revisão passou (GitHub Actions run 41249833353). Isso não é prova causal.

Quatro controles permanecem no arquivo contratual e em `npm test` / CI, com o teto default de 5000 ms, sem aumento:

1. TSTYPES-09-ROOT cannot fabricate runtime or explicit-marker protection
2. TSTYPES-CONSUMER
3. resolves adapter server-to-root reference paths without module extension substitution
4. NODE-DIAGNOSTIC includes real installed declarations without weakening complete adapter diagnostics

Diagnóstico controlado de 2026-11-01: esses controles, a frio, produziram `Test timed out in 5000ms`. Não houve `AssertionError`. A classe chama `createAdapterDiagnosticProgram` e depois `getPreEmitDiagnostics`. A causa suficiente (reuso de `SourceFile` via predecessor, cache de host, ou ambos) não foi separada.

**R1:** `RUNTIME_STRUCTURE_FAIL` / `ROOT_CAUSE_UNPROVEN`. `TypeError: Cannot set property diagnosticPredecessor of [object Module] which has only a getter`. Atribuição inválida a binding ESM importado. A exceção não prova a causa do timeout. Não foi `PASS_STRUCTURE`.

**Remediação ESM:** `ESM_BINDING_STATIC_PASS` / `RUNTIME_NOT_AUTHORIZED`. A atribuição ilegal foi removida do driver. O isolamento entre a réplica 2345 e CACHE-OPTION-EPOCH passou a ser transição do harness só na fase `released`. Isso valida a instrumentação. Não é correção causal.

**R2:** o teste concluiu (exit 0, resumo Vitest 1 passed) e não capturou o relatório JSON. Estado `RUNTIME_INCOMPLETE_EVIDENCE`. O resumo do runner não foi promovido a `PASS_STRUCTURE`. C0 não foi executada nessa rodada.

**R3:** capturou os JSON originais de C0-off e de C0. Ambas `PASS_STRUCTURE` com `validityReasons` vazio. Controles estruturais e oráculos passaram. Métricas observacionais de uma corrida: C0-off 5088.019964 ms e C0 5064.081275 ms na métrica `exclusive_getPreEmitDiagnostics_ms`. Nenhuma média, desvio, intervalo de Welch, H6 ou `CAUSAL_SUPPORT` foi calculado. Nenhuma outra célula foi executada para esta PR.

Issue de débito: [tech-debt: investigate TypeScript boundary diagnostic performance after MVP](https://github.com/jlima004/indicio-cult/issues/66). Sem prazo obrigatório antes do MVP. A issue não autoriza ignorar problemas futuros de segurança.

Escopo desta PR: somente este ADR. Os arquivos locais de instrumentação (`boundary.test.ts` modificado, `tests/experimental/nuvemshop-boundary-harness.ts`, `tests/experimental/boundary-causal.driver.test.ts`, `vitest.causal.config.mts`) ficam de fora. O harness não está isolado do teste contratual se o import for publicado. O driver e a config causal são opt-in e não entram em `package.json` nem na CI. Não há melhoria de código apta à publicação. Este registro não afirma melhora de performance.

Preservar: SEC-01 e seus limites (exceção operacional já ratificada de `cli_login_postgres`; não reabrir); EVD-01 e seus limites (aceite específico da perda histórica de evidências); controles de segurança obrigatórios; compatibilidade Supabase ainda pendente; bloqueio de SQL/migrations/roles Supabase remotos não autorizados; bloqueio de merge e deploy por este ADR; C4 não calibrada.

A matriz causal está encerrada como trabalho ativo do MVP. A retomada depende de nova decisão humana, não de um gate implícito desta PR.

## Decisão

- Encerrar TEST-BOUNDARY-01 como investigação causal ativa do MVP, com estado `RUNTIME_STRUCTURE_PASS_SCOPE_LIMITED` / `CAUSAL_INFERENCE_NOT_AUTHORIZED` e `ROOT_CAUSE_UNPROVEN` permanecendo verdadeiro.
- Registrar os problemas residuais de performance dos quatro controles contratuais como débito técnico aceito, vinculado à issue #66, sem prazo obrigatório antes do MVP.
- Manter os quatro controles listados acima em `npm test` e na CI, com teto default de 5000 ms inalterado.
- Timeout dos quatro controles acima de 5000 ms, em execução fria, permanece débito de performance aceito. Esse timeout não é reclassificado como `PASS`. O `PASS_STRUCTURE` da R3 permanece limitado a `C0-off` e `C0`; não é correção causal nem prova de causa raiz.
- Publicar nesta PR apenas este ADR; nenhuma outra célula da matriz (C1–C4, H5b, H5d) é exigida para o fechamento documental desta PR.

## Alternativas consideradas

- **Continuar a matriz C1–C4 / H5b / H5d antes da PR.** Rejeitada pela decisão humana de prioridade do MVP. `ROOT_CAUSE_UNPROVEN` permanece.
- **Publicar o harness, o driver ou a config causal.** Rejeitada: instrumentação experimental; o harness não está isolado do teste contratual se publicado; driver e config são opt-in sem justificativa de manutenção permanente.
- **Aumentar timeouts ou retirar os quatro controles de `npm test` para obter CI verde.** Rejeitada: enfraqueceria verificação de segurança/correção e trataria débito como aprovação. A CI da revisão de baseline já passou a suíte completa; esta PR não muda seleção de testes.
- **Tratar `PASS_STRUCTURE` ou o sucesso da CI como correção causal.** Rejeitada.

## Consequências

- O repositório ganha o registro da decisão de encerramento e o vínculo explícito com a issue #66.
- O custo dos quatro controles continua podendo exceder 5000 ms em execução fria. Isso é débito aceito, não `PASS`.
- Agentes futuros não devem reabrir a matriz causal sem nova decisão humana.
- Segurança, asserções e a presença dos quatro controles na CI permanecem obrigatórias.
- Estados que este ADR **não** declara: `EXPERIMENT_PASS`, `CAUSAL_SUPPORT`, `ROOT_CAUSE_PROVEN`, `RELEASE_APPROVED`, `NUV16_COMPLETE`, `LOCAL_PASS`.
