# NUV-11 — riscos residuais e gates não encerrados (2026-10-20)

> **Registro de acompanhamento, não emenda normativa.** Este documento não altera `SPEC-nuvemshop.md`, `plan.md`, `todo.md` ou a decisão humana [NUV-11-LEGACY-B](./NUV-11-LEGACY-B.md), e não concede autorização para acesso real à Nuvemshop, merge, deploy ou divulgação de dados. Status abaixo é uma **fotografia de 2026-10-20**, a ser revalidada antes de decisões futuras.

## Escopo e fronteira da conclusão técnica

- [PR técnica NUV-11 #46](https://github.com/jlima004/indicio-cult/pull/46), branch `codex/nuv-11-orders-resume`, HEAD publicado `6656ea2144a8bedc05bf2fe6df817c0b784416c4` (R2).
- **Condição observada:** `LOCAL_PASS / REMEDIATION_PUBLISHED`, 2.581/2.581 testes locais, build local PASS; [CI #39440938689](https://github.com/jlima004/indicio-cult/actions/runs/39440938689) **SUCCESS após reexecução do job**, incluindo build Docker, E2E e scanners; [Codex Code Review do mesmo HEAD](https://github.com/jlima004/indicio-cult/pull/46#issuecomment-6293539958) **COMPLETED sem novos findings**; três threads P2 históricas respondidas e resolvidas.
- **Fronteira:** `TECHNICAL_PASS / READY_FOR_HUMAN_MERGE_REVIEW` **não** é `MERGED`, `DEPLOYED`, `ADAPTER_OPERATIONAL`, `IMPLEMENTATION_COMPLETE` nem aprovação do consumo por `orders`/identidade. No snapshot inicial, anterior ao merge, a PR #46 estava aberta; merge e deploy exigiam decisões/gates humanos próprios. Após qualquer merge, provar CI/deploy/health/version do SHA efetivamente liberado, conforme governança de release.

## Quadro de pendências que permanecem após eventual merge

- **CI-FONT-01 — `next/font/google` e Turbopack no Docker:** `OPEN / acompanhamento independente`. Um build Docker falhou e a repetição do mesmo HEAD passou. Responsável operacional: manutenção frontend/build/CI, atribuição a confirmar. Encerramento depende de evidência de causa/mitigação ou decisão explícita de monitoramento; mudança eventual em PR separada.
- **NUV-HR-02 — capabilities, scopes e acesso real:** `OPEN / BLOCKS_REAL_PROVIDER_USE`. Responsável: owner da app e decisão humana. Encerramento exige prova de capabilities/scopes efetivos, modalidade/distribuição, versão `2025-03`, fluxo de instalação/OAuth autorizado e adjudicação explícita.
- **NUV-11-LEGACY-B — contrato fiscal legado:** `UNVERIFIED / DEFERRED_PROVIDER_EVIDENCE_REQUIRED`. Responsáveis: product/integrador Nuvemshop, engenharia e privacidade. Encerramento exige evidência confiável do formato/reconciliação legados e nova adjudicação com contrato, testes e revisão próprios.

Nenhum dos itens é automaticamente fechado pelo merge da NUV-11. A pendência de fontes **não reabre os P2 técnicos de Order**, nem invalida retrospectivamente a aprovação da reexecução CI; uma recorrência futura exige nova análise do run/HEAD afetado.

### CI-FONT-01 — falha intermitente de build Docker

**Evidência factual:**

1. Na [primeira tentativa do CI #39440938689](https://github.com/jlima004/indicio-cult/actions/runs/39440938689) do candidate R2, as etapas `Check`, `Build` fora do Docker, E2E e scanners passaram; **`Build Docker image` falhou** durante `RUN test -n "$APP_VERSION" && npm run build` de `deploy/Dockerfile:25`.
2. Log da falha: Next.js `16.4.1` / Turbopack; `next/font/google queries have exactly one entry`, `Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'`. Traces incluem `Cormorant Garamond`, `src/app/layout.tsx` e `src/app/global-error.tsx`. Não há prova no log da URL Google Fonts completa causadora.
3. Sem mudança no HEAD da PR, a [reexecução do job #118699411252](https://github.com/jlima004/indicio-cult/actions/runs/39440938689/job/118699411252) concluiu **SUCCESS**, inclusive o Docker build.
4. A [issue upstream vercel/next.js#99114](https://github.com/vercel/next.js/issues/99114) descreve **erro equivalente** causado, naquele caso reproduzido, por resposta Google Fonts com URL `/l/font?kit=...` contendo parâmetros `&`. **Hipótese compatível, não root cause comprovada para este run**. O estado da issue upstream não comprova correção disponível na versão do projeto.

**Acompanhamento dedicado:** [GitHub issue #47 — CI-RISK: Docker/fontes](https://github.com/jlima004/indicio-cult/issues/47), OPEN.

**Conduta:** em recorrência, comparar logs de tentativas/mesmo SHA, registrar frequência e versão, investigar upstream e avaliar mitigação compatível em **PR separada** (por exemplo, fontes localmente hospedadas apenas após análise de licença e preservação tipográfica). Exigir build Docker, regressões e avaliação visual; não trocar fontes, desabilitar verificações, alterar lockfile/Next ou ampliar PR #46 sem autorização. Um rerun verde resolve o **gate daquele candidato**, não prova eliminação da intermitência.

### NUV-HR-02 — app/capabilities e acesso real

**Fonte normativa:** [plano — Human checkpoints / NUV-HR-02](./plan.md#human-checkpoints) e [SPEC — Nuvemshop](../../docs/specs/SPEC-nuvemshop.md).

- A prova local/sintética de NUV-11 não inclui chamada real autenticada à Nuvemshop. `NUV-HR-02` permanece **OPEN**, independentemente de CI, revisão, merge ou deploy da leitura server-only.
- O owner da app deve documentar `2025-03`, modalidade/distribuição/instalabilidade API-only/SDK, URLs e sequência OAuth/ensaio permitida, requested scopes (`read_products`, `read_orders`) versus capabilities efetivas (incluindo `read_locations`, `read_fulfillment_orders`) e tópicos permitidos. Não presumir permissões adicionais, inclusive acesso real a metafields Order.
- Divergências seguem os estados normativos `BLOCKED_PROVIDER_SCOPE_DIVERGENCE` ou `BLOCKED_ARCHITECTURE_ADJUDICATION_REQUIRED`, conforme o caso. Sem token, secret, scope extra ou ensaio real neste registro.
- Encerramento exige **decisão humana própria** e evidência minimizada, fora desta documentação. A conclusão técnica da PR #46 não constitui aprovação operacional.

### NUV-11-LEGACY-B — compatibilidade fiscal legada diferida

**Fontes normativas:** [ratificação NUV-11-LEGACY-B](./NUV-11-LEGACY-B.md), [SPEC — Orders / NUV-11-LEGACY](../../docs/specs/SPEC-nuvemshop.md#orders), [PLAN](./plan.md), [TODO NUV-11/23/25](./todo.md).

- A exceção humana de 2026-10-19 permite **somente o aceite técnico local** do leitor moderno enquanto a reconciliação fiscal legada não estiver comprovada. Não equivale a suporte completo às notas fiscais históricas.
- O leitor moderno usa `owner_id` exato, `namespace=nfe`, `key=list` e `fields=value`; referências `0..N` e associação opcional `fulfillment_order_id` não autorizam inferir formato ou pareamento legado.
- **Modern-only bem-sucedido → `invoices.completeness='incomplete'`**, mesmo com `[]` ou `value='[]'`. `not_consulted` significa não consultado; presente malformado é erro de protocolo. **Não afirmar ausência fiscal global a partir de ausência moderna.**
- Gatilhos de reabertura: documentação oficial específica, resposta verificável do suporte ou ensaio read-only **expressamente autorizado depois de HR-02**, com evidência anonimizada e aprovação humana.
- A prova posterior deve cobrir nomes/namespace/key/value, ownership, cardinalidade, pareamento, coexistência/precedência com `nfe/list`, paginação, limites, completude e privacidade. Sem parse especulativo ou enumeração cega de metafields.
- **NUV-23** conserva a obrigação de demonstrar integração e a semântica de `incomplete`; **NUV-25 e consumers** devem comprovar disclosure/ausência falsa e fluxos autorizados. Esses gates não são encerrados pela PR #46.

## Atualização pós-merge e deploy — 2026-10-20

**Evidência posterior ao snapshot inicial, sem retroeditar os gates históricos.**

- A [PR #46](https://github.com/jlima004/indicio-cult/pull/46) foi **MERGED** em `main` em 2026-10-20, commit `fc83b8f63b62468ade21d6fef0aa08590cbfc7e4`. O candidate técnico anteriormente revisado foi `6656ea2144a8bedc05bf2fe6df817c0b784416c4`.
- O owner forneceu log do deploy Coolify do mesmo merge commit: `npm run build` no Docker PASS (8/8 páginas); nova imagem e contêiner iniciados; healthcheck do contêiner `healthy`; rolling update concluído, contêiner anterior removido. Isso é evidência de deploy deste SHA, não de uso autenticado real da API Nuvemshop.
- Health de produção informado pelo owner em [`/api/health`](https://indiciocult.com.br/api/health): `{"status":"ok","version":"fc83b8f63b62468ade21d6fef0aa08590cbfc7e4","supabase":"ok"}`. A versão coincide com o commit selecionado pelo Coolify. Não implica prova de smoke Nuvemshop autenticado ou de consumer `orders`.
- **NUV-11: `TECHNICAL_COMPLETE / MERGED / DEPLOYED`**, sem declarar `ADAPTER_OPERATIONAL` ou `IMPLEMENTATION_COMPLETE` para a integração completa.
- **Permanecem OPEN / DEFERRED:** `CI-FONT-01` ([issue #47](https://github.com/jlima004/indicio-cult/issues/47)), `NUV-HR-02` e a compatibilidade fiscal legada `DEFERRED_PROVIDER_EVIDENCE_REQUIRED`. Nenhuma é encerrada por esse deploy.

## Regras de fechamento e atualização

- Toda alteração futura deve citar **evidência, HEAD/run e decisão** que sustente o novo estado. Relatórios de uma PR não substituem os gates de outra.
- **Não fechar automaticamente** `CI-FONT-01`, `NUV-HR-02` ou `DEFERRED_PROVIDER_EVIDENCE_REQUIRED` porque a PR #46 passou ou foi mergeada.
- Este documento é **documental / sem alteração de contrato, runtime, Dockerfile, CI, dependências ou workflow**; sua inclusão na `main` requer revisão/merge humano separados.
