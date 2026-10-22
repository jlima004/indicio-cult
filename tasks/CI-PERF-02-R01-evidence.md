# CI-PERF-02-R01 — Remote npm Installation Diagnostics

Date: 2026-10-22 (America/Sao_Paulo). Diagnostic scope only; no production remediation.

## A — Executive Summary

**CI-PERF-02-R01 / DIAGNOSTIC_INCONCLUSIVE / ADDITIONAL_EVIDENCE_REQUIRED.** Both authorized remote controls completed: E1 cache MISS 22.103 s and E2 historical-cache HIT 19.852 s. Neither reproduced the historical 422–424 s installation. The largest retained inclusive phase was reify:unpack, 21.099/18.682 s; audit was 11.700/11.731 s and overlapped installation. Bulk-audit returned HTTP 200 in 650/4563 ms. These observations do not identify the historical slow phase or prove an audit/cache speedup.

A cache-version mismatch in the experimental E1 restore configuration was identified, documented and corrected for E2; E1 was retained. Exactly two diagnostic workflows ran, with no retry, variant, production change, merge or deploy. The permitted execution budget is exhausted. Further causal evidence requires new human authorization; this report proposes no automatic production fix.

## B — Baseline

Authorized and measured checkout: `9249a1efe8c1703408a2ebb9828d41341dd6cd74`; baseline tree `5eaa7f347093fb810325dab8d9a2ea15f0bf3580`. Lockfile SHA-256: `2a6e6077d46d953ee4fbeac8a776d3e0d0c79f996edcca7e3c045c740bf8d14b`; Node 22.23.1/npm 10.9.8. The original local main checkout remains at `b305d8aa9771aafc8b08d73856412a8604c8f787` and was preserved. Fetch confirmed origin/main at the authorized baseline. The only b305d8a..9249a1e changes are the three CI-PERF-02 Markdown files; installation inputs, CI/deploy workflows and Dockerfile are identical.

Read and reused: [previous evidence](CI-PERF-02-evidence.md), [npm reproduction](CI-PERF-02-npm-reproduction.md), [boundary reproduction](CI-PERF-02-boundary-reproduction.md), production ci.yml, deploy/Dockerfile, package.json, package-lock.json and .nvmrc. No boundary benchmark or local installation was repeated.

Historical observations remain a separate cohort: 18.372 s after PR #54, 423.691 s on PR #55, 422.003 s after PR #55, 18.242 s in the same-baseline db-types job, and local original median 75.779 s. These numbers were reused from the audited dossier, not remeasured. Historical host cache key/HIT, 337109425 restored bytes and Node/npm match; archive restoration never proved full content coverage. The historical omitted audit summary supports H5 without measuring it.

The [post-merge PR #56 run 39840776295](https://github.com/jlima004/indicio-cult/actions/runs/39840776295) has attempt 1 failure at Build and db-types skipped, followed by attempt 2 success for ci and db-types at the same baseline. This R01 neither repeated that recovery nor changed next/font/google. Build intermittence and npm installation causality remain separate questions.

## C — Agents

The requested orchestrator is GPT-6.1 Sol Alto; this session cannot switch or independently attest its effective model. The real delegations accepted the following configuration parameters; these are not independent runtime model attestations.

| Role                            | Real agent                 | Requested/accepted model and effort | Actual delivery                                                                    |
| ------------------------------- | -------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- |
| A npm Runtime Investigator      | `/root/a_npm_runtime`      | `gpt-6.1-sol`, `high`               | npm 10.9.8 source, timer/audit/retry semantics and compatible private config probe |
| B GitHub Actions Specialist     | `/root/b_actions`          | `gpt-6.1-sol`, `medium`             | Isolated trigger/cache architecture and temporary workflow                         |
| C Measurement Engineer          | `/root/c_measurement`      | `gpt-6.1-sol`, `high`               | Harness, synthetic tests, private config probe and measurement methodology         |
| D Independent Security Reviewer | `/root/d_security_review`  | `gpt-6-luna`, `xhigh`               | Independent pre-execution and final conclusion reviews                             |
| E Evidence & Release Auditor    | `/root/e_evidence_auditor` | `gpt-6.1-sol`, `medium`             | Independent baseline/history/ledger and documentary audit                          |

## D — Remote Execution Architecture

Temporary branch: `chore/ci-perf-02-r01-diagnostics`, with no experimental PR. The preferred PR-only trigger would also activate the unchanged CI's unfiltered pull_request event; Draft does not suppress it. A new workflow_dispatch could not be assumed available without presence on the default branch. The supported alternative is a unique diagnostic workflow triggered exclusively by push to that exact feature branch and only changes to its workflow/harness paths. It does not match CI's push/main trigger; deploy listens only for the workflow named CI. No release topology was changed.

The workflow has contents:read, two checkout actions with persist-credentials:false, no production environment, secrets or vars references, no pull_request_target/workflow_run trigger and no cache-save step. setup-node uses the same pinned production action with automatic cache disabled; actions/cache/restore preserves the original key policy; E2 corrects the literal restore path to match the historical archive version, as explained in F. Its run-attempt/run-number guard is additional protection, not the run ledger: a third push could still create a skipped run and is prohibited.

Harness implementation and runner event SHA E1: `33f151beb54402278484e91d357ae4657cc1291b`; tree `2138c1fab3338dd452f4da32d2ace775b21c17ca`. Baseline is checked out independently at its full SHA; neither identity is a temporary PR merge ref. [Harness source at E1](https://github.com/jlima004/indicio-cult/blob/33f151beb54402278484e91d357ae4657cc1291b/tasks/ci-perf-02-r01/measure.py) is temporary and is excluded from the final documentary branch.

| E1 source             | SHA-256                                                            |
| --------------------- | ------------------------------------------------------------------ |
| measure.py            | `712432080834d9589dc26330a19acda66ba5d21c21e2ed9c3a34c83904726dd7` |
| test_measure.py       | `4fa084e297b66eb60f7f288ac7e7b13c4eeb85bc919a83566ed061dfebeb151a` |
| experimental workflow | `84e71723c035de982e455bfed91b35f59387ea81fcd4d7c965686c6abeccbd5f` |

The existing main archive was read-only verified before E1: cache id 9060917506, key `node-cache-Linux-x64-npm-d17d8a101ab44ecaa3d8d7d61fade855193577a41bae7040512491e0c001e69d`, size 337109425 bytes, version `04d00cc68e25ee34fd8b04095d0a46a28244d98af53e6925e47ed311d487b1d6`, created 2026-10-16T17:16:02.795082Z. hashFiles' aggregate hash in this key differs from the lockfile's direct SHA-256.

## E — npm Measurements

Both runs executed one `npm ci --timing` control in a fresh baseline checkout with node_modules absent. `logs-max=0` and `loglevel=info` are diagnostic environment settings verified against npm 10.9.8; they preserve audit, lifecycle scripts and installation semantics. Empty, distinct private user/global npmrc files and an allowlisted child environment prevent provider/GitHub credentials from reaching npm. The collector verifies the actual child cache path before starting.

| Identity / result                          | E1                                                                               | E2                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Run                                        | [39858620249](https://github.com/jlima004/indicio-cult/actions/runs/39858620249) | [39859369212](https://github.com/jlima004/indicio-cult/actions/runs/39859369212) |
| Job                                        | 120103197278                                                                     | 120105785209                                                                     |
| Harness and runner event SHA               | `33f151beb54402278484e91d357ae4657cc1291b`                                       | `bdeff511b7bdefcde7eb4838fa982f15e84ef4a4`                                       |
| npm start UTC                              | 2026-10-22T21:36:36Z                                                             | 2026-10-22T21:42:28Z                                                             |
| Runner/image/provisioner                   | 2.338.0 /20261012.334.1 /20261012.601                                            | same versions                                                                    |
| OS/image/cloud/region                      | Ubuntu 24.04.5 LTS /ubuntu-24.04 /Azure/eastus                                   | Ubuntu 24.04.5 LTS /ubuntu-24.04 /Azure/westus2                                  |
| Cache restore                              | MISS; no matched key/archive restored                                            | HIT; exact historical key matched                                                |
| Restored bytes                             | not observed; no archive restored                                                | 337109425                                                                        |
| npm exit / diagnostic workflow result      | 0 /success                                                                       | 0 /success                                                                       |
| Artifact ID                                | 12460403247                                                                      | 12459929501                                                                      |
| Baseline/lock unchanged / cleanup complete | true /true /true                                                                 | true /true /true                                                                 |

These are installation/diagnostic successes, not application test/build/release gate passes. Artifact JSON runner/byte fields initially contain null; public Actions setup/cache logs were allowlist-reconciled separately. Original JSON bytes were not rewritten. The sanitized [metrics appendix](CI-PERF-02-R01-metrics.md) preserves scalar measurements, all retained timers, config, network aggregates and original JSON hashes after the 14-day artifact retention expires.

| External measurement, seconds             |           E1 |           E2 |
| ----------------------------------------- | -----------: | -----------: |
| Pre-Node setup/checkout region            |     1.693569 |     1.977869 |
| Node setup and version verification       |     5.190671 |     5.382062 |
| Cache action plus step transitions        |     0.321039 |     5.377281 |
| Collector pre-install setup               |     0.213361 |     0.231830 |
| Install monotonic wall                    | 22.103005011 | 19.851978277 |
| Collector finalization before publication |     0.035386 |     0.046003 |
| Collector total before JSON publication   |    22.351831 |    20.129889 |

External setup/cache intervals include step transitions and are not pure action download times. E2's first cache-action log to restored-key log spans 5.2365382 s; extraction-command to success log spans 0.5626502 s. These are timestamp-log intervals, distinct from the external monotonic 5.377281 s. End-to-end artifact upload/job teardown is not included in collector finalization. The monotonic clock reports 1 ns resolution; displayed precision is not a claim of accuracy at that scale.

| wait4 resources                |        E1 |        E2 |
| ------------------------------ | --------: | --------: |
| User CPU, s                    | 27.131412 | 23.852067 |
| System CPU, s                  |  5.406933 |  5.731291 |
| Max process RSS, KiB           |    662868 |   1607608 |
| Filesystem input operations    |       232 |       120 |
| Filesystem output operations   |   2976720 |   2312040 |
| Voluntary context switches     |    645427 |    573276 |
| Involuntary context switches   |     12711 |     13103 |
| Root /proc I/O samples /errors |    438 /1 |    391 /3 |

CPU accounting can exceed elapsed wall because work is concurrent. Max RSS is not simultaneous process-tree memory. Linux ru_inblock/ru_oublock count filesystem operations, not bytes or 512-byte blocks. Root /proc byte/syscall counters in the appendix are sampled maxima with incomplete scope; errors and missed final/short-child activity prevent exhaustive I/O attribution. No CPU-wait, scheduler-pressure or disk-latency trace was collected. Collector overhead was not measured against an uninstrumented control.

| npm Date.now timer, seconds |     E1 |     E2 |
| --------------------------- | -----: | -----: |
| npm                         | 21.973 | 19.633 |
| command:ci                  | 21.712 | 19.352 |
| idealTree                   |  0.114 |  0.115 |
| reify                       | 21.412 | 19.044 |
| reify:unpack                | 21.099 | 18.682 |
| reify:audit                 | 11.700 | 11.731 |
| auditReport:getReport       |  0.652 |  4.566 |
| auditReport:init            | 11.048 |  7.165 |
| reify:build                 |  0.089 |  0.115 |
| build:run:postinstall       |  0.052 |  0.079 |

Timers overlap and nest; never sum them or subtract audit from wall as hypothetical savings. reify:unpack is an inclusive region containing concurrent cache/network/extraction/write work, not pure decompression or a historical I/O diagnosis. It is the largest retained phase in these fast samples. Audit completes while installation also progresses. The collector retains one timing file, zero parse failures, zero unfinished timers and zero missing required timers in each run.816/813 other timer names were intentionally excluded by the publication allowlist, without claiming that work absent. Each run logged one postinstall start/completion and one package lifecycle timer; other lifecycle events were not observed in this collector.

Effective npm settings in both actual children: audit=true, ignore-scripts=false, foreground-scripts=false, strict-ssl=true, offline=false, prefer-offline=false, prefer-online=false, registry=public npm, maxsockets=15, fetch-timeout=300000 ms, fetch-retries=2, factor=10, min/max retry timeouts=10000/60000 ms, logs-max=0 and loglevel=info. These are configuration values, not observations of a 300-second timeout or two retries. Cache path matched the explicit restored-directory path in both; E1's acquisition of that directory's archive still failed.

| Observed network class                        | E1                                          | E2                                          |
| --------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| bulk-audit                                    | one POST 200, 650 ms                        | one POST 200, 4563 ms                       |
| metadata                                      | 10 GET 200 cache-miss, 88–4745 ms           | 10 GET 200:3 revalidated, 5 miss, 2 updated |
| tarball                                       | 548 GET200 cache-miss, 788–20862 ms         | no parsed tarball row                       |
| quick-audit /parsed errors /explicit attempts | none observed /none observed /none observed | none observed /none observed /none observed |
| HTTP-like lines /parsed /unparsed             | 1107 /559 /548                              | 559 /11 /548                                |

No parsed response proves a comprehensive transport trace. Attempts are null when absent; do not call them zero retries. No parsed tarball/quick-audit/error line does not prove no network/work. All 548unparsed lines in each run remain unknown. Installed pacote source emits optimistic cache text with package specs before reading/verifying the stream, consistent with a parser gap; it does not prove those removed lines were successful cache hits. No retrospective relabeling was performed. There were zero oversized/truncated HTTP records. No complete URLs, querystrings, headers, bodies or payloads are published.

## F — Experiment Comparison

E1 completed in 22.103005011 s but failed to restore the intended archive: the experimental workflow used the literal path `~/.npm`, whereas setup-node had saved `/home/runner/.npm`. The restore action hashes the original path string into its cache version. Recomputing SHA256 of `/home/runner/.npm|zstd-without-long|1.0` exactly matches the existing archive version 04d00cc..., whereas the tilde string yields `c242501c19ada3dcced7a83b074ccb8e79f816602d4125493924624b38591de2`. This CONFIRMED experimental acquisition error is separate from the unknown historical seven-minute cause. The negative E1 result is retained and consumes the first run.

A, B and C independently recommended the same E2 discriminator: repeat the ORIGINAL command using the absolute restore path, with no no-audit/offline variant or parser change. A no-audit sample would leave the original cache mismatch unresolved. D approved the exact one-line delta before push: commit `bdeff511b7bdefcde7eb4838fa982f15e84ef4a4`, tree `9e4d4aabc5f0c8195163a43a72694f893e43329b`, workflow SHA256 `75fe50f342d21e152a403a6941b40580cb6a3137c68084956e10be0ea7af9638`. Harness/test hashes are unchanged. This is the second and final diagnostic run; no retry is authorized after it.

E2 restored the intended archive and completed in 19.851978277 s. There was one sample per cache condition, on different fresh runners/regions and at different times. No median, significance, p95, causal cache gain or no-audit saving is claimed. The same harness checksum, baseline/lock/runtime and install flags are preserved. E1 and E2 are not pooled as identically conditioned samples. No variant was tested; the final budget was used to restore the intended original control.

The live ledger contains exactly two diagnostic workflow runs, each attempt 1/run_number 1 or 2, and only this uniquely named diagnostic workflow for either experimental candidate SHA. No production CI/deploy run was associated with those pushes. There was no experimental PR to close. The experimental branch remains frozen at bdeff511, with no merge candidate and no further pushes/reruns permitted. The final documentary branch is independent and contains no diagnostic configuration. A normal PR validation run is a publication gate only and will not collect more npm experiments.

## G — Root Cause Adjudication

npm 10.9.8 starts reify:audit in parallel with installation and awaits it before ending reify. auditReport:getReport covers bulk POST and possible quick POST fallback; auditReport:init can include metavulnerability computation, cache and metadata GETs. POST bulk/quick are not retried by installed make-fetch-happen 14.0.3; quick is a distinct fallback operation. Configured GET retries are not evidence of retries actually occurring.

| Hypothesis as explanation of the historical slow installs | Status                   | New observation / unresolved discriminator                                                                                                                                              |
| --------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1 registry/network latency                               | INSUFFICIENT_EVIDENCE    | Bulk-audit responded200 in 650/4563ms and E1 tarballs downloaded; no historical transport timing or server failure attribution.                                                         |
| H2 npm cache utilization                                  | INSUFFICIENT_EVIDENCE    | E1 archive MISS is explained by the experimental fingerprint error; E2 actual HIT is fast. Neither identifies historical cache-HIT slow work.                                           |
| H3 reify/unpack                                           | INSUFFICIENT_EVIDENCE    | Largest retained inclusive region in fast samples; historical phase trace absent, so no pure extraction/network/disk attribution.                                                       |
| H4 lifecycle scripts                                      | INSUFFICIENT_EVIDENCE    | Current postinstall timers 52/79 ms; no evidence of a long script in either R01 sample. Historical script durations remain unmeasured.                                                  |
| H5 auxiliary npm audit                                    | SUPPORTED_BUT_NOT_PROVEN | Historical omitted summary remains a clue. Current audit overlaps unpack and is about 11.7 s; no historical long audit/fallback/error trace.                                            |
| H6 runner contention                                      | SUPPORTED_BUT_NOT_PROVEN | Historical identical inputs vary across runners, and current runners differ in region/resources; no contemporary pressure/scheduler measurement isolates contention.                    |
| H7 I/O/filesystem                                         | INSUFFICIENT_EVIDENCE    | Operations and sampled root byte counters demonstrate activity, not seven-minute filesystem latency or a pure I/O bottleneck.                                                           |
| H8 incomplete cache                                       | INSUFFICIENT_EVIDENCE    | Restore HIT never proves content/platform coverage;548 unknown lines prevent a complete cache-utilization trace. No offline sufficiency experiment was performed.                       |
| H9 different Node/npm host versions                       | REJECTED, narrowly       | Historical inspected host jobs and both R01 samples use 22.23.1/10.9.8. This rejects a difference in these versions, not every runtime/environment effect; Docker is a distinct cohort. |
| H10 dependency-graph operations                           | INSUFFICIENT_EVIDENCE    | Inputs did not change; idealTree was 114/115 ms in the fast samples. Identical input does not prove identical operation cost in historical environmental conditions.                    |

No historical root-cause hypothesis is CONFIRMED. The only confirmed configuration cause is the R01 E1 cache restore-version mismatch, bounded to this experiment. The R01 does not reproduce or explain the original seven-minute event.

## H — Security & CI Invariants

Only positive scalar fields and enumerated strings are publishable. npm stdout/stderr, timing metadata/argv and config JSON remain private. The extractor removes URLs, querystrings, headers, bodies, package/script names and freeform errors; unknown observations become numeric loss counters. A second payload validator rejects unexpected fields/strings/nonfinite numbers. Private files use 0700 directories/0600 files and are removed before artifact publication. Neither original npmrc nor cache archives are exported.

The workflow uses technical ephemeral GitHub checkout/artifact/cache credentials supplied by Actions. No such credential or provider/production secret is passed to npm or lifecycle children. This is not a claim that Actions contains no credential anywhere. The child receives an explicit environment allowlist and empty private npmrc files. The registry/cache/audit/scripts/SSL settings are checked under that exact environment before installation.

Six synthetic tests passed, including fake credential/URL rejection, scoped metadata classification, malicious timing metadata, nonfinite values, failed-child evidence retention, cleanup and cache mismatch blocking before install. Real local probes only read npm config; no local install or provider request was performed. No changes to production workflows, manifests, lockfile, dependencies, timeouts, boundary tests, db-types, E2E, Gitleaks or Docker build are included.

## I — Independent Review

D approved E1 before the first push at exact harness commit 33f151b/tree 2138c1fa, with zero material P0/P1/P2. Pre-review corrections verified the child effective cache against the restored directory and classified encoded scoped metadata without publishing it. C authored; D reviewed without authorship. Root ran the six synthetic tests and workflow Prettier check. E independently verified baseline, historical recovery and zero-run preflight ledger. D also approved the exact E2 one-line delta before push, explicitly requiring retention of the E1 negative cache result and stopping after the second run. The post-E1 cache mismatch is a resolved material comparability issue, not a hidden successful first restore. A/B/C completed real E2 adjudication; A and C then independently classified the final observations/limits. Final D/E conclusion verdicts, findings and immutable file/HEAD binding are supplied in the final Draft PR publication receipt; neither pre-run approval alone attests later documentary conclusions.

## J — Publication

Clean documentary branch: `codex/ci-perf-02-r01-evidence`, created independently from baseline. No harness or experimental configuration is incorporated. The publication receipt in the final Draft PR body/conversation binds this frozen report and appendix to their actual candidate commit, PR URL, D/E final reviews, normal PR CI and the single authorized Codex Review. It avoids embedding a self-referential commit hash in its own source. Any later correction needs its own applicable validation and independent review; an older review never attests a changed HEAD.

Local validation is documentary formatting, scope/link/secret checks and git diff --check, plus the temporary harness's six meaningful synthetic tests. No complete local npm run check, application build, E2E, Docker or db-types pass is claimed for the documentary candidate. Unchanged normal PR CI retains those applicable gates; db-types is expected SKIPPED for pull_request, not PASS. A publication CI completion may create a Deploy Production workflow_run record, whose deploy job is blocked by the unchanged push/main predicate; that is separate from the diagnostic pushes' absence of such a record. No merge, manual deploy or provider activity is authorized.

## K — Human Decision

No production remediation is recommended as established. The human decision is whether to authorize additional bounded diagnostics, or retain the current installation behavior and leave the historical cause open. The current 2/2 diagnostic budget is exhausted; no third run, retry or auxiliary variant will be started under this authorization.

A decisive next observation would reproduce a slow ORIGINAL with the historical archive actually restored and capture monotonic audit begin/end, bulk/quick completion/failure/fallback, relevant metadata GET waits and concurrent unpack/lifecycle completion boundaries. The observer must retain only positive-schema timing/status/class/error fields, add tests for pacote spec-format/cache-access semantics, and distinguish client wait from server unavailability. Even another sample may not reproduce a rare delay. One future run could cost at least about seven installation minutes if the historical stall recurs, plus setup/publication; worst-case cost and reproduction probability remain unknown. It adds public-network/observer-risk, requiring a fresh security review and explicit human approval of the run count/budget. No provider credentials, raw transport logs or timeout increase is proposed.

Only one conditional remediation candidate is recorded, without adopting it:

| Required field        | CI-PERF-02-R01-FIX-01                                                                                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cause addressed       | Hypothesized audit work; not proven as the historical critical wait.                                                                                                                                                 |
| Evidence              | Historical missing summary; R01 current audit 11.700/11.731 s overlaps install; bulk 650/4563 ms. Insufficient evidence to implement.                                                                                |
| Proposed intervention | Only after a slow trace proves audit dominates: evaluate a separate mandatory sequential audit step with equivalent advisory coverage and release blocking; no parallel job architecture in this task.               |
| Expected impact       | Unknown. Subtracting current audit time from wall is invalid; no saving measured.                                                                                                                                    |
| Risk                  | Lost/stale advisory coverage, different failure/exit semantics, changed timing/cache/dependency graph behavior and weakened release gating if equivalence is not enforced.                                           |
| Gates affected        | A future separately approved CI/build/release security contract; unchanged in R01.                                                                                                                                   |
| Validation            | Synthetic failure/timeout/fallback RED controls, GREEN equivalent advisory/exit/release-blocking behavior, immutable lock/runtime, multiple bounded comparable original/variant measurements and all existing gates. |
| Rollback              | Revert only the separately authorized future intervention and restore the original installation/audit command and gate contract.                                                                                     |
| Authorization         | Specific human approval of that future scope after causal evidence and independent security/release review. No permanent no-audit/offline, dependency update or retry/timeout change is authorized here.             |

Primary sources: [npm 10.9.8 audit implementation](https://github.com/npm/cli/blob/v10.9.8/workspaces/arborist/lib/audit-report.js), [reify audit overlap](https://github.com/npm/cli/blob/v10.9.8/workspaces/arborist/lib/arborist/reify.js), [make-fetch-happen 14.0.3 retry behavior](https://github.com/npm/make-fetch-happen/blob/v14.0.3/lib/remote.js), [pacote 19.0.2 cache stream/log behavior](https://github.com/npm/pacote/blob/v19.0.2/lib/fetcher.js), [npm 10 logging/timing](https://docs.npmjs.com/cli/v10/using-npm/logging/), [Linux getrusage operation counters](https://man7.org/linux/man-pages/man2/getrusage.2.html), [GitHub trigger support](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [cache version and lookup](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching), and [pinned restore action source](https://github.com/actions/cache/blob/caa296126883cff596d87d8935842f9db880ef25/dist/restore-only/index.js). Exact installed npm-source hashes/line notes were preserved privately by A; these links identify the public versioned implementations, not a remote slowdown trace.
