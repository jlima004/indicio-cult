# NUV-DAG-01 proposed SPEC / PLAN / TODO amendments

**Date:** 2026-10-20

**Status: PROPOSED / PENDING HUMAN ADJUDICATION.** This packet is not effective normative text. It is attached to ADR-004 for D1–D5 review. Do not apply these edits to SPEC, PLAN, or TODO unless all five decisions are explicitly approved and a later materialization records the exact approved text. A partial approval or a changed candidate requires renewed adjudication. No implementation or release authority follows from approval of this proposal.

## Materialization rule

The baseline for these anchors is `main@43a41ca51f0732d1a918e677bdd9e8d2bef29f13`. Apply only the insertions and replacements below, preserving all other current text, history, snapshots, evidence, and acceptance criteria. Where historical text describes an earlier state, retain it as history and append the current supplement at the named anchor; the supplement supersedes only the specifically identified active dependency interpretation after approval and materialization. Do not globally replace occurrences of “12 complete”, “blocked”, or “proposed”: historical snapshots are not silently rewritten. The graph artifact `NUV-DAG-01-graph.md` carries the complete proposed graph and formal evidence and must agree with these exact edges.

The three task prerequisite substitutions proposed are `12-FULL→22` to `12-PARTIAL→22`, `12-FULL→23` to `12-PARTIAL→23`, and `12-FULL→24` to `12-PARTIAL→24`. Each takes effect only after joint approval/materialization of D1–D5 and the explicit `DAG_EFFECTIVE` gate. NUV-24 retains NUV-01–11 and NUV-13–23 plus all existing gates; only NUV-12-FULL is excluded from its entry condition. Clarified retained obligations include NUV-12-FULL/T03-GENERAL, global-absence evidence and all 18 criteria at NUV-25, plus the existing consumer sequence `NUV-24→catalog→identity→orders`. Consumers produce evidence before NUV-25; NUV-25 does not gate consumer implementation. Every negative test, other task predecessor, release control and full-closure criterion remains in force. No item becomes complete or ready from this proposal.

## Status rendering during future approved materialization

This rule is itself **PROPOSED / PENDING HUMAN ADJUDICATION** today. It does not assert that any D1–D5 decision has been approved. The following is the exact proposed rendering rule for the later, separately reviewed materialization PR. “Exact insertion” means the approved payload after this explicit rendering step, not a byte-for-byte copy of pending proposal labels into an effective contract.

1. Before rendering, verify concrete human approval records for **each** of D1–D5, the exact approved proposal HEAD, and authorization for the materialization PR. Record the real approval references, date and approved proposal SHA in a new current-state supplement in each of SPEC, PLAN and TODO. Missing/rejected/partial approval, changed text or a missing reference stops materialization. A renderer cannot establish human approval.
2. Apply the two literal substitutions below **only inside the newly approved quoted insertion payloads in this packet**. They cover every SPEC/TODO insertion and the PLAN heading/wave note. Do not substitute across the existing canonical files, historical snapshots, this proposal's metadata, or the stored approval record.

| Proposal-payload token                  | Future materialized-payload token, conditional on verified approval and authorized merge |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `PROPOSED / PENDING HUMAN ADJUDICATION` | `D1–D5 APPROVAL RECORDED / EFFECTIVE ONLY ON AUTHORIZED MATERIALIZATION MERGE`           |
| `NUV-DAG-01 proposal (not effective)`   | `NUV-DAG-01 adjudicated amendment (effective only on authorized materialization merge)`  |

3. In each canonical file, accompany the rendered payload with this exact record template, replacing every brace field with concrete verified evidence: `NUV-DAG-01 materialization record: D1={record}; D2={record}; D3={record}; D4={record}; D5={record}; approved proposal HEAD={40-hex SHA}; approval date={YYYY-MM-DD}; materialization PR={URL}. These rendered amendments become effective only on the authorized human merge of this materialization PR; before that merge the prior contract remains effective. No implementation or release authorization follows.` Unfilled/synthetic fields are forbidden in an actual materialization. The enclosing proposal files remain pending today; this template is not an approval record.
4. Before requesting the later human merge, require that **none of the newly rendered insertion payloads** retains either source token. The new record must identify the earlier, explicitly scoped sentences retained as historical baseline and link their supersession to the actual D1–D5 approvals. Recheck all three canonical documents for one unambiguous current interpretation. Existing historical pending labels stay historical; they are not silently rewritten.
5. Independent review must confirm the actual approval references, exact scoped substitutions, absence of stale pending labels in the new payloads, every retained proof/HR gate and the human merge boundary. After authorized merge the conditional effect marker is satisfied by that merge; it never continues to claim human adjudication is pending. A rejected or unmerged materialization does not activate any edge.

The old proposal tokens and template braces appear above solely to specify future transformation. They do not change this packet's pending status, waive D1–D5, or authorize any materialization now.

## SPEC exact patches

### SPEC §10 — Resource contracts / Orders

**Location:** `docs/specs/SPEC-nuvemshop.md`, heading `## 10. Resource contracts`, subsection `### Orders` (current lines 452 onward). Insert the following paragraph after the current Order lookup / `NUV-12-COVERAGE-PARTIAL` addendum, before `### Checkout/cart`. Preserve all existing Order and fiscal text.

**Exact insertion:**

> **PROPOSED / PENDING HUMAN ADJUDICATION — NUV-DAG-01; effective only after D1–D5 approval and exact materialization.** NUV-12-PARTIAL is the deployed, bounded adapter capability. An exact, unique canonical `Order.number` in a sufficient current NUV-12-PARTIAL response may establish observed presence from that response. A durable `orders` projection row has the additional requirement of exact, store-scoped `getOrder` revalidation against the recorded provider order ID; record which evidence origin applies. Neither origin proves collection coverage. NUV-12-FULL / T03-GENERAL remains a separate blocked obligation; the partial result, including its scoped `null`, is not global absence. No missing row, backfill, count, Link sequence, or webhook silence establishes absence.
>
> Consumers must distinguish evidence (`PRESENCE_VERIFIED` or `ABSENCE_UNPROVEN`) from lookup outcome (`LOOKUP_INCOMPLETE`, `LOOKUP_INVALID`, or `LOOKUP_FAILED`); these are conceptual labels, not API names. `LOOKUP_INVALID` means only locally invalid input rejected before I/O. Malformed provider protocol data is `LOOKUP_FAILED` with `NuvemshopProtocolError` cause, not local invalidity. No NUV-12 result by itself authorizes ownership, identity linkage, disclosure, or a complete order list.
>
> The proposed dependency interpretation allows the bounded NUV-12-PARTIAL prerequisite to support NUV-22 negative testing, NUV-23 mock integration, and NUV-24 adapter operation only after all five decisions are approved and materialized. It does not satisfy T03-GENERAL or NUV-12-FULL. NUV-24 remains adapter operation with consumer closure pending; NUV-25 alone may declare full implementation closure after all §21 criteria and effective consumer evidence. NUV-13 email discovery and coverage remain independent.

### SPEC §18 — Testing strategy

**Location:** `docs/specs/SPEC-nuvemshop.md`, immediately after the final paragraph in `## 18. Testing strategy` and before `## 19. Human setup e checkpoints` (current lines 822–884).

**Exact insertion:**

> **PROPOSED / PENDING HUMAN ADJUDICATION — NUV-DAG-01.** If D1–D5 are approved and materialized, NUV-22 and NUV-23 may use NUV-12-PARTIAL as their bounded adapter prerequisite. This changes no negative test, security/privacy criterion, mock integration requirement, or existing dependency other than the single NUV-12 prerequisite at each target. A passing subset case is not T03-GENERAL, NUV-12-FULL, global absence, or consumer evidence. NUV-23 must retain the NUV-11-LEGACY-B distinctions: modern-only remains `incomplete`, including empty responses; `not_consulted` is distinct; malformed present data remains an error.

### SPEC §19 — Human setup and checkpoints

**Location:** `docs/specs/SPEC-nuvemshop.md`, after the current final paragraph of `### Gate operacional e inventário` and before `## 20. Contracts provided to consumers` (current lines 885–912).

**Exact insertion:**

> **PROPOSED / PENDING HUMAN ADJUDICATION — NUV-DAG-01.** The proposed NUV-24 path still requires every unchanged task dependency and operational gate. HR-06 confirmation of subscriptions/payloads and real HR-08 confirmation of privacy authentication, trigger and delivery occur inside NUV-24 after authorized deployment and before the operational exit; cleanup removes only temporary rehearsal artifacts, and final inventories must show required integrations active. HR-02/HR-08 adjudicate supported URL/OAuth/rehearsal sequencing before bootstrap. HR-03 decision precedes any conditional NUV-02/14 reconciliation; HR-07 precedes NUV-16/17; HR-08 contract decision precedes NUV-20; release approval bound to the reviewed candidate HEAD and topology or shared-budget proof precedes any deploy enabling reads. No gate depends on the task it authorizes. NUV-24 does not certify future consumer effects.

### SPEC §20 — Contracts provided to consumers

**Location:** `docs/specs/SPEC-nuvemshop.md`, after the existing `Handoff NUV-12-COVERAGE-PARTIAL` paragraph and before `## 21. Success criteria para a implementação futura` (current lines 913–928). Retain the existing handoff paragraph.

**Exact insertion:**

> **PROPOSED / PENDING HUMAN ADJUDICATION — NUV-DAG-01.** Consumers must preserve separate evidence and attempt outcomes: an exact, unique number in a sufficient current partial response may establish observed presence; a durable row additionally requires exact `getOrder` revalidation; incomplete lookup; absence unproven; pre-I/O local invalid input; and lookup failure, including malformed provider protocol data with typed protocol cause. These descriptions do not prescribe enum names. A `null` from the NUV-12-PARTIAL subset is scoped to that result and cannot be converted to global absence, ownership denial, or authorization to disclose. An `orders`-owned presence projection is not email coverage and cannot make `/conta/pedidos` complete by itself. `identity` separately proves authenticated session, verified email, explicit order association and disclosure authority. `/rastreio` always requires proof of possession: the authenticated path uses a session with verified email; the no-login path requires a cryptographically random one-use challenge emailed to that address and bound to the email and order, with short expiry, send/attempt limits, invalidation on success/expiry/replacement, and no plaintext storage or logging, as required by SPEC §10. PRD requires email plus order number and rate limits. A commercial order number alone is not possession. `/rastreio` remains limited to an authorized status summary, fulfillment timeline and available shipment tracking; it exposes no address, contact email, items, prices, payment, NF-e or raw provider data. A partial or unreconciled list must never be presented as complete.

### SPEC §21 — Success criteria

**Location:** `docs/specs/SPEC-nuvemshop.md`, after the current `Critérios 3, 4 e 17 — NUV-12-COVERAGE-PARTIAL` paragraph and before `## 22. Riscos` (current lines 929–1007).

**Exact insertion:**

> **PROPOSED / PENDING HUMAN ADJUDICATION — NUV-DAG-01.** A materialized DAG change may replace the NUV-12-FULL prerequisite into NUV-22, NUV-23 and NUV-24 with NUV-12-PARTIAL; all remaining task dependencies stay in force. This does not alter any of the 18 success criteria. NUV-24 may establish `ADAPTER OPERATIONAL / SPEC CLOSURE PENDING CONSUMERS` only after all operational prerequisites, recovery evidence, temporary-only cleanup, active final inventory, independent review and human operational acceptance. NUV-25 alone may establish `IMPLEMENTATION COMPLETE`, after effective `orders` and `catalog` evidence, all 18 criteria, final adversarial review and human closure. NUV-12-FULL, T03-GENERAL, full-contract evidence, global-absence evidence where required, and ALL_18 remain explicit NUV-25 closure prerequisites as represented in the graph. They are not currently satisfied.

## PLAN exact patches

### Graph and edge interpretation

**Location:** `tasks/nuvemshop/plan.md`, immediately after the current graph block and its HR sequencing paragraph, before `## Waves e checkpoints` (current lines 60–82). Preserve the existing graph and its current interpretation as historical baseline; append this clearly marked proposal. The actual effective graph changes only after D1–D5 approval and materialization.

**Exact insertion:**

> ### NUV-DAG-01 — PROPOSED / PENDING HUMAN ADJUDICATION
>
> Until D1–D5 are all approved and the exact approved amendments are materialized, the graph above remains effective and NUV-22/23/24 remain blocked by NUV-12-FULL as currently interpreted. After that joint approval and materialization only, replace the single NUV-12-FULL prerequisite into each of NUV-22, NUV-23 and NUV-24 with NUV-12-PARTIAL, subject to `DAG_EFFECTIVE`. Preserve every other predecessor and task acceptance condition. In the graph formula, replace `12` with `12-PARTIAL` in `{04,06,12,13,14,17,18,19,20,21} → 22`, in `{05,08,09,10,12,13,19,20,21,22} → 23`, and in `{01…11,13…23,12-PARTIAL,HR-01/02/03/04/07,HR-08 decisão humana} → 24`. Thus NUV-24 requires NUV-01–11 and NUV-13–23 plus all existing gates; only NUV-12-FULL is excluded from entry. The complete graph and dependency verification live in `tasks/nuvemshop/NUV-DAG-01-graph.md`.
>
> `12-PARTIAL` means only the deployed page-one fail-closed subset and does not satisfy `12-FULL`, T03-GENERAL, or global absence. NUV-22 retains its full negative security/privacy matrix; NUV-23 retains all existing integration/CI/fiscal tests and non-12 dependencies. NUV-24 remains conditional on NUV-01–11, NUV-13–23, NUV-12-PARTIAL, HR-01/02/03/04/07, HR-08 contract decision, candidate-HEAD release authorization, supported setup sequence, topology/budget, and every operational proof; only NUV-12-FULL is excluded from NUV-24 entry. HR-06 and real HR-08 evidence remain inside NUV-24 after authorized deployment and before its exit. Its exit still requires independent review and human operational acceptance after recovery, temporary-only cleanup and active final inventories. HR-03 decision precedes conditional NUV-02/14 reconciliation; HR-07 precedes NUV-16/17; HR-08 decision precedes NUV-20; HR-02 precedes real provider activity. No human decision is gated on the task it authorizes.
>
> NUV-24's outcome is only `ADAPTER OPERATIONAL / SPEC CLOSURE PENDING CONSUMERS`. It does not require a future consumer that has not been registered, but any already-operational consumer must reconcile before resuming. After NUV-24, the existing Capability Map sequence remains `catalog → identity → orders`; email and consent remain parallel under foundation. Future consumers perform initial sync before operating and produce their evidence before NUV-25. NUV-25 alone may close the full SPEC after all 18 criteria, effective `orders` identity/ownership/disclosure and complete-list evidence, `catalog` evidence, fiscal incompleteness behavior, active final inventories, operational recovery, final adversarial review and human closure. NUV-12-FULL/T03-GENERAL, full-contract proof, and global-absence evidence remain explicit closure obligations as represented by `FULL_CONTRACT`, `T03_GENERAL`, and `GLOBAL_ABSENCE`; these are not currently satisfied. No presence-only state or subset `null` proves absence. NUV-13 retains only its current `{11,06}` prerequisites and independent email coverage. No NUV-25→consumer implementation dependency is introduced.

### Waves, criteria and risks

**Location:** `tasks/nuvemshop/plan.md`, after the final paragraph of `## Waves e checkpoints` and before `## Human checkpoints` (current lines 84–100).

**Exact insertion:**

> **NUV-DAG-01 proposal (not effective):** If D1–D5 are later approved/materialized and `DAG_EFFECTIVE` is satisfied, the existing Wave 4 NUV-22 and Wave 5 NUV-23/24 paths may proceed with the partial adapter prerequisite, subject to all other wave gates and unchanged acceptance requirements. No wave becomes ready on this proposal alone. Keep NUV-24's independent review and human operational acceptance, temporary-only rehearsal cleanup and required active final inventories. Keep NUV-12-FULL/T03-GENERAL, full-contract/global-absence evidence where required, all 18 criteria, effective `orders` and `catalog` evidence, final adversarial review and human full closure in NUV-25. The consumer sequence remains 24→catalog→identity→orders, with consumer evidence before NUV-25. Update neither the historical planning snapshot nor unrelated risk/closure wording globally.

## TODO exact insertions

These are insertions before named existing headings, so their anchors do not depend on ambiguous paragraph boundaries. Keep every existing paragraph and checklist, including historical status labels. After D1–D5 approval and exact materialization, each insertion takes precedence only over the named active prerequisite interpretation in the immediately following task clause. No broad replacement is authorized.

### NUV-12 — `tasks/nuvemshop/todo.md`, heading `### NUV-12 · Busca exata por número`

**Insert immediately before `### NUV-13 · Contrato de busca de pedidos por e-mail` (line 165):**

> **NUV-DAG-01 current-state supplement — PROPOSED / PENDING HUMAN ADJUDICATION:** NUV-12-PARTIAL is the deployed subset; NUV-12-FULL and T03-GENERAL remain blocked/pending coverage evidence. Only after D1–D5 approval, exact materialization and `DAG_EFFECTIVE` may P12 serve as the NUV-22/23/24 adapter prerequisite. It never satisfies integral coverage or global absence. This supplement takes precedence only over the active dependency interpretation in the NUV-12 lead at lines 153–156 and its following sentence that the subset satisfies none of 22/23/24/25; it does not change NUV-12's own full-coverage obligation, approve an index, authorize a consumer, or close any dependent task. Preserve its implementation, fiscal, HR-02 and CI-FONT-01 gates.

### NUV-13 — `tasks/nuvemshop/todo.md`, heading `### NUV-13 · Contrato de busca de pedidos por e-mail`

**Insert immediately before `## Wave 3 — eventos e durabilidade` (line 176):**

> **NUV-DAG-01 boundary — PROPOSED / PENDING HUMAN ADJUDICATION:** NUV-13 retains its current `{11,06}` prerequisites and has no NUV-12 edge. Its email discovery, exact `contactEmail` comparison, incompleteness and consumer handoff proofs are independent. A future number-keyed `orders` presence projection does not prove email coverage. No local eligibility or partial results authorize a complete account list, identity association or disclosure. This supplements, and does not change, the NUV-13 dependency clause beginning `**Dependências/gates:**`.

### NUV-22 — `tasks/nuvemshop/todo.md`, heading `### NUV-22 · Suíte negativa de segurança`

**Insert immediately before `### NUV-23 · Mock HTTP integration + validation against existing CI gates` (line 254):**

> **NUV-DAG-01 precedence for NUV-22 — PROPOSED / PENDING HUMAN ADJUDICATION:** Until D1–D5 are approved and materialized and `DAG_EFFECTIVE` is satisfied, the NUV-12-FULL dependency and blocked state in the current first paragraph beginning `**Dependência integral preservada:**` remain effective. Afterward, this insertion supersedes only that paragraph's `NUV-12→22` prerequisite: require P12 instead. Every other dependency and the complete negative security/privacy matrix remain mandatory. Subset tests never satisfy T03-GENERAL, certify global absence, relax fail-closed behavior, or grant consumer authority. No PASS follows from the edge proposal.

### NUV-23 — `tasks/nuvemshop/todo.md`, heading `### NUV-23 · Mock HTTP integration + validation against existing CI gates`

**Insert immediately before `## Wave 5 — operação humana e fechamento` (line 266):**

> **NUV-DAG-01 precedence for NUV-23 — PROPOSED / PENDING HUMAN ADJUDICATION:** Until D1–D5 are approved/materialized and `DAG_EFFECTIVE` is satisfied, the NUV-12-FULL dependency and blocked state in the current first paragraph beginning `**Bloqueio de cobertura preservado:**` remain effective. Afterward, this insertion supersedes only that paragraph's `NUV-12→23` prerequisite: require P12 instead. Every other dependency, mock integration requirement, existing CI gate and fiscal/security acceptance condition remains mandatory. Partial scenarios are additional subset evidence only; they do not satisfy T03-GENERAL, NUV-12-FULL, consumer disclosure, fiscal completeness, or any other task dependency. Modern-only fiscal data remains `incomplete`, including empty responses; `not_consulted` and malformed present payload remain distinct.

### NUV-24 — `tasks/nuvemshop/todo.md`, heading `### NUV-24 · Release autorizado, smoke real e dossiê do adapter`

**Insert immediately before `### NUV-25 · Closure integral da spec` (line 279):**

> **NUV-DAG-01 precedence for NUV-24 — PROPOSED / PENDING HUMAN ADJUDICATION:** Until D1–D5 are approved/materialized and `DAG_EFFECTIVE` is satisfied, the current first paragraph beginning `**Gate integral preservado:**` and the dependency clause in NUV-24 remain effective. Afterward, this insertion supersedes only NUV-12-FULL as an entry prerequisite: require NUV-01–11, NUV-13–23 and P12 with every listed external/operational gate; exclude only NUV-12-FULL from NUV-24 entry. HR-06 subscriptions/payload evidence and real HR-08 privacy confirmation occur inside NUV-24 after authorized deployment and before operational exit. Cleanup removes only temporary rehearsal artifacts; final inventories must show required integrations active. Exit remains `ADAPTER OPERATIONAL / SPEC CLOSURE PENDING CONSUMERS`. Future consumer evidence and full closure are not waived, and this proposal authorizes no real provider action.

### NUV-25 — `tasks/nuvemshop/todo.md`, heading `### NUV-25 · Closure integral da spec`

**Insert immediately before `## Capability opcional e consumer handoffs` (line 290):**

> **NUV-DAG-01 precedence for NUV-25 — PROPOSED / PENDING HUMAN ADJUDICATION:** This insertion supplements, and does not relax, the current first paragraph beginning `**Closure preservada:**`, the NUV-25 dependencies and its 18/18 acceptance checklist. T03-GENERAL, NUV-12-FULL, full-contract/global-absence evidence where required, and all 18 criteria remain explicit NUV-25 closure obligations; none is declared satisfied. Preserve effective consumer evidence: `orders` identity, ownership, disclosure, complete `/conta/pedidos`, honest modern-only fiscal incompleteness and idempotency; `catalog` revalidation/metadata behavior; active final inventories; operational recovery; final adversarial review and human closure. The existing consumer sequence is NUV-24→catalog→identity→orders; NUV-25 waits for consumer evidence and does not gate consumer implementation. No integral status follows from the 22–24 prerequisite substitutions.

Keep NUV-25's full existing acceptance checklist, including modern-only empty response `incomplete`, `not_consulted`, malformed data as error, unresolved legacy evidence, and proof from effective consumers. Do not shorten or defer it.

## Exact graph edge ledger

| Plan source edge                                        | Proposed materialized edge                                                                                                                  | Conditions and retained evidence                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{04,06,12,13,14,17,18,19,20,21} → 22`                  | `{04,06,12-PARTIAL,13,14,17,18,19,20,21} → 22`                                                                                              | D1–D5 all approved/materialized; all negative tests and non-12 predecessors remain.                                                                                     |
| `{05,08,09,10,12,13,19,20,21,22} → 23`                  | `{05,08,09,10,12-PARTIAL,13,19,20,21,22} → 23`                                                                                              | D1–D5 all approved/materialized; all integration/CI/fiscal tests and non-12 predecessors remain.                                                                        |
| `{01…23,HR-01/02/03/04/07,HR-08 decision human} → 24`   | `{01…11,13…23,12-PARTIAL,HR-01/02/03/04/07,HR-08 decision human,DAG_EFFECTIVE} → 24`                                                        | D1–D5 all approved/materialized; only FULL12 is excluded from entry. HR-06/HR-08 real evidence, independent review and human operational acceptance remain before exit. |
| `{24, effective orders/catalog consumer evidence} → 25` | `{24, ORDERS_EVIDENCE, CATALOG_EVIDENCE, FULL_CONTRACT, T03_GENERAL, GLOBAL_ABSENCE, ALL_18, final adversarial review, HUMAN_CLOSURE} → 25` | Explicitly preserve full closure proof. Requirements are pending and evidence not available; consumers may execute after 24 and before 25.                              |
| `{11,06} → {12,13}`                                     | unchanged                                                                                                                                   | No artificial NUV-12→NUV-13 edge.                                                                                                                                       |

The explicit proposed NUV-24 predecessor set is NUV-01–11, NUV-13–23, NUV-12-PARTIAL and all named gates; NUV-12-FULL alone is excluded from NUV-24 entry and remains a separate NUV-25 closure obligation. No other task can be omitted. The existing consumer sequence after the NUV-24 operational exit is `catalog→identity→orders`; no consumer implementation depends on NUV-25. Consult the graph artifact for every expanded node and ordering.

## Exact scoped precedence for currently conflicting text

These are the known active/historical clauses that the proposed supplements address. If approved and materialized, apply the specified scope only. Keep each original sentence visible as historical provenance; do not use global replacement.

| Source anchor in baseline                                                                                 | Exact scoped precedence after D1–D5 and `DAG_EFFECTIVE`                                                                                                                                                                                    | Retained meaning                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| PLAN `plan.md:82`, paragraph beginning `**Interpretação do DAG preservado**`                              | Its statement that subset does not satisfy `12→22`, `12→23`, or `01…23→24` is superseded only for these three edges, which use P12.                                                                                                        | Its statements that NUV-12 FULL, T03 and consumer authorization remain pending continue; `12→13` is not introduced and `24→25` is unchanged.         |
| PLAN `plan.md:166`, first risk bullet beginning `NUV-12 permanece bloqueada`                              | Supersede only the claim that the pending subset can never release 22/23/24: after all five decisions/materialization, P12 can be their prerequisite subject to every other gate.                                                          | NUV-12-FULL remains blocked; T03 is not dispensed; consumer/full-closure gates remain.                                                               |
| PLAN `plan.md:177`, closure paragraph beginning `` `nuvemshop` só pode ser **IMPLEMENTATION COMPLETE** `` | No edge replacement here. Read with the expanded NUV-25 prerequisites in the Plan supplement: FULL/T03/global-absence evidence where required and ALL_18 remain closure requirements; preserve final adversarial review and human closure. | All existing NUV-25 requirements remain; NUV-24 is adapter operation only and consumers may run after 24 before 25.                                  |
| TODO `todo.md:151–156`, NUV-12 lead and dependency warning                                                | The inserted supplement before NUV-13 supersedes only the statement that P12 cannot be a prerequisite to 22/23/24 after activation.                                                                                                        | P12 does not close NUV-12 FULL or T03 and does not prove absence or authorize consumers.                                                             |
| TODO `todo.md:243–250`, NUV-22 opening dependency paragraph and dependency list                           | The inserted supplement before NUV-23 supersedes only NUV-12-FULL as a prerequisite to NUV-22.                                                                                                                                             | All other predecessors and all negative security/privacy acceptance remain.                                                                          |
| TODO `todo.md:254–264`, NUV-23 opening coverage paragraph and dependency list                             | The inserted supplement before Wave 5 supersedes only NUV-12-FULL as a prerequisite to NUV-23.                                                                                                                                             | All other dependencies, mock/CI/fiscal/security acceptance remain.                                                                                   |
| TODO `todo.md:268–277`, NUV-24 opening gate paragraph and dependency clause                               | The inserted supplement before NUV-25 supersedes only NUV-12-FULL as NUV-24 entry prerequisite, replacing it with P12 and explicitly retaining NUV-01–11, NUV-13–23 plus gates.                                                            | HR/release sequence, operational acceptance, independent review and human exit approval remain; FULL/T03/global absence and ALL_18 remain at NUV-25. |
| TODO `todo.md:279–288`, NUV-25 opening closure paragraph/dependencies/acceptance                          | No relaxation. The insertion before Capability handoffs clarifies FULL/T03/full-contract/global-absence/ALL_18 and final adversarial/human closure prerequisites.                                                                          | All existing NUV-25 acceptance and effective consumer evidence remain mandatory.                                                                     |

The same NUV-24 and NUV-25 overrides are stated in the exact PLAN and SPEC insertions above. The graph appendix is the canonical edge ledger; it must agree with these limited precedence rules. The baseline conflict review is complete for the exact PLAN/TODO clauses enumerated here; none is deferred to an unspecified patch. If a future reviewer identifies a new conflicting clause outside these anchors, do not silently widen this proposal: seek a new D5 adjudication.

## Conflict and history handling

After a later approved materialization, the supplement paragraphs above govern only the active graph interpretation and task prerequisite text they identify. Earlier snapshots, prior proposal states and historical evidence remain as provenance and must not be retroactively edited. Do not use broad search-and-replace. The specific known live clauses and their exact scoped precedence are listed above; a newly discovered clause outside those anchors requires new D5 adjudication before materialization.

## Approval record

| Decision                   | State                      | Human record |
| -------------------------- | -------------------------- | ------------ |
| D1 — DAG semantics         | PENDING HUMAN ADJUDICATION | —            |
| D2 — consumer contract     | PENDING HUMAN ADJUDICATION | —            |
| D3 — operational gate      | PENDING HUMAN ADJUDICATION | —            |
| D4 — closure               | PENDING HUMAN ADJUDICATION | —            |
| D5 — exact materialization | PENDING HUMAN ADJUDICATION | —            |
