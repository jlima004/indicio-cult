# CI-PERF-02-R02 — TypeScript boundary partitioning and performance validation

Date: 2026-10-23 (America/Sao_Paulo). Controlled experiment; documentary publication only.

## A — Executive summary

**CI-PERF-02-R02 / BLOCKED / CONTRACT_OR_EQUIVALENCE_FAILURE. Do not adopt this prototype.** The two-file organization preserves all 598 identities and the recorded assertions/compiler/diagnostic/resolution/rejection signatures, and real concurrent TypeScript work was measured. Required complete-suite validation remains failed: the primary baseline passed 2,699/2,702 tests and the prototype 2,695/2,702, with three versus seven unchanged-timeout failures affecting different identities.

Primary monotonic full-command walls were 644.545 s and 395.498 s. CPU increased from 924.955 s to 994.367 s; sampled summed process-tree RSS increased from 1,884,389,376 to 3,201,122,304 bytes. These failed single-pair observations do not establish a validated speedup, acceptable release behavior or a causal CI improvement. Section G reports the requested ratio/reduction arithmetic explicitly as unvalidated single-sample observations. No PERFORMANCE_GAIN_VALIDATED, full equivalence PASS or PROTOTYPE_PASS is claimed. The section-16 PERFORMANCE_INCONCLUSIVE completion definition also requires preserved equivalence; the primary completion state therefore remains BLOCKED.

Publish only this report, the complete identity/expectation manifest and the reproduction appendix. Keep the experimental snapshot and all negative samples in durable local evidence. Human choices are to retain the original arrangement/reject this prototype or authorize a new bounded investigation. Merge, deploy, permanent worker configuration and additional remote experiments remain unauthorized.

## B — Baseline and environment

Fetched `origin/main` equals the authorized baseline `42bb6e4f21254854d232ae8e8422c949234e3c0f`. The original local `main` checkout remains at `b305d8aa9771aafc8b08d73856412a8604c8f787`; existing worktrees were preserved. Separate managed baseline and experimental worktrees started at the authorized SHA. The experimental branch is `perf/ci-perf-02-r02-boundary-partition`.

Node 22.23.1, npm 10.9.8, TypeScript 5.9.3, Vitest 5.0.1, Next.js 16.4.1; WSL2 Linux x64, four available CPUs, about 5.79 GiB physical memory and no swap. Physical dependency copies were used, without installation or version changes. All three trees matched across 33,193 files and 1,070,948,276 bytes, excluding mutable `.vite`, `.vite-temp` and `.cache` directories: aggregate content/path SHA-256 `182ad7a28877c76ad7491d43c1ef9d96c29b3619b6b9352c943c2abf7beaeaeb`. A baseline-copy warning concerned only an already-existing `.vite-temp` directory; full content verification then passed. OS caches were not forced cold. Dynamic collection precedes measured execution on each side.

Lockfile SHA-256: `2a6e6077d46d953ee4fbeac8a776d3e0d0c79f996edcca7e3c045c740bf8d14b`. Original boundary source SHA-256: `7e743bc104720fd6b6805d75310fa82ff75b4afc84c99b7d80d43c26b1ff5d50`.

Installed-source inspection and a non-running `createVitest` probe established `forks`, isolation enabled, `jsdom`, file parallelism enabled and default timeout 5000 ms. The local normal scheduler resolves three workers from four available CPUs; a single original boundary file still occupies one worker. Explicit CLI `--maxWorkers=2` resolves two. The existing per-case timeout literals, including 10000, 12000 and 120000 ms exceptions, remain unchanged. `vmMemoryLimit` does not constrain the installed forks pool. No persistent worker count or memory limit was added.

Read the three mandatory CI-PERF evidence/reproduction documents, original boundary source, configuration/setup, package/lockfile, CI and Dockerfile; PRs #56 and #57 were inspected live and are merged. Their historical measurements and R01's exhausted 2/2 remote diagnostic budget remain distinct from this experiment.

## C — Real agent organization

The requested orchestrator is GPT-6.1 Sol Alto. This session cannot switch or independently attest its effective model. These real delegations record requested model/effort parameters accepted by the harness, rather than independently attested backend model identity.

| Role | Real agent                                                                    | Requested/accepted parameters | Work                                                                                                          |
| ---- | ----------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A    | `/root/a_contract`                                                            | `gpt-6.1-sol`, `high`         | Complete source audit, 598-case manifest, family/state contract                                               |
| B    | `/root/b_vitest`                                                              | `gpt-6.1-sol`, `medium`       | Installed Vitest source, effective workers/isolation, initial static release audit                            |
| C    | `/root/c_implementation`                                                      | `gpt-6.1-sol`, `high`         | Deterministic prototype, source/identity guards, snapshot and guarded rollback                                |
| D    | `/root/d_bench`, resumed after continuation                                   | `gpt-6.1-sol`, `medium`       | Serialized measurements, instrumentation, differential analysis and local validation                          |
| E    | `/root/e_review`                                                              | `gpt-6-luna`, `xhigh`         | Fresh independent adversarial review after implementation/differential controls; no implementation authorship |
| F    | `/root/f_release` (preliminary), `/root/f_release_final` (final continuation) | `gpt-6.1-sol`, `medium`       | Dedicated independent release/evidence audit; no implementation authorship                                    |

B supplied an additional preliminary release/static audit; dedicated F remains a separate delegation. E did not design or implement the prototype. All six roles are real; no simulated delegation or model capability attestation is claimed.

## D — Partition design and state ownership

The [complete manifest](CI-PERF-02-R02-identities.md) covers exactly 598 expanded cases, their stable logical identities and multiplicities, original locations, hierarchy, expectations, family and source-level mutation/cache/security classifications. Vitest 5.0.1 default static list sees only 155 registration templates; dynamic collection with `--staticParse=false` was necessary to freeze all 598 cases.

The prototype used `boundary-partition-a.test.ts`, `boundary-partition-b.test.ts` and a test-only `boundary-support.ts`. The original monolith was absent from collection; support does not match the unchanged test include pattern. Both partition files retain the original describe hierarchy and original afterEach restore hook. The four nested fixture matrices and all sequential compiler/cache epochs remain atomic. Each isolated fork owns its own private diagnostic/binding predecessor lanes. No source fixture writes to disk or shared cache between workers were introduced. CACHE-PATHS retains its original try/finally restoration of shared compiler options. The three real-import tests keep their mocking/env/module cleanup together.

The split was frozen only after the current original full baseline completed. A has 326 cases and 320.255 s of baseline body-duration weight; B has 272 and 316.384 s. These sums are scheduling weights, not separately measured file wall or a predicted parallel gain. Ambient and CommonJS-heavy families occupy different workers; all CI-OPT-01, native Node and guard-identity controls remain in B. Historical planning counts were 744/760 Programs, with approximately 1,187.5/1,218.5 MiB heap endpoints; current measurements below supersede those planning inputs.

| Family                                           | Cases | Partition | Original body sum, s | Partitioned body sum, s |
| ------------------------------------------------ | ----- | --------- | -------------------- | ----------------------- |
| JSDoc type dependency matrix                     | 18    | A         | 46.493               | 37.320                  |
| JSDoc ScriptKind dependency matrix               | 18    | A         | 24.382               | 34.059                  |
| triple-slash local types dependency matrix       | 33    | B         | 69.783               | 115.560                 |
| Module boundaries and real entrypoint imports    | 52    | A         | 29.393               | 33.332                  |
| triple-slash path dependency matrix              | 23    | B         | 45.079               | 49.882                  |
| Ambient process/global capabilities              | 180   | A         | 206.867              | 235.476                 |
| Browser/client import graph and CSS              | 58    | A         | 13.120               | 15.320                  |
| CommonJS runtime capabilities and local bindings | 101   | B         | 114.502              | 132.912                 |
| Guard binding and Program identity               | 9     | B         | 10.111               | 11.027                  |
| CommonJS/ESM export surfaces                     | 62    | B         | 63.590               | 69.627                  |
| Canonical resolver and tombstones                | 10    | B         | 0.010                | 0.010                   |
| CI-OPT-01 cache invalidation canaries            | 17    | B         | 2.315                | 2.128                   |
| CI-OPT-01 compiler equivalence                   | 13    | B         | 4.633                | 4.673                   |
| CI-OPT-01 library resolution                     | 1     | B         | 0.578                | 0.583                   |
| native Node diagnostic opt-in isolation          | 3     | B         | 5.781                | 5.575                   |

## E — Implementation and delivered scope

The temporary change moved 44 helper declarations and 77 complete movement units without changing their source bytes; all 155 registration/callback hashes matched independently. Fixture tables, local helper closures, assertions, original timeout literals and diagnostic calls remained inside those units. Only surrounding test imports/exports and file organization changed. No productive Nuvemshop source, package, lockfile, workflow, Vitest configuration or setup file changed.

The guard self-test rejected missing identity, duplicate identity, same-count replacement and changed callback before implementation. C's dynamic identity comparison and A's independently authored comparison both found 598/598, missing 0, duplicated 0, unexpected 0. Full primary collection separately preserved all 2,702 unit identities; non-boundary cases remained present. A comparator QC correction added occurrence ordinals and explicit multisets for 16 repeated non-boundary rows that an initial derived dictionary had collapsed to 2,686 distinct keys. The initial derived JSON remains retained; final comparison preserves all 2,702 rows and the same ten outcome differences. No boundary record or measured result was changed.

Rollback status: **COMPLETE**. The original monolith is reinstated and all three prototype files are removed; final scope verification must also bind the original source hash and protected inputs.

The uninstrumented snapshot remains in `/home/jlima/.codex/evidence/ci-perf-02-r02/prototype/`, with original source, mapping, hashes, scripts and all measurement artifacts in that evidence directory. Published executable changes: **none**. Expected final diff: three new Markdown files, this report and the identity/reproduction appendices. The [reproduction appendix](CI-PERF-02-R02-reproduction.md) preserves exact local observer/generator/comparator sources and the required archived rollback manifest as documentary fences, with hashes; it does not install or adopt them.

## F — Differential and isolation validation

Both detailed runs recorded 598 identities, 31,760,030 assertions, 1,504 Programs, 520 pre-emit diagnostic calls, 328 emitted diagnostics, 53,584 resolution traces and 957 caught boundary/client rejection events. All 598 per-case assertion counts, Program metadata (ordered roots, complete options, normalized source fingerprints), diagnostic signatures, resolution traces and rejection traces match after permitted exact-workspace-prefix normalization. Diagnostic code, category, file, start, length, message and related/source flags are preserved. Test callback/helper source and negative assertion paths remain byte-identical under the separate static unit-hash checks. Counters/traces show observed instrumented assertions and rejection events, including records from failed tests; they do not certify successful completion or every negative path. Timed-out controls remain incomplete validation and FAIL. Additional controlled mutation tests were NOT RUN; that proof is not waived and no production mutation is included or claimed. Static preservation and observed fields support the documentary fallback, not runtime PASS.

The initial comparator retained one resolution-trace mismatch for TSTYPES-06's absolute filename argument. The executed prelude already normalized containing paths/resolved targets but left `resolutions[].name` raw. Both 112-entry traces resolve to the same normalized target; only the exact worktree prefix in that first argument differed. The derived analyzer now normalizes that exact prefix too. Original JSONL, executed prelude and `baseline-profile-vs-candidate-profile.initial-raw-prefix.json` remain unchanged. The final documentary analyzer includes this explicit derivation; no diagnostic value or position was removed to obtain equality. Recorded-field equality does not make failed outcomes PASS.

Implementation precision: the observer performs literal exact-workspace text substitution wherever the token occurs (`replaceAll`), rather than enforcing a startsWith-only path parser. This also applies to `source.text` inside `boundarySourceDigest`: both filenames and source contents are normalized before the fingerprint is computed. The executed observer did **not** preserve a separate raw-text digest, so equal Program source fingerprints establish only normalized-text equality, not raw-byte equality. Static registration/helper/movement-unit byte hashes are separate evidence; they do not retroactively strengthen that observed digest. E independently checked 137,615 captured filesystem path fields in each full corpus: all have the expected `<root>/` path prefix; diagnostic/rejection messages use it inside quoted filesystem-path tokens. Those path-field checks do not prove arbitrary source-text replacement harmless. No raw observer, digest or benchmark was changed for this documentary correction; the limitation remains part of the blocked equivalence conclusion.

AST reuse totals were 208,573 and 208,040. All seven changed cases are retained below. Different immediate predecessors and initially cold worker lanes change eligible AST sets; per-case roots/options/normalized source fingerprints/diagnostics remain equal. No Program reuse or diagnostic cache was introduced. The delta is a measured locality cost, not a waived correctness check.

| Original logical identity         | Case                                                                                                                                                          | Original AST reuse | Partitioned AST reuse |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------- |
| boundary-0654edb1c1b7132e9ebf1e17 | Nuvemshop server-only boundary &gt; blocks resolved server → root mutation: import '../index.js'                                                              | 124                | 125                   |
| boundary-c5e004b8aabd579207736b90 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-02 traverses two diagnostics-clean declaration wrappers                    | 429                | 428                   |
| boundary-3c20b7db027ec576f3057d76 | Nuvemshop server-only boundary &gt; MODREQ-01 rejects diagnostics-clean static module.require through the full boundary                                       | 574                | 252                   |
| boundary-4997cd4ad3acc739b82d1f73 | Nuvemshop server-only boundary &gt; TSREF-01 rejects diagnostics-clean triple-slash declaration wrapper ownership                                             | 339                | 132                   |
| boundary-00189a17b8430f893a108b84 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-01 rejects the diagnostics-clean original global-contract finding | 132                | 128                   |
| boundary-a66e5856a2802af508f1bca5 | Nuvemshop server-only boundary &gt; RED-C rejects conventional call facade: Object.assign(module.exports, { ownerContract: () =&gt; true })                   | 124                | 125                   |
| boundary-871cfa0b1843a873b444750c | Nuvemshop server-only boundary &gt; rejects server → root dependency: import '../index'                                                                       | 124                | 123                   |

After a later host restart, focused shuffled controls ran as a separate validation cohort. A's whole ScriptKind family ran without B: 18 PASS, 0 FAIL, 308 filtered cases in the A file, seed 2302. B's CI-OPT/native families ran without A: 33 PASS, 1 FAIL, 238 filtered cases, seed 2303. The native declaration case timed out at 5,470.696 ms under the unchanged 5000-ms limit. All 18/34 selected recorded signatures match the earlier full detailed candidate; both actual selected orders differ from natural order. A has no outcome difference; B's native case changes from full-profile PASS to focused FAIL. No filtered case is counted as executed or passing.

Full A-alone and full B-alone runs, exhaustive order permutations and every family isolated were **NOT RUN**. These focused observations plus source-level state ownership do not establish complete order independence. Host restoration, snapshot/source/alias/options/roots/library and Node/client/noLib controls were executed; the remaining full-green/isolation proof is insufficient for adoption. No focused PASS supersedes any full FAIL.

## G — Measurements and limitations

The primary pair uses original uninstrumented source, normal defaults (three scheduler workers here), the same allowlisted environment/runner and full `npm run test` with JSON/task-location reporting. The detailed pair is boundary-only, with identical temporary instrumentation and explicit CLI cap two, and remains a different cohort. All observations are retained. No run was selected away, no timeout was increased and no second primary pair was started to chase PASS. With one pair per cohort, empirical variance, median/amplitude across repetitions and a robust gain are not established. Retained failures and operational cost favored the documentary fallback rather than additional adoption benchmarks.

| Untouched-source cohort | Unit PASS | Boundary PASS | External wall, s | CPU, s  | Max single-process RSS, KiB | Sampled tree RSS, bytes | Result |
| ----------------------- | --------- | ------------- | ---------------- | ------- | --------------------------- | ----------------------- | ------ |
| Original full           | 2699/2702 | 595/598       | 644.545          | 924.955 | 1490000                     | 1884389376              | FAIL   |
| Partitioned full        | 2695/2702 | 591/598       | 395.498          | 994.367 | 1471204                     | 3201122304              | FAIL   |

| Instrumented boundary cohort | PASS    | External wall, s | First-test/last-hook monotonic span, s | CPU, s  | Sampled tree RSS, bytes | Max worker heap endpoint, bytes | Result |
| ---------------------------- | ------- | ---------------- | -------------------------------------- | ------- | ----------------------- | ------------------------------- | ------ |
| Original detailed            | 596/598 | 646.320          | 642.981                                | 823.086 | 1814867968              | 1280582896                      | FAIL   |
| Partitioned detailed         | 594/598 | 366.836          | 362.961                                | 866.775 | 3164692480              | 1286858200                      | FAIL   |

Requested arithmetic: `ratio = original_wall / partitioned_wall`; `reduction_percent = (original_wall - partitioned_wall) / original_wall * 100`. Each row uses only its matching monotonic cohort. **These are descriptive ratios from failed, unreplicated samples, not validated speedups or an adoption recommendation.**

| Separate failed-sample cohort | Descriptive wall ratio | Observed wall reduction, % |
| ----------------------------- | ---------------------- | -------------------------- |
| Full untouched-source pair    | 1.629707               | 38.639284                  |
| Instrumented boundary pair    | 1.761876               | 43.242306                  |

Primary CPU rose about 7.5% and sampled tree RSS about 69.9%. These are observations on this host, not validated runner capacity or total CI savings. No two-worker GitHub benchmark was authorized or run. `ru_maxrss` is a per-process/descendant maximum, not the simultaneous tree sum. `/proc` tree RSS was sampled every 0.5 s and double-counts shared pages; short peaks can be missed. Heap is unavailable without changing observation of the original-source cohort; detailed heap/RSS endpoints are not continuous peaks or per-family allocations. Observer overhead has not been subtracted.

The instrumented candidate's worker PIDs 1073216/1073205 executed 326/272 cases. Actual test-interval intersection was 326.910 s and actual TypeScript createProgram/diagnostic-interval intersection 93.100 s; 261 sampled intervals showed both workers advancing CPU wholly inside real tests, including 31 wholly inside real compiler intervals. This proves concurrent actual work, beyond configured maxWorkers or idle worker lifetimes. Baseline had one boundary worker despite cap two.

Primary non-boundary test-body sums were 34.958/19.461 s. They overlap boundary work and are not independent wall components; dedicated others-only wall was not measured. Reporter epoch file spans are non-monotonic and cannot ground a speedup. External full-command wall is authoritative. Detailed per-family compiler/CPU/cache/heap observations follow; they are instrumented state measurements, not additive elapsed time.

| Family                                           | Programs (both) | Diagnostic calls (both) | AST reuse B/C | Worker body CPU B/C, s | Max heap endpoint B/C, MiB |
| ------------------------------------------------ | --------------- | ----------------------- | ------------- | ---------------------- | -------------------------- |
| JSDoc type dependency matrix                     | 54              | 18                      | 1963/1963     | 30.859/35.076          | 750.1/865.7                |
| JSDoc ScriptKind dependency matrix               | 64              | 22                      | 2190/2190     | 25.118/28.304          | 760.4/874.4                |
| triple-slash local types dependency matrix       | 106             | 29                      | 12406/12402   | 94.881/116.011         | 1221.3/1227.2              |
| Module boundaries and real entrypoint imports    | 71              | 1                       | 8825/8618     | 36.299/39.745          | 1115.1/1172.7              |
| triple-slash path dependency matrix              | 76              | 18                      | 9104/9103     | 68.034/62.828          | 1209.5/1114.9              |
| Ambient process/global capabilities              | 492             | 157                     | 92415/92415   | 265.425/272.172        | 1209.2/1100.1              |
| Browser/client import graph and CSS              | 63              | 5                       | 8893/8893     | 18.678/20.020          | 1117.9/1018.3              |
| CommonJS runtime capabilities and local bindings | 295             | 95                      | 55767/55445   | 154.196/162.738        | 1117.8/1054.3              |
| Guard binding and Program identity               | 19              | 9                       | 4131/4131     | 15.100/14.190          | 1059.5/1052.3              |
| CommonJS/ESM export surfaces                     | 99              | 0                       | 12374/12375   | 85.658/82.991          | 1138.1/1075.6              |
| Canonical resolver and tombstones                | 0               | 0                       | 0/0           | 0.011/0.014            | 1060.6/896.4               |
| CI-OPT-01 cache invalidation canaries            | 63              | 21                      | 332/332       | 3.185/3.598            | 755.5/1052.6               |
| CI-OPT-01 compiler equivalence                   | 88              | 127                     | 67/67         | 7.054/8.362            | 1134.6/555.8               |
| CI-OPT-01 library resolution                     | 11              | 16                      | 16/16         | 0.828/0.863            | 244.5/197.0                |
| native Node diagnostic opt-in isolation          | 3               | 2                       | 90/90         | 10.853/9.740           | 620.5/533.6                |

Preparation is excluded from benchmark wall. Candidate support/A/B instrumentation setup took 0.442/0.355/0.390 s in separate measured commands. Earlier baseline instrumentation preparation overlapped the first approximately 8.3 s of the primary candidate command (tool wall, not independently isolated compiler CPU); it is an unmatched small background-analysis confound. No second heavy application/test/build command ran concurrently. The detailed pair did not overlap candidate compiler preparation with the baseline run. Ordinary analysis/text work was not an experimentally isolated zero-load condition.

The host restarted after all four original benchmark commands had finished, before continuation at approximately 13:48 UTC. Preserved benchmark monotonic ranges belong to the earlier boot; subsequent focused/check/build observations use the new boot `9ee74ed9-0008-4c25-bbac-e280c888716e`. Node/npm versions and file/source SHA-256 checks were rechecked. Post-restart timings/caches are not pooled with the original performance pair. Historical WSL timeouts (TSTYPES-09-ROOT and native declaration) and old remote PASS remain historical, not substitutes for these local outcomes.

### Every failed timed test in the measured suites

All rows below retain their original default limit of 5000 ms. Passing the same identity in another run does not erase its FAIL.

| Run                 | Complete case identity                                                                                                                                                        | Observed body duration, ms | Outcome        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------- |
| baseline-a          | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-01 rejects the diagnostics-clean consecutive-block typedef finding                                | 6796.741                   | FAIL / timeout |
| baseline-a          | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-02 rejects the diagnostics-clean consecutive-block import tag                                     | 6395.036                   | FAIL / timeout |
| baseline-a          | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-03 rejects compiler-recognized inline import types                                                | 5861.186                   | FAIL / timeout |
| candidate-a         | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-01 rejects the diagnostics-clean original global-contract finding                 | 6281.079                   | FAIL / timeout |
| candidate-a         | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-06 canonicalizes effective local filename ./nested/../__b-types-wrapper.d.ts      | 6287.809                   | FAIL / timeout |
| candidate-a         | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-09-ROOT cannot fabricate runtime or explicit-marker protection                    | 7637.883                   | FAIL / timeout |
| candidate-a         | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-09-MARKER cannot fabricate runtime or explicit-marker protection                  | 6920.047                   | FAIL / timeout |
| candidate-a         | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-15 cannot fabricate runtime or explicit-marker protection                         | 8261.523                   | FAIL / timeout |
| candidate-a         | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-CONSUMER rejects diagnostics-clean adapter-local types reaching a consumer module | 5042.469                   | FAIL / timeout |
| candidate-a         | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; resolves adapter server-to-root reference paths without module extension substitution            | 5887.800                   | FAIL / timeout |
| baseline-profile    | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; resolves adapter server-to-root reference paths without module extension substitution            | 12228.189                  | FAIL / timeout |
| baseline-profile    | native Node diagnostic opt-in isolation &gt; NODE-DIAGNOSTIC includes real installed declarations without weakening complete adapter diagnostics                              | 5242.179                   | FAIL / timeout |
| candidate-profile   | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-01 rejects the diagnostics-clean original global-contract finding                 | 6299.873                   | FAIL / timeout |
| candidate-profile   | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-09-ROOT cannot fabricate runtime or explicit-marker protection                    | 5272.657                   | FAIL / timeout |
| candidate-profile   | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-CONSUMER rejects diagnostics-clean adapter-local types reaching a consumer module | 5086.240                   | FAIL / timeout |
| candidate-profile   | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; resolves adapter server-to-root reference paths without module extension substitution            | 5202.652                   | FAIL / timeout |
| candidate-b-shuffle | native Node diagnostic opt-in isolation &gt; NODE-DIAGNOSTIC includes real installed declarations without weakening complete adapter diagnostics                              | 5470.696                   | FAIL / timeout |

The separate post-restart focused B native timeout is retained above; any additional normal-check failures are recorded in J.

## H — Security and release invariants

The experiment preserves fresh Program/checker/resolution/diagnostic state and the two immediate-predecessor AST lanes. It adds neither `oldProgram` reuse nor a broad Program/TypeChecker/diagnostic cache. Full option snapshots, authoritative overlays, tombstones, parser inputs, forced-fresh parsing and host restoration remain in the unchanged helper bodies. Sequential source/alias/options/roots/add-delete-restore/library epochs stay inside their original callbacks.

NUV-14 native declarations remain an explicit adapter-diagnostic capability. Client diagnostic Programs retain empty types and absent implicit Node roots/globals; binding Programs retain `noLib:true` and `types:[]`. Production webhook/HMAC code and all other production sources are unchanged. No provider credentials or authenticated provider calls are used; child commands receive an environment allowlist, and no original `.env` is copied.

The unchanged normal CI retains `npm ci` → complete `npm run check` → Next build → Playwright E2E → repository/history Gitleaks → client-bundle scan → Docker build. The main-only `db-types` job still depends on `ci`; its expected PR SKIPPED result is not PASS. Deploy continues to require whole-CI success, triggering push/main and exact-SHA guards. This experiment creates no additional remote workflow, release lane, timeout, skip, dependency update or check suppression. Normal Draft PR CI validates the published tree; it is not a remote performance experiment or authorization to merge/deploy.

## I — Independent adversarial and release review

E is independent from implementation and was dispatched only after implementation and differential/shuffled controls. Its review covers all 25 requested questions, including identity/duplicates/assertions, diagnostics/negative paths, compiler/cache/Node boundaries, state/order, real concurrency, memory/comparability, full-suite failures, pipeline protection, scope and rollback. B's preliminary static audit verified the frozen prototype hashes and protected inputs, with no material static P0/P1/P2; it explicitly withheld runtime/publication approval. Dedicated F additionally audits the documentary release evidence.

E's independent preliminary 25-question review rejected prototype adoption: **P1** incomplete full-suite/runtime/negative-control proof and **P2** unvalidated performance with CPU/memory cost. Those findings remain adoption blockers. Initial E/F documentary approvals bound the first published commit; they did not catch the three later valid P2 findings in the sole remote Codex Review. That initial approval does not cover this remediation.

The original review of `a993f1d63d643e6fd77972d6ce6e625e2b6c1bc6` found:

- [Source-fingerprint qualification](https://github.com/jlima004/indicio-cult/pull/58#discussion_r4360468927): the observer normalizes source text too, and captured no independent raw-text digest. This revision corrects the qualification without changing measured artifacts.
- [Required rollback manifest](https://github.com/jlima004/indicio-cult/pull/58#discussion_r4360468939): the appendix now supplies the exact archived `prototype/manifest.json`, its hash/schema and explicit snapshot-copy/save/verification steps. A separate synthetic temp-root validation confirmed dry-run, mismatch refusal without writes, exact matching rollback and preservation of an unrelated sentinel.
- [Focused B failure ledger](https://github.com/jlima004/indicio-cult/pull/58#discussion_r4360468946): the table now includes the actual `candidate-b-shuffle` native timeout at 5,470.696 ms, in addition to every previously retained failure.

The experimental source and all raw measurement files remain unchanged. Final fresh E/F remediation verdicts and exact file/diff/commit bindings will be supplied in the PR publication receipt. Documentary approval does not approve the withdrawn prototype, waive its P1/P2 blockers or assert a new bot review of the corrected HEAD. No second Codex Review request is made.

## J — Validation and publication binding

Local source guards/identity collection/ESLint and diff checks passed; inherited two `_source` warnings remain unchanged. The four measurement runs and focused controls have their real FAIL/PASS outcomes above. All temporary instrumentation was removed from original/prototype sources byte-for-byte before normal check/build; baseline worktree returned clean. No local E2E/Docker/db-types operational PASS is inferred from unit or static evidence.

Post-restart local validation (separate from the four benchmark samples): after byte-exact instrumentation restoration, `npm run check` **FAIL**, 437.605150 s monotonic. Lint, runtime/token lint, formatting, Next type generation, TypeScript, runtime tooling **6/6** and token tooling **135/135** passed; lint retained two existing warnings. Full Vitest finished **2,695 PASS / 7 FAIL / 2,702**, including **591 PASS / 7 FAIL / 598** boundary cases; all seven failures were unchanged **5,000 ms** timeouts. Its own reported duration was 406.16 s, separate from total check wall. These results do not replace any earlier FAIL.

| Failed case                                                                                                                                                             | Rounded reported ms | Limit ms |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------: | -------: |
| Nuvemshop server-only boundary > triple-slash local types dependency matrix > TSTYPES-01 rejects the diagnostics-clean original global-contract finding                 |                5856 |     5000 |
| Nuvemshop server-only boundary > triple-slash local types dependency matrix > TSTYPES-09-ROOT cannot fabricate runtime or explicit-marker protection                    |                7185 |     5000 |
| Nuvemshop server-only boundary > triple-slash local types dependency matrix > TSTYPES-09-MARKER cannot fabricate runtime or explicit-marker protection                  |                7872 |     5000 |
| Nuvemshop server-only boundary > triple-slash local types dependency matrix > TSTYPES-15 cannot fabricate runtime or explicit-marker protection                         |                5707 |     5000 |
| Nuvemshop server-only boundary > triple-slash local types dependency matrix > TSTYPES-CONSUMER rejects diagnostics-clean adapter-local types reaching a consumer module |                5365 |     5000 |
| Nuvemshop server-only boundary > triple-slash path dependency matrix > resolves adapter server-to-root reference paths without module extension substitution            |                5351 |     5000 |
| native Node diagnostic opt-in isolation > NODE-DIAGNOSTIC includes real installed declarations without weakening complete adapter diagnostics                           |                6482 |     5000 |

`npm run build` **PASS**, 24.639858 s monotonic, using explicit synthetic `.invalid` URLs, dummy `ci-unused` keys, the baseline APP_VERSION and disabled telemetry. No Google-font incident occurred. This validates compilation with synthetic configuration and does not validate a provider, production configuration or deployment.

The documentary branch was initially published as [Draft PR #58](https://github.com/jlima004/indicio-cult/pull/58) at `a993f1d63d643e6fd77972d6ce6e625e2b6c1bc6`. Its [single requested Codex Review](https://github.com/jlima004/indicio-cult/pull/58#issuecomment-6366857461) reviewed that initial commit and returned the three valid P2 findings described in I. This revision corrects the documents; the original review does not attest the corrected HEAD. No second review request is made. The [initial normal CI run 39967270939](https://github.com/jlima004/indicio-cult/actions/runs/39967270939) is evidence for its own initial SHA only, not this correction. It failed at E2E webServer readiness after 180,000 ms. The Check step passed all 2,702 unit tests (plus tooling checks), and Build passed; Gitleaks, client-bundle scanning, Docker and db-types were SKIPPED, not PASS. The actual checkout was PR merge `ab38d6e5e42c3f1aa6f3491ec681cf5c4a94e0a6`, tree `85575097ce1dd19ae4e08bde85e18670f067970e`, matching the initial documentary tree. Logs include the existing standalone/next-start warning, but do not establish the readiness failure's root cause. No Playwright/configuration/timeout remediation or retry was performed; the failure remains retained separately from the local prototype failures.

The final PR body/conversation will bind the actual corrected commit, three-file scope, fresh E/F remediation receipts, exact-final-HEAD normal CI and the disposition of the original review threads. Those external receipts avoid a self-referential commit hash inside its own source. Final correction CI and thread-resolution receipts are not assumed at this versioned snapshot. The final PR receipt supersedes publication status only, leaving every negative experiment conclusion intact.

Normal PR CI validates the documentary tree with the restored original test suite. It does **not** validate the withdrawn two-file prototype. Main-only db-types is expected SKIPPED on PR, never PASS; main/deployment authorization remains separate. An ordinary PR CI completion can create a Deploy Production workflow_run record whose deploy job is skipped by unchanged push/main predicates. No remote experimental workflow, repeated diagnostic run, merge or deployment belongs to R02. Any next/font/google build incident is reported separately; no font or Next configuration remediation is introduced.

## K — Human decision required

Retain the original suite and reject adoption of this prototype under the current evidence. Alternatively authorize a new bounded investigation that addresses reliable unchanged-timeout execution, full partition-alone/order validation, repeated comparable measurements and actual runner memory/cost before proposing adoption. This report grants no authority for a permanent worker cap, CI job split (R03), broad Program/result cache (R05), dependency change, merge or deploy. The experiment is delivered as a negative/blocked adoption result with a documentary Draft PR; it is not an unfinished promise to publish the prototype later.
