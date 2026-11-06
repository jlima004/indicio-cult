# NUV-19 — durable business/lifecycle HTTP intake

**Local result: `NUV19_LOCAL_PARTIAL` (2026-11-05).** The global check failed
on a boundary timeout reproduced on baseline; no waiver is assumed.

Implemented locally on `fa65669b8604e9a19e8ffad14e94856ef98a977d` (2026-11-05),
branch `codex/nuv-19-business-route`. The explicit NUV-19 implementation request
supersedes the historical HR-07-only blocked snapshot for this scope. Operational
gates and the NUV-16 compatibility hold are preserved.

`POST /api/webhooks/nuvemshop/events` uses Node.js and delegates to a server-only
intake helper. Next.js 16.4.1 with Cache Components rejects an explicit
`runtime` export, including `nodejs`; this route uses the documented default
Node.js runtime, as verified by production build and HTTP/PostgreSQL execution.
No global Next.js configuration is changed. It authenticates the original stream bytes with NUV-14, classifies
with NUV-15, assigns a fresh local attempt UUID, and awaits NUV-16 `persist`.
Only confirmed COMMIT permits 204. No domain processing, provider calls,
dispatcher, worker, subscriptions or user session are involved.

The 3 s request deadline aborts a pending reader and returns 503. A monotonic
check also prohibits success when synchronous work or COMMIT completes late.
An in-flight SQL operation may finish after a 5xx: no absence of writing is
asserted, no automatic write retry occurs, and no background continuation is
required to justify an ACK. PostgreSQL pool and SQL timeouts remain unchanged.

The verifier yields to the event loop every 1,024 read attempts.
A regression first demonstrated a continuously-ready empty-chunk producer
starving timer-driven cancellation. The yield preserves bytes, HMAC and the
1,048,576-byte limit while allowing the ingress deadline to interrupt that loop. Independent review
also identified unnecessary 1 MiB preallocation before receiving a stalled body.
A second regression demonstrated that allocation; a single geometrically growing
buffer now starts empty and grows from 1 KiB only as bytes arrive, up to the
same 1 MiB ceiling, without accumulating per-chunk metadata.

After strict UTF-8 decoding and before the existing lossless JSON decoder, a
linear lexical cost check caps depth at 32, total containers at 1,024, tokens
(including property names) at 8,192, properties at 4,096, and non-string primitive
lexemes at 256 characters. Strings remain bounded by the raw byte cap. Counters
ignore escaped string content. This is a conservative HTTP admission policy,
not a generic parser or a change to NUV-07's shared decoder; native JSON parsing
still determines syntax and the existing decoder preserves integer lexemes.
Large canonical IDs remain exact; NUV-15's rejection of exponent IDs is unchanged.

The runtime ledger is created lazily from explicit server-only
`NUVEMSHOP_INTAKE_*` settings, documented in `.env.example`: host, custom role,
password, database, port `5432`, session mode, optional CA and connection count.
No endpoint, role credential or trust certificate is inferred. `createIntakePool`
preserves certificate validation and its existing connection limits. Import and
build need no Nuvemshop or PostgreSQL credentials.

Unknown topics remain rejected: no approved owner policy exists. Eligibility
alone cannot enable ACK-ignore, and no speculative policy configuration is added.
The ledger's independently tested terminal-receipt primitive remains available
for a future explicit policy. Privacy topics are rejected by the business
classifier; no privacy handlers, projections, retention or redaction are created.

The Proxy bypasses generic maintenance and storefront session checks only for the
four exact approved webhook paths, retaining health/live exceptions. Prefixes,
suffixes and future routes receive no exemption. Unimplemented privacy routes
remain 404. `Headers` exposes combined duplicate signature fields, which fail the
strict 64-hex grammar. Node/Next HTTP fixtures send actual repeated fields; this
is evidence for this runtime, not a guarantee that multiplicity discarded by an
upstream intermediary can be recovered. No guarantee is invented for that case.

## Validation

Locked dependencies were installed independently using `npm ci --ignore-scripts`
(package/lockfile unchanged; Node 22.23.1, Next 16.4.1, Vitest 5.0.1, pg 8.23.1).
The initial shared installation differed from the lockfile and its exploratory
results are not the final verification evidence.

| Gate                                                                                   | Observed result                                              |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Seven focused unit suites (route, Proxy, HMAC, schema, ledger, bounds, runtime config) | 345 PASS                                                     |
| PostgreSQL 17.11, actual TLS pool and restricted runtime login                         | 15 PASS                                                      |
| Real Next HTTP: failure/duplicate-header/privacy/maintenance                           | 5 PASS                                                       |
| Real Next HTTP + independent PostgreSQL receipt/work reads, normal and maintenance     | 2 PASS                                                       |
| Complete `npm run check` before runtime-export compatibility correction                | FAIL: 3,062 PASS, 1 boundary timeout, 46 files, 746.14 s     |
| Final route unit suite after compatibility correction                                  | 23 PASS                                                      |
| `npm run build`, without Nuvemshop/PostgreSQL credentials                              | PASS after using default Node runtime                        |
| `npm run worker:build`                                                                 | PASS; no worker started                                      |
| Independent review                                                                     | No open material P0/P1/P2                                    |
| ACK budget                                                                             | Local synthetic successful paths proved; remote SLA UNPROVEN |

The timeout is `TSTYPES-09-ROOT cannot fabricate runtime or explicit-marker
protection`: 6,183 ms against the unchanged 5 s limit in the complete run.
Bounded isolated comparison with independently installed locked dependencies
reproduced it on baseline `fa65669` (7,637 ms) and candidate (15,431 ms). These
filtered runs select one test, leaving 597 unselected; they do not replace a
complete check or establish absence of a performance regression. No test,
threshold, timeout, Vitest setting or workflow was weakened. The earlier full
check was intentionally interrupted to address the review's allocation finding;
it is not PASS. The final published HEAD's repeat and CI are recorded separately
in the PR, without rewriting failures or assuming NUV-18's human waiver.

The integrated helper/real-pool successful samples were 5.83–162.23 ms, including
a 1 MiB body, fragmented delivery and 150 ms of actual SQL delay. A 3.15 s SQL
delay returned 503 around 3,004.5 ms and later committed, a lost COMMIT response
returned 500 with the row present, and exhausted-pool acquisition returned 500.
No write was retried. Actual Next HTTP successful samples were 16.97–124.44 ms
with independent subsequent receipt/work visibility. This is local synthetic
measurement, not proof of remote capacity or end-to-end provider SLA.

Implementation delegation used GPT-6.1 Terra High (route/runtime/tests),
GPT-6.1 Terra Medium (Proxy/HTTP fixtures), and independent GPT-6 Luna Extra High
review without authorship. The review's material preallocation finding was
fixed with a red/green regression; the final compatibility follow-up found no
material issue. Parent review also strengthened the raw duplicate-header HTTP
fixture with an explicit Host and problem-response assertion, preventing a
Node-level malformed-request 400 from masquerading as endpoint validation.

PR publication, candidate SHA, CI and Codex Review are exact-HEAD records in the
Draft PR. They do not change the partial classification without a full check PASS.

The PostgreSQL integration uses a fresh PostgreSQL 17 cluster bound to loopback,
local test TLS certificate, restricted runtime login and migrations NUV-16–18.
It never reads the application DSN or a remote Supabase configuration. Invoke
`npx vitest run --config tests/integration/nuvemshop-events.config.mts` with
`NUV19_TEST_SOCKET=/tmp/nuv19-pg-.../socket` and `NUV19_TEST_CA` pointing to that
fixture's certificate. Optional `NUV19_TEST_REPORT` writes sanitized timing data
only under the local NUV-19 evidence directory. The explicit fixture database is
`nuv19_test`, port 5432; do not point it at an existing environment.

The opt-in HTTP E2E suites use the existing two-server Playwright harness via
`playwright.nuvemshop.config.ts`. Set `NUV19_HTTP_FIXTURE=unconfigured` for the
five missing-ledger/failure tests or `NUV19_HTTP_FIXTURE=durable` for the two
actual PostgreSQL ACK tests, and run
`npx playwright test --config playwright.nuvemshop.config.ts --project desktop`.
These mutually exclusive fixtures use `.nuv19.ts` filenames, so neither enters
the existing default or `PLAYWRIGHT_INTEGRATION=1` selection. Collection is
validated with `--list` for all four selections. This corrects Codex Review's
P2 on mixed fixture requirements without changing the existing global config.
The fixtures use synthetic store `9` and client secret
`nuv19-local-http-secret`. PostgreSQL intake configuration stays absent for this
failure-boundary suite. Supabase points only to an unreachable loopback URL,
so health reports its existing degraded 503 while live remains 200. Unit tests
separately prove healthy health remains 200 during maintenance. Successful
receipt/work and COMMIT evidence comes from the real PostgreSQL suite, not this
missing-configuration HTTP fixture.

HR-02/03/06/08, NUV-20/21/24 and provider SLA remain open. Local synthetic timing
cannot prove remote delivery latency or operational readiness. No remote SQL,
migrations, provider calls, subscriptions, worker activation, merge, deployment,
workflow activation or Coolify configuration changes are authorized or executed.

## Supplemental validation receipt

The complete repeat after the default-Node correction also returned FAIL:
3,062 PASS and one timeout in 46 files (780.24 s). This time the failing case was
`resolves adapter server-to-root reference paths without module extension
substitution`, 5,304 ms against 5 s. Bounded isolated comparison reproduced the
same timeout on baseline (8,344 ms) and candidate (7,926 ms). Together with the
initial TSTYPES-09-ROOT result, this preserves `NUV19_LOCAL_PARTIAL`; neither
comparison is a waiver or proof of a complete local PASS.

The final dedicated Playwright modes were executed with automatically started
production Next servers, without reuse: unconfigured **5/5 PASS**, durable
PostgreSQL **2/2 PASS**. Their builds/typechecking passed. Final HTTP ACK samples
were 15.79–163.01 ms, including distinct receipts for identical bodies and
independent receipt/work reads after each accepted sequence. The disposable
PostgreSQL and both HTTP servers were stopped afterwards.

Codex Review's fixture-selection P2 was fixed by the dedicated modes, verified
independently, replied to and resolved. Follow-up review on `b720f33` found no
major issue. That HEAD's CI passed the complete Check, Build and existing E2E,
but stopped at Gitleaks on a public synthetic HMAC fixture in the first commit.
No provider credential was present. The current test now generates a 32-byte
random key, and `.gitleaksignore` acknowledges only the immutable historical
commit/file/rule/line fingerprint. It does not exclude a path, rule or commit.
The narrow mechanism is documented by [Gitleaks 8.24.3](https://github.com/gitleaks/gitleaks/blob/v8.24.3/README.md#gitleaksignore).

The official 8.24.3 binary was checksum-verified. Removing the new ignore entry
reproduced exactly the historical finding; restoring it produced zero findings
for the PR range and `git --all` (202 commits). A separate temporary repository
with an unrelated synthetic generic API key was still detected using the same
ignore file. The generated-key bounds suite passed 10/10. No scan rule, entropy
threshold, workflow or exit condition changed, and no history was rewritten.
Final commit, CI and Codex Review results remain exact-HEAD receipts in the PR.
