# CI-PERF-02 — npm installation diagnostics and TypeScript boundary profiling

Date: 2026-10-22 (America/Sao_Paulo). Scope: diagnostic audit and proposals only.

## A — Executive Summary

The historical seven-minute npm root cause remains **unproven**. Equal lock/cache/host versions coexist with 18–424 s installations, and the same-baseline db-types job installs quickly. The local controlled install attempts did not reproduce seven minutes; local reify/unpack timers were large and audit overlapped them. Missing audit-summary text is a clue, not a root-cause measurement.

The boundary bottleneck is structural: 1,504 Programs, 520 diagnostic calls and 31,760,030 invariant assertions were observed in the complete instrumented file. Existing bounded AST reuse is active; reading fixtures and constructing environments are cheap here. Diagnostics and graph/invariant work are meaningful investigation targets. No new safe cache optimization or causal speedup has been validated.

The complete local baseline has two real unchanged-5-second timeouts; the instrumented run and isolated native diagnostic also fail by timeout. These are reported negative results, not application validation PASS. First prioritize R01's authorized-later remote timing, then investigate R02's bounded partition prototype; R03/R04 require broader architecture/trust work, and R05 is rejected. No definitive optimization, workflow, dependency, timeout, assertion, production code or release contract is changed. Independent approvals and publication receipts are recorded in I/J.

Diagnostic audit state after independent review: **CI-PERF-02 / LOCAL_AUDIT_PASS / REMOTE_PENDING**. This approves the diagnostic dossier and its limits, not a green local application suite. Remote diagnostic instrumentation remains separately unauthorized.

## B — Baseline & GitHub Runs

The expected baseline, original clean checkout, fetched `origin/main`, documentation worktree and disposable measurement worktrees all started at `b305d8aa9771aafc8b08d73856412a8604c8f787`. The documentation branch is `docs/ci-perf-02-diagnostics`. Existing checkouts and worktrees were preserved.

The final published diff must contain Markdown only. `package.json`, lockfile, production sources, boundary tests, HMAC tests, workflows, Dockerfile and Vitest configuration remain byte-identical to the baseline.

### Historical installation and test observations

| Run / event                                                                                                           | Actual checkout                            | npm command to summary | Vitest / boundary | Docker dependency layer |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------- | ----------------- | ----------------------- |
| [39715228681 / push main](https://github.com/jlima004/indicio-cult/actions/runs/39715228681/job/119615617126)         | `b305d8aa9771aafc8b08d73856412a8604c8f787` | 422.003 s              | 497.03 / 494.42 s | 23.4 s                  |
| [39711411882 / PR #55](https://github.com/jlima004/indicio-cult/actions/runs/39711411882/job/119603370682)            | `b4ee12ab6ad02930aef163aaa9bb5cd5ac9f3b68` | 423.691 s              | 322.90 / 321.14 s | 421.3 s                 |
| [39682910236 / push after PR #54](https://github.com/jlima004/indicio-cult/actions/runs/39682910236/job/119509630554) | `ab70a3a6262ebcfc020a2790d9179148356dae35` | 18.372 s               | 462.09 / 459.45 s | 23.4 s                  |

These are three observations, not causal before/after optimization samples. npm durations use log command/summary timestamps; Actions step durations have coarser boundaries and are shown separately in the chronology. Docker layer duration includes its RUN context and is not the host install duration.

PR #55's API head is `ed142a0c4f0dfc75f6b2327eab4f789f721d3b05`; the actual tested checkout was the merge ref shown above. That merge object was fetched read-only. Its complete tree and the baseline tree are identical: `ffa9198ae52f5fdfb6e76e65630e514d138c9de1`. Thus the boundary difference of 321.14 versus 494.42 seconds exists with identical tracked inputs. Runner/time-dependent state remains uncontrolled; this does not identify which environmental factor dominates.

PR #54 versus baseline differs only in the four NUV-14 implementation/test/evidence files. `package.json`, lockfile, workflows, Dockerfile and Vitest configuration are unchanged. All three checkout lockfiles have the SHA-256 in F. NUV-14's three additional canaries and explicit native Node diagnostic capability are preserved; the observed installation regression cannot be assigned to those code changes from these data.

All three host jobs use Node 22.23.1, npm 10.9.8 and runner 2.338.0, restore 337,109,425 bytes (321.49 MiB) under the same cache key, and install 543 packages. Cache key: `node-cache-Linux-x64-npm-d17d8a101ab44ecaa3d8d7d61fade855193577a41bae7040512491e0c001e69d`. Docker logs disclose npm 10.9.9 through its update notice; Alpine/native package handling is a distinct cohort.

The same-baseline [db-types job 119620903745](https://github.com/jlima004/indicio-cult/actions/runs/39715228681/job/119620903745) installed in 18.242 s. The PR #54 [db-types job 119514185102](https://github.com/jlima004/indicio-cult/actions/runs/39682910236/job/119514185102) installed in 14.859 s. Both restored the same cache and used the same host Node/npm. These independent runners weaken a deterministic source-graph explanation but do not isolate network, audit, disk or contention.

| Main historical job | Start UTC           | Ubuntu image / provisioner    | Region         | Cache HIT to restore success |
| ------------------- | ------------------- | ----------------------------- | -------------- | ---------------------------- |
| 119615617126        | 2026-10-22 03:08:46 | 20261012.334.1 / 20261012.601 | southcentralus | 3.171 s                      |
| 119603370682        | 2026-10-22 02:26:52 | 20261018.339.1 / 20261015.610 | westus3        | 3.061 s                      |
| 119509630554        | 2026-10-21 21:57:50 | 20261012.334.1 / 20261012.601 | westus2        | 4.666 s                      |

All are Azure GitHub-hosted Ubuntu 24.04.5 x64. Image version alone does not explain the host regression: the fast PR #54 job and slow baseline job have the same image. Cache restoration finishes before the install command; its seconds do not account for the following seven minutes. Restoration success does not prove complete offline cache coverage.

The baseline Actions chronology (UTC, step boundary resolution of one second): setup-node 03:08:49–03:08:58; install 03:08:58–03:16:00; check 03:16:00–03:24:38; build 03:24:38–03:24:56; Chromium 03:24:56–03:25:16; E2E 03:25:16–03:25:29; repository/history/bundle scans 03:25:29–03:25:32; Docker 03:25:32–03:26:34. The job finishes at 03:26:36; db-types follows on its own runner. `check` includes 2,702 passing unit tests and 141 passing tooling tests in this historical run. Its 518 seconds are distinct from Vitest's 497.03 seconds and the boundary file's 494.42 seconds.

## C — Subagents

The requested orchestrator is GPT-6.1 Sol Alto. This session cannot switch or independently attest its own effective model. Delegated model/effort parameters and accepted agent registrations are recorded below; they are not independent runtime model attestations.

| Role | Real agent                                                                  | Requested and accepted parameters | Responsibility                                                                   |
| ---- | --------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| A    | `/root/npm_investigator`                                                    | `gpt-6.1-sol`, `high`             | Historical runs, npm phases, controlled installation experiments                 |
| B    | `/root/boundary_profiler`                                                   | `gpt-6.1-sol`, `high`             | Full-suite baseline, families, temporary compiler instrumentation                |
| C    | `/root/benchmark_methodology`                                               | `gpt-6.1-sol`, `medium`           | Comparability, experiment design and statistical limitations                     |
| D    | `/root/independent_review`                                                  | `gpt-6-luna`, `xhigh`             | Independent adversarial review after consolidation, without diagnosis authorship |
| E    | `/root/release_evidence_auditor`, resumed as `/root/release_audit_recovery` | `gpt-6.1-sol`, `medium`           | Independent pipeline, configured enforcement and release evidence audit          |

A resumed as `/root/npm_recovery` and B as `/root/boundary_recovery` after interruption; the accepted parameters were unchanged. C completed the methodology assessment before interruption; its principal conclusions were retained in the conversation and environment metadata was recaptured on resume. D reviewed only after consolidation and did not author the diagnosis or recommendations. E completed both preliminary and final release audits. Review receipts are in I; final publication binding remains a separate step.

## D — npm Install Findings

Cache HIT is package-cache availability, not a ready `node_modules` installation. `npm ci` still performs a clean install; neither HIT nor a long silent interval identifies the dominant phase. See [npm v10 ci](https://docs.npmjs.com/cli/v10/commands/npm-ci/) and [setup-node v7 caching](https://github.com/actions/setup-node/blob/v7.0.0/docs/advanced-usage.md#caching-packages-data).

Historical clues: both slow host summaries say `added 543 packages in 7m`, omitting the `audited 544 packages` reported by the fast host, Docker and db-types installs. The slow Docker install also omits the audit count. npm 10.9.8's installed Arborist implementation attempts bulk advisory lookup, falls back to quick audit on failure, can return no report, and awaits the audit report in reify. Therefore the missing audit count is compatible with an unsuccessful auxiliary audit request; it does not time that request or prove it consumed the seven minutes. npm intentionally hides lifecycle output by default, so the absence of lifecycle lines cannot exonerate scripts. See [npm v10 logging](https://docs.npmjs.com/cli/v10/using-npm/logging/).

No npm phase timers, HTTP timings, CPU/memory/I/O traces or lifecycle durations were recorded by those historical install commands. Registry latency, cache utilization, extraction, scripts and audit cannot be separated conclusively from their default logs. In particular, cache HIT, a 420-second pattern and an omitted audit count are not a root-cause measurement.

### Local controlled installation observations

Four serialized clean installs ran in their own disposable workspace, with a private allowlisted environment, public registry, empty private user/global npmrc and no real credentials. Cache preparation copied only validated public lock-integrity blobs: 525 of 659 eligible integrities, 336,976,153 bytes, zero mismatches; 134 absent integrities included other platforms. No original npmrc/cache index was copied and no global config changed. Preparation was outside the timed interval. All samples kept lifecycle scripts active and preserved package/lock bytes.

| Order / command variant                                  | Start UTC | Initial node_modules       | Monotonic wall, s | User / system CPU, s | MaxRSS, KiB | Result                                 |
| -------------------------------------------------------- | --------- | -------------------------- | ----------------: | -------------------: | ----------: | -------------------------------------- |
| original 1: npm ci --timing --logs-max=0 --loglevel=info | 14:01:58  | absent                     |            76.219 |      43.373 / 41.209 |   1,441,580 | exit 0; 543 added, 544 summary-audited |
| no-audit 1: same command plus --no-audit                 | 14:03:27  | present; npm ci removes it |            57.297 |      24.086 / 28.330 |   1,434,308 | exit 0; 543 added                      |
| original 2: original command, clean reinstall            | 14:04:40  | present; npm ci removes it |            75.338 |      21.920 / 21.185 |   1,437,412 | exit 0; 543 added, 544 summary-audited |
| offline 1: same command plus --offline                   | 14:06:22  | present; npm ci removes it |            81.971 |      19.753 / 18.486 |   1,405,752 | exit 0; 543 added, 544 summary-audited |

The original commands have n=2, descriptive median **75.779 s**, min/max **75.338–76.219 s**. Auxiliary variants each have n=1. The private cache evolves across samples; initial absence versus removal of node_modules also differs. These are exploratory installation controls, not a frozen-cache causal optimization comparison. The observed no-audit time is not a validated saving. Offline was slower in its single observation and is not recommended as a production command. Four installs were sufficient to cover the requested scenarios without unnecessary repetition.

| npm named timer (Date.now basis), s | Original 1 | No-audit 1 | Original 2 | Offline 1 |
| ----------------------------------- | ---------: | ---------: | ---------: | --------: |
| reify:unpack                        |     76.248 |     56.034 |     73.837 |    80.350 |
| reify                               |     77.014 |     56.623 |     74.463 |    80.911 |
| reify:audit                         |     37.255 |     absent |     12.296 |     0.006 |
| auditReport:getReport               |      6.777 |     absent |      8.330 |    absent |
| auditReport:init                    |     30.478 |     absent |      3.966 |    absent |
| build:run:postinstall               |      0.100 |      0.133 |      0.084 |     0.101 |

All samples yielded real numeric npm timers and zero unfinished timers. npm's Date.now intervals differ from the external monotonic clock (some exceed the measured process wall); they are named-phase observations with a different time base. Timers nest/overlap and cannot be summed or subtracted into a critical-path attribution. The original audit timer falls from 37.255 to 12.296 s while external install wall stays about 75–76 s. Measured bulk-audit POSTs succeeded in 6.774 and 8.327 s. Original 1 additionally observed ten public-registry GETs; the collector does not establish complete network tracing. No HTTP lines were observed for no-audit/offline; that is not a universal proof of no network.

Offline success establishes sufficient cache contents for this specific platform/install after the preceding online samples. It also printed `audited 544` despite the installed npm offline audit bypass and no audit HTTP observed. Thus the summary's audit count alone does not prove a fresh advisory consultation, and its absence alone does not time a failure. Installed source `audit-report.js`/`reify-output.js` supports this distinction. The root has no lifecycle scripts; the lock flags fsevents and unrs-resolver, with the applicable installed postinstall measured near 0.1 s locally. None of these local measurements proves the historical runner's dominant phase.

### Hypothesis classification

| Hypothesis                        | Historical verdict           | Local discriminator / remaining gap                                                                                                          |
| --------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| H1 registry access                | INSUFFICIENT_EVIDENCE        | Local successful bulk requests measured; no historical HTTP/retry/DNS/TLS durations                                                          |
| H2 cache verification/utilization | INSUFFICIENT_EVIDENCE        | Archive restored quickly; local seeded/evolved cache differs from the historical archive; no historical per-package utilization trace        |
| H3 reify/extract/disk writes      | INSUFFICIENT_EVIDENCE        | Large local unpack/reify timers confirmed, but not physical-I/O attribution or historical stall cause                                        |
| H4 lifecycle/postinstall          | INSUFFICIENT_EVIDENCE        | Local postinstall near 0.1 s; historical default logs lack script timing                                                                     |
| H5 audit/auxiliary work           | SUPPORTED_BUT_NOT_PROVEN     | Missing historical count fits audit-report failure; local audit overlaps unpack and count can appear offline; no historical phase trace      |
| H6 runner contention/variation    | SUPPORTED_BUT_NOT_PROVEN     | Same commit/cache/runtime fast on another runner, and identical trees have different test durations; no contemporaneous host resource traces |
| H7 GitHub/Docker/Coolify network  | INSUFFICIENT_EVIDENCE        | Docker fast/slow observations use a different runtime/cache scope; no Coolify benchmark performed                                            |
| H8 incomplete cache contents      | INSUFFICIENT_EVIDENCE        | HIT/size does not prove coverage; local later offline success does not establish historical coverage                                         |
| H9 host Node/npm differences      | REJECTED for these host jobs | Node/npm identical across all five inspected host jobs; Docker npm differs and remains a cross-environment confounder                        |
| H10 dependency-graph property     | INSUFFICIENT_EVIDENCE        | Unchanged graph rejects a graph-change explanation; graph operations can still vary with platform/environment                                |

### Next remote diagnostic protocol — not executed

State: `REMOTE_INSTRUMENTATION_AUTHORIZATION_PENDING`. The normal documentary PR CI is authorized separately and will not silently acquire diagnostic flags.

After specific authorization, use a fixed full SHA/lock, the pinned Node/setup-node version and the existing npm content-cache policy. Record actual npm version, OS/image/provisioner/region, cache key/HIT/bytes/restore interval and per-sample cache state. Use an allowlisted environment without provider/deployment credentials, private npmrc/log directories and no global config edits. Start with the original `npm ci --timing`; capture external monotonic wall, CPU, RSS and I/O alongside numeric phase timers, cache utilization and lifecycle duration. Retain scripts and audit in that control.

Only after that control, compare a bounded isolated auxiliary-operation variant, alternating order or restoring the same private cache snapshot. Record every attempt, including failed/offline/cache-incomplete results, with at most three comparable samples per feasible variant. A no-audit variant is diagnostic only; any permanent separation of audit would require an equivalent mandatory audit gate and separate approval. Offline success cannot by itself distinguish audit from tarball fetch because npm's offline path also changes auxiliary behavior.

Reduce HTTP observations to method, endpoint class (tarball, metadata, bulk audit, quick audit), status, retry count and duration. Never publish headers, bodies, auth, registry query strings, environment dumps, npm config dumps or raw debug logs. Confirm a long measured phase/endpoint before naming a cause. A trace showing time in audit does not automatically prove a specific registry/network outage; distinguish client waiting, retries and endpoint behavior. No remote experiment or later optimization may remove any existing CI/release gate.

## E — TypeScript Boundary Findings

The current harness already reuses eligible ASTs from the immediate predecessor in separate binding/diagnostic lanes and constructs a fresh Program. The audit will not propose indiscriminate Program reuse.

### D1 — unmodified complete Vitest baseline

One complete local Vitest run, with the original source/configuration/assertions and default 5,000 ms test timeout, finished with **2,700 PASS / 2 FAIL / 2,702 total**, including **596 PASS / 2 FAIL / 598 boundary tests**. Both failures were real timeouts: `TSTYPES-09-ROOT` at 5,075.321 ms and the adapter `NODE-DIAGNOSTIC` native-declaration case at 5,035.582 ms. No timeout was changed and no retry/skip was introduced. A focused pass later cannot turn this run into PASS.

External monotonic process wall was **644.014 s**, user CPU **868.104 s**, system CPU **41.160 s**, maximum process/child RSS **1,437,716 KiB**. CPU accounts for waited processes and their threads and can exceed elapsed wall. The maximum RSS is not an aggregate simultaneous tree footprint. These local values cannot predict GitHub-hosted performance or establish a regression caused by a code change: the measured code was the baseline itself.

Reporter timestamps imply a 654.595 s boundary interval, exceeding the measured process lifetime; they are not treated as a trustworthy monotonic wall clock. The serial per-test reported durations sum to 639.355 s, a descriptive body-duration measure rather than total process wall. The outer monotonic timer is authoritative. D3 worker-level timing and family attribution are recorded separately from this uninstrumented baseline.

The partition below is exclusive and covers all 598 boundary identities. It uses suite ancestry and original source locations, with executable mapping in the reproduction appendix. Type diagnostics are exercised across dependency, ambient, CommonJS and explicit compiler families; they are not an extra disjoint group to add again.

| D1 family                              | Tests | Reported serial body sum, s |  Mean, ms |      Worst, ms |
| -------------------------------------- | ----: | --------------------------: | --------: | -------------: |
| JSDoc type dependencies                |    18 |                      33.903 | 1,883.507 |      3,430.965 |
| JSDoc ScriptKind                       |    18 |                      22.042 | 1,224.562 |      2,535.249 |
| Triple-slash local types               |    33 |                      70.812 | 2,145.822 | 5,075.321 FAIL |
| Module boundaries and real entrypoints |    52 |                      28.848 |   554.770 |      1,964.774 |
| Triple-slash paths                     |    23 |                      46.462 | 2,020.076 |      4,695.121 |
| Ambient process/global capabilities    |   180 |                     211.903 | 1,177.237 |      1,941.950 |
| Browser/client import graph and CSS    |    58 |                      14.463 |   249.358 |      2,271.290 |
| CommonJS runtime/local bindings        |   101 |                     121.742 | 1,205.370 |      1,764.904 |
| CommonJS/ESM exports                   |    62 |                      64.005 | 1,032.345 |      1,455.589 |
| Guard binding / Program identity       |     9 |                       9.877 | 1,097.431 |      1,245.758 |
| Canonical resolver / tombstones        |    10 |                       0.011 |     1.124 |          1.298 |
| CI-OPT-01 cache invalidation           |    17 |                       2.188 |   128.703 |        658.871 |
| CI-OPT-01 compiler equivalence         |    13 |                       6.019 |   462.975 |        769.284 |
| CI-OPT-01 library resolution           |     1 |                       0.830 |   830.137 |        830.137 |
| Native Node diagnostic opt-in          |     3 |                       6.250 | 2,083.190 | 5,035.582 FAIL |

Ambient and CommonJS capability families dominate this local body-duration attribution. The three native Node opt-in canaries account for about 6.25 s of it; native-declaration costs also occur in other adapter diagnostics, so this is not the total cost attributable to Node declarations or a causal before/after NUV-14 estimate. Cache invalidation, compiler equivalence and library resolution controls are deliberate security work, not candidates for removal.

### D3 — complete instrumented boundary run

The temporary copy ran all **598** boundary identities in the same reported order as D1: **597 PASS / 1 FAIL**, with the native adapter diagnostic still timing out (6,072.042 ms reported total; its measured pre-emit diagnostics call took 5,056.972 ms). External monotonic wall: **615.680 s**; user/system CPU: **765.607 / 27.841 s**; max process/child RSS: **1,487,776 KiB**. TSTYPES-09-ROOT changed from timeout to PASS. These different workloads (complete Vitest versus instrumented boundary), cache/heap histories and outcomes do **not** establish an optimization speedup or full equivalence PASS.

| Instrumented operation           |     Calls | Inclusive wall, s | Inclusive CPU, s |
| -------------------------------- | --------: | ----------------: | ---------------: |
| assertBoundary                   |       581 |           333.124 |          410.309 |
| ts.getPreEmitDiagnostics         |       520 |           209.488 |          292.367 |
| ts.createProgram                 |     1,504 |            81.657 |           99.841 |
| createProgramWithPredecessor     |     1,448 |            80.579 |           98.151 |
| createTestProgram                |       440 |            51.012 |           62.074 |
| createBindingProgram             |     1,008 |            29.578 |           36.089 |
| createAdapterDiagnosticProgram   |        10 |             3.301 |            4.422 |
| dependencies                     |    14,637 |            32.724 |           35.497 |
| assertClientIsolation            |       847 |            13.777 |           17.101 |
| ts.resolveModuleName             |    53,484 |            26.753 |           31.294 |
| ts.resolveTypeReferenceDirective |       100 |             0.039 |            0.055 |
| host.directoryExists             | 2,205,988 |            47.903 |           52.342 |
| host.readFile                    |   295,766 |            17.104 |           19.169 |
| host.fileExists                  |   952,151 |             7.499 |            6.740 |
| ts.createSourceFile              |     7,451 |             9.834 |           14.986 |
| readSources                      |       589 |             0.502 |            0.697 |
| sourceEnvironment                |     1,183 |             0.107 |            0.146 |

These timers nest and include observation overhead: do not sum them into a wall-clock decomposition. `assertBoundary` includes graph traversal, invariant assertions and nested compiler/resolver work. The result supports investigating both semantic diagnostics and repeated graph/invariant work, rather than naming one exclusive compiler phase. The **31,760,030 assertion calls** are observed work, not dispensable coverage. Source reading and environment construction are each under one second in this instrumented run; caching those helpers alone has little measured local headroom.

There were **1,504 fresh Programs**: 1,448 through the bounded helper and 56 direct/reference controls; 1,024 had noLib, and program sizes ranged from 1 to 1,268 files, totaling 214,856 SourceFile inclusions (not unique filesystem files). **208,573 AST reuse events** show that reuse already exists. **328 returned diagnostic entries** are fixture outputs, often expected negative controls, not 328 test failures. Some 284 Programs contain Node declaration files according to their existing roots/compiler settings; that count is not the number of calls to the new explicit adapter opt-in. Repeated source/descriptor digests do not establish permission to cache Programs, diagnostics or checker state: current roots/options/authoritative overlays/resolution and deliberate reference compilations still matter.

D3 family metrics below come from instrumented test scopes. CPU is process CPU; heap is the maximum sampled test endpoint in that family, includes previous state and GC, and is neither continuous peak nor exclusive allocation. These are not before/after improvements relative to D1.

| D3 family                                        | Cases | Scope wall sum, s |  CPU, s | Programs | Max sampled heap, MiB |
| ------------------------------------------------ | ----: | ----------------: | ------: | -------: | --------------------: |
| JSDoc type dependency matrix                     |    18 |            18.420 |  29.395 |       54 |                 859.5 |
| JSDoc ScriptKind dependency matrix               |    18 |            21.399 |  27.141 |       64 |                 931.5 |
| triple-slash local types dependency matrix       |    33 |            68.139 |  94.630 |      106 |                1218.5 |
| Module boundaries and real entrypoint imports    |    52 |            30.000 |  36.818 |       71 |                1118.4 |
| triple-slash path dependency matrix              |    23 |            43.863 |  58.230 |       76 |                1174.5 |
| Ambient process/global capabilities              |   180 |           204.828 | 255.219 |      492 |                1187.5 |
| Browser/client import graph and CSS              |    58 |            14.298 |  18.461 |       63 |                1066.6 |
| CommonJS runtime capabilities and local bindings |   101 |           120.435 | 150.304 |      295 |                1120.8 |
| Guard binding and Program identity               |     9 |             9.559 |  14.610 |       19 |                1061.4 |
| CommonJS/ESM export surfaces                     |    62 |            65.862 |  80.779 |       99 |                1134.7 |
| Canonical resolver and tombstones                |    10 |             0.012 |   0.018 |        0 |                1023.0 |
| CI-OPT-01 cache invalidation canaries            |    17 |             2.410 |   3.171 |       63 |                 714.1 |
| CI-OPT-01 compiler equivalence                   |    13 |             5.282 |   7.305 |       88 |                1124.8 |
| CI-OPT-01 library resolution                     |     1 |             0.873 |   1.308 |       11 |                1124.9 |
| native Node diagnostic opt-in isolation          |     3 |             7.236 |  10.136 |        3 |                 690.4 |

The overlapping type-diagnostic slice covers 368 cases and 520 calls. Its inclusive diagnostic phase averages 569.261 ms per case with diagnostics, with a 5,056.972 ms worst case. It must not be added to the exclusive family totals. All families retain fixture isolation; cache/compiler/library cases deliberately mutate and restore inputs, and the Node/client/binding isolation cases remain distinct.

### D2, D4 and D5 — controls and limits

Two isolated selections used the installed Vitest `-t` interface with the same temporary instrumentation: **CI-OPT-01 31/31 PASS**, process wall **10.594 s**; **native Node 2/3 PASS**, process wall **10.232 s**, preserving the adapter timeout. The 34 selected identities matched the corresponding D3 cases with zero differences in assertion counts, Program root/source digests and file counts, diagnostic digests/codes, rejection traces and outcomes. This is a focused instrumentation/isolation control, not a replacement full-suite gate.

Vitest marks the 567 and 595 nonselected cases as filtered/skipped in those focused JSON results; none are counted as PASS. No source/config skip was introduced, and the complete D1/D3 boundary selections both contain all 598 cases.

D4 was not executed: no new cache-reuse hypothesis with demonstrated safe gain emerged. The existing AST cache is measured, helper construction is cheap, and indiscriminate oldProgram/diagnostic reuse conflicts with the freshness controls. The worker-partition idea in R02 remains a future experiment. D5 demonstrates that instrumentation/focused execution retains the selected negatives; it does not certify an unimplemented optimization. The temporary test source was restored byte-for-byte to F's baseline hash and the measurement worktree is tracked-clean.

## F — Experimental Methodology

Heavy installation and TypeScript workloads are serialized across agents. Local WSL and GitHub-hosted observations are separate cohorts. Instrumented duration includes measurement overhead and cannot by itself establish a speedup against an uninstrumented baseline.

Local metadata recaptured at `2026-10-22T13:37:52Z`: Ubuntu 24.04.4 LTS / WSL2 kernel 6.18.54.1, linux x64, Intel Core i5-7300HQ at 2.50 GHz, four visible logical CPUs, 6,216,564,736 bytes OS RAM. cgroup CPU `max 100000`, memory `max`, cpuset `0-3`; these are configuration observations, not sustained CPU entitlement. Project files are on the Linux filesystem. Windows host contention is not fully observed. Node v22.23.1, npm 10.9.8, TypeScript 5.9.3, Vitest 5.0.1, Node declarations 22.20.3, Next 16.4.1.

| Baseline input       | SHA-256                                                            |
| -------------------- | ------------------------------------------------------------------ |
| package-lock.json    | `2a6e6077d46d953ee4fbeac8a776d3e0d0c79f996edcca7e3c045c740bf8d14b` |
| boundary.test.ts     | `7e743bc104720fd6b6805d75310fa82ff75b4afc84c99b7d80d43c26b1ff5d50` |
| vitest.config.mts    | `2e559df25de9778a47f16456771887806d12b98c1483f973803be7695f1f72d3` |
| tests/setup.ts       | `7a5a3f17c8c8d2ef74019f5a7f92e30cff2fa7dd56c6b1aeccd67b6230524757` |
| webhook-auth.test.ts | `37eed766c12b219027dff31454f70dde8feff2f579f9e9fbbe3f01df3959e171` |

Installed package versions are checked separately from lock identity. Optional native packages can differ between GNU/Linux and Alpine/musl despite the same lock. Distinguish npm content cache, installed node_modules, OS page cache, Vite transform cache and per-worker AST predecessor state. No OS cache flush or global npm configuration change is made.

For one sample, report the observation without a reproducibility claim; for two or three, publish all samples, median and min/max. No statistical-significance or p95 claim follows from these sample sizes. Failed/time-out workloads remain in the ledger. Do not pool historical jobs as before/after optimization samples.

External wall time covers the invocation. CPU user/system and maximum RSS have process/child scopes documented by the runner; maximum RSS is not the simultaneous process-tree memory sum. Worker heap deltas can be negative after GC. Nested helper timers are inclusive and must not be added as disjoint phases. Family selections start with a different predecessor history; their times do not sum into the full-suite wall time. A main-process-only CPU profile would not represent TypeScript running in a Vitest worker.

Local filesystem input/output operation counters returned zero and npm's sampled `/proc` I/O was unavailable; this does not establish zero I/O. The measured host/API call counts describe logical access, not physical storage traffic. Instrumentation records worker CPU and memory endpoints rather than a calibrated CPU flamegraph or continuous allocation trace. No claimed compiler optimization depends on subtracting its overhead.

Reproduction is versioned as documentation: [npm protocol and corrected reproduction harness](./CI-PERF-02-npm-reproduction.md) and [boundary wrappers, instrumentation, aggregation and commands](./CI-PERF-02-boundary-reproduction.md). The five boundary source fences preserve executed bytes. The npm fence includes a post-review metadata correction, with original and corrected hashes and the one-string difference documented; it is not represented as the executed original. All fences are checked after formatting. It runs only when explicitly extracted into an isolated measurement workspace; it is not wired into CI or the application. Absolute paths identify this measurement instance and must be adjusted explicitly for another machine. Raw Actions/npm logs and private per-test JSONL are not automatically published.

The first session was interrupted by an agent usage limit. Temporary evidence under `/tmp` and the unfinished baseline process were lost. Those unfinished executions are not counted as PASS or used for performance figures. The resumed audit keeps evidence in a private durable directory and repeats the needed measurements.

## G — Optimization Candidates

No projected reduction is an implementation or release authorization. The shortlist has at most five entries; R02 is selected after the compiler measurements. Diagnostic work is the immediate step; architecture and cache changes require separate authorization.

### Installation diagnosis before a production change

| Field                   | CI-PERF-02-R01                                                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bottleneck / hypothesis | Install: identify the measured long phase, especially the plausible auxiliary audit request path                                                                                                         |
| Evidence                | Same lock/cache/host Node/npm, 18.372 versus 422–424 s; slow summaries omit audit count; same-baseline db-types installs in 18.242 s                                                                     |
| Proposed scope          | The bounded remote timing protocol in D; keep the original scripts/audit control, use sanitized phase/HTTP/lifecycle/resource evidence, then adjudicate any narrowly targeted production fix separately  |
| Gain                    | No optimization gain measured. About 404–405 s separates the observed fast/slow host installs; that observational difference is not a promised recoverable saving.                                       |
| Risk                    | Wrong phase attribution, unsafe log publication, conflating online/offline behavior, weakening audit/scripts to manufacture a faster install                                                             |
| Dependencies            | Specific remote-instrumentation authorization; fixed SHA/lock/runtime/cache policy and a secret-free measurement environment                                                                             |
| Required tests          | Original command/control repetitions, cache coverage and endpoint/phase traces, unchanged manifests/lock, all current CI/release gates; any later flag change needs explicit security-equivalence review |
| Complexity / rollback   | Small to medium diagnostic task; remove temporary instrumentation and retain the existing command. No permanent flag change is proposed now.                                                             |
| Decision                | Recommend as the first diagnostic decision; `REMOTE_INSTRUMENTATION_AUTHORIZATION_PENDING`                                                                                                               |

### Compiler workload candidate

| Field                   | CI-PERF-02-R02                                                                                                                                                                                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bottleneck / hypothesis | Boundary: independent compiler-heavy fixture families may benefit from bounded worker isolation while preserving fresh Programs and the existing AST reuse in each worker                                                                                                                                       |
| Evidence                | D1 has 639.355 s of reported serial test bodies and 909.264 s user+system CPU; ambient capabilities and CommonJS runtime alone contribute 333.645 s of body duration. D3 phase evidence must be considered with its instrumentation overhead.                                                                   |
| Proposed scope          | A separately authorized temporary two-worker/family partition prototype, then possible test organization changes only if it proves complete identity, assertion, rejection and compiler equivalence. Do not widen Program/diagnostic caches.                                                                    |
| Gain                    | Unknown and not validated here. A perfectly balanced two-worker model has an ideal body-work lower bound near 320 s for this one local 639 s observation, before duplicate parsing/setup, lost AST locality, GC, memory pressure and scheduling. This is a model bound, not a measured speedup or CI forecast.  |
| Risk                    | Lost predecessor locality, order-dependent bugs, duplicated libraries/heap, oversubscription, omitted/duplicated tests and changed compiler or server-only behavior                                                                                                                                             |
| Dependencies            | Human authorization for the prototype/possible test reorganization, measured runner CPU/RAM headroom, stable partition manifest and every CI-OPT-01/NUV-14 invariant                                                                                                                                            |
| Required tests          | Union of selected identities and multiplicities equals all 598, no assertion changes or skipped coverage, exact diagnostics/rejection traces, fresh-state and shuffled-order controls, cache invalidation/library/Node canaries, unchanged full suite in baseline/candidate comparable runs, complete remote CI |
| Complexity / rollback   | Medium to high; discard a temporary partition or revert only the separately authorized test organization change, retaining the original monolithic suite                                                                                                                                                        |
| Decision                | Investigate; no worker/config/test organization change is published and no production improvement is claimed                                                                                                                                                                                                    |

### Pipeline and container candidates (architectural investigation)

| Field                   | CI-PERF-02-R03                                                                                                                                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bottleneck / hypothesis | Pipeline: overlap a mandatory boundary lane with independent ordinary checks and downstream validation                                                                                                                                                                                                    |
| Evidence                | Baseline boundary 494.419 s within a 518 s check; subsequent build/Chromium/E2E/scans/Docker steps total about 116 s                                                                                                                                                                                      |
| Proposed scope          | Future separate mandatory boundary/security job, ordinary-check/build/E2E/scan/Docker lane, explicit aggregate, then main-only db-types and final successful CI completion                                                                                                                                |
| Gain                    | Unmeasured. At identical install/setup times, roughly 140 s of current non-boundary check/downstream work could theoretically overlap with boundary in this one baseline. This is an overlap ceiling for that observation, not a predicted saving. Queue/install variance and new job setup can erase it. |
| Risk                    | Additional installs and runner-minutes; mismatched required check names; unexpected skipped lanes; accidental partial-success deploy; changed test scheduling/cache behavior                                                                                                                              |
| Dependencies            | Human topology authorization, install diagnosis, ruleset reconciliation and an acyclic aggregate/db-types DAG. Keeping the existing `db-types needs ci` while making that same `ci` depend on db-types would create a cycle.                                                                              |
| Required tests          | Exact test identities/multiplicities/assertions/diagnostics; failure/cancel/skip injection for every lane; required main db-types; PR-only expected db-types skip; full E2E/Gitleaks/Docker; workflow_run event/branch/SHA and aggregate conclusion                                                       |
| Complexity / rollback   | High; revert the separately authorized topology commit and reconcile required contexts together                                                                                                                                                                                                           |
| Decision                | Investigate; no topology change in this task                                                                                                                                                                                                                                                              |

The model is `max(install_boundary + boundary, install_fast + fast + downstream) + aggregation` instead of the current sequential path, before adding main's db-types installation/generation and queue/setup overhead. Measure both end-to-end wall and total runner-minutes. A faster feedback lane alone does not establish a faster or cheaper complete CI.

| Field                   | CI-PERF-02-R04                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bottleneck / hypothesis | Install/container: reuse trusted dependency/build layers instead of repeating an unchanged Docker deps stage                                                                          |
| Evidence                | Dockerfile runs its own npm ci and Next build; observed deps RUN layers are 23.4 / 421.3 / 23.4 s, separate from the host install                                                     |
| Proposed scope          | Future BuildKit layer-cache design keyed/bound to base digest, platform, lock/manifests and build inputs, with a separate provenance and trust policy                                 |
| Gain                    | Unknown; a valid hit could avoid some observed repeated dependency-layer work. No cache-hit rate, restore cost, storage cost or future seconds saved has been measured.               |
| Risk                    | Poisoned/untrusted cross-PR caches, stale native binaries, secrets in layers, skipped lifecycle effects, divergence between cached and fresh final images                             |
| Dependencies            | Human authorization for container-cache design and trusted publication, diagnostic confirmation of duplicated critical cost, GNU/Linux versus Alpine controls                         |
| Required tests          | Cold/hit/miss/corrupted-cache controls, lock/base/platform invalidation, image dependency/integrity and runtime equivalence, full Docker build and all existing secret/release checks |
| Complexity / rollback   | Medium to high; disable the separately introduced cache backend and rebuild cold without changing gates                                                                               |
| Decision                | Investigate; no node_modules cache or Docker/workflow change is introduced                                                                                                            |

### Rejected compiler shortcut

| Field                   | CI-PERF-02-R05                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bottleneck / hypothesis | Boundary: avoid compiler work by passing predecessor oldProgram or retaining broad fixture Programs/diagnostics                                                                                   |
| Evidence                | Existing CI-OPT-01 fresh-Program design and source/alias/options/root/add-delete-restore/library/diagnostic equivalence controls; current AST reuse already exists                                |
| Proposed scope          | None. Preserve fresh resolution/checker/diagnostic state and the bounded immediate-predecessor AST lanes.                                                                                         |
| Gain                    | Unmeasured; an apparent faster result with stale resolution or diagnostics has no acceptable gain                                                                                                 |
| Risk                    | Security violation accepted from stale source/library/binding/ambient state; retained Program chains and memory growth                                                                            |
| Dependencies            | A different future design would first need explicit fresh-compiler equivalence proof, not merely equal test counts                                                                                |
| Required tests          | All CI-OPT-01 canaries, complete diagnostics including code/file/position/message/category, forced-fresh and current-source behavior, NUV-14 Node/client/noLib negatives and full unchanged suite |
| Complexity / rollback   | High correctness burden; discard the temporary experiment and restore original bytes, never publish it as an optimization from this task                                                          |
| Decision                | Reject indiscriminate Program/result reuse                                                                                                                                                        |

## H — Security & Release Invariants

The actual pipeline in `.github/workflows/ci.yml` has one sequential `ci` job: checkout → setup-node/cache → public-configuration validation → npm ci → npm run check → Next.js build → Chromium install → E2E → repository Gitleaks → complete-history Gitleaks → client-bundle marker scan → Docker build. `check` runs ESLint, runtime lint, token lint, Prettier, Next typegen/TypeScript, runtime tooling tests, token tooling tests and Vitest sequentially via `&&`; individual Vitest files may execute concurrently.

`db-types` has `needs: ci`, runs only on a push to `main`, uses the named `ci-supabase-types` environment and performs its own checkout/setup/npm ci before generation and diff. It is required on main. On a PR its expected SKIPPED result is not PASS. Environment/branch-rule enforcement and human authorization are distinct; their observed settings are recorded with the independent release audit.

E's live read-only audit confirmed that environment has a main-only branch policy, with no required reviewer or wait timer. The active `main-protection` ruleset requires a PR and strict `ci` status (GitHub Actions app 15368), rejects deletion/non-fast-forward, and has no bypass actors; required approving-review count is zero. Classic branch-protection API 404 does not mean main is unprotected. `db-types` is mandatory through the push/main workflow DAG rather than a separate required ruleset context. Neither the environment nor the deploy job currently enforces human review. The human authorization required by this task is a separate contractual gate; this audit does not change those settings or authorize release.

`Deploy Production` receives `workflow_run: CI/completed`. Its job additionally requires the entire triggering workflow conclusion to be success, event push, and head branch main. It checks for a superseded SHA, pins and rereads that SHA in Coolify, verifies deployment commit and public health/release identity, and checks security headers. A completed workflow alone does not authorize deployment. See [GitHub workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).

Any future parallel design must keep every check required and fail closed if a required lane fails, is cancelled or is unexpectedly skipped. An explicit aggregator must evaluate all required outcomes even after failure; main must additionally require db-types success. Keeping the aggregate within the triggering CI workflow prevents a fast partial workflow from satisfying the deploy predicate. Branch-protection contexts and the dependency graph must be adjudicated together. No such design is implemented here.

CI-OPT-01 invariants: fresh Program/checker/resolution/diagnostic state per fixture; immediate-predecessor AST reuse only after compiler-option, authoritative source/path and parser-input checks; forced-fresh parsing honored; host restoration in `finally`; no stale virtual-library results; source/alias/options/root/add/delete/restore and binding/ambient canaries retained.

NUV-14 invariants: the helper's explicit installed Node root is added only to opted-in adapter diagnostic programs; pre-existing compiler-option fixtures keep their intended roots/options. Client isolation controls have no implicit Node roots/globals; ordinary sourceEnvironment binding programs keep `noLib: true` and `types: []`; explicit compiler/reference fixtures retain their intended settings. Exact diagnostic errors and HMAC assertions remain unchanged. No timeout increase, skip, assertion suppression or change to E2E/Gitleaks/Docker/db-types is permitted.

No real provider calls or benchmark credentials are used. Raw npm/Actions logs are excluded from the publication; only reviewed, allowlisted fields and aggregate measurements may be published.

## I — Independent Review

D's initial independent adversarial verdict was **APPROVE**, zero material P0/P1/P2, covering the diagnostic accuracy, limits and recommendations. E's separate initial release/evidence verdict was **APPROVE**, zero required findings. Both first reviewed staged documentary diff SHA-256 `bed39446ce063889ef6f5769dcb1156672da86cc269757fbf4408fcc3d8423fd`; the final receipt update is reconfirmed before commit. Final file/diff/commit binding will be published in the PR conversation rather than embedded as a self-referential hash here.

D's only nonblocking P3 (`R-D-01`) notes machine-specific home/worktree paths in the exact reproduction scripts. They disclose directory layout, not credentials. The appendix already requires explicit prefix adaptation on another host; preserving the recorded script bytes keeps the measured-instance hashes verifiable. Those initial local reviews reported no P0/P1/P2. The one authorized remote Codex Review of `aa694000470ca82478e899c02b2428a7566ace88` subsequently found a valid [P2 in the I/O units](https://github.com/jlima004/indicio-cult/pull/56#discussion_r4349574612): Linux rusage counters count filesystem operations, not 512-byte blocks. This revision corrects the reproduction metadata and prose, preserves original script/JSON provenance, and leaves all numeric measurements and recommendations unchanged. Fresh remediation reviews are kept in private evidence; publication of their final verdicts and corrected-HEAD remote CI receipts remains pending at this snapshot. The original remote review does not attest a later HEAD.

| D question               | Independent conclusion                                                    |
| ------------------------ | ------------------------------------------------------------------------- |
| 1 — Logs                 | Command/summary, Actions step and Docker timing scopes distinguished      |
| 2 — SHAs                 | Three requested runs reconciled; PR merge ref and API head separated      |
| 3 — Cache HIT            | npm content cache distinguished from installed node_modules               |
| 4 — Seven-minute cause   | Unproven; correctly left pending instrumentation                          |
| 5 — Hypotheses           | No material causal overclaim                                              |
| 6 — Comparability        | Local, GitHub and Docker cohorts/limitations explicit                     |
| 7 — Cache states         | Evolving cache and absent/removal states explicit                         |
| 8 — Sample size          | Adequate for exploratory conclusions only; no significance claim          |
| 9 — Resources            | CPU/RSS/I/O limits and missing metrics recorded                           |
| 10 — Real suite          | D1 full original; D3 all 598 boundary identities                          |
| 11 — Preservation        | Same ordered 598 identities, real negative outcomes retained              |
| 12 — Timing sums         | No concurrent-file or nested-phase additive overclaim                     |
| 13 — CI-OPT-01           | Fresh Programs and bounded predecessor/cache canaries preserved           |
| 14 — Diagnostics         | No full equivalence PASS; D5 only 34 selected consistency controls        |
| 15 — NUV-14              | Opt-in/client/binding controls and HMAC scope preserved                   |
| 16 — Stale state         | R05 rejected; invalidation requirements explicit                          |
| 17 — Order               | Future partition risk explicit; shuffle proof not claimed                 |
| 18 — Focused regressions | Filtered cases not counted as complete-suite PASS                         |
| 19 — Security            | No weakened gate/assertion/timeout or delivered optimization              |
| 20 — Release             | No changed DAG; future aggregate/ruleset risks specified                  |
| 21 — db-types            | Required by main-push DAG; PR skip is not PASS                            |
| 22 — Deploy              | Whole CI/event/branch/SHA predicates and identity checks preserved        |
| 23 — Secrets             | No credential material found; raw logs excluded; P3 paths noted           |
| 24 — Reproduction        | Scripts/commands/versions/hashes, path adaptation and metadata correction |
| 25 — Authorization       | Diagnosis, remote experiments, implementation and release separated       |

## J — Validation & GitHub

Local documentary `npm run format:check` passed using the baseline installed Prettier through a process-only PATH, without installing dependencies in the documentation worktree. The five boundary executable-source fences match the executed private scripts byte-for-byte. The npm fence matches the separately preserved corrected reproduction, whose only difference from the executed script is the documented I/O unit string; no new benchmark result is claimed. Fences are extracted after formatting and their SHA-256 values checked. The original checkout and both disposable measurement worktrees are tracked-clean; only the three report/reproduction Markdown files enter the candidate diff.

The local complete Vitest result is the negative D1 result, not PASS. No end-to-end local `npm run check` or application build is claimed for this documentary candidate. Build/E2E/Gitleaks/client-marker/Docker and the complete check remain required in the normal PR CI; main's privileged db-types remains a distinct later gate. Local schema/provider/production validation was not performed.

The initial dossier was published as Draft PR #56 at `aa694000470ca82478e899c02b2428a7566ace88`; its normal CI passed, with PR db-types skipped, and its one authorized Codex Review returned the P2 described above. That initial CI/review does not validate this correction. At this correction snapshot, only the initial HEAD has published CI/review receipts. Remediation review and local checks are private evidence; their final verdicts and fresh normal CI for the corrected HEAD must be recorded in the PR body/conversation after publication. No second Codex Review request is authorized by this task. Final receipts distinguish the originally reviewed commit, the resolved finding and any later-HEAD review gap; remote PASS must not be assumed from local measurements.

## K — Human Decision Required

Implementation selection remains a human decision. First authorize or defer **R01's remote diagnostic protocol**, because a production install change needs a measured long phase rather than the historical audit clue alone. R02's bounded fixture-partition prototype is the next test-performance investigation; R03/R04 are architectural alternatives with unmeasured net CI gains. R05 is rejected. No definitive optimization is validated or implemented by this audit.

Additional instrumented GitHub diagnostic runs require specific authorization: `REMOTE_INSTRUMENTATION_AUTHORIZATION_PENDING`. The normal CI triggered by the authorized documentary Draft PR is distinct from an additional diagnostic workflow run. Merge and deploy are not authorized. The unknown historical npm root cause does not prevent publication of an honest diagnostic audit, but prevents presenting a registry/cache/audit fix as proven.

## Primary sources

- [npm v10 logging/timing and sensitive-log limitations](https://docs.npmjs.com/cli/v10/using-npm/logging/): timing files expose named phase timers; npm redaction alone is not a publication sanitizer.
- [TypeScript compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API): Program, CompilerHost, SourceFile and diagnostics APIs. Installed TypeScript declarations/source take precedence for version-specific behavior.
- [Vitest CLI](https://main.vitest.dev/guide/cli): focused name filters and JSON reporting, verified against installed v5 help before use.
- [Linux getrusage(2)](https://man7.org/linux/man-pages/man2/getrusage.2.html): `ru_inblock` and `ru_oublock` count filesystem input/output operations, not byte quantities.
- [Node v22 process metrics](https://nodejs.org/docs/latest-v22.x/api/process.html#processresourceusage): CPU, memory and process resource metrics. Exact local runtime version is recorded with the measurements.
- [GitHub job dependencies](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs): needs/skip/failure propagation and explicit conditional execution.
