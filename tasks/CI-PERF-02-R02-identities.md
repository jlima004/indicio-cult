# CI-PERF-02-R02 — Complete original boundary identity contract

Baseline `42bb6e4f21254854d232ae8e8422c949234e3c0f`; source SHA-256 `7e743bc104720fd6b6805d75310fa82ff75b4afc84c99b7d80d43c26b1ff5d50`. **598 dynamically collected cases, 155 atomic registrations**, each case exactly once. Source locations below refer to the original `tests/unit/modules/nuvemshop/boundary.test.ts`.

Identity hashes the complete normalized hierarchy/title plus duplicate occurrence ordinal, independent of test filename/line. Only the exact worktree root prefix in generated absolute fixture names becomes `<PROJECT_ROOT>`. Original raw names remain in the JSON evidence. `Rnnn` refers to the verbatim callback expectation/helper contract dictionary below. These source-level classifications do not declare runtime equivalence or performance PASS.

Flags: `T` compiler-backed compilation or parsing; `S` synthetic source Map mutation directly or through helper; `O` callback option epoch mutation; `A` alias mutation; `R` custom resolution exercised; `C` predecessor AST lane used; `I` independent execution and fresh compiler state mandatory. Every row is a security/control case. Between-test correctness dependency: **none found**; module predecessor lanes are performance state. Three real-import cases require original mocks/env/module cleanup. Preserve all sequential within-callback mutation/restoration epochs. `CACHE-PARSER`/`CACHE-CALLBACK` parse through hosts without constructing a Program; their direct-host parser/cache boundary is intentional (C is absent). Critical epoch classifications were manually traced for all CI-OPT/Node cases. The compact JSON distinguishes createsTypeScriptProgram, testsCacheOrParserBoundary and exercisedEpochs.

## Family reconciliation

| Family                                           |   Cases |
| ------------------------------------------------ | ------: |
| JSDoc type dependency matrix                     |      18 |
| JSDoc ScriptKind dependency matrix               |      18 |
| triple-slash local types dependency matrix       |      33 |
| Module boundaries and real entrypoint imports    |      52 |
| triple-slash path dependency matrix              |      23 |
| Ambient process/global capabilities              |     180 |
| Browser/client import graph and CSS              |      58 |
| CommonJS runtime capabilities and local bindings |     101 |
| Guard binding and Program identity               |       9 |
| CommonJS/ESM export surfaces                     |      62 |
| Canonical resolver and tombstones                |      10 |
| CI-OPT-01 cache invalidation canaries            |      17 |
| CI-OPT-01 compiler equivalence                   |      13 |
| CI-OPT-01 library resolution                     |       1 |
| native Node diagnostic opt-in isolation          |       3 |
| **Total**                                        | **598** |

## Complete identity manifest

|   # | Stable logical ID                 | Complete describe hierarchy and case name                                                                                                                                                           | Original line | Family                                           | Contract | Flags   |
| --: | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------: | ------------------------------------------------ | -------- | ------- |
|   1 | boundary-f4743792d9151ccfcb1c8ae2 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-01 rejects the diagnostics-clean consecutive-block typedef finding                                                      |          1164 | JSDoc type dependency matrix                     | R001     | TCI     |
|   2 | boundary-207319ca365ef5de6418d945 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-02 rejects the diagnostics-clean consecutive-block import tag                                                           |          1172 | JSDoc type dependency matrix                     | R002     | TCI     |
|   3 | boundary-9e60cf182d61f9de19ba7b42 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-03 rejects compiler-recognized inline import types                                                                      |          1181 | JSDoc type dependency matrix                     | R003     | TCI     |
|   4 | boundary-4590ee53d0920f45475e15d6 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-04 rejects compiler-recognized inline import types                                                                      |          1181 | JSDoc type dependency matrix                     | R003     | TCI     |
|   5 | boundary-f8994d9b56c34845e7557131 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-05 rejects compiler-recognized inline import types                                                                      |          1181 | JSDoc type dependency matrix                     | R003     | TCI     |
|   6 | boundary-821412d24d8b47948eb03b0e | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-06 permits a diagnostics-clean harmless local type import                                                               |          1201 | JSDoc type dependency matrix                     | R004     | TCI     |
|   7 | boundary-51a619d020c88f30b70c1433 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-07 traverses diagnostics-clean type reexport wrappers                                                                   |          1213 | JSDoc type dependency matrix                     | R005     | TCI     |
|   8 | boundary-cec601112ef1f0f416989039 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-08 traverses diagnostics-clean type reexport wrappers                                                                   |          1213 | JSDoc type dependency matrix                     | R005     | TCI     |
|   9 | boundary-6e1de30a637f2f2acce1ac32 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-09 reuses canonical project alias resolution                                                                            |          1231 | JSDoc type dependency matrix                     | R006     | TRCI    |
|  10 | boundary-58e30f4c1cbda2a3393477f6 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-10 reuses canonical relative adapter resolution                                                                         |          1243 | JSDoc type dependency matrix                     | R007     | TCI     |
|  11 | boundary-b388cdd547f110822894da9a | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-11 fails closed for a missing local type import with expected diagnostic                                                |          1251 | JSDoc type dependency matrix                     | R008     | TRCI    |
|  12 | boundary-c358be151d29585e85e50159 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-12 ignores prose import text and harmless runtime-capability type names                                                 |          1264 | JSDoc type dependency matrix                     | R009     | TCI     |
|  13 | boundary-4e8f60265ac4bce5f550e7bc | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-13-ROOT cannot use JSDoc imports as a runtime guard                                                                     |          1273 | JSDoc type dependency matrix                     | R010     | TSCI    |
|  14 | boundary-443289ba2022047d4e59bc00 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-13-MARKER cannot use JSDoc imports as a runtime guard                                                                   |          1273 | JSDoc type dependency matrix                     | R010     | TSCI    |
|  15 | boundary-7abf086a81c649b0e06b4fb2 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-13-GUARDED cannot use JSDoc imports as a runtime guard                                                                  |          1273 | JSDoc type dependency matrix                     | R010     | TSCI    |
|  16 | boundary-ddb08b4e679e8a29666f5984 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-14 terminates a diagnostics-clean type cycle                                                                            |          1316 | JSDoc type dependency matrix                     | R011     | TCI     |
|  17 | boundary-879686e97b377cd2a4405f73 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-15 terminates a diagnostics-clean type cycle                                                                            |          1316 | JSDoc type dependency matrix                     | R011     | TCI     |
|  18 | boundary-2154f069a255c18985d05d88 | Nuvemshop server-only boundary &gt; JSDoc type dependency matrix &gt; JSDOC-16 rejects diagnostics-clean JSX with consecutive JSDoc blocks                                                          |          1337 | JSDoc type dependency matrix                     | R012     | TCI     |
|  19 | boundary-8ff72dae12c1dd859cce0bca | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-01 permits TS documentary @type import of the adapter                                                         |          1425 | JSDoc ScriptKind dependency matrix               | R013     | TCI     |
|  20 | boundary-aef8282c3e191283ea210297 | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-02 permits TSX documentary @type import of the adapter                                                        |          1439 | JSDoc ScriptKind dependency matrix               | R014     | TCI     |
|  21 | boundary-567991794ea88950c3086892 | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-03 permits TS documentary @typedef import of the adapter                                                      |          1452 | JSDoc ScriptKind dependency matrix               | R015     | TCI     |
|  22 | boundary-f619777a5d886265f3b1834e | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-04 permits TS/TSX documentary @import when the compiler ignores it                                            |          1465 | JSDoc ScriptKind dependency matrix               | R016     | TCI     |
|  23 | boundary-66c984ad568a275a03b44fbf | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-05 rejects JS @typedef importing the adapter                                                                  |          1489 | JSDoc ScriptKind dependency matrix               | R017     | TCI     |
|  24 | boundary-508623aedb8bda98b27f2d96 | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-06 rejects JSX JSDoc importing the adapter                                                                    |          1502 | JSDoc ScriptKind dependency matrix               | R018     | TCI     |
|  25 | boundary-30c804f11345ee304c53f1ec | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-07 rejects JS @import importing the adapter                                                                   |          1515 | JSDoc ScriptKind dependency matrix               | R019     | TCI     |
|  26 | boundary-d49177be1d1efb2c9848454c | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-08 rejects TS real import type of the adapter                                                                 |          1529 | JSDoc ScriptKind dependency matrix               | R020     | TCI     |
|  27 | boundary-5316e27fb0de57f448b7ff8b | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-09 rejects TS real import type node of the adapter                                                            |          1543 | JSDoc ScriptKind dependency matrix               | R021     | TCI     |
|  28 | boundary-f564891a92cc3fcbc0f59618 | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-10 rejects TSX real import type of the adapter                                                                |          1555 | JSDoc ScriptKind dependency matrix               | R022     | TCI     |
|  29 | boundary-6853dfa8dc09bfb3caa1fb27 | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-11 permits TS/TSX real import type of an innocent module                                                      |          1569 | JSDoc ScriptKind dependency matrix               | R023     | TCI     |
|  30 | boundary-8bb15e8a2478f3720ab2ea87 | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-12 rejects JS JSDoc through a wrapper to the adapter                                                          |          1592 | JSDoc ScriptKind dependency matrix               | R024     | TCI     |
|  31 | boundary-0ad61f05a3b9d0981109f811 | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-13 rejects JSX JSDoc through a wrapper to the adapter                                                         |          1605 | JSDoc ScriptKind dependency matrix               | R025     | TCI     |
|  32 | boundary-317ade5560bc09a3258ba102 | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-14 permits TS/TSX documentary JSDoc plus a real innocent import                                               |          1618 | JSDoc ScriptKind dependency matrix               | R026     | TCI     |
|  33 | boundary-4d13bbb6b34b5c36e145879c | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-15 rejects TS/TSX documentary JSDoc plus a real adapter import                                                |          1633 | JSDoc ScriptKind dependency matrix               | R027     | TCI     |
|  34 | boundary-0d009c114bb17e35cb9c1cca | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-16 rejects JS/JSX JSDoc used as a fabricated runtime guard                                                    |          1649 | JSDoc ScriptKind dependency matrix               | R028     | TCI     |
|  35 | boundary-e3d21055f62b6ec411f19e98 | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-17 ignores JSDoc prose naming require, module, globalThis, global, process                                    |          1689 | JSDoc ScriptKind dependency matrix               | R029     | TCI     |
|  36 | boundary-c52931f9d2a43341a7dd38f8 | Nuvemshop server-only boundary &gt; JSDoc ScriptKind dependency matrix &gt; JSDOCKIND-18 keeps JS/JSX JSDoc type-only while preserving a real runtime import                                        |          1712 | JSDoc ScriptKind dependency matrix               | R030     | TCI     |
|  37 | boundary-00189a17b8430f893a108b84 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-01 rejects the diagnostics-clean original global-contract finding                                       |          1791 | triple-slash local types dependency matrix       | R031     | TSCI    |
|  38 | boundary-1fc8c8a2b4e4687855f2fe2d | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-02 traverses two diagnostics-clean declaration wrappers                                                 |          1819 | triple-slash local types dependency matrix       | R032     | TSCI    |
|  39 | boundary-66f5869ae5fcf2820e3cb8ef | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-03 permits a diagnostics-clean harmless wrapper with a type-only edge                                   |          1837 | triple-slash local types dependency matrix       | R033     | TSCI    |
|  40 | boundary-c0e7ad7ff4acafa747fdd43d | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-04 fails closed for missing local types with expected compiler diagnostics                              |          1853 | triple-slash local types dependency matrix       | R034     | TSCI    |
|  41 | boundary-8ceb45c9483243ed052bbf2a | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-05 rejects diagnostics-clean declare-global namespace ownership                                         |          1861 | triple-slash local types dependency matrix       | R035     | TSCI    |
|  42 | boundary-90b7c50eb50b1fd651a602b5 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-06 canonicalizes effective local filename .\__b-types-wrapper.d.ts                                      |          1873 | triple-slash local types dependency matrix       | R036     | TSRCI   |
|  43 | boundary-0bb28a648aed8693a7d65350 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-06 canonicalizes effective local filename ./nested/../__b-types-wrapper.d.ts                            |          1873 | triple-slash local types dependency matrix       | R036     | TSRCI   |
|  44 | boundary-cb7e56bbf5182b690a2b0a27 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-06 canonicalizes effective local filename ../src/__b-types-wrapper.d.ts                                 |          1873 | triple-slash local types dependency matrix       | R036     | TSRCI   |
|  45 | boundary-5ef243cdb240bb5688ba38d2 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-06 canonicalizes effective local filename &lt;PROJECT_ROOT&gt;/src/__b-types-wrapper.d.ts               |          1873 | triple-slash local types dependency matrix       | R036     | TSRCI   |
|  46 | boundary-a13abcbb03253341476fa3e7 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-07 preserves the separate types package/library channel                                                 |          1911 | triple-slash local types dependency matrix       | R037     | TSCI    |
|  47 | boundary-fd76dcbec2cb0b21d3a4fa59 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-08 preserves the separate lib package/library channel                                                   |          1915 | triple-slash local types dependency matrix       | R038     | TSCI    |
|  48 | boundary-f780595f99ec0d84a55a17c4 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-09-ROOT cannot fabricate runtime or explicit-marker protection                                          |          1920 | triple-slash local types dependency matrix       | R039     | TSRCI   |
|  49 | boundary-479cd0962024544f1e9d6328 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-09-MARKER cannot fabricate runtime or explicit-marker protection                                        |          1920 | triple-slash local types dependency matrix       | R039     | TSRCI   |
|  50 | boundary-0bb5063459363139d08fd6d4 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-15 cannot fabricate runtime or explicit-marker protection                                               |          1920 | triple-slash local types dependency matrix       | R039     | TSRCI   |
|  51 | boundary-ca43f1ed69b7cbcb0e92a71b | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-10 terminates diagnostics-clean declaration cycles (adapter branch: false)                              |          1972 | triple-slash local types dependency matrix       | R040     | TSCI    |
|  52 | boundary-545222da805ca840a4c3f4bb | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-11 terminates diagnostics-clean declaration cycles (adapter branch: true)                               |          1972 | triple-slash local types dependency matrix       | R040     | TSCI    |
|  53 | boundary-02dd4c350b627060514d5f0a | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-12 traverses diagnostics-clean combined path then types channels                                        |          1994 | triple-slash local types dependency matrix       | R041     | TSCI    |
|  54 | boundary-36b10f4dfaa6835a25f085ed | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-12 traverses diagnostics-clean combined types then path channels                                        |          1994 | triple-slash local types dependency matrix       | R041     | TSCI    |
|  55 | boundary-17b2c5fe53fc66779d5b9e98 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-13 rejects diagnostics-clean direct adapter declaration reference                                       |          2012 | triple-slash local types dependency matrix       | R042     | TSCI    |
|  56 | boundary-7b8d142819fa0a41c1a50154 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-14 permits diagnostics-clean ordinary sources without references                                        |          2026 | triple-slash local types dependency matrix       | R043     | TSCI    |
|  57 | boundary-bc1638dd5ae34f026290f877 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-EXT allows effective diagnostics-clean local .d.mts declarations                                        |          2041 | triple-slash local types dependency matrix       | R044     | TSCI    |
|  58 | boundary-deeeacb29a3994a484ac488a | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-EXT allows effective diagnostics-clean local .d.cts declarations                                        |          2041 | triple-slash local types dependency matrix       | R044     | TSCI    |
|  59 | boundary-f82693903ac66fd2ff37be99 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-EXT rejects diagnostics-clean adapter ownership through local .d.mts declarations                       |          2059 | triple-slash local types dependency matrix       | R045     | TSCI    |
|  60 | boundary-92ba9c8e206ce57c5352cb39 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-EXT rejects diagnostics-clean adapter ownership through local .d.cts declarations                       |          2059 | triple-slash local types dependency matrix       | R045     | TSCI    |
|  61 | boundary-f79d00aaf7a8ffe3f3f768a9 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-MODE preserves public directive resolution-mode=import                                                  |          2075 | triple-slash local types dependency matrix       | R046     | TSRCI   |
|  62 | boundary-1cf3509ddfe9345eb62c3837 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-MODE preserves public directive resolution-mode=require                                                 |          2075 | triple-slash local types dependency matrix       | R046     | TSRCI   |
|  63 | boundary-7d49635d78c190bc456ba9c1 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-BOUNDED fails closed for unsupported explicit-local ./__b-types-wrapper.d.ts?raw                        |          2104 | triple-slash local types dependency matrix       | R047     | TSRCI   |
|  64 | boundary-e54fbddb03e449ba3a31a6fa | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-BOUNDED fails closed for unsupported explicit-local ./__b-types-wrapper.css                             |          2104 | triple-slash local types dependency matrix       | R047     | TSRCI   |
|  65 | boundary-27f9259d8cc27323d281dc8d | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-BOUNDED fails closed for unsupported explicit-local ../node_modules/typescript/lib/typescript.d.ts      |          2104 | triple-slash local types dependency matrix       | R047     | TSRCI   |
|  66 | boundary-2757e94b4745c88452c8dffb | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-BOUNDED fails closed for unsupported explicit-local /tmp/__b-types-external.d.ts                        |          2104 | triple-slash local types dependency matrix       | R047     | TSRCI   |
|  67 | boundary-17911216b29f91281982ce96 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-LOCAL-SEPARATOR rejects diagnostics-clean Windows-relative wrapper ownership                            |          2122 | triple-slash local types dependency matrix       | R048     | TSCI    |
|  68 | boundary-4d5dffc7f497fcae89b08400 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-CONSUMER rejects diagnostics-clean adapter-local types reaching a consumer module                       |          2134 | triple-slash local types dependency matrix       | R049     | TSRCI   |
|  69 | boundary-18c2b5d93f11f416a760bf49 | Nuvemshop server-only boundary &gt; triple-slash local types dependency matrix &gt; TSTYPES-ADAPTER-MISSING fails closed for missing adapter-local declarations                                     |          2165 | triple-slash local types dependency matrix       | R050     | TSCI    |
|  70 | boundary-4997cd4ad3acc739b82d1f73 | Nuvemshop server-only boundary &gt; TSREF-01 rejects diagnostics-clean triple-slash declaration wrapper ownership                                                                                   |          2184 | Module boundaries and real entrypoint imports    | R051     | TSCI    |
|  71 | boundary-c5e004b8aabd579207736b90 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-02 traverses two diagnostics-clean declaration wrappers                                                          |          2279 | triple-slash path dependency matrix              | R052     | TSCI    |
|  72 | boundary-bfae102b6b8f3b841aa01935 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-03 allows a diagnostics-clean harmless declaration wrapper                                                       |          2300 | triple-slash path dependency matrix              | R053     | TSCI    |
|  73 | boundary-a2b4d516bfa02477b59a3f1e | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-04 fails closed for missing exact project-local paths                                                            |          2319 | triple-slash path dependency matrix              | R054     | TSRCI   |
|  74 | boundary-c0c166addb1749c4cf5cd469 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-05 rejects a diagnostics-clean direct adapter declaration reference                                              |          2333 | triple-slash path dependency matrix              | R055     | TSCI    |
|  75 | boundary-f1d1b35caea394f9515d3b49 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-06 rejects diagnostics-clean global namespace wrapper ownership                                                  |          2350 | triple-slash path dependency matrix              | R056     | TSCI    |
|  76 | boundary-b8fa08d12f6349344a2301bd | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-07 allows diagnostics-clean sources without triple-slash references                                              |          2361 | triple-slash path dependency matrix              | R057     | TSCI    |
|  77 | boundary-a33e719c8a02d60d8ee64951 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-08 keeps other directive channels separate                                                                       |          2405 | triple-slash path dependency matrix              | R058     | TSCI    |
|  78 | boundary-4c8a3a5b5e4b2a59e7138c26 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-09 keeps other directive channels separate                                                                       |          2410 | triple-slash path dependency matrix              | R059     | TSCI    |
|  79 | boundary-a4a0537c49a239090c823452 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-10-ROOT cannot fabricate positive runtime guards                                                                 |          2414 | triple-slash path dependency matrix              | R060     | TSRCI   |
|  80 | boundary-e71fab72061f475f3e6b2130 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-10-MARKER cannot fabricate positive runtime guards                                                               |          2414 | triple-slash path dependency matrix              | R060     | TSRCI   |
|  81 | boundary-13a3d58c03c8f5fc7df3b43d | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-10-GUARDED cannot fabricate positive runtime guards                                                              |          2414 | triple-slash path dependency matrix              | R060     | TSRCI   |
|  82 | boundary-532c65790318736cd36d4f0d | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-11 terminates declaration cycles (adapter branch: false)                                                         |          2459 | triple-slash path dependency matrix              | R061     | TSCI    |
|  83 | boundary-f2b6f7516b4bfab319989f4f | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; TSREF-12 terminates declaration cycles (adapter branch: true)                                                          |          2459 | triple-slash path dependency matrix              | R061     | TSCI    |
|  84 | boundary-35f596fae73d55055a09abd5 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; converges exact reference ./nested/../__tsref-wrapper.d.ts to compiler and overlay identity                            |          2484 | triple-slash path dependency matrix              | R062     | TSRCI   |
|  85 | boundary-d877c30cc49ae62aa6333a4d | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; converges exact reference __tsref-wrapper.d.ts to compiler and overlay identity                                        |          2484 | triple-slash path dependency matrix              | R062     | TSRCI   |
|  86 | boundary-9048d0b1669103c9bfcc081b | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; converges exact reference &lt;PROJECT_ROOT&gt;/src/__tsref-wrapper.d.ts to compiler and overlay identity               |          2484 | triple-slash path dependency matrix              | R062     | TSRCI   |
|  87 | boundary-7eccaef57df8cf1dd5fd6a70 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; fails closed for bounded unsupported ./__tsref-wrapper (extensionless path)                                            |          2503 | triple-slash path dependency matrix              | R063     | TSRCI   |
|  88 | boundary-7970ee34598542bbffbb3925 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; fails closed for bounded unsupported ./__tsref-wrapper.d.ts?raw (query path)                                           |          2503 | triple-slash path dependency matrix              | R063     | TSRCI   |
|  89 | boundary-0dd6b6f5fd63db302819b883 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; fails closed for bounded unsupported ./__tsref-wrapper.css (asset path)                                                |          2503 | triple-slash path dependency matrix              | R063     | TSRCI   |
|  90 | boundary-17ba14febd8bd9fdde759770 | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; fails closed for bounded unsupported ../node_modules/typescript/lib/typescript.d.ts (package path)                     |          2503 | triple-slash path dependency matrix              | R063     | TSRCI   |
|  91 | boundary-da6de167bc60c05364ab82af | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; fails closed for bounded unsupported /tmp/__tsref-external.d.ts (external path)                                        |          2503 | triple-slash path dependency matrix              | R063     | TSRCI   |
|  92 | boundary-92e50dbe1858d95dc473900d | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; fails closed for bounded unsupported @/modules/nuvemshop/__tsref-contracts.ts (module alias path)                      |          2503 | triple-slash path dependency matrix              | R063     | TSRCI   |
|  93 | boundary-116216611e063d6d9cd8c9da | Nuvemshop server-only boundary &gt; triple-slash path dependency matrix &gt; resolves adapter server-to-root reference paths without module extension substitution                                  |          2524 | triple-slash path dependency matrix              | R064     | TSRCI   |
|  94 | boundary-9ac5239ecb11c61f535ea4c4 | Nuvemshop server-only boundary &gt; SECRET-DIAGNOSTICS keeps every static and harmless secret fixture diagnostics-clean                                                                             |          2587 | Ambient process/global capabilities              | R065     | TSCI    |
|  95 | boundary-a5005bfddbe4c21f05cf1a75 | Nuvemshop server-only boundary &gt; SECRET-GREEN-01 rejects unguarded static ambient process.env through the full boundary                                                                          |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
|  96 | boundary-b2119fee9a1278499b4a399c | Nuvemshop server-only boundary &gt; SECRET-RED-01 rejects unguarded static ambient process.env through the full boundary                                                                            |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
|  97 | boundary-7feb0d4d364e59039a6d08e4 | Nuvemshop server-only boundary &gt; SECRET-RED-02 rejects unguarded static ambient process.env through the full boundary                                                                            |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
|  98 | boundary-5cdccb21152a8a206c838cd9 | Nuvemshop server-only boundary &gt; SECRET-DOUBLE-BRACKET rejects unguarded static ambient process.env through the full boundary                                                                    |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
|  99 | boundary-caf2e6c3c6172050789831af | Nuvemshop server-only boundary &gt; SECRET-PARENTHESIZED rejects unguarded static ambient process.env through the full boundary                                                                     |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
| 100 | boundary-5a5170ccac7696c73e7a736e | Nuvemshop server-only boundary &gt; SECRET-NONNULL rejects unguarded static ambient process.env through the full boundary                                                                           |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
| 101 | boundary-6afd524e75bcd3d44a3053b1 | Nuvemshop server-only boundary &gt; SECRET-AS rejects unguarded static ambient process.env through the full boundary                                                                                |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
| 102 | boundary-d831ad73546bc08959357802 | Nuvemshop server-only boundary &gt; SECRET-ASSERTION rejects unguarded static ambient process.env through the full boundary                                                                         |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
| 103 | boundary-3a9a9464cc164bb147fb00d7 | Nuvemshop server-only boundary &gt; SECRET-SATISFIES rejects unguarded static ambient process.env through the full boundary                                                                         |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
| 104 | boundary-558babe14d145c80c8484323 | Nuvemshop server-only boundary &gt; SECRET-NESTED-WRAPPERS rejects unguarded static ambient process.env through the full boundary                                                                   |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
| 105 | boundary-910b1c76278aafefc122608b | Nuvemshop server-only boundary &gt; SECRET-STATIC-KEY-PARENS rejects unguarded static ambient process.env through the full boundary                                                                 |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
| 106 | boundary-36832785e93a9479ef1de55f | Nuvemshop server-only boundary &gt; SECRET-STATIC-TEMPLATE-KEY rejects unguarded static ambient process.env through the full boundary                                                               |          2602 | Ambient process/global capabilities              | R066     | TSCI    |
| 107 | boundary-f1097c2503fc64bee0b635eb | Nuvemshop server-only boundary &gt; SECRET-GREEN-04 accepts guarded bracket process.env through the full boundary                                                                                   |          2611 | Ambient process/global capabilities              | R067     | TSCI    |
| 108 | boundary-3f09837cffdc81856d0ba3d4 | Nuvemshop server-only boundary &gt; SECRET-GREEN-05 preserves harmless process-like sources through the full boundary                                                                               |          2617 | Ambient process/global capabilities              | R068     | TSCI    |
| 109 | boundary-ec67284032a6cf5860207cba | Nuvemshop server-only boundary &gt; SECRET-LOCAL-BRACKET preserves harmless process-like sources through the full boundary                                                                          |          2617 | Ambient process/global capabilities              | R068     | TSCI    |
| 110 | boundary-ba1e5a5871033b315415bb2e | Nuvemshop server-only boundary &gt; SECRET-LOCAL-PARAMETER preserves harmless process-like sources through the full boundary                                                                        |          2617 | Ambient process/global capabilities              | R068     | TSCI    |
| 111 | boundary-e5cb9f2977a70f66a288c7dd | Nuvemshop server-only boundary &gt; SECRET-TYPE-ONLY preserves harmless process-like sources through the full boundary                                                                              |          2617 | Ambient process/global capabilities              | R068     | TSCI    |
| 112 | boundary-b76040f97da1d03a3296a762 | Nuvemshop server-only boundary &gt; SECRET-COMMENT-TEXT preserves harmless process-like sources through the full boundary                                                                           |          2617 | Ambient process/global capabilities              | R068     | TSCI    |
| 113 | boundary-9e245f640b58289814252599 | Nuvemshop server-only boundary &gt; SECRET-STRING-TEXT preserves harmless process-like sources through the full boundary                                                                            |          2617 | Ambient process/global capabilities              | R068     | TSCI    |
| 114 | boundary-f71b38f79eaf0b081f996462 | Nuvemshop server-only boundary &gt; SECRET-DYNAMIC-KEY preserves harmless process-like sources through the full boundary                                                                            |          2617 | Ambient process/global capabilities              | R068     | TSCI    |
| 115 | boundary-fe667c34a4727646a60aebf6 | Nuvemshop server-only boundary &gt; SECRET-DYNAMIC-TEMPLATE preserves harmless process-like sources through the full boundary                                                                       |          2617 | Ambient process/global capabilities              | R068     | TSCI    |
| 116 | boundary-00eb0b8493bdedf5ee399201 | Nuvemshop server-only boundary &gt; SECRET-UNRELATED-STATIC preserves harmless process-like sources through the full boundary                                                                       |          2617 | Ambient process/global capabilities              | R068     | TSCI    |
| 117 | boundary-b2b17d33b84d34c5bc5696fe | Nuvemshop server-only boundary &gt; SECRET-GREEN-06 preserves harmless process-like sources through the full boundary                                                                               |          2617 | Ambient process/global capabilities              | R068     | TSCI    |
| 118 | boundary-47d9092a123927ebee9044ab | Nuvemshop server-only boundary &gt; POST-RETIREMENT allows unrelated client generic types                                                                                                           |          2626 | Browser/client import graph and CSS              | R069     | TCI     |
| 119 | boundary-cea38074991b04b34f318ddf | Nuvemshop server-only boundary &gt; POST-RETIREMENT allows unrelated client conditional types                                                                                                       |          2626 | Browser/client import graph and CSS              | R069     | TCI     |
| 120 | boundary-e97e659b342edabcd641924b | Nuvemshop server-only boundary &gt; POST-RETIREMENT allows unrelated client keyof types                                                                                                             |          2626 | Browser/client import graph and CSS              | R069     | TCI     |
| 121 | boundary-ad7c78f8f1eae207f5a4f994 | Nuvemshop server-only boundary &gt; POST-RETIREMENT allows unrelated client IndexedAccess types                                                                                                     |          2626 | Browser/client import graph and CSS              | R069     | TCI     |
| 122 | boundary-c2d47261210d7e76795abe8e | Nuvemshop server-only boundary &gt; POST-RETIREMENT allows unrelated client mapped types                                                                                                            |          2626 | Browser/client import graph and CSS              | R069     | TCI     |
| 123 | boundary-7f495d74d65388461594e66c | Nuvemshop server-only boundary &gt; POST-RETIREMENT accepts exact CSS overlays through the full boundary                                                                                            |          2664 | Browser/client import graph and CSS              | R070     | TCI     |
| 124 | boundary-29a383f638d38bc65b019646 | Nuvemshop server-only boundary &gt; GROOT-globalThis-01 applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 125 | boundary-dc4b22baf9e2a12585321940 | Nuvemshop server-only boundary &gt; GROOT-globalThis-02 applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 126 | boundary-6c8b8440151e341bba97140e | Nuvemshop server-only boundary &gt; GROOT-globalThis-03 applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 127 | boundary-8f39c653212066e95bc5e2dd | Nuvemshop server-only boundary &gt; GROOT-globalThis-04 applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 128 | boundary-9771037f065ef0fb36767ee4 | Nuvemshop server-only boundary &gt; GROOT-globalThis-05 applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 129 | boundary-20fd658469d0b86654482669 | Nuvemshop server-only boundary &gt; GROOT-globalThis-06 applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 130 | boundary-f5c0d377e66a5b58e293ccb2 | Nuvemshop server-only boundary &gt; GROOT-globalThis-07 applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 131 | boundary-3baf01cd7906803c3942207f | Nuvemshop server-only boundary &gt; GROOT-globalThis-08 applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 132 | boundary-3efda88c529d3ddd74dc7aeb | Nuvemshop server-only boundary &gt; GROOT-globalThis-09 applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 133 | boundary-3602f1761adc2acfa8d34c0c | Nuvemshop server-only boundary &gt; GROOT-globalThis-10 applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 134 | boundary-ef720559693efa6666597a1a | Nuvemshop server-only boundary &gt; GROOT-globalThis-EXACT-ALIAS applies the whole-global root policy through graph and full boundary                                                               |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 135 | boundary-8752200fb2f82a075f19e809 | Nuvemshop server-only boundary &gt; GROOT-globalThis-WRAPPER-1 applies the whole-global root policy through graph and full boundary                                                                 |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 136 | boundary-f4b972a6897ead49f4225200 | Nuvemshop server-only boundary &gt; GROOT-globalThis-WRAPPER-2 applies the whole-global root policy through graph and full boundary                                                                 |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 137 | boundary-b0da9c265d6596304017cc85 | Nuvemshop server-only boundary &gt; GROOT-globalThis-WRAPPER-3 applies the whole-global root policy through graph and full boundary                                                                 |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 138 | boundary-f7d15f8042329ad1db73b08b | Nuvemshop server-only boundary &gt; GROOT-globalThis-WRAPPER-4 applies the whole-global root policy through graph and full boundary                                                                 |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 139 | boundary-97931b5462bc56ade753ab90 | Nuvemshop server-only boundary &gt; GROOT-globalThis-WRAPPER-5 applies the whole-global root policy through graph and full boundary                                                                 |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 140 | boundary-8b1c16e4894eecd176737a9a | Nuvemshop server-only boundary &gt; GROOT-globalThis-COMPUTED-KEY applies the whole-global root policy through graph and full boundary                                                              |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 141 | boundary-bc9fe0d96361c52be953f8f2 | Nuvemshop server-only boundary &gt; GROOT-globalThis-COMPUTED-TEMPLATE applies the whole-global root policy through graph and full boundary                                                         |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 142 | boundary-b0adec21fdb6749a380f7e4f | Nuvemshop server-only boundary &gt; GROOT-globalThis-COMPUTED-EXPRESSION applies the whole-global root policy through graph and full boundary                                                       |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 143 | boundary-a19eaa89b82190550e9e829e | Nuvemshop server-only boundary &gt; GROOT-globalThis-BENIGN-DOT-1 applies the whole-global root policy through graph and full boundary                                                              |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 144 | boundary-77d3c41f1f5e6ea9d9c019c2 | Nuvemshop server-only boundary &gt; GROOT-globalThis-BENIGN-BRACKET-1 applies the whole-global root policy through graph and full boundary                                                          |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 145 | boundary-07d76804acdc4938535ea96e | Nuvemshop server-only boundary &gt; GROOT-globalThis-BENIGN-DOT-2 applies the whole-global root policy through graph and full boundary                                                              |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 146 | boundary-a64e4059320f31a728f7c34f | Nuvemshop server-only boundary &gt; GROOT-globalThis-BENIGN-BRACKET-2 applies the whole-global root policy through graph and full boundary                                                          |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 147 | boundary-60e9dd453ba5f7c86a8d491e | Nuvemshop server-only boundary &gt; GROOT-globalThis-BENIGN-DOT-3 applies the whole-global root policy through graph and full boundary                                                              |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 148 | boundary-bfe64c965b6216c9e8fcc231 | Nuvemshop server-only boundary &gt; GROOT-globalThis-BENIGN-BRACKET-3 applies the whole-global root policy through graph and full boundary                                                          |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 149 | boundary-8ec6aba57399b453b5f58e9b | Nuvemshop server-only boundary &gt; GROOT-globalThis-LOCAL applies the whole-global root policy through graph and full boundary                                                                     |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 150 | boundary-00b39b44acda40eea0d090e3 | Nuvemshop server-only boundary &gt; GROOT-globalThis-PARAM applies the whole-global root policy through graph and full boundary                                                                     |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 151 | boundary-72f7bcf40b1699b2c69cde3c | Nuvemshop server-only boundary &gt; GROOT-globalThis-NESTED applies the whole-global root policy through graph and full boundary                                                                    |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 152 | boundary-ef6ce374b09662bacda26e6d | Nuvemshop server-only boundary &gt; GROOT-globalThis-LOCAL-COMPUTED applies the whole-global root policy through graph and full boundary                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 153 | boundary-0b02092376b6af8d8189ce9c | Nuvemshop server-only boundary &gt; GROOT-globalThis-TOKENS applies the whole-global root policy through graph and full boundary                                                                    |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 154 | boundary-f2e77f9165b0e94e1be653fa | Nuvemshop server-only boundary &gt; GROOT-globalThis-BENIGN-WRAPPED applies the whole-global root policy through graph and full boundary                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 155 | boundary-76eef69d64f22fb7c76a026a | Nuvemshop server-only boundary &gt; GROOT-global-01 applies the whole-global root policy through graph and full boundary                                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 156 | boundary-8c2966ba5ca8774e440600cb | Nuvemshop server-only boundary &gt; GROOT-global-02 applies the whole-global root policy through graph and full boundary                                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 157 | boundary-5ae5be649d695ac756733871 | Nuvemshop server-only boundary &gt; GROOT-global-03 applies the whole-global root policy through graph and full boundary                                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 158 | boundary-8371943d4b419e816bc29159 | Nuvemshop server-only boundary &gt; GROOT-global-04 applies the whole-global root policy through graph and full boundary                                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 159 | boundary-e986d314bfbeed219cf056b7 | Nuvemshop server-only boundary &gt; GROOT-global-05 applies the whole-global root policy through graph and full boundary                                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 160 | boundary-bbd735f3bc21f1067d7d2ad5 | Nuvemshop server-only boundary &gt; GROOT-global-06 applies the whole-global root policy through graph and full boundary                                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 161 | boundary-1f180779adbeab85604c0358 | Nuvemshop server-only boundary &gt; GROOT-global-07 applies the whole-global root policy through graph and full boundary                                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 162 | boundary-05a7378f09985433c7eb8747 | Nuvemshop server-only boundary &gt; GROOT-global-08 applies the whole-global root policy through graph and full boundary                                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 163 | boundary-9fcfb74418ce379abd7bd229 | Nuvemshop server-only boundary &gt; GROOT-global-09 applies the whole-global root policy through graph and full boundary                                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 164 | boundary-6dc76364370d6170489e87c8 | Nuvemshop server-only boundary &gt; GROOT-global-10 applies the whole-global root policy through graph and full boundary                                                                            |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 165 | boundary-7143452b5b6d4823b16d2531 | Nuvemshop server-only boundary &gt; GROOT-global-EXACT-ALIAS applies the whole-global root policy through graph and full boundary                                                                   |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 166 | boundary-ad6922c4b942cd199e4e3da7 | Nuvemshop server-only boundary &gt; GROOT-global-WRAPPER-1 applies the whole-global root policy through graph and full boundary                                                                     |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 167 | boundary-256b1912a6269b0395f98a4f | Nuvemshop server-only boundary &gt; GROOT-global-WRAPPER-2 applies the whole-global root policy through graph and full boundary                                                                     |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 168 | boundary-4f31aa88035b73288eeb7d7a | Nuvemshop server-only boundary &gt; GROOT-global-WRAPPER-3 applies the whole-global root policy through graph and full boundary                                                                     |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 169 | boundary-805f502ab735b7e610fc292b | Nuvemshop server-only boundary &gt; GROOT-global-WRAPPER-4 applies the whole-global root policy through graph and full boundary                                                                     |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 170 | boundary-f7768f9a0d7d86dcf49c1b3c | Nuvemshop server-only boundary &gt; GROOT-global-WRAPPER-5 applies the whole-global root policy through graph and full boundary                                                                     |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 171 | boundary-40fe03195a81f2b0e7fc85c5 | Nuvemshop server-only boundary &gt; GROOT-global-COMPUTED-KEY applies the whole-global root policy through graph and full boundary                                                                  |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 172 | boundary-bd988c24b1276698a401c8a2 | Nuvemshop server-only boundary &gt; GROOT-global-COMPUTED-TEMPLATE applies the whole-global root policy through graph and full boundary                                                             |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 173 | boundary-0849d90627151b5443e74663 | Nuvemshop server-only boundary &gt; GROOT-global-COMPUTED-EXPRESSION applies the whole-global root policy through graph and full boundary                                                           |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 174 | boundary-15844ffeda8f90a073822d41 | Nuvemshop server-only boundary &gt; GROOT-global-BENIGN-DOT-1 applies the whole-global root policy through graph and full boundary                                                                  |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 175 | boundary-3afe6fb6c734de5be5a7e5ee | Nuvemshop server-only boundary &gt; GROOT-global-BENIGN-BRACKET-1 applies the whole-global root policy through graph and full boundary                                                              |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 176 | boundary-f91f5b0a9ceec0c67085c1ea | Nuvemshop server-only boundary &gt; GROOT-global-BENIGN-DOT-2 applies the whole-global root policy through graph and full boundary                                                                  |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 177 | boundary-1c01d3fb3daac4e467c84f51 | Nuvemshop server-only boundary &gt; GROOT-global-BENIGN-BRACKET-2 applies the whole-global root policy through graph and full boundary                                                              |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 178 | boundary-810997689181610413141669 | Nuvemshop server-only boundary &gt; GROOT-global-BENIGN-DOT-3 applies the whole-global root policy through graph and full boundary                                                                  |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 179 | boundary-755e324bda7506a2bced3a43 | Nuvemshop server-only boundary &gt; GROOT-global-BENIGN-BRACKET-3 applies the whole-global root policy through graph and full boundary                                                              |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 180 | boundary-1ff392b722e6baf1d173cd10 | Nuvemshop server-only boundary &gt; GROOT-global-LOCAL applies the whole-global root policy through graph and full boundary                                                                         |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 181 | boundary-a4f9c32b278844f9508f73d6 | Nuvemshop server-only boundary &gt; GROOT-global-PARAM applies the whole-global root policy through graph and full boundary                                                                         |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 182 | boundary-04a56b0ab61107250afc1444 | Nuvemshop server-only boundary &gt; GROOT-global-NESTED applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 183 | boundary-825df908698b0ce4f5beca73 | Nuvemshop server-only boundary &gt; GROOT-global-LOCAL-COMPUTED applies the whole-global root policy through graph and full boundary                                                                |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 184 | boundary-1465cd6986c065f2bc337149 | Nuvemshop server-only boundary &gt; GROOT-global-TOKENS applies the whole-global root policy through graph and full boundary                                                                        |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 185 | boundary-11375e273dabf236de021f43 | Nuvemshop server-only boundary &gt; GROOT-global-BENIGN-WRAPPED applies the whole-global root policy through graph and full boundary                                                                |          2679 | Ambient process/global capabilities              | R071     | TSCI    |
| 186 | boundary-84e85e330bd4d36788df3c02 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-1 applies the finite global capability policy through graph and full boundary                                                          |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 187 | boundary-a5f12c9b8555a3d74d93b3db | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-2 applies the finite global capability policy through graph and full boundary                                                          |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 188 | boundary-c4c31bd18ad90f1f7fc1904c | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-3 applies the finite global capability policy through graph and full boundary                                                          |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 189 | boundary-20a23d41ebbea529dcd66310 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-4 applies the finite global capability policy through graph and full boundary                                                          |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 190 | boundary-5aaaccc58fb35c66cfcd877e | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-5 applies the finite global capability policy through graph and full boundary                                                          |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 191 | boundary-f89f3aa6c97d6ee916332a5b | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-6 applies the finite global capability policy through graph and full boundary                                                          |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 192 | boundary-b62df6d4a2732295e5fcef3c | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-7 applies the finite global capability policy through graph and full boundary                                                          |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 193 | boundary-68591f7a699ac942aa58c424 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-8 applies the finite global capability policy through graph and full boundary                                                          |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 194 | boundary-fe73c2138afd33081a69fd60 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-9 applies the finite global capability policy through graph and full boundary                                                          |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 195 | boundary-95349d7b7a1f90aa7ad2b5eb | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-10 applies the finite global capability policy through graph and full boundary                                                         |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 196 | boundary-43c900394458a6c37deab89e | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-11 applies the finite global capability policy through graph and full boundary                                                         |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 197 | boundary-b982ba53484027a2c44722fe | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-12 applies the finite global capability policy through graph and full boundary                                                         |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 198 | boundary-63217290497e0f80eaef4393 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-13 applies the finite global capability policy through graph and full boundary                                                         |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 199 | boundary-4c2d91b773799ac23a9d31ac | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-14 applies the finite global capability policy through graph and full boundary                                                         |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 200 | boundary-91c8d1ec808ababb469a3e5f | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-15 applies the finite global capability policy through graph and full boundary                                                         |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 201 | boundary-13213f4e1344cda0b5620f0b | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-16 applies the finite global capability policy through graph and full boundary                                                         |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 202 | boundary-a2e9e3b7a0cd6a727ca7007f | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-17 applies the finite global capability policy through graph and full boundary                                                         |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 203 | boundary-fbe0961ea5432d585d6b6885 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-18 applies the finite global capability policy through graph and full boundary                                                         |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 204 | boundary-233e86141154de5f0176fe14 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-STATIC-19 applies the finite global capability policy through graph and full boundary                                                         |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 205 | boundary-3ad580b39cb451912cb32cda | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-DYNAMIC applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 206 | boundary-cb73b6e814e36a6a05884285 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-MISSING applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 207 | boundary-7151bae8cba0032da5148a7c | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-1-1 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 208 | boundary-3431ffb728678212ab41f766 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-1-2 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 209 | boundary-d3ea71aa3a89e3adf7ac8a75 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-1-3 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 210 | boundary-f63e751f799d6fbe273a3083 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-1-4 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 211 | boundary-8fc8875b82e81ec26dd27447 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-1-5 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 212 | boundary-b064d97cdbc037bd1fd5a4c5 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-1-6 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 213 | boundary-4294980fd56ef0e426c8f0e4 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-2-1 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 214 | boundary-525ab546c113fcadc3cad04f | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-2-2 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 215 | boundary-b5f419a35312d52abd80a5b6 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-2-3 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 216 | boundary-63afbf935d204c27c5a4f791 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-2-4 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 217 | boundary-95c4d2133b7e6fc956485d85 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-2-5 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 218 | boundary-52f706b08ead11ea12194607 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-2-6 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 219 | boundary-c04e0773b869f1725a9ce577 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-3-1 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 220 | boundary-1997a5adb854517e034964c8 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-3-2 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 221 | boundary-4998e1d8030ae1938df4700a | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-3-3 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 222 | boundary-1f58b4db1df9f34cd32af515 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-3-4 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 223 | boundary-7b22bd211914fba0a70a60a2 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-3-5 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 224 | boundary-eb35465d42e7b2420dc7fa60 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-ESC-3-6 applies the finite global capability policy through graph and full boundary                                                           |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 225 | boundary-0b7cf67e6045c7da74102a1c | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-call applies the finite global capability policy through graph and full boundary                                                              |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 226 | boundary-a3533f0375c9154809aff0fc | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-apply applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 227 | boundary-48a15371dd92438d7c426939 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-bind applies the finite global capability policy through graph and full boundary                                                              |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 228 | boundary-c2cc036409b559a1cd51f9c4 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-REQUIRE-CALL applies the finite global capability policy through graph and full boundary                                                      |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 229 | boundary-9ad78e9f1266cb2697b8e139 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-SHADOW applies the finite global capability policy through graph and full boundary                                                            |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 230 | boundary-9534b7d267dfab35343e8210 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-PARAM applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 231 | boundary-7ffa255664436a9e311e2bf8 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-NESTED applies the finite global capability policy through graph and full boundary                                                            |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 232 | boundary-7b3812497551ebfe51b12c53 | Nuvemshop server-only boundary &gt; GLOBAL-globalThis-TOKENS applies the finite global capability policy through graph and full boundary                                                            |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 233 | boundary-fe45196f8c306f7585cb93f2 | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-1 applies the finite global capability policy through graph and full boundary                                                              |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 234 | boundary-3fbe9af65260f944211ec2c3 | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-2 applies the finite global capability policy through graph and full boundary                                                              |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 235 | boundary-02afca84502f684973784968 | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-3 applies the finite global capability policy through graph and full boundary                                                              |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 236 | boundary-6e684c0868505d654b6002b5 | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-4 applies the finite global capability policy through graph and full boundary                                                              |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 237 | boundary-afa71271d014c7b000c969fd | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-5 applies the finite global capability policy through graph and full boundary                                                              |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 238 | boundary-223802acc4979158402c44f0 | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-6 applies the finite global capability policy through graph and full boundary                                                              |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 239 | boundary-ec4dbe791b4a15fbd04594f1 | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-7 applies the finite global capability policy through graph and full boundary                                                              |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 240 | boundary-3a111248a3f95165b2649868 | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-8 applies the finite global capability policy through graph and full boundary                                                              |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 241 | boundary-7af0ef2772233089d0be91fb | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-9 applies the finite global capability policy through graph and full boundary                                                              |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 242 | boundary-00daa8a493957f75c3c4e2cb | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-10 applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 243 | boundary-53f2c15d7c92f93131a4f794 | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-11 applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 244 | boundary-2aa2269d149cea10f338abab | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-12 applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 245 | boundary-277517fc79e063b8ab4ff72c | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-13 applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 246 | boundary-6f70140d0026dae3b314cc2c | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-14 applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 247 | boundary-f099c119017a7744b42f247c | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-15 applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 248 | boundary-8fc10d0d9d2fd08a115e3444 | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-16 applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 249 | boundary-f844125d965aca30b8871f36 | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-17 applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 250 | boundary-a6bb8592d08de3760863a939 | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-18 applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 251 | boundary-f6e39c6be8df3ec9fa0d5c8c | Nuvemshop server-only boundary &gt; GLOBAL-global-STATIC-19 applies the finite global capability policy through graph and full boundary                                                             |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 252 | boundary-01ba4bb565275b2fd07d42e0 | Nuvemshop server-only boundary &gt; GLOBAL-global-DYNAMIC applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 253 | boundary-a913310ac8e1cd4261ebff61 | Nuvemshop server-only boundary &gt; GLOBAL-global-MISSING applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 254 | boundary-d6978e32e2a9fef931a7d646 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-1-1 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 255 | boundary-9ec164361b4a9bc5ff268c3f | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-1-2 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 256 | boundary-45fd61c8e8064d6427329c18 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-1-3 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 257 | boundary-5037203bab466c8ac1f8c1a3 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-1-4 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 258 | boundary-c0cce4b6bd469a15e921bef3 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-1-5 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 259 | boundary-9f75f8adc5e056cb9b78c968 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-1-6 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 260 | boundary-60b40869f68acc9b3d3c6dbc | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-2-1 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 261 | boundary-34bb3aec75ed07fb5c859a1a | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-2-2 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 262 | boundary-96b25acfc718dc461df84746 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-2-3 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 263 | boundary-5a572aa5d6670cd110cf51b4 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-2-4 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 264 | boundary-37994e500e4880fa972281b0 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-2-5 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 265 | boundary-54d8c5a7709d5ba0511010d5 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-2-6 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 266 | boundary-b165a032ef2041deaf7ab461 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-3-1 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 267 | boundary-6bca93f32e98d41d7903bfc0 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-3-2 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 268 | boundary-36381a0377c207af8320dcb9 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-3-3 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 269 | boundary-3615bc3698c063c30ae2e4a9 | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-3-4 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 270 | boundary-7979e6474a8951cfdeb0843c | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-3-5 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 271 | boundary-8763c8177e1f391db9efeefd | Nuvemshop server-only boundary &gt; GLOBAL-global-ESC-3-6 applies the finite global capability policy through graph and full boundary                                                               |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 272 | boundary-54e8e299e6fd3594203ff761 | Nuvemshop server-only boundary &gt; GLOBAL-global-call applies the finite global capability policy through graph and full boundary                                                                  |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 273 | boundary-0d84e35fbf0b491e74002fb1 | Nuvemshop server-only boundary &gt; GLOBAL-global-apply applies the finite global capability policy through graph and full boundary                                                                 |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 274 | boundary-f1552d477279b61044a879ef | Nuvemshop server-only boundary &gt; GLOBAL-global-bind applies the finite global capability policy through graph and full boundary                                                                  |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 275 | boundary-cc980b5e589500fd28d236cf | Nuvemshop server-only boundary &gt; GLOBAL-global-REQUIRE-CALL applies the finite global capability policy through graph and full boundary                                                          |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 276 | boundary-14eda27a53085019372180d2 | Nuvemshop server-only boundary &gt; GLOBAL-global-SHADOW applies the finite global capability policy through graph and full boundary                                                                |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 277 | boundary-27c4bc3162e4f09863506985 | Nuvemshop server-only boundary &gt; GLOBAL-global-PARAM applies the finite global capability policy through graph and full boundary                                                                 |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 278 | boundary-9bca78e1faf090cdd51bbd76 | Nuvemshop server-only boundary &gt; GLOBAL-global-NESTED applies the finite global capability policy through graph and full boundary                                                                |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 279 | boundary-2d44e4ea614c2a1a607d2449 | Nuvemshop server-only boundary &gt; GLOBAL-global-TOKENS applies the finite global capability policy through graph and full boundary                                                                |          2831 | Ambient process/global capabilities              | R072     | TSRCI   |
| 280 | boundary-3c20b7db027ec576f3057d76 | Nuvemshop server-only boundary &gt; MODREQ-01 rejects diagnostics-clean static module.require through the full boundary                                                                             |          3235 | CommonJS runtime capabilities and local bindings | R073     | TSRCI   |
| 281 | boundary-9eb2f94948b7f672b8570d88 | Nuvemshop server-only boundary &gt; MODREQ-02 rejects diagnostics-clean static module.require through the full boundary                                                                             |          3235 | CommonJS runtime capabilities and local bindings | R073     | TSRCI   |
| 282 | boundary-4c56af5a1849892906b3eaff | Nuvemshop server-only boundary &gt; MODREQ-03 rejects diagnostics-clean static module.require through the full boundary                                                                             |          3235 | CommonJS runtime capabilities and local bindings | R073     | TSRCI   |
| 283 | boundary-af7d366da787d4967d54eaec | Nuvemshop server-only boundary &gt; MODREQ-04 rejects diagnostics-clean static module.require through the full boundary                                                                             |          3235 | CommonJS runtime capabilities and local bindings | R073     | TSRCI   |
| 284 | boundary-09b9de97965d0ab012ff48d8 | Nuvemshop server-only boundary &gt; MODREQ-05 rejects diagnostics-clean static module.require through the full boundary                                                                             |          3235 | CommonJS runtime capabilities and local bindings | R073     | TSRCI   |
| 285 | boundary-b149680d6c42306f3f1e37d0 | Nuvemshop server-only boundary &gt; MODREQ-TYPEASSERT rejects diagnostics-clean static module.require through the full boundary                                                                     |          3235 | CommonJS runtime capabilities and local bindings | R073     | TSRCI   |
| 286 | boundary-969874b4fb63e1b3b03a1c3c | Nuvemshop server-only boundary &gt; MODREQ-SATISFIES rejects diagnostics-clean static module.require through the full boundary                                                                      |          3235 | CommonJS runtime capabilities and local bindings | R073     | TSRCI   |
| 287 | boundary-2e450aaa535133fb187da970 | Nuvemshop server-only boundary &gt; MODREQ-06 rejects diagnostics-clean unproven module capability use at acquisition                                                                               |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 288 | boundary-af51dc260791448a3d93ddc2 | Nuvemshop server-only boundary &gt; MODREQ-07 rejects diagnostics-clean unproven module capability use at acquisition                                                                               |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 289 | boundary-f8a9c24357e9a99ced5d3a7a | Nuvemshop server-only boundary &gt; MODCAP-01 rejects diagnostics-clean unproven module capability use at acquisition                                                                               |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 290 | boundary-c2a553e0c4dc59d9bae0c8aa | Nuvemshop server-only boundary &gt; MODCAP-02 rejects diagnostics-clean unproven module capability use at acquisition                                                                               |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 291 | boundary-38858cad7ff12ce2d46c6dcc | Nuvemshop server-only boundary &gt; MODCAP-03 rejects diagnostics-clean unproven module capability use at acquisition                                                                               |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 292 | boundary-c3ea388a0f6ee8b52feb6b68 | Nuvemshop server-only boundary &gt; MODCAP-04 rejects diagnostics-clean unproven module capability use at acquisition                                                                               |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 293 | boundary-e3ae90c8d53b37ba3fb5a0ed | Nuvemshop server-only boundary &gt; MODCAP-05 rejects diagnostics-clean unproven module capability use at acquisition                                                                               |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 294 | boundary-d0d5294571170a8dcb7172a4 | Nuvemshop server-only boundary &gt; MODCAP-06 rejects diagnostics-clean unproven module capability use at acquisition                                                                               |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 295 | boundary-43b693c9db9c6f259b548998 | Nuvemshop server-only boundary &gt; MODCAP-07 rejects diagnostics-clean unproven module capability use at acquisition                                                                               |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 296 | boundary-008c650cc092daf8f84cd48e | Nuvemshop server-only boundary &gt; MODCAP-08 rejects diagnostics-clean unproven module capability use at acquisition                                                                               |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 297 | boundary-4db810c00587eb5dc5b26217 | Nuvemshop server-only boundary &gt; MODULE-ESC-01 rejects diagnostics-clean unproven module capability use at acquisition                                                                           |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 298 | boundary-80ad806e3cccdb9f720100dd | Nuvemshop server-only boundary &gt; MODULE-ESC-02 rejects diagnostics-clean unproven module capability use at acquisition                                                                           |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 299 | boundary-9331f38a93d4c35d005c3ebf | Nuvemshop server-only boundary &gt; MODULE-ESC-03 rejects diagnostics-clean unproven module capability use at acquisition                                                                           |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 300 | boundary-79b46210011d4a9fe7042412 | Nuvemshop server-only boundary &gt; MODULE-ESC-04 rejects diagnostics-clean unproven module capability use at acquisition                                                                           |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 301 | boundary-5d1bba3c758525844b08c85a | Nuvemshop server-only boundary &gt; MODULE-ESC-05 rejects diagnostics-clean unproven module capability use at acquisition                                                                           |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 302 | boundary-8cba0841d98c669e34348b6e | Nuvemshop server-only boundary &gt; MODULE-ESC-LET rejects diagnostics-clean unproven module capability use at acquisition                                                                          |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 303 | boundary-8f1b001a5e565d4666f4a9d3 | Nuvemshop server-only boundary &gt; MODULE-ESC-SHORTHAND rejects diagnostics-clean unproven module capability use at acquisition                                                                    |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 304 | boundary-55099f58c3787c1c62c27ba1 | Nuvemshop server-only boundary &gt; MODULE-ELEMENT rejects diagnostics-clean unproven module capability use at acquisition                                                                          |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 305 | boundary-809872e65d9b673f2d67d0dc | Nuvemshop server-only boundary &gt; MODULE-COMPUTED rejects diagnostics-clean unproven module capability use at acquisition                                                                         |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 306 | boundary-c50e219c43ccb3653082c700 | Nuvemshop server-only boundary &gt; MODULE-PROPERTY rejects diagnostics-clean unproven module capability use at acquisition                                                                         |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 307 | boundary-cc82aab51890d8be42349023 | Nuvemshop server-only boundary &gt; MODULE-BOOL rejects diagnostics-clean unproven module capability use at acquisition                                                                             |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 308 | boundary-fb8c6a24a57dbc868dff46cd | Nuvemshop server-only boundary &gt; MODULE-VOID rejects diagnostics-clean unproven module capability use at acquisition                                                                             |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 309 | boundary-92e58c5bce5e25f2472cae72 | Nuvemshop server-only boundary &gt; MODULE-COMPARE rejects diagnostics-clean unproven module capability use at acquisition                                                                          |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 310 | boundary-649c7850167b30307b373983 | Nuvemshop server-only boundary &gt; MODULE-UNPROVEN rejects diagnostics-clean unproven module capability use at acquisition                                                                         |          3302 | CommonJS runtime capabilities and local bindings | R074     | TSCI    |
| 311 | boundary-fc30036b7bc95c6f3ee0b448 | Nuvemshop server-only boundary &gt; MODULE-SHADOW-01 preserves diagnostics-clean local module shadows in graph and full boundary                                                                    |          3380 | CommonJS runtime capabilities and local bindings | R075     | TCI     |
| 312 | boundary-ce4c50d6ce6a288b2dd64621 | Nuvemshop server-only boundary &gt; MODULE-SHADOW-02 preserves diagnostics-clean local module shadows in graph and full boundary                                                                    |          3380 | CommonJS runtime capabilities and local bindings | R075     | TCI     |
| 313 | boundary-12c15ccd35859f09e20d3758 | Nuvemshop server-only boundary &gt; MODULE-SHADOW-03 preserves diagnostics-clean local module shadows in graph and full boundary                                                                    |          3380 | CommonJS runtime capabilities and local bindings | R075     | TCI     |
| 314 | boundary-a82d7ce1178b6caaec87f15d | Nuvemshop server-only boundary &gt; MODULE-SHADOW-04 preserves diagnostics-clean local module shadows in graph and full boundary                                                                    |          3380 | CommonJS runtime capabilities and local bindings | R075     | TCI     |
| 315 | boundary-76c6fb2a166057679dba4886 | Nuvemshop server-only boundary &gt; MODULE-SHADOW-IMPORT preserves diagnostics-clean local module shadows in graph and full boundary                                                                |          3380 | CommonJS runtime capabilities and local bindings | R075     | TCI     |
| 316 | boundary-dae8649daa17c872eab5791f | Nuvemshop server-only boundary &gt; preserves existing module.exports client consumption: module.exports = { safe: true };                                                                          |          3438 | CommonJS runtime capabilities and local bindings | R076     | TCI     |
| 317 | boundary-cc40ece9c51f376cff475370 | Nuvemshop server-only boundary &gt; preserves existing module.exports client consumption: module.exports.safe = true;                                                                               |          3438 | CommonJS runtime capabilities and local bindings | R076     | TCI     |
| 318 | boundary-793c4c4858947e2e8b56cd1a | Nuvemshop server-only boundary &gt; preserves existing module.exports client consumption: module['exports'] = { safe: true };                                                                       |          3438 | CommonJS runtime capabilities and local bindings | R076     | TCI     |
| 319 | boundary-00d0981780e5ab6910372275 | Nuvemshop server-only boundary &gt; preserves existing module.exports client consumption: module[('exports')][('safe')] = true;                                                                     |          3438 | CommonJS runtime capabilities and local bindings | R076     | TCI     |
| 320 | boundary-6435d6fd679f89b21b82f737 | Nuvemshop server-only boundary &gt; preserves existing module.exports client consumption: (module).exports.safe = true;                                                                             |          3438 | CommonJS runtime capabilities and local bindings | R076     | TCI     |
| 321 | boundary-f0725531fbf2b45d15da2c34 | Nuvemshop server-only boundary &gt; preserves existing module.exports client consumption: module[(((`exports`)))][((`safe`))] = true;                                                               |          3438 | CommonJS runtime capabilities and local bindings | R076     | TCI     |
| 322 | boundary-5e994ac916e48c65f6c2f9e0 | Nuvemshop server-only boundary &gt; preserves existing module.exports client consumption: Object.assign(module.exports, { safe: true });                                                            |          3438 | CommonJS runtime capabilities and local bindings | R076     | TCI     |
| 323 | boundary-f6ecf2ea15db8903a799b3ae | Nuvemshop server-only boundary &gt; preserves existing module.exports client consumption: Object.defineProperty(module.exports, 'safe', { value: true });                                           |          3438 | CommonJS runtime capabilities and local bindings | R076     | TCI     |
| 324 | boundary-86df95e66f0013b811e4b2ba | Nuvemshop server-only boundary &gt; preserves existing module.exports client consumption: Object.defineProperties(module.exports, { safe: { value: true } });                                       |          3438 | CommonJS runtime capabilities and local bindings | R076     | TCI     |
| 325 | boundary-e35dba9ec1e006f941ce5b78 | Nuvemshop server-only boundary &gt; preserves existing module.exports client consumption: Reflect.defineProperty(module.exports, 'safe', { value: true });                                          |          3438 | CommonJS runtime capabilities and local bindings | R076     | TCI     |
| 326 | boundary-b566514f7791eec59e596032 | Nuvemshop server-only boundary &gt; excludes property-name and type-only module tokens from runtime references                                                                                      |          3474 | CommonJS runtime capabilities and local bindings | R077     | TCI     |
| 327 | boundary-be1280f137a3a2c027751f4d | Nuvemshop server-only boundary &gt; traverses static module.require of unrelated project wrappers                                                                                                   |          3496 | CommonJS runtime capabilities and local bindings | R078     | TCI     |
| 328 | boundary-80b49310f4f4a599740beaca | Nuvemshop server-only boundary &gt; BIND-INT-01 preserves local require binding classification in the full boundary                                                                                 |          3521 | CommonJS runtime capabilities and local bindings | R079     | TSCI    |
| 329 | boundary-30f021e531ad13ce4ab8961e | Nuvemshop server-only boundary &gt; BIND-INT-02 preserves local require binding classification in the full boundary                                                                                 |          3521 | CommonJS runtime capabilities and local bindings | R079     | TSCI    |
| 330 | boundary-1c9c3dea3ffb4d6e42e31507 | Nuvemshop server-only boundary &gt; BIND-INT-03 preserves local require binding classification in the full boundary                                                                                 |          3521 | CommonJS runtime capabilities and local bindings | R079     | TSCI    |
| 331 | boundary-e668520fe48fb3d958b42e1b | Nuvemshop server-only boundary &gt; BIND-INT-04 preserves local require binding classification in the full boundary                                                                                 |          3521 | CommonJS runtime capabilities and local bindings | R079     | TSCI    |
| 332 | boundary-4bd3c02139eb85a413281ae9 | Nuvemshop server-only boundary &gt; BIND-INT-05 preserves local require binding classification in the full boundary                                                                                 |          3521 | CommonJS runtime capabilities and local bindings | R079     | TSCI    |
| 333 | boundary-2b4bdf529160c531ef686fa3 | Nuvemshop server-only boundary &gt; RCAP-01 rejects diagnostics-clean acquisition of the require capability                                                                                         |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 334 | boundary-4b183b6c673df924958c7aa4 | Nuvemshop server-only boundary &gt; RCAP-02 rejects diagnostics-clean acquisition of the require capability                                                                                         |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 335 | boundary-9e18184393cf8d04ab1a3547 | Nuvemshop server-only boundary &gt; RCAP-03 rejects diagnostics-clean acquisition of the require capability                                                                                         |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 336 | boundary-b11311af2f2f9807de413a61 | Nuvemshop server-only boundary &gt; RCAP-04 rejects diagnostics-clean acquisition of the require capability                                                                                         |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 337 | boundary-4df17cbd484c12733464838b | Nuvemshop server-only boundary &gt; RCAP-05 rejects diagnostics-clean acquisition of the require capability                                                                                         |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 338 | boundary-445f0771e8ebaa63528cef9c | Nuvemshop server-only boundary &gt; RCAP-06 rejects diagnostics-clean acquisition of the require capability                                                                                         |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 339 | boundary-16f0dba2b5293fe96ac82b4e | Nuvemshop server-only boundary &gt; RCAP-07 rejects diagnostics-clean acquisition of the require capability                                                                                         |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 340 | boundary-942fc617e58ad1e52a9c38af | Nuvemshop server-only boundary &gt; RCAP-08 rejects diagnostics-clean acquisition of the require capability                                                                                         |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 341 | boundary-ec8c36eed64ce47c8e25f385 | Nuvemshop server-only boundary &gt; RCAP-09 rejects diagnostics-clean acquisition of the require capability                                                                                         |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 342 | boundary-285c3cd25d8fcb4a508dcd9d | Nuvemshop server-only boundary &gt; RCAP-10 rejects diagnostics-clean acquisition of the require capability                                                                                         |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 343 | boundary-f199481ce8d506cc47c778b2 | Nuvemshop server-only boundary &gt; RCAP-BOOL rejects diagnostics-clean acquisition of the require capability                                                                                       |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 344 | boundary-409cd9d301255754e44fb883 | Nuvemshop server-only boundary &gt; RCAP-COMPARE rejects diagnostics-clean acquisition of the require capability                                                                                    |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 345 | boundary-4c31a30c748257b55f3d1b22 | Nuvemshop server-only boundary &gt; RCAP-VOID rejects diagnostics-clean acquisition of the require capability                                                                                       |          3567 | CommonJS runtime capabilities and local bindings | R080     | TSCI    |
| 346 | boundary-4f582ae3a230c2fb1fa6ff00 | Nuvemshop server-only boundary &gt; SHADOW-01 allows diagnostics-clean proven local runtime bindings                                                                                                |          3605 | CommonJS runtime capabilities and local bindings | R081     | TCI     |
| 347 | boundary-e75b474b47b0c5f64819f3fb | Nuvemshop server-only boundary &gt; SHADOW-02 allows diagnostics-clean proven local runtime bindings                                                                                                |          3605 | CommonJS runtime capabilities and local bindings | R081     | TCI     |
| 348 | boundary-668c8525e09f53f46a66e361 | Nuvemshop server-only boundary &gt; SHADOW-03 allows diagnostics-clean proven local runtime bindings                                                                                                |          3605 | CommonJS runtime capabilities and local bindings | R081     | TCI     |
| 349 | boundary-516e570f3e700b90762a8241 | Nuvemshop server-only boundary &gt; SHADOW-04 allows diagnostics-clean proven local runtime bindings                                                                                                |          3605 | CommonJS runtime capabilities and local bindings | R081     | TCI     |
| 350 | boundary-134132b366bffb1f2fb2b11a | Nuvemshop server-only boundary &gt; SHADOW-FUNCTION allows diagnostics-clean proven local runtime bindings                                                                                          |          3605 | CommonJS runtime capabilities and local bindings | R081     | TCI     |
| 351 | boundary-f567ef439c59d6667e55418d | Nuvemshop server-only boundary &gt; SHADOW-OVERLOAD allows diagnostics-clean proven local runtime bindings                                                                                          |          3605 | CommonJS runtime capabilities and local bindings | R081     | TCI     |
| 352 | boundary-fe485bba16565010b32d0a25 | Nuvemshop server-only boundary &gt; SHADOW-IMPORT allows diagnostics-clean proven local runtime bindings                                                                                            |          3605 | CommonJS runtime capabilities and local bindings | R081     | TCI     |
| 353 | boundary-3bf9d9fa930e3821cf9ce7b7 | Nuvemshop server-only boundary &gt; SHADOW-BLOCK allows diagnostics-clean proven local runtime bindings                                                                                             |          3605 | CommonJS runtime capabilities and local bindings | R081     | TCI     |
| 354 | boundary-a29dcf29c013779598bcba8c | Nuvemshop server-only boundary &gt; excludes property-name and type-only require tokens from runtime capability references                                                                          |          3659 | CommonJS runtime capabilities and local bindings | R082     | TCI     |
| 355 | boundary-f783dd3bfd40fc52d4366304 | Nuvemshop server-only boundary &gt; RCALL-01 rejects diagnostics-clean direct require.call of adapter code                                                                                          |          3683 | CommonJS runtime capabilities and local bindings | R083     | TSRCI   |
| 356 | boundary-3ada511c3d2a227e615d086d | Nuvemshop server-only boundary &gt; RCALL-02 rejects diagnostics-clean direct require.call of adapter code                                                                                          |          3683 | CommonJS runtime capabilities and local bindings | R083     | TSRCI   |
| 357 | boundary-47591aa59f619841172ee935 | Nuvemshop server-only boundary &gt; RCALL-03 rejects diagnostics-clean direct require.call of adapter code                                                                                          |          3683 | CommonJS runtime capabilities and local bindings | R083     | TSRCI   |
| 358 | boundary-936f3688294f38ad8dd5cb78 | Nuvemshop server-only boundary &gt; RCALL-04 rejects diagnostics-clean direct require.call of adapter code                                                                                          |          3683 | CommonJS runtime capabilities and local bindings | R083     | TSRCI   |
| 359 | boundary-19e9dc41ceffb20981d5c236 | Nuvemshop server-only boundary &gt; RCALL-05 rejects diagnostics-clean direct require.call of adapter code                                                                                          |          3683 | CommonJS runtime capabilities and local bindings | R083     | TSRCI   |
| 360 | boundary-07bb5c79b25f22eb1fc17809 | Nuvemshop server-only boundary &gt; RCALL-06 rejects diagnostics-clean unproven direct require invocation                                                                                           |          3733 | CommonJS runtime capabilities and local bindings | R084     | TSCI    |
| 361 | boundary-322fa84294fb8ca98fec2c28 | Nuvemshop server-only boundary &gt; RPROP-01 rejects diagnostics-clean unproven direct require invocation                                                                                           |          3733 | CommonJS runtime capabilities and local bindings | R084     | TSCI    |
| 362 | boundary-82d4dba2af31f65060cb7d21 | Nuvemshop server-only boundary &gt; RPROP-02 rejects diagnostics-clean unproven direct require invocation                                                                                           |          3733 | CommonJS runtime capabilities and local bindings | R084     | TSCI    |
| 363 | boundary-d9cf82d91ddbef91b5281302 | Nuvemshop server-only boundary &gt; RPROP-03 rejects diagnostics-clean unproven direct require invocation                                                                                           |          3733 | CommonJS runtime capabilities and local bindings | R084     | TSCI    |
| 364 | boundary-35b740a41686c337d0470c7a | Nuvemshop server-only boundary &gt; RPROP-04 rejects diagnostics-clean unproven direct require invocation                                                                                           |          3733 | CommonJS runtime capabilities and local bindings | R084     | TSCI    |
| 365 | boundary-85f73d4794c2ff82316340a7 | Nuvemshop server-only boundary &gt; RCALL-MISSING rejects diagnostics-clean unproven direct require invocation                                                                                      |          3733 | CommonJS runtime capabilities and local bindings | R084     | TSCI    |
| 366 | boundary-327c1dc5c73dfe49eb55485a | Nuvemshop server-only boundary &gt; allows static direct require.call of unrelated project code                                                                                                     |          3771 | CommonJS runtime capabilities and local bindings | R085     | TCI     |
| 367 | boundary-e5984d1900b7e00b38cc696d | Nuvemshop server-only boundary &gt; TR-01 rejects diagnostics-clean transparent direct require of adapter code                                                                                      |          3797 | CommonJS runtime capabilities and local bindings | R086     | TSRCI   |
| 368 | boundary-73da63d01c006cf971233f85 | Nuvemshop server-only boundary &gt; TR-02 rejects diagnostics-clean transparent direct require of adapter code                                                                                      |          3797 | CommonJS runtime capabilities and local bindings | R086     | TSRCI   |
| 369 | boundary-3ea341bbfb532147c1073acc | Nuvemshop server-only boundary &gt; TR-03 rejects diagnostics-clean transparent direct require of adapter code                                                                                      |          3797 | CommonJS runtime capabilities and local bindings | R086     | TSRCI   |
| 370 | boundary-c35dd046a82ab9f44ed4c7ca | Nuvemshop server-only boundary &gt; TR-04 rejects diagnostics-clean transparent direct require of adapter code                                                                                      |          3797 | CommonJS runtime capabilities and local bindings | R086     | TSRCI   |
| 371 | boundary-96f125a98d821de534c33e55 | Nuvemshop server-only boundary &gt; TR-05 rejects diagnostics-clean transparent direct require of adapter code                                                                                      |          3797 | CommonJS runtime capabilities and local bindings | R086     | TSRCI   |
| 372 | boundary-97acbfd43f4bdfc3ccdfb995 | Nuvemshop server-only boundary &gt; TR-06 rejects diagnostics-clean transparent direct require of adapter code                                                                                      |          3797 | CommonJS runtime capabilities and local bindings | R086     | TSRCI   |
| 373 | boundary-aa0d045da400ab09256803fe | Nuvemshop server-only boundary &gt; TR-07 rejects diagnostics-clean transparent direct require of adapter code                                                                                      |          3797 | CommonJS runtime capabilities and local bindings | R086     | TSRCI   |
| 374 | boundary-10bbb631ad2385378f69dfd7 | Nuvemshop server-only boundary &gt; allows transparent direct require wrappers for unrelated project code                                                                                           |          3846 | CommonJS runtime capabilities and local bindings | R087     | TCI     |
| 375 | boundary-a8ed59aac684ef595c5caf32 | Nuvemshop server-only boundary &gt; REQ-PAREN-01 rejects adapter ownership through transparent require parentheses                                                                                  |          3873 | CommonJS runtime capabilities and local bindings | R088     | TSRCI   |
| 376 | boundary-b3042666498b59ffebe63ad0 | Nuvemshop server-only boundary &gt; REQ-PAREN-02 rejects adapter ownership through transparent require parentheses                                                                                  |          3873 | CommonJS runtime capabilities and local bindings | R088     | TSRCI   |
| 377 | boundary-18c1468a0360b4f3c40ea490 | Nuvemshop server-only boundary &gt; REQ-PAREN-03 rejects adapter ownership through transparent require parentheses                                                                                  |          3873 | CommonJS runtime capabilities and local bindings | R088     | TSRCI   |
| 378 | boundary-59f90204c5b6c98c4c8dcc36 | Nuvemshop server-only boundary &gt; REQ-PAREN-04 rejects adapter ownership through transparent require parentheses                                                                                  |          3873 | CommonJS runtime capabilities and local bindings | R088     | TSRCI   |
| 379 | boundary-c8c4b01e36421b65a375db0e | Nuvemshop server-only boundary &gt; REQ-PAREN-05 rejects adapter ownership through transparent require parentheses                                                                                  |          3873 | CommonJS runtime capabilities and local bindings | R088     | TSRCI   |
| 380 | boundary-6776231fa6e663a81a64474f | Nuvemshop server-only boundary &gt; allows a parenthesized direct require of an unrelated project dependency                                                                                        |          3910 | CommonJS runtime capabilities and local bindings | R089     | TCI     |
| 381 | boundary-6ce28e1779d5a5ade8e09bb7 | Nuvemshop server-only boundary &gt; NL-01 alias blocks by source dependency                                                                                                                         |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 382 | boundary-de34c387fcadec350de18b14 | Nuvemshop server-only boundary &gt; NL-02 interface extends alias blocks by source dependency                                                                                                       |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 383 | boundary-5027ae6fc4deaf77e2154db6 | Nuvemshop server-only boundary &gt; NL-03 Pick blocks by source dependency                                                                                                                          |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 384 | boundary-9737b30cd9f3c73ebf29cef8 | Nuvemshop server-only boundary &gt; NL-04 ReturnType blocks by source dependency                                                                                                                    |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 385 | boundary-25575fa0c12d53496dcffccd | Nuvemshop server-only boundary &gt; NL-05 namespace blocks by source dependency                                                                                                                     |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 386 | boundary-158bbe7e4dfdc283a3e94f6f | Nuvemshop server-only boundary &gt; NL-06 barrel chain blocks by source dependency                                                                                                                  |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 387 | boundary-0bd98a70449ec45c20aca780 | Nuvemshop server-only boundary &gt; NL-07 configured alias wrapper blocks by source dependency                                                                                                      |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 388 | boundary-0c445371b99efda03a715009 | Nuvemshop server-only boundary &gt; NL-08 ImportType wrapper blocks by source dependency                                                                                                            |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 389 | boundary-4b050154b806aa81e2e63480 | Nuvemshop server-only boundary &gt; NL-09 relative export type wrapper blocks by source dependency                                                                                                  |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 390 | boundary-becf413a2601ca5244c35d14 | Nuvemshop server-only boundary &gt; NL-10 star reexport blocks by source dependency                                                                                                                 |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 391 | boundary-c25794d55bbb014f5d21324e | Nuvemshop server-only boundary &gt; NL-11 namespace reexport blocks by source dependency                                                                                                            |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 392 | boundary-fd7f395e532d60a09ed229ee | Nuvemshop server-only boundary &gt; NL-12 explicit JS to TS blocks by source dependency                                                                                                             |          3926 | Browser/client import graph and CSS              | R090     | TSCI    |
| 393 | boundary-825bfc397ee3aaed1de31304 | Nuvemshop server-only boundary &gt; isolates conventional runtime/type edge import '@/modules/nuvemshop'                                                                                            |          3991 | Browser/client import graph and CSS              | R091     | TCI     |
| 394 | boundary-c1cde290f867ccd42f7f0ab7 | Nuvemshop server-only boundary &gt; isolates conventional runtime/type edge import type { Contract } from '@/modules/nuvemshop'                                                                     |          3991 | Browser/client import graph and CSS              | R091     | TCI     |
| 395 | boundary-f311d8f80923fe347e51884e | Nuvemshop server-only boundary &gt; isolates conventional runtime/type edge export type * from '@/modules/nuvemshop'                                                                                |          3991 | Browser/client import graph and CSS              | R091     | TCI     |
| 396 | boundary-db354858ca2406cb88009e79 | Nuvemshop server-only boundary &gt; isolates conventional runtime/type edge export * as Contract from '@/modules/nuvemshop'                                                                         |          3991 | Browser/client import graph and CSS              | R091     | TCI     |
| 397 | boundary-7d28a872be27b7700f6bf7da | Nuvemshop server-only boundary &gt; isolates conventional runtime/type edge type Contract = typeof import('@/modules/nuvemshop')                                                                    |          3991 | Browser/client import graph and CSS              | R091     | TCI     |
| 398 | boundary-f8942187c80cfec9795df43a | Nuvemshop server-only boundary &gt; isolates conventional runtime/type edge import Contract = require('@/modules/nuvemshop')                                                                        |          3991 | Browser/client import graph and CSS              | R091     | TCI     |
| 399 | boundary-ab1d54acd240954482b85e3f | Nuvemshop server-only boundary &gt; isolates conventional runtime/type edge const contract = import('@/modules/nuvemshop')                                                                          |          3991 | Browser/client import graph and CSS              | R091     | TCI     |
| 400 | boundary-a11b798fd02f2d4c65c7de6f | Nuvemshop server-only boundary &gt; isolates conventional runtime/type edge const contract = require('@/modules/nuvemshop')                                                                         |          3991 | Browser/client import graph and CSS              | R091     | TCI     |
| 401 | boundary-c8872a7aca5b749f8c8549e1 | Nuvemshop server-only boundary &gt; isolates conventional runtime/type edge const contract = require((`@/modules/nuvemshop`))                                                                       |          3991 | Browser/client import graph and CSS              | R091     | TCI     |
| 402 | boundary-9c960613fce38741cd4b6d48 | Nuvemshop server-only boundary &gt; terminates canonical graph cycles (adapter branch: false)                                                                                                       |          4008 | Browser/client import graph and CSS              | R092     | TCI     |
| 403 | boundary-081ce04262a232c8ce7c983b | Nuvemshop server-only boundary &gt; terminates canonical graph cycles (adapter branch: true)                                                                                                        |          4008 | Browser/client import graph and CSS              | R092     | TCI     |
| 404 | boundary-a33f5447965244fcf8eb2180 | Nuvemshop server-only boundary &gt; rejects unproven loader in checked client wrapper: const value = import(cssVariable)                                                                            |          4022 | Browser/client import graph and CSS              | R093     | TCI     |
| 405 | boundary-33bb9e74e63f3805cc1314e5 | Nuvemshop server-only boundary &gt; rejects unproven loader in checked client wrapper: const value = require(cssVariable)                                                                           |          4022 | Browser/client import graph and CSS              | R093     | TCI     |
| 406 | boundary-02855f1f197392ffaa8ddae6 | Nuvemshop server-only boundary &gt; rejects unproven loader in checked client wrapper: const value = import(`./${name}.css`)                                                                        |          4022 | Browser/client import graph and CSS              | R093     | TCI     |
| 407 | boundary-9f0647baecf12c6bb95b0642 | Nuvemshop server-only boundary &gt; rejects unproven loader in checked client wrapper: const value = require()                                                                                      |          4022 | Browser/client import graph and CSS              | R093     | TCI     |
| 408 | boundary-75a06205e1effb3704bcc17f | Nuvemshop server-only boundary &gt; allows unrelated client type expressions and a server consumer adapter dependency                                                                               |          4037 | Browser/client import graph and CSS              | R094     | TCI     |
| 409 | boundary-15e5606165fc229441c042b9 | Nuvemshop server-only boundary &gt; treats exact CSS as terminal without reading or parsing code-looking contents                                                                                   |          4049 | Browser/client import graph and CSS              | R095     | TCI     |
| 410 | boundary-c043a1e282cb9a09f119624e | Nuvemshop server-only boundary &gt; keeps missing, unsupported and code edges fail-closed: ./__fixture-fake.css                                                                                     |          4066 | Browser/client import graph and CSS              | R096     | TCI     |
| 411 | boundary-0b442b690844966381a33c54 | Nuvemshop server-only boundary &gt; keeps missing, unsupported and code edges fail-closed: @/modules/nuvemshop/fake.css                                                                             |          4066 | Browser/client import graph and CSS              | R096     | TCI     |
| 412 | boundary-4bbe8d51d1df725ea4746978 | Nuvemshop server-only boundary &gt; keeps missing, unsupported and code edges fail-closed: ./__fixture-style.scss                                                                                   |          4066 | Browser/client import graph and CSS              | R096     | TCI     |
| 413 | boundary-6104fc35c94664d26de39486 | Nuvemshop server-only boundary &gt; keeps missing, unsupported and code edges fail-closed: ./__fixture-style.svg                                                                                    |          4066 | Browser/client import graph and CSS              | R096     | TCI     |
| 414 | boundary-0aec45c358e2b60a8770ccaf | Nuvemshop server-only boundary &gt; keeps missing, unsupported and code edges fail-closed: ./__fixture-style.css?raw                                                                                |          4066 | Browser/client import graph and CSS              | R096     | TCI     |
| 415 | boundary-c127c029018dddd6484cea47 | Nuvemshop server-only boundary &gt; keeps missing, unsupported and code edges fail-closed: ./__fixture-style                                                                                        |          4066 | Browser/client import graph and CSS              | R096     | TCI     |
| 416 | boundary-1588e8e1e6aca59185562c59 | Nuvemshop server-only boundary &gt; keeps missing, unsupported and code edges fail-closed: ./__fixture-style.css.ts                                                                                 |          4066 | Browser/client import graph and CSS              | R096     | TCI     |
| 417 | boundary-d0e2f7a37fe8de5365349675 | Nuvemshop server-only boundary &gt; keeps missing, unsupported and code edges fail-closed: unconfigured/__fixture-style.css                                                                         |          4066 | Browser/client import graph and CSS              | R096     | TCI     |
| 418 | boundary-a5b1288bc9a6384e4fee05ad | Nuvemshop server-only boundary &gt; keeps missing, unsupported and code edges fail-closed: package/__fixture-style.css                                                                              |          4066 | Browser/client import graph and CSS              | R096     | TCI     |
| 419 | boundary-10ca6f3ca653962b44c9f21c | Nuvemshop server-only boundary &gt; rejects multiple viable CSS alias targets and requires an exact CSS file                                                                                        |          4086 | Browser/client import graph and CSS              | R097     | ARI     |
| 420 | boundary-e4f102520daf0a225f8e22fc | Nuvemshop server-only boundary &gt; inventories actual repository client closures with the real terminal CSS edge                                                                                   |          4106 | Browser/client import graph and CSS              | R098     | TCI     |
| 421 | boundary-53b1cd2c87c1d0cdb58b2db4 | Nuvemshop server-only boundary &gt; CSS-01 existing relative CSS                                                                                                                                    |          4122 | Browser/client import graph and CSS              | R099     | TSCI    |
| 422 | boundary-ba85fd6a6659e941f5051ba5 | Nuvemshop server-only boundary &gt; CSS-02 existing configured-alias CSS                                                                                                                            |          4122 | Browser/client import graph and CSS              | R099     | TSCI    |
| 423 | boundary-56d9770882371d38c523d478 | Nuvemshop server-only boundary &gt; CSS-03 missing relative CSS                                                                                                                                     |          4122 | Browser/client import graph and CSS              | R099     | TSCI    |
| 424 | boundary-565a7de190cc1c4847397ef7 | Nuvemshop server-only boundary &gt; CSS-04 missing alias CSS                                                                                                                                        |          4122 | Browser/client import graph and CSS              | R099     | TSCI    |
| 425 | boundary-9d5b6609547b0e0c6d4be08a | Nuvemshop server-only boundary &gt; CSS-05 unresolved code                                                                                                                                          |          4122 | Browser/client import graph and CSS              | R099     | TSCI    |
| 426 | boundary-34fb3518256f0ebdfd2a8452 | Nuvemshop server-only boundary &gt; CSS-06 adapter code                                                                                                                                             |          4122 | Browser/client import graph and CSS              | R099     | TSCI    |
| 427 | boundary-8f5ead1480cde1e4c7a20466 | Nuvemshop server-only boundary &gt; CSS-07 adapter-like CSS filename                                                                                                                                |          4122 | Browser/client import graph and CSS              | R099     | TSCI    |
| 428 | boundary-db0660a00d4fafd36b39a383 | Nuvemshop server-only boundary &gt; RED-ARCH-01 harmless adapter type is rejected by ownership                                                                                                      |          4153 | Browser/client import graph and CSS              | R100     | TSCI    |
| 429 | boundary-0d5b164c23e54eecb9858524 | Nuvemshop server-only boundary &gt; RED-ARCH-02 known keyof OwnerFactory is rejected by dependency, without evaluating keyof                                                                        |          4153 | Browser/client import graph and CSS              | R100     | TSCI    |
| 430 | boundary-582f7c1f0a68d82d9f08c720 | Nuvemshop server-only boundary &gt; RED-ARCH-03 client wrapper adapter type-only closure                                                                                                            |          4153 | Browser/client import graph and CSS              | R100     | TSCI    |
| 431 | boundary-b99135508121edbd62498b33 | Nuvemshop server-only boundary &gt; RED-ARCH-04 barrel namespace adapter reexport closure                                                                                                           |          4153 | Browser/client import graph and CSS              | R100     | TSCI    |
| 432 | boundary-19c595a628f45c33f25b168e | Nuvemshop server-only boundary &gt; RED-ARCH-05 client ImportTypeNode adapter closure                                                                                                               |          4153 | Browser/client import graph and CSS              | R100     | TSCI    |
| 433 | boundary-187d913ba6eedd951c13964e | Nuvemshop server-only boundary &gt; preserves required entrypoints, explicit markers and dependency direction as owners add files                                                                   |          4207 | Module boundaries and real entrypoint imports    | R101     | TCI     |
| 434 | boundary-c5c7de5474c6c4ec246db6d8 | Nuvemshop server-only boundary &gt; imports the entrypoints without provider configuration                                                                                                          |          4219 | Module boundaries and real entrypoint imports    | R102     | I       |
| 435 | boundary-16ac47f88ac26ccb48f756b0 | Nuvemshop server-only boundary &gt; rejects a client import through the public entrypoint using the real marker                                                                                     |          4229 | Module boundaries and real entrypoint imports    | R103     | I       |
| 436 | boundary-ab317c491ed40b4c09e3190a | Nuvemshop server-only boundary &gt; rejects a direct client import of the server entrypoint using the real marker                                                                                   |          4238 | Module boundaries and real entrypoint imports    | R104     | I       |
| 437 | boundary-77b6c63652aa0f35c9eb654d | Nuvemshop server-only boundary &gt; allows an additional internal owner file without freezing the module tree                                                                                       |          4246 | Module boundaries and real entrypoint imports    | R105     | TSCI    |
| 438 | boundary-e5e22c40ebb710d4d24af949 | Nuvemshop server-only boundary &gt; allows guarded normalized contracts for server consumers                                                                                                        |          4252 | Module boundaries and real entrypoint imports    | R106     | TSCI    |
| 439 | boundary-ce152bae49e3491962632e21 | Nuvemshop server-only boundary &gt; detects removal of required entrypoint index.ts                                                                                                                 |          4270 | Module boundaries and real entrypoint imports    | R107     | TSCI    |
| 440 | boundary-ae434a6cdbc16deff76ce00a | Nuvemshop server-only boundary &gt; detects removal of required entrypoint server/index.ts                                                                                                          |          4270 | Module boundaries and real entrypoint imports    | R107     | TSCI    |
| 441 | boundary-6111997eeaff3a05a6bffd92 | Nuvemshop server-only boundary &gt; detects removal of the server-only marker from index.ts                                                                                                         |          4276 | Module boundaries and real entrypoint imports    | R108     | TSCI    |
| 442 | boundary-2c49975e340cbaed198bb354 | Nuvemshop server-only boundary &gt; detects removal of the server-only marker from server/index.ts                                                                                                  |          4276 | Module boundaries and real entrypoint imports    | R108     | TSCI    |
| 443 | boundary-fe276311ed254808c7fc47aa | Nuvemshop server-only boundary &gt; detects removal of the root → server dependency                                                                                                                 |          4282 | Module boundaries and real entrypoint imports    | R109     | TSCI    |
| 444 | boundary-c43fe58caf90b76abab7c219 | Nuvemshop server-only boundary &gt; GUARD-BIND-RED-01 root edge rejects local require as positive proof through the full boundary                                                                   |          4288 | Guard binding and Program identity               | R110     | TSCI    |
| 445 | boundary-e92d6a9f0b1deeb2a36b3310 | Nuvemshop server-only boundary &gt; GUARD-BIND-RED-02 contract guard rejects local require as positive proof through the full boundary                                                              |          4288 | Guard binding and Program identity               | R110     | TSCI    |
| 446 | boundary-5df78c3fcb0556fb83b6cf00 | Nuvemshop server-only boundary &gt; GUARD-BIND-RED-03 secret guard rejects local require as positive proof through the full boundary                                                                |          4288 | Guard binding and Program identity               | R110     | TSCI    |
| 447 | boundary-642c65aabd36bce6ba095bd4 | Nuvemshop server-only boundary &gt; GUARD-POS-01 static import guard retains genuine positive proof through the full boundary                                                                       |          4323 | Guard binding and Program identity               | R111     | TSCI    |
| 448 | boundary-1bfe33572af212d5b3476762 | Nuvemshop server-only boundary &gt; GUARD-POS-02 runtime root require retains genuine positive proof through the full boundary                                                                      |          4323 | Guard binding and Program identity               | R111     | TSCI    |
| 449 | boundary-71d14057eb70067e40b428ba | Nuvemshop server-only boundary &gt; GUARD-POS-03 transitive guard retains genuine positive proof through the full boundary                                                                          |          4323 | Guard binding and Program identity               | R111     | TSCI    |
| 450 | boundary-32dffc398c307241c93ca4c8 | Nuvemshop server-only boundary &gt; GUARD-POS-04 local require retains genuine positive proof through the full boundary                                                                             |          4323 | Guard binding and Program identity               | R111     | TSCI    |
| 451 | boundary-b094413b5be57c594f3e464f | Nuvemshop server-only boundary &gt; GUARD-POS-05 ambient require guard retains genuine positive proof through the full boundary                                                                     |          4323 | Guard binding and Program identity               | R111     | TSCI    |
| 452 | boundary-913da39461da1eee572992a6 | Nuvemshop server-only boundary &gt; GUARD-PROGRAM-IDENTITY collects guard evidence with one Program and its checker                                                                                 |          4359 | Guard binding and Program identity               | R112     | TSRCI   |
| 453 | boundary-871cfa0b1843a873b444750c | Nuvemshop server-only boundary &gt; rejects server → root dependency: import '../index'                                                                                                             |          4400 | Module boundaries and real entrypoint imports    | R113     | TSCI    |
| 454 | boundary-5ebd5ca88727ea48d8209613 | Nuvemshop server-only boundary &gt; rejects server → root dependency: export * from '@/modules/nuvemshop'                                                                                           |          4400 | Module boundaries and real entrypoint imports    | R113     | TSCI    |
| 455 | boundary-7045bcda2dc3c47462b82eb4 | Nuvemshop server-only boundary &gt; rejects server → root dependency: import type { Owner } from '..'                                                                                               |          4400 | Module boundaries and real entrypoint imports    | R113     | TSCI    |
| 456 | boundary-cbd7708ff5c3293a9fd3c0da | Nuvemshop server-only boundary &gt; detects an unauthorized cache dependency in entrypoints and internal files                                                                                      |          4410 | Module boundaries and real entrypoint imports    | R114     | TSCI    |
| 457 | boundary-56d992d881cfee6edbe40072 | Nuvemshop server-only boundary &gt; detects an unauthorized UI dependency in entrypoints and internal files                                                                                         |          4410 | Module boundaries and real entrypoint imports    | R114     | TSCI    |
| 458 | boundary-16d6f4d85e8261d431ed85c3 | Nuvemshop server-only boundary &gt; detects an unauthorized client state in entrypoints and internal files                                                                                          |          4410 | Module boundaries and real entrypoint imports    | R114     | TSCI    |
| 459 | boundary-dfbf4b63e961cf3164ad5fcb | Nuvemshop server-only boundary &gt; detects an unauthorized client directive in entrypoints and internal files                                                                                      |          4410 | Module boundaries and real entrypoint imports    | R114     | TSCI    |
| 460 | boundary-c0474e82721948aecd986ddb | Nuvemshop server-only boundary &gt; detects an unauthorized checkout export in entrypoints and internal files                                                                                       |          4410 | Module boundaries and real entrypoint imports    | R114     | TSCI    |
| 461 | boundary-3a4526b52d7b388aa55cb0cd | Nuvemshop server-only boundary &gt; detects an unauthorized Customer export in entrypoints and internal files                                                                                       |          4410 | Module boundaries and real entrypoint imports    | R114     | TSCI    |
| 462 | boundary-7b18aa38b4b6356615b0986e | Nuvemshop server-only boundary &gt; detects an unauthorized orders dependency in entrypoints and internal files                                                                                     |          4410 | Module boundaries and real entrypoint imports    | R114     | TSCI    |
| 463 | boundary-3cfb43fa5edc560607c2b037 | Nuvemshop server-only boundary &gt; detects an unauthorized cache re-export in entrypoints and internal files                                                                                       |          4410 | Module boundaries and real entrypoint imports    | R114     | TSCI    |
| 464 | boundary-8aa3b003a84d9be0a67e30ce | Nuvemshop server-only boundary &gt; detects an unauthorized dynamic client dependency in entrypoints and internal files                                                                             |          4410 | Module boundaries and real entrypoint imports    | R114     | TSCI    |
| 465 | boundary-c573779fd1e61d2f4d18d1bc | Nuvemshop server-only boundary &gt; detects an unauthorized CommonJS client dependency in entrypoints and internal files                                                                            |          4410 | Module boundaries and real entrypoint imports    | R114     | TSCI    |
| 466 | boundary-f367a8b818c467c2b79b0e7a | Nuvemshop server-only boundary &gt; rejects an internal JSX UI surface                                                                                                                              |          4429 | Module boundaries and real entrypoint imports    | R115     | TSCI    |
| 467 | boundary-816f2e5cc6c9fa475c20e760 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module.exports = { ownerContract: () =&gt; true }                                                                         |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 468 | boundary-6356c5cc98c00146423ca2b0 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module.exports.ownerContract = () =&gt; true                                                                              |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 469 | boundary-55b2d1dd63a7e46ba76e68c2 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: exports.ownerContract = () =&gt; true                                                                                     |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 470 | boundary-a758b6c605cd9fcb80c19664 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module['exports'] = { ownerContract: () =&gt; true }                                                                      |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 471 | boundary-47c61c913378e70eced7bf55 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module['exports']['ownerContract'] = () =&gt; true                                                                        |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 472 | boundary-835f65949d8ced4f6561d85a | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: exports['ownerContract'] = () =&gt; true                                                                                  |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 473 | boundary-616f7b1a79c2d9f7a08b3fa1 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module[('exports')] = {<br> ownerContract: () =&gt; true,<br>}                                                            |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 474 | boundary-9e84e30225abe0e4ee3e28b4 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module[((('exports')))] = {<br> ownerContract: () =&gt; true,<br>}                                                        |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 475 | boundary-e7aaf8a168b9254b6cce34ac | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module[('exports')].ownerContract = () =&gt; true                                                                         |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 476 | boundary-684660f0086247f579af4430 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module[('exports')][('ownerContract')] = () =&gt; true                                                                    |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 477 | boundary-ed5be640717e7206e31fc32a | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module['exports'][('ownerContract')] = () =&gt; true                                                                      |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 478 | boundary-ec78604a4e02a5e424531fe2 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: exports[('ownerContract')] = () =&gt; true                                                                                |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 479 | boundary-7894b5dd2a2286f78bb682f3 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module[`exports`] = { ownerContract: () =&gt; true }                                                                      |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 480 | boundary-a27706caf65a772f34d4c63e | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: exports[`ownerContract`] = () =&gt; true                                                                                  |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 481 | boundary-0c597e897d9e4e87963b5ca9 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module[(((`exports`)))][((`ownerContract`))] = () =&gt; true                                                              |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 482 | boundary-ec164daae0fc9004e7a8e276 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module[('exports')].ownerContract ??= () =&gt; true                                                                       |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 483 | boundary-208b3ea4578c3420ea82e020 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: const ownerKey = 'ownerContract'; module[('exports')][ownerKey] = () =&gt; true                                           |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 484 | boundary-5dc2a1f2dba3d09bccbecd53 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: const ownerKey = 'ownerContract'; module.exports[ownerKey] = () =&gt; true                                                |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 485 | boundary-a90a8e9a5a3ff19cb5f1b4b7 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: const ownerKey = 'ownerContract'; exports[ownerKey] = () =&gt; true                                                       |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 486 | boundary-088b359960d8f85f8cb25f0c | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: (module.exports) = { ownerContract: () =&gt; true }                                                                       |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 487 | boundary-803614e47d715f28d885059b | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: (module.exports).ownerContract = () =&gt; true                                                                            |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 488 | boundary-0a55354ed3e33952a434dde1 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: (exports).ownerContract = () =&gt; true                                                                                   |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 489 | boundary-7c3376544f17a23ca9bba272 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: (module).exports.ownerContract = () =&gt; true                                                                            |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 490 | boundary-d6a10ded39b6544b4075bbc1 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: exports.ownerContract &#124;&#124;= () =&gt; true                                                                         |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 491 | boundary-06b7eef195b2004a02c5ff78 | Nuvemshop server-only boundary &gt; rejects an unguarded CommonJS facade: module.exports.ownerContract ??= () =&gt; true                                                                            |          4435 | CommonJS/ESM export surfaces                     | R116     | TSCI    |
| 492 | boundary-6cc4656256498c10ceca00f5 | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: // module.exports = { ownerContract: () =&gt; true }                                                        |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 493 | boundary-394306649fdd6945dc40cb51 | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: /* exports.ownerContract = () =&gt; true */                                                                 |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 494 | boundary-859f6fc4212ee4fd7b219249 | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: const text = "module.exports = {}"; void text                                                               |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 495 | boundary-b5207089e81cc5c8f6856331 | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: const text = 'exports.ownerContract = () =&gt; true'; void text                                             |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 496 | boundary-7c258f560928db9ef40a4a48 | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: const text = `module.exports.ownerContract = () =&gt; true`; void text                                      |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 497 | boundary-6cbdc2eb2d9c27386ec6207a | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: // module[('exports')] = {}                                                                                 |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 498 | boundary-d0dcb458d78a3d76a19ded6e | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: const text = "module[('exports')] = {}"; void text                                                          |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 499 | boundary-846c74ec1d00ef1394ea2b97 | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: const text = `module[('exports')] = {}`; void text                                                          |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 500 | boundary-77cd983abc8560f470fcd222 | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: const key = 'unrelated'; module[(key)] = {}                                                                 |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 501 | boundary-030595927e3e6adc847ef70d | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: const getKey = () =&gt; 'unrelated'; module[(getKey())] = {}                                                |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 502 | boundary-7ec9d02e257dc2397e50ea5a | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: const suffix = 'other'; module[(`exp${suffix}`)] = {}                                                       |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 503 | boundary-7e20c2f93116c3446f902fae | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: const owner = {}; owner.exports = {}; owner.exports.ownerContract = () =&gt; true                           |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 504 | boundary-970a68b8251ba0c8fa0f5b07 | Nuvemshop server-only boundary &gt; allows CommonJS-like text and unrelated properties: const owner = {}; owner.module = {}; owner.module.exports = () =&gt; true                                   |          4469 | CommonJS/ESM export surfaces                     | R117     | TSCI    |
| 505 | boundary-60e53bf9530225425dfbbf1b | Nuvemshop server-only boundary &gt; continues rejecting an unguarded ESM facade: export const ownerContract = () =&gt; true                                                                         |          4489 | Module boundaries and real entrypoint imports    | R118     | TSCI    |
| 506 | boundary-2f72a7e46ebf3fd9a90d30a9 | Nuvemshop server-only boundary &gt; continues rejecting an unguarded ESM facade: export class OwnerContract {}                                                                                      |          4489 | Module boundaries and real entrypoint imports    | R118     | TSCI    |
| 507 | boundary-a950c7bf36362a9fc61c36eb | Nuvemshop server-only boundary &gt; continues rejecting an unguarded ESM facade: const ownerContract = () =&gt; true; export { ownerContract }                                                      |          4489 | Module boundaries and real entrypoint imports    | R118     | TSCI    |
| 508 | boundary-cc729409847c4bb66709d5d4 | Nuvemshop server-only boundary &gt; continues rejecting an unguarded ESM facade: export default () =&gt; true                                                                                       |          4489 | Module boundaries and real entrypoint imports    | R118     | TSCI    |
| 509 | boundary-36b172b8f786834cda762044 | Nuvemshop server-only boundary &gt; continues rejecting an unguarded ESM facade: export * from 'node:fs'                                                                                            |          4489 | Module boundaries and real entrypoint imports    | R118     | TSCI    |
| 510 | boundary-dc9f96f7ac4929c6bd93e2ea | Nuvemshop server-only boundary &gt; continues rejecting an unguarded ESM facade: export { readFile as ownerContract } from 'node:fs'                                                                |          4489 | Module boundaries and real entrypoint imports    | R118     | TSCI    |
| 511 | boundary-ce6db8c1826edb4c6de98b0c | Nuvemshop server-only boundary &gt; rejects an unguarded browser-safe facade bypassing the entrypoints                                                                                              |          4502 | Module boundaries and real entrypoint imports    | R119     | TSCI    |
| 512 | boundary-7fd38dd7b47098329e06d84c | Nuvemshop server-only boundary &gt; rejects an unguarded client PII type bypassing the entrypoints                                                                                                  |          4502 | Module boundaries and real entrypoint imports    | R119     | TSCI    |
| 513 | boundary-8f33253efbca3f543a3fe31a | Nuvemshop server-only boundary &gt; rejects an unguarded client secret access bypassing the entrypoints                                                                                             |          4502 | Module boundaries and real entrypoint imports    | R119     | TSCI    |
| 514 | boundary-cb9e931c437f45a31507c6ea | Nuvemshop server-only boundary &gt; rejects an unguarded type-only facade bypassing the entrypoints                                                                                                 |          4502 | Module boundaries and real entrypoint imports    | R119     | TSCI    |
| 515 | boundary-b335eea8a09cc7583104b86c | Nuvemshop server-only boundary &gt; rejects an unguarded type-only marker bypassing the entrypoints                                                                                                 |          4502 | Module boundaries and real entrypoint imports    | R119     | TSCI    |
| 516 | boundary-3a925dc92087a53c1d011653 | Nuvemshop server-only boundary &gt; RED-B rejects TypeScript JS-extension substitution into root                                                                                                    |          4521 | Module boundaries and real entrypoint imports    | R120     | TSCI    |
| 517 | boundary-a66e5856a2802af508f1bca5 | Nuvemshop server-only boundary &gt; RED-C rejects conventional call facade: Object.assign(module.exports, { ownerContract: () =&gt; true })                                                         |          4527 | CommonJS/ESM export surfaces                     | R121     | TSCI    |
| 518 | boundary-9347a6baf0afee360df60547 | Nuvemshop server-only boundary &gt; RED-C rejects conventional call facade: Object.assign(exports, { ownerContract: () =&gt; true })                                                                |          4527 | CommonJS/ESM export surfaces                     | R121     | TSCI    |
| 519 | boundary-af4db3486ea7332e8441c564 | Nuvemshop server-only boundary &gt; RED-C rejects conventional call facade: Object.defineProperty(module.exports, 'ownerContract', { value: () =&gt; true })                                        |          4527 | CommonJS/ESM export surfaces                     | R121     | TSCI    |
| 520 | boundary-2a021e2ff34c5192a579ea27 | Nuvemshop server-only boundary &gt; RED-C rejects conventional call facade: Object.defineProperty(exports, 'ownerContract', { value: () =&gt; true })                                               |          4527 | CommonJS/ESM export surfaces                     | R121     | TSCI    |
| 521 | boundary-dc0ec8cb00a65088e09b7658 | Nuvemshop server-only boundary &gt; uses compiler resolution for ../index → index.ts in synthetic Sources                                                                                           |          4538 | Canonical resolver and tombstones                | R122     | SRI     |
| 522 | boundary-ab2fdae9604f94a750b4a368 | Nuvemshop server-only boundary &gt; uses compiler resolution for .. → index.ts in synthetic Sources                                                                                                 |          4538 | Canonical resolver and tombstones                | R122     | SRI     |
| 523 | boundary-2bdfb28f5859cfd2350ce30f | Nuvemshop server-only boundary &gt; uses compiler resolution for ../index.js → index.ts in synthetic Sources                                                                                        |          4538 | Canonical resolver and tombstones                | R122     | SRI     |
| 524 | boundary-5a9ecb800a31496323934d61 | Nuvemshop server-only boundary &gt; uses compiler resolution for ../__fixture-esm.mjs → __fixture-esm.mts in synthetic Sources                                                                      |          4538 | Canonical resolver and tombstones                | R122     | SRI     |
| 525 | boundary-e245a79cdbabe39e3e9c9e02 | Nuvemshop server-only boundary &gt; uses compiler resolution for ../__fixture-common.cjs → __fixture-common.cts in synthetic Sources                                                                |          4538 | Canonical resolver and tombstones                | R122     | SRI     |
| 526 | boundary-6296f9b0f502fa936bee80e3 | Nuvemshop server-only boundary &gt; uses compiler resolution for @/modules/nuvemshop → index.ts in synthetic Sources                                                                                |          4538 | Canonical resolver and tombstones                | R122     | SRI     |
| 527 | boundary-077b1f060c66fc51a6194ac0 | Nuvemshop server-only boundary &gt; uses compiler resolution for @/modules/nuvemshop/server → server/index.ts in synthetic Sources                                                                  |          4538 | Canonical resolver and tombstones                | R122     | SRI     |
| 528 | boundary-40ac19b9e3857933b34bf9d3 | Nuvemshop server-only boundary &gt; uses compiler resolution for @/modules/nuvemshop/index.js → index.ts in synthetic Sources                                                                       |          4538 | Canonical resolver and tombstones                | R122     | SRI     |
| 529 | boundary-7808e9485b54cbe77dcf604c | Nuvemshop server-only boundary &gt; does not restore deleted candidate files from physical module sources                                                                                           |          4557 | Canonical resolver and tombstones                | R123     | SRI     |
| 530 | boundary-0654edb1c1b7132e9ebf1e17 | Nuvemshop server-only boundary &gt; blocks resolved server → root mutation: import '../index.js'                                                                                                    |          4568 | Module boundaries and real entrypoint imports    | R124     | TSCI    |
| 531 | boundary-fceefb35e54247f195b7fc7a | Nuvemshop server-only boundary &gt; blocks resolved server → root mutation: export * from '../index.js'                                                                                             |          4568 | Module boundaries and real entrypoint imports    | R124     | TSCI    |
| 532 | boundary-cfba457e3059460b7db6a4af | Nuvemshop server-only boundary &gt; blocks resolved server → root mutation: import type { X } from '../index.js'                                                                                    |          4568 | Module boundaries and real entrypoint imports    | R124     | TSCI    |
| 533 | boundary-70e26fcf72687d9eebd61fab | Nuvemshop server-only boundary &gt; blocks resolved server → root mutation: import '@/modules/nuvemshop/index.js'                                                                                   |          4568 | Module boundaries and real entrypoint imports    | R124     | TSCI    |
| 534 | boundary-1f4553617e303f81a095f6a8 | Nuvemshop server-only boundary &gt; blocks resolved server → root mutation: export * from '@/modules/nuvemshop/index.js'                                                                            |          4568 | Module boundaries and real entrypoint imports    | R124     | TSCI    |
| 535 | boundary-11352597560ef843d6770c75 | Nuvemshop server-only boundary &gt; blocks resolved server → root mutation: import type { X } from '@/modules/nuvemshop/index.js'                                                                   |          4568 | Module boundaries and real entrypoint imports    | R124     | TSCI    |
| 536 | boundary-880f55b6405a51c71de73598 | Nuvemshop server-only boundary &gt; blocks resolved server → root mutation: import type { X } from '@/modules/nuvemshop'                                                                            |          4568 | Module boundaries and real entrypoint imports    | R124     | TSCI    |
| 537 | boundary-2719103b3d21351291daec50 | Nuvemshop server-only boundary &gt; preserves exported internal PII contracts for server consumers                                                                                                  |          4582 | Module boundaries and real entrypoint imports    | R125     | TSCI    |
| 538 | boundary-1e2c31a91842ef98c139017d | Nuvemshop server-only boundary &gt; blocks client runtime module imports: import '@/modules/nuvemshop'                                                                                              |          4599 | Module boundaries and real entrypoint imports    | R126     | TSCI    |
| 539 | boundary-0fd6bc0892c5ca42102c4a5d | Nuvemshop server-only boundary &gt; blocks client runtime module imports: import '@/modules/nuvemshop/server'                                                                                       |          4599 | Module boundaries and real entrypoint imports    | R126     | TSCI    |
| 540 | boundary-b93b327dce1b2edba5080bcd | Nuvemshop server-only boundary &gt; blocks client runtime module imports: export * from '@/modules/nuvemshop/server'                                                                                |          4599 | Module boundaries and real entrypoint imports    | R126     | TSCI    |
| 541 | boundary-13fa1c9bef790a75e2a755f9 | Nuvemshop server-only boundary &gt; blocks client runtime module imports: const owner = import('@/modules/nuvemshop/types')                                                                         |          4599 | Module boundaries and real entrypoint imports    | R126     | TSCI    |
| 542 | boundary-7b1794af3b6d8145345ec17d | Nuvemshop server-only boundary &gt; blocks client runtime module imports: const owner = require('@/modules/nuvemshop/types')                                                                        |          4599 | Module boundaries and real entrypoint imports    | R126     | TSCI    |
| 543 | boundary-e0693d5fa3df21f779bd7cdd | Nuvemshop server-only boundary &gt; does not treat directive-like text as a client importer                                                                                                         |          4616 | Module boundaries and real entrypoint imports    | R127     | TSCI    |
| 544 | boundary-6b505d9de030f86a05faf680 | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: Object.assign(module.exports, { ownerContract() {} })                                                |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 545 | boundary-ce5193cac5f073efcf4fe686 | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: Object.assign(exports, { ownerContract() {} })                                                       |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 546 | boundary-e19045b0108cf0869e3449ea | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: Object.defineProperties(module.exports, { ownerContract: { value: () =&gt; true } })                 |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 547 | boundary-db03b95cbb34fcbffe599a75 | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: Object.defineProperties(exports, { ownerContract: { value: () =&gt; true } })                        |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 548 | boundary-f2405e70e37ddfdb8d9183b7 | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: Reflect.defineProperty(module.exports, 'ownerContract', { value: () =&gt; true })                    |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 549 | boundary-9d22b8a3b6804be368f47724 | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: Reflect.defineProperty(exports, 'ownerContract', { value: () =&gt; true })                           |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 550 | boundary-410d7c651bf12324fe3e97d2 | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: Object['assign'](module.exports, { ownerContract() {} })                                             |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 551 | boundary-dacfa0f01a0f1e21eae2600c | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: Object[('assign')](module[('exports')], { ownerContract() {} })                                      |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 552 | boundary-c5ecb7d7c1b18486f4dd78fe | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: (Object[((`assign`))])((module.exports), { ownerContract() {} })                                     |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 553 | boundary-7ae75f0064c9f42e5284cfca | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: Object[('defineProperty')]((exports), 'ownerContract', { value: () =&gt; true })                     |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 554 | boundary-32fc8d7f8179e6e1ad70d850 | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: Reflect[`defineProperty`](module[((('exports')))], 'ownerContract', { value: () =&gt; true })        |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 555 | boundary-6f193fcb792b72f9534bfc39 | Nuvemshop server-only boundary &gt; rejects conventional static call-based CommonJS mutations: Object.assign(module.exports.ownerContract, { method() {} })                                         |          4628 | CommonJS/ESM export surfaces                     | R128     | TSCI    |
| 556 | boundary-a314da1f5458ae9dace0db24 | Nuvemshop server-only boundary &gt; allows call-like text and unrelated mutation targets: // Object.assign(module.exports, { ownerContract() {} })                                                  |          4649 | CommonJS/ESM export surfaces                     | R129     | TSCI    |
| 557 | boundary-1c24e3209a1a55f92430bb0f | Nuvemshop server-only boundary &gt; allows call-like text and unrelated mutation targets: /* Object.defineProperty(exports, 'ownerContract', {}) */                                                 |          4649 | CommonJS/ESM export surfaces                     | R129     | TSCI    |
| 558 | boundary-2f9edcc38d9466c7c66b82c9 | Nuvemshop server-only boundary &gt; allows call-like text and unrelated mutation targets: const text = "Object.assign(module.exports, {})"; void text                                               |          4649 | CommonJS/ESM export surfaces                     | R129     | TSCI    |
| 559 | boundary-dc1090b2d6c5747d88001938 | Nuvemshop server-only boundary &gt; allows call-like text and unrelated mutation targets: const text = `Reflect.defineProperty(exports, "ownerContract", {})`; void text                            |          4649 | CommonJS/ESM export surfaces                     | R129     | TSCI    |
| 560 | boundary-649799e7fe3b90f68a6526ed | Nuvemshop server-only boundary &gt; allows call-like text and unrelated mutation targets: const otherObject = {}; Object.assign(otherObject, { ownerContract() {} })                                |          4649 | CommonJS/ESM export surfaces                     | R129     | TSCI    |
| 561 | boundary-dec6260218f7dd7d948bf522 | Nuvemshop server-only boundary &gt; allows call-like text and unrelated mutation targets: const otherObject = {}; Object.defineProperty(otherObject, 'ownerContract', { value: () =&gt; true })     |          4649 | CommonJS/ESM export surfaces                     | R129     | TSCI    |
| 562 | boundary-6e15983701a05b4065010f02 | Nuvemshop server-only boundary &gt; allows call-like text and unrelated mutation targets: const otherObject = {}; Object.defineProperties(otherObject, { ownerContract: { value: () =&gt; true } }) |          4649 | CommonJS/ESM export surfaces                     | R129     | TSCI    |
| 563 | boundary-a07bd704534089568685c17a | Nuvemshop server-only boundary &gt; allows call-like text and unrelated mutation targets: const otherObject = {}; Reflect.defineProperty(otherObject, 'ownerContract', { value: () =&gt; true })    |          4649 | CommonJS/ESM export surfaces                     | R129     | TSCI    |
| 564 | boundary-80d2f180a9fa7632f71aca5a | Nuvemshop server-only boundary &gt; resolves virtual intermediary directories before filesystem fallback                                                                                            |          4664 | Canonical resolver and tombstones                | R130     | RI      |
| 565 | boundary-510c1919e6f2f4cb28ec3e00 | CI-OPT-01 cache invalidation canaries &gt; CACHE-SOURCE replaces one same-path source and restores the safe result                                                                                  |          4700 | CI-OPT-01 cache invalidation canaries            | R131     | TSCI    |
| 566 | boundary-213fd0ea7fefa32f693e946a | CI-OPT-01 cache invalidation canaries &gt; CACHE-ADD-REMOVE keeps identical root text authoritative across membership changes                                                                       |          4710 | CI-OPT-01 cache invalidation canaries            | R132     | TSRCI   |
| 567 | boundary-784a123b7efb3ea8c003b484 | CI-OPT-01 cache invalidation canaries &gt; CACHE-SNAPSHOT gives old and new environments independent authoritative overlays                                                                         |          4725 | CI-OPT-01 cache invalidation canaries            | R133     | TSCI    |
| 568 | boundary-90cf30fc3b8a15d18480afe7 | CI-OPT-01 cache invalidation canaries &gt; CACHE-MODULE-TOMBSTONE never restores removed physical adapter sources                                                                                   |          4739 | CI-OPT-01 cache invalidation canaries            | R134     | TSRCI   |
| 569 | boundary-44d7589a2a4105c4b3f95dba | CI-OPT-01 cache invalidation canaries &gt; CACHE-BINDING invalidates checker ownership after local-to-ambient changes                                                                               |          4758 | CI-OPT-01 cache invalidation canaries            | R135     | TSCI    |
| 570 | boundary-43968019caa7d998fc0201d1 | CI-OPT-01 cache invalidation canaries &gt; CACHE-ROOT-PATH changes and restores client root membership with a warm compiler lane                                                                    |          4770 | CI-OPT-01 cache invalidation canaries            | R136     | TSRCI   |
| 571 | boundary-8cc6b425205bc189fe20fd2d | CI-OPT-01 cache invalidation canaries &gt; CACHE-PATHS resolves a changed alias target and restores the previous graph                                                                              |          4784 | CI-OPT-01 cache invalidation canaries            | R137     | TSOARCI |
| 572 | boundary-c218060da81a2e022e5781c4 | CI-OPT-01 cache invalidation canaries &gt; CACHE-PARSER respects language, module format, JSDoc mode and forced reparsing                                                                           |          4804 | CI-OPT-01 cache invalidation canaries            | R138     | TOI     |
| 573 | boundary-dd28a383b5eb7e98b0b82132 | CI-OPT-01 cache invalidation canaries &gt; CACHE-CALLBACK honors distinct external module indicator parser callbacks                                                                                |          4839 | CI-OPT-01 cache invalidation canaries            | R139     | TOI     |
| 574 | boundary-ea6de99c3fe56e54dd6783a1 | CI-OPT-01 cache invalidation canaries &gt; CACHE-EXTENSION preserves identical-source compiler JSDoc policy for .js                                                                                 |          4866 | CI-OPT-01 cache invalidation canaries            | R140     | TCI     |
| 575 | boundary-09e7132ceb43f7de8c3df615 | CI-OPT-01 cache invalidation canaries &gt; CACHE-EXTENSION preserves identical-source compiler JSDoc policy for .jsx                                                                                |          4866 | CI-OPT-01 cache invalidation canaries            | R140     | TCI     |
| 576 | boundary-e2452c762f9d9baef245dbb7 | CI-OPT-01 cache invalidation canaries &gt; CACHE-EXTENSION preserves identical-source compiler JSDoc policy for .ts                                                                                 |          4866 | CI-OPT-01 cache invalidation canaries            | R140     | TCI     |
| 577 | boundary-eaa281b48b6ff61d568865d5 | CI-OPT-01 cache invalidation canaries &gt; CACHE-EXTENSION preserves identical-source compiler JSDoc policy for .tsx                                                                                |          4866 | CI-OPT-01 cache invalidation canaries            | R140     | TCI     |
| 578 | boundary-21eccfe4bed01cf9780f7a08 | CI-OPT-01 cache invalidation canaries &gt; CACHE-EXTENSION preserves identical-source compiler JSDoc policy for .mts                                                                                |          4866 | CI-OPT-01 cache invalidation canaries            | R140     | TCI     |
| 579 | boundary-f6f0920a89d5dbc6b7f95269 | CI-OPT-01 cache invalidation canaries &gt; CACHE-EXTENSION preserves identical-source compiler JSDoc policy for .cts                                                                                |          4866 | CI-OPT-01 cache invalidation canaries            | R140     | TCI     |
| 580 | boundary-6250eac3c653da6ab7d13a12 | CI-OPT-01 cache invalidation canaries &gt; CACHE-PROGRAM-OPTIONS changes and restores parser and semantic options through real factory                                                              |          4888 | CI-OPT-01 cache invalidation canaries            | R141     | TOCI    |
| 581 | boundary-fa21e338f8cc13a6e0424e9b | CI-OPT-01 cache invalidation canaries &gt; CACHE-DIAGNOSTICS uses fresh checker and matches compiler across ambient changes                                                                         |          4934 | CI-OPT-01 cache invalidation canaries            | R142     | TSCI    |
| 582 | boundary-6e1983fcac49c1dbe92e6505 | CI-OPT-01 compiler equivalence &gt; CACHE-PERFORMANCE reuses unchanged library parsing with fresh Programs and checkers                                                                             |          5034 | CI-OPT-01 compiler equivalence                   | R143     | TCI     |
| 583 | boundary-d91a1d31bd30a8d85ef8b58f | CI-OPT-01 compiler equivalence &gt; CACHE-SEMANTIC replaces source, diagnostic positions and related information then restores                                                                      |          5045 | CI-OPT-01 compiler equivalence                   | R144     | TSCI    |
| 584 | boundary-715a5c2955b89ff97a13ee60 | CI-OPT-01 compiler equivalence &gt; CACHE-SEMANTIC-MEMBERSHIP refreshes unchanged importers after add, change, delete and restore                                                                   |          5057 | CI-OPT-01 compiler equivalence                   | R145     | TSRCI   |
| 585 | boundary-701d69f9f3755e13e52fb4d9 | CI-OPT-01 compiler equivalence &gt; CACHE-SEMANTIC-ALIAS snapshots nested paths and renews unchanged importer resolution                                                                            |          5072 | CI-OPT-01 compiler equivalence                   | R146     | TOARCI  |
| 586 | boundary-cd831c2f9b4ce198960152ac | CI-OPT-01 compiler equivalence &gt; CACHE-SEMANTIC-GLOBAL invalidates unchanged clients for ambient type changes and deletion                                                                       |          5087 | CI-OPT-01 compiler equivalence                   | R147     | TSCI    |
| 587 | boundary-7a9ff8a8a0128373125e2223 | CI-OPT-01 compiler equivalence &gt; CACHE-SEMANTIC-LIB refreshes real standard library augmentation under skipLibCheck false                                                                        |          5098 | CI-OPT-01 compiler equivalence                   | R148     | TSRCI   |
| 588 | boundary-c059b8379fde49915b269fc5 | CI-OPT-01 compiler equivalence &gt; CACHE-SEMANTIC-LIB-ERROR preserves library diagnostics and removes them after restoration                                                                       |          5114 | CI-OPT-01 compiler equivalence                   | R149     | TSRCI   |
| 589 | boundary-062b00383a395f8bac8f3022 | CI-OPT-01 compiler equivalence &gt; CACHE-SEMANTIC-OPTION preserves diagnostics across strictNullChecks epochs                                                                                      |          5132 | CI-OPT-01 compiler equivalence                   | R150     | TOCI    |
| 590 | boundary-ff8c783a87c43e3d1a4f3cc5 | CI-OPT-01 compiler equivalence &gt; CACHE-SEMANTIC-OPTION preserves diagnostics across checkJs epochs                                                                                               |          5132 | CI-OPT-01 compiler equivalence                   | R150     | TOCI    |
| 591 | boundary-c3b6e62ce1c5e60ef01553de | CI-OPT-01 compiler equivalence &gt; CACHE-SEMANTIC-OPTION preserves diagnostics across allowUnreachableCode epochs                                                                                  |          5132 | CI-OPT-01 compiler equivalence                   | R150     | TOCI    |
| 592 | boundary-f6cfd4ee52373fca85c0c7de | CI-OPT-01 compiler equivalence &gt; CACHE-SEMANTIC-OPTION preserves diagnostics across noFallthroughCasesInSwitch epochs                                                                            |          5132 | CI-OPT-01 compiler equivalence                   | R150     | TOCI    |
| 593 | boundary-fbce51018a937a5ea39ab03b | CI-OPT-01 compiler equivalence &gt; CACHE-SEMANTIC-OPTION preserves diagnostics across strictBindCallApply epochs                                                                                   |          5132 | CI-OPT-01 compiler equivalence                   | R150     | TOCI    |
| 594 | boundary-4207d7f16567e13f3ff066b0 | CI-OPT-01 compiler equivalence &gt; CACHE-OPTION-EPOCH does not reuse orphaned library ASTs after full to noLib changes                                                                             |          5174 | CI-OPT-01 compiler equivalence                   | R151     | TORCI   |
| 595 | boundary-843534b0a80a7bf01e03c003 | CI-OPT-01 library resolution &gt; CACHE-LIB-LOOKUP adds and deletes a virtual standard library replacement with fixed roots                                                                         |          5186 | CI-OPT-01 library resolution                     | R152     | TSRCI   |
| 596 | boundary-c92e2c1b3afa84e913d3ca3c | native Node diagnostic opt-in isolation &gt; NODE-DIAGNOSTIC includes real installed declarations without weakening complete adapter diagnostics                                                    |          5310 | native Node diagnostic opt-in isolation          | R153     | TCI     |
| 597 | boundary-fd1d7d2d4b85f8c958370d52 | native Node diagnostic opt-in isolation &gt; NODE-DIAGNOSTIC-CLIENT keeps the existing client program without Node roots or globals                                                                 |          5349 | native Node diagnostic opt-in isolation          | R154     | TCI     |
| 598 | boundary-bc213a503fffbaa7775ef7f2 | native Node diagnostic opt-in isolation &gt; NODE-DIAGNOSTIC-BINDING preserves the noLib types-empty binding environment without Node globals                                                       |          5370 | native Node diagnostic opt-in isolation          | R155     | TCI     |

## Registration expectation contracts

Each original registration is moved as one atomic unit, including parameter table and complete callback. The hashes cover exact original bytes. Principal expectations below are verbatim outer matcher calls; called helper expectation contracts are interned separately. A callback that delegates all assertions may have no direct matcher calls. Every expanded row references the unchanged contract and its own complete case title.

### R001 — JSDOC-01 rejects the diagnostics-clean consecutive-block typedef finding

Original lines 1164–1171. Callback SHA-256 `9903f98784e78c21326957e9ffcdbbec3313b19cd1a8f711b027935d09afa179`; registration SHA-256 `5413469438a05c57c4c7319ee05b5b3909c3432c758a8b47c974046b6c9af6f0`. Explicit timeout: inherited unchanged. Helper contracts: H001, H002, H003, H004, H005, H006, H007, H008.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R002 — JSDOC-02 rejects the diagnostics-clean consecutive-block import tag

Original lines 1172–1180. Callback SHA-256 `ec1dd351fa6b6039fded0ac9d7d3e135f6db8115ddfa4d1ce3ad85d7a5065585`; registration SHA-256 `07b9443c4ea8a73826f991f3b8b361d178bfd83cc0f037c74f261520c0056720`. Explicit timeout: inherited unchanged. Helper contracts: H001, H002, H003, H004, H005, H006, H007, H008.

```typescript
expect(ts.isJSDocImportTag(jsdocImports(result)[0]!)).toBe(true)
```

### R003 — %s rejects compiler-recognized inline import types

Original lines 1181–1200. Callback SHA-256 `b41f51294d32dc09eb4754ace0909be28f4f3f354d1e2a92a5db27301537d62e`; registration SHA-256 `085d4b7c16fbd4a7b0127d3990529237700cba061793a006a5da41476e868e79`. Explicit timeout: inherited unchanged. Helper contracts: H001, H002, H003, H004, H005, H006, H007, H008.

```typescript
expect(ts.isImportTypeNode(jsdocImports(result)[0]!)).toBe(true)
```

### R004 — JSDOC-06 permits a diagnostics-clean harmless local type import

Original lines 1201–1212. Callback SHA-256 `9348ef7ba97d092c2f1e383c2ebb33e89f8414c89d4a596dab43816ddb001fb8`; registration SHA-256 `7324d6a4bb4524a62947c9410f6f2b11fee406944cf86b00ede8ce35f19b2d01`. Explicit timeout: inherited unchanged. Helper contracts: H001, H007, H008, H002, H003, H004, H005, H006.

```typescript
expect(assertClientIsolation(result.environment).codeEdges).toMatchObject([
  { origin: 'jsdoc-type-import', runtime: false, explicitMarker: false },
])
```

### R005 — %s traverses diagnostics-clean type reexport wrappers

Original lines 1213–1230. Callback SHA-256 `eeea0a5a6891c520f037460b344fb077db11f74e2f2f7b4b2ab66799da277929`; registration SHA-256 `e89939b40333179094de0e65a9d0ce792b10478e3cf7c8aeeb11c91d9965ab5e`. Explicit timeout: inherited unchanged. Helper contracts: H001, H007, H008, H002, H003, H004, H005, H006.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R006 — JSDOC-09 reuses canonical project alias resolution

Original lines 1231–1242. Callback SHA-256 `90b6871f74ce3b348a142631d8603bd8b4729a4d713b73c0fc9ed6e2069976dc`; registration SHA-256 `e151d60cfd1b2ad2925b4a1592c10b1a5869365d6cdc74031caa517fce049f6d`. Explicit timeout: inherited unchanged. Helper contracts: H001, H007, H008, H002, H003, H004, H005, H006.

```typescript
expect(result.environment.resolve('@/__jsdoc-wrapper', result.source.fileName)).toBe(
  path.join(projectRoot, 'src/__jsdoc-wrapper.ts'),
)
```

### R007 — JSDOC-10 reuses canonical relative adapter resolution

Original lines 1243–1250. Callback SHA-256 `c4eac6371462e1aa5a97876c153cfa51d100c305eec1292fa7f69e6ab89a6233`; registration SHA-256 `95bb59cf88f9f0ba28f1171ec16c58bd47da21998ed459f2ba214c3783ff8e44`. Explicit timeout: inherited unchanged. Helper contracts: H001, H007, H008, H002, H003, H004, H005, H006.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R008 — JSDOC-11 fails closed for a missing local type import with expected diagnostic

Original lines 1251–1263. Callback SHA-256 `1181c4fdbbbcfd4d19a912fd45573c6c22ba6926a5b223c16005c5c1bc93b925`; registration SHA-256 `eef153d1c3ffca9a596fb03c8947986fa985e78eadcd74d8c00718b41892079a`. Explicit timeout: inherited unchanged. Helper contracts: H008, H002, H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(result.program).map((diagnostic) => diagnostic.code)).toEqual([
  2307,
])
expect(jsdocImports(result)).toHaveLength(1)
expect(result.environment.resolve('./__jsdoc-missing', result.source.fileName)).toBeUndefined()
```

### R009 — JSDOC-12 ignores prose import text and harmless runtime-capability type names

Original lines 1264–1272. Callback SHA-256 `a81fdcac82141b118196a8101668cf3e4c1d78bed28cc583ea7f9393e9a71463`; registration SHA-256 `2188aed4f81f0892d62702264a0d95f11d09e66c7a3df64c2ad090e2c9084c3a`. Explicit timeout: inherited unchanged. Helper contracts: H001, H008, H002, H003, H004, H005, H006.

```typescript
expect(jsdocImports(result)).toEqual([])
expect(dependencies(result.source, result.program.getTypeChecker())).toEqual([])
```

### R010 — %s cannot use JSDoc imports as a runtime guard

Original lines 1273–1315. Callback SHA-256 `b757ae228450594d81077e4f98da63b50ac0ff22c2ea7dd2d0a18f745c7f3ef6`; registration SHA-256 `11061d6bcd0ee446aafce09490c6c7807798209765773dad45a67342e067fdba`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(() => assertBoundary(result.sources, result.clients)).toThrow(message)
expect(edges).toHaveLength(1)
expect(edges[0]).toMatchObject({ runtime: false, explicitMarker: false })
expect(edges).toHaveLength(0)
```

### R011 — %s terminates a diagnostics-clean type cycle

Original lines 1316–1336. Callback SHA-256 `524c13f57d32dfba8a2d32fcd2ee4cd73782f20a0ad2fffcd5d4f0ea56e68d55`; registration SHA-256 `915573057acb284f91e5368428c8d9a032010f8cd86f5c16bf48776736f163eb`. Explicit timeout: inherited unchanged. Helper contracts: H001, H007, H008, H002, H003, H004, H005, H006.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R012 — JSDOC-16 rejects diagnostics-clean JSX with consecutive JSDoc blocks

Original lines 1337–1347. Callback SHA-256 `5f8ef5b75ba46ce90751c550025be75ce277d0af745c353a3770ed26d9333ef4`; registration SHA-256 `65dc5e4f152423dd68c00a73afb5efb52388c3d8cad02024d69267fd00fd082d`. Explicit timeout: inherited unchanged. Helper contracts: H001, H007, H008, H002, H003, H004, H005, H006.

```typescript
expect(result.source.fileName.endsWith('.jsx')).toBe(true)
```

### R013 — JSDOCKIND-01 permits TS documentary @type import of the adapter

Original lines 1425–1438. Callback SHA-256 `9ad781c2e054522a6f2e547a959f31d618d0c7051e3f3064f03ded1bbefb7e36`; registration SHA-256 `62034803d7caab9be7394f9f5dd274d736537c6b77d9ef51fa9073f28284c0be`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.TS)
expect(jsdocImports(result)).toHaveLength(1)
expect(ts.isImportTypeNode(jsdocImports(result)[0]!)).toBe(true)
expect(jsdocTypeEdges(result)).toEqual([])
expect(result.program.getSourceFile(path.join(moduleRoot, 'index.ts'))).toBeUndefined()
```

### R014 — JSDOCKIND-02 permits TSX documentary @type import of the adapter

Original lines 1439–1451. Callback SHA-256 `6523d1cebe4610da640e827536d3a30732c0f75e1b256fbb769d361cf6723625`; registration SHA-256 `bfbd9dca8c09f12738b25140a9b9b443cc9c6487b0359a602e1c0a36b51fb3fb`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.TSX)
expect(jsdocImports(result)).toHaveLength(1)
expect(jsdocTypeEdges(result)).toEqual([])
expect(result.program.getSourceFile(path.join(moduleRoot, 'index.ts'))).toBeUndefined()
```

### R015 — JSDOCKIND-03 permits TS documentary @typedef import of the adapter

Original lines 1452–1464. Callback SHA-256 `2a769cbb79ea1c534778bac72c689d83b3e8d3d4cb377a5738938d70c7a51ad9`; registration SHA-256 `ce70381f282156f909a588fd020c95c0ddb355be313df9b5055e3ee72145345f`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.TS)
expect(jsdocImports(result)).toHaveLength(1)
expect(jsdocTypeEdges(result)).toEqual([])
expect(result.program.getSourceFile(path.join(moduleRoot, 'index.ts'))).toBeUndefined()
```

### R016 — JSDOCKIND-04 permits TS/TSX documentary @import when the compiler ignores it

Original lines 1465–1488. Callback SHA-256 `5290f79ca498e8a0cd73b6d4e3397a15239c3caaa6bf0925a54d9a7d9c25ba24`; registration SHA-256 `42539a539fa99413acd41251b116b27883268c1ac3972e7f44a97efcc3eeb592`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(tsResult.source)).toBe(ts.ScriptKind.TS)
expect(compilerScriptKind(tsxResult.source)).toBe(ts.ScriptKind.TSX)
expect(ts.isJSDocImportTag(jsdocImports(tsResult)[0]!)).toBe(true)
expect(ts.isJSDocImportTag(jsdocImports(tsxResult)[0]!)).toBe(true)
expect(jsdocTypeEdges(tsResult)).toEqual([])
expect(jsdocTypeEdges(tsxResult)).toEqual([])
expect(tsResult.program.getSourceFile(path.join(moduleRoot, 'index.ts'))).toBeUndefined()
expect(tsxResult.program.getSourceFile(path.join(moduleRoot, 'index.ts'))).toBeUndefined()
```

### R017 — JSDOCKIND-05 rejects JS @typedef importing the adapter

Original lines 1489–1501. Callback SHA-256 `f11cecafab074f7b72ba85a890726983a584f01039c846111e0db4d891dc63df`; registration SHA-256 `178fc2ab2ada835cd397ad83342cbd8ed3a0c10103e3a6dd92c873d7b8e75366`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.JS)
expect(jsdocTypeEdges(result)).toMatchObject([
  { name: adapter, origin: 'jsdoc-type-import', runtime: false, explicitMarker: false },
])
```

### R018 — JSDOCKIND-06 rejects JSX JSDoc importing the adapter

Original lines 1502–1514. Callback SHA-256 `fadea23b039af9349a94fc5d2599385f93ca29707fdb8d263fa132c056c1c64a`; registration SHA-256 `06588032b2f1c7f461339e6f0d12a347b886d3da4704fcae40c1b6f62baf1e6c`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.JSX)
expect(jsdocTypeEdges(result)).toMatchObject([
  { name: adapter, origin: 'jsdoc-type-import', runtime: false, explicitMarker: false },
])
```

### R019 — JSDOCKIND-07 rejects JS @import importing the adapter

Original lines 1515–1528. Callback SHA-256 `15dc7aba5e6bcc5cc7c7adcaed1d680543eca6e3930908077cc7e57282757720`; registration SHA-256 `372debb83a872e12a93fb066b322082569b3449e82d38945f7698c5a183af12f`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.JS)
expect(ts.isJSDocImportTag(jsdocImports(result)[0]!)).toBe(true)
expect(jsdocTypeEdges(result)).toMatchObject([
  { name: adapter, origin: 'jsdoc-type-import', runtime: false, explicitMarker: false },
])
```

### R020 — JSDOCKIND-08 rejects TS real import type of the adapter

Original lines 1529–1542. Callback SHA-256 `62fd36f6f150e57cade3211314148753c7f8e4393233e7c713368b2fcafd51ce`; registration SHA-256 `482da91a4131bed338cde6b89a522bccba7b2b925f10d7ff81a254a265651b1d`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.TS)
expect(jsdocTypeEdges(result)).toEqual([])
expect(collected(result)).toMatchObject([{ name: adapter, runtime: false, explicitMarker: false }])
```

### R021 — JSDOCKIND-09 rejects TS real import type node of the adapter

Original lines 1543–1554. Callback SHA-256 `89be6517a707c781c401d8e13c4e1d186ea6da55dac2c875511473c1851323b2`; registration SHA-256 `33f9eafa790f91d8ded0de2f64513ab25bae57632d746d988cfdb3059d62ddd5`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.TS)
expect(jsdocTypeEdges(result)).toEqual([])
expect(collected(result)).toMatchObject([{ name: adapter, runtime: false }])
```

### R022 — JSDOCKIND-10 rejects TSX real import type of the adapter

Original lines 1555–1568. Callback SHA-256 `a0273930375d46ccfc7003f3aefe3ac4d4f3e68f2cc0854410bfe78e5c4028fc`; registration SHA-256 `a92ccbb2c9633f71a2080f2c4cefc1917e5a31c234562ae72e7803fda87a441c`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.TSX)
expect(jsdocTypeEdges(result)).toEqual([])
expect(collected(result)).toMatchObject([{ name: adapter, runtime: false, explicitMarker: false }])
```

### R023 — JSDOCKIND-11 permits TS/TSX real import type of an innocent module

Original lines 1569–1591. Callback SHA-256 `0d69d77de70e2a84cb0cb1cb816c6b70d4c2c58fef923b8ab8dd3d414a2fa203`; registration SHA-256 `b829db7154800a5a007beee3eee2229d651a924d0bf6ecd9448140add58825bf`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(tsResult.source)).toBe(ts.ScriptKind.TS)
expect(compilerScriptKind(tsxResult.source)).toBe(ts.ScriptKind.TSX)
expect(jsdocTypeEdges(tsResult)).toEqual([])
expect(jsdocTypeEdges(tsxResult)).toEqual([])
expect(collected(tsResult)).toMatchObject([
  { name: './__jsdockind-safe', runtime: false, explicitMarker: false },
])
```

### R024 — JSDOCKIND-12 rejects JS JSDoc through a wrapper to the adapter

Original lines 1592–1604. Callback SHA-256 `6cc11b19a7872d6009c340b153fb6f506044357dcfb1e78d4732c19b7729bca6`; registration SHA-256 `211afafebff3b11f494aa147d06854ec7e08b4ade42044666ec3f3c38cddd539`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.JS)
expect(jsdocTypeEdges(result)).toMatchObject([
  { name: './__jsdockind-wrapper', origin: 'jsdoc-type-import', runtime: false },
])
```

### R025 — JSDOCKIND-13 rejects JSX JSDoc through a wrapper to the adapter

Original lines 1605–1617. Callback SHA-256 `a03630f8086145df8d3fb61b854d3a5fa78223eccbbf31a1355b63cec64f9865`; registration SHA-256 `b205b63392f7df351c16c21200106da9c88d8ae27bb479f3b286246020adeb92`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.JSX)
expect(jsdocTypeEdges(result)).toMatchObject([
  { name: './__jsdockind-wrapper', origin: 'jsdoc-type-import', runtime: false },
])
```

### R026 — JSDOCKIND-14 permits TS/TSX documentary JSDoc plus a real innocent import

Original lines 1618–1632. Callback SHA-256 `dc7a8d3bc56f1ce3560ac2d56495b7fb01e57d9125aec7e07a29c6fd73f08195`; registration SHA-256 `93ae47f9d1d02fc7c78b18b54ce3e8ef65f8d44c1b3fcfa77e43c60e5fedc937`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.TS)
expect(jsdocImports(result)).toHaveLength(1)
expect(jsdocTypeEdges(result)).toEqual([])
expect(collected(result)).toMatchObject([
  { name: './__jsdockind-safe', runtime: false, explicitMarker: false },
])
```

### R027 — JSDOCKIND-15 rejects TS/TSX documentary JSDoc plus a real adapter import

Original lines 1633–1648. Callback SHA-256 `0b318ffff6aff5d6b79ec3fb5e4a8b638b79ec4d47953a8f3ce4f11a72664187`; registration SHA-256 `560dae2b240f0eae8fc4e7000718d3f1c37506eca2a995cf75a36f4342274e1b`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.TS)
expect(
  collected(result).some(
    (edge) =>
      edge.name === adapter && edge.runtime === false && edge.origin !== 'jsdoc-type-import',
  ),
).toBe(true)
```

### R028 — JSDOCKIND-16 rejects JS/JSX JSDoc used as a fabricated runtime guard

Original lines 1649–1688. Callback SHA-256 `49de555858ba96c98354bb72f4e286f478d91d776442a11c88de5bffc2b80963`; registration SHA-256 `50304b7e96e29c413e8bc844a45cbb479b6fefde4c3df28fe7ad002714599d4e`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(compilerScriptKind(source)).toBe(kind)
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(() => assertBoundary(sources)).toThrow(/contracts and secrets must remain server-only/)
expect(edges).toHaveLength(1)
expect(edges[0]).toMatchObject({
  name: 'server-only',
  runtime: false,
  explicitMarker: false,
})
```

### R029 — JSDOCKIND-17 ignores JSDoc prose naming require, module, globalThis, global, process

Original lines 1689–1711. Callback SHA-256 `5d12f8fa8cd482021ee7e82c76b021b6158b22abd20ae4951ace183beb6be45d`; registration SHA-256 `fbf71108a81ceb4f05f6d4d4e136dba9f1b7c4e7f06ae48058346ddb33889012`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(js.source)).toBe(ts.ScriptKind.JS)
expect(compilerScriptKind(tsResult.source)).toBe(ts.ScriptKind.TS)
expect(jsdocImports(js)).toEqual([])
expect(jsdocImports(tsResult)).toEqual([])
expect(collected(js)).toEqual([])
expect(collected(tsResult)).toEqual([])
```

### R030 — JSDOCKIND-18 keeps JS/JSX JSDoc type-only while preserving a real runtime import

Original lines 1712–1736. Callback SHA-256 `08e558598f19bbdfa54f745af9bf06b6928ef39bc948ceb9fb74aec728ced485`; registration SHA-256 `5882484ec9f9f306babaa35a5be80bd7fae7870a07dd1fbcc81014ef5a97b620`. Explicit timeout: inherited unchanged. Helper contracts: H009, H010, H003, H004, H005, H006.

```typescript
expect(compilerScriptKind(result.source)).toBe(ts.ScriptKind.JS)
expect(collected(result)).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      name: adapter,
      origin: 'jsdoc-type-import',
      runtime: false,
      explicitMarker: false,
    }),
    expect.objectContaining({
      name: './__jsdockind-runtime',
      runtime: true,
    }),
  ]),
)
expect(jsdocTypeEdges(result)).toHaveLength(1)
```

### R031 — TSTYPES-01 rejects the diagnostics-clean original global-contract finding

Original lines 1791–1817. Callback SHA-256 `bf403bfa98086b976310ebec5dd93376f7278f5bef8e83f39e1b705589031c57`; registration SHA-256 `507ffaf9a84f1e92f5ca2b0d3e712bcf6518e4441eb693a23026966df4a7a5bc`. Explicit timeout: inherited unchanged. Helper contracts: H011, H012, H003, H004, H005, H006.

```typescript
expect(source.referencedFiles).toEqual([])
expect(source.typeReferenceDirectives.map((reference) => reference.fileName)).toEqual([
  './__b-types-wrapper.d.ts',
])
expect(result.program.getSourceFile(path.join(projectRoot, wrapperName))).toBeDefined()
expect(result.program.getSourceFile(path.join(moduleRoot, '__b-types-contract.ts'))).toBeDefined()
expect(dependencies(source, result.program.getTypeChecker())).toMatchObject([
  {
    name: './__b-types-wrapper.d.ts',
    origin: 'triple-slash-types-local',
    runtime: false,
    explicitMarker: false,
  },
])
```

### R032 — TSTYPES-02 traverses two diagnostics-clean declaration wrappers

Original lines 1819–1835. Callback SHA-256 `a300d2b15cd5b990bf8ef0b732b5ae601239592a9d940bad224eb29416a83b62`; registration SHA-256 `d1b3d0cb4a33e4c9a7c41199ca7ad2ced4be2378d5f2a0b6cc04ce6733559456`. Explicit timeout: inherited unchanged. Helper contracts: H011, H012, H003, H004, H005, H006.

```typescript
expect(
  result.program.getSourceFile(path.join(projectRoot, 'src/__b-types-second.d.ts')),
).toBeDefined()
```

### R033 — TSTYPES-03 permits a diagnostics-clean harmless wrapper with a type-only edge

Original lines 1837–1851. Callback SHA-256 `0c6e41330475f1fb1015a7a8efe1454fc7b8b40a5c856b3ca7e386cd1e0d40f4`; registration SHA-256 `5e0f76f45619f4f2722da9f11476db9aef68dd7376ca8383f8f8e056da5e3ef0`. Explicit timeout: inherited unchanged. Helper contracts: H011, H012, H003, H004, H005, H006.

```typescript
expect(assertClientIsolation(result.environment).codeEdges).toEqual([
  {
    importer: path.join(projectRoot, clientName),
    name: './__b-types-wrapper.d.ts',
    target: path.join(projectRoot, wrapperName),
    origin: 'triple-slash-types-local',
    runtime: false,
    explicitMarker: false,
  },
])
```

### R034 — TSTYPES-04 fails closed for missing local types with expected compiler diagnostics

Original lines 1853–1859. Callback SHA-256 `a930d25a8295dea64215cf617fbac3d3b533c1b0167d3279ec088c39366e62b4`; registration SHA-256 `65b7e8ed7ae9e94999016bb3ccc9480cc37186b4dcaed8aa024c96878184a220`. Explicit timeout: inherited unchanged. Helper contracts: H012, H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(result.program).map((diagnostic) => diagnostic.code)).toEqual([
  2688,
])
```

### R035 — TSTYPES-05 rejects diagnostics-clean declare-global namespace ownership

Original lines 1861–1871. Callback SHA-256 `67309517bf2a2c3d66f6309e0f20acb638f4247225c4b5d566a867008beb7ec6`; registration SHA-256 `5f8d29c0ec5f089bc4c0f07ee77e6df96f136feaca60b7fd4cd33e63dc11e8c4`. Explicit timeout: inherited unchanged. Helper contracts: H011, H012, H003, H004, H005, H006.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R036 — TSTYPES-06 canonicalizes effective local filename %s

Original lines 1873–1892. Callback SHA-256 `929873ed8ede96cde692f513599ebac28f553fca276c4a6ae030363f33860cd9`; registration SHA-256 `5b4019d2300dbe631bfd2174b773090d2a6f17ab71414eb5eed144d16401f6d4`. Explicit timeout: inherited unchanged. Helper contracts: H011, H003, H004, H012, H005, H006.

```typescript
expect(target).toBe(path.join(projectRoot, wrapperName))
expect(result.program.getSourceFile(target!)?.fileName).toBe(target)
expect(assertClientIsolation(result.environment).codeEdges.map((edge) => edge.target)).toEqual([
  target,
])
```

### R037 — TSTYPES-07 preserves the separate types package/library channel

Original lines 1911–1913. Callback SHA-256 `ad0990bf75b52d490e81c829f438365f304e213222a776cdf0a4fb74e1c2aaec`; registration SHA-256 `a94d0862158f815837026ae4623ca9b0a3d5a5ed06b916e08527bc973a9db599`. Explicit timeout: { timeout: 12000 }. Helper contracts: H013, H011, H003, H004, H012, H005, H006.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R038 — %s preserves the separate %s package/library channel

Original lines 1915–1918. Callback SHA-256 `7d592d3aaaeb5afc07a5a2f8a4c29e0818d6addd12b642f3e3983fefe027dbee`; registration SHA-256 `600d8015759b234639f933b8c1dfaab8f8a0c89134f8bed9ab1d137f5b412a74`. Explicit timeout: inherited unchanged. Helper contracts: H011, H003, H004, H012, H005, H006.

```typescript
expect(
  channel === 'types' ? source.typeReferenceDirectives : source.libReferenceDirectives,
).toHaveLength(1)
expect(dependencies(source, current.program.getTypeChecker())).toEqual([])
expect(assertClientIsolation(current.environment).codeEdges).toEqual([])
```

### R039 — %s cannot fabricate runtime or explicit-marker protection

Original lines 1920–1970. Callback SHA-256 `ded8c5aa89bbdcfc95b1989cf3478edd1e7671d977405e8ecf63de43bfac81a6`; registration SHA-256 `1796973d4fe41f0a1b58daf03ac0b2821fef9deb252f8fe779b83839278ed2da`. Explicit timeout: inherited unchanged. Helper contracts: H011, H005, H006, H003, H004.

```typescript
expect(edge).toMatchObject({ runtime: false, explicitMarker: false })
expect(
  result.environment.internalTarget(
    edge.name,
    filename as string,
    edge.origin,
    edge.resolutionMode,
  ),
).toBe(_id === 'TSTYPES-09-MARKER' ? '__b-types-marker.d.ts' : 'server/__b-types-guard.d.ts')
expect(() => assertBoundary(sources)).toThrow(message as RegExp)
```

### R040 — %s terminates diagnostics-clean declaration cycles (adapter branch: %s)

Original lines 1972–1992. Callback SHA-256 `67afe110310b80f01835346753e41d3d74bf606cfd676b727e23dea77e997c92`; registration SHA-256 `216de90d9ca2d1941e61e0a90d226c2956fe05cddb6555448668cdc53e80db1b`. Explicit timeout: inherited unchanged. Helper contracts: H011, H012, H003, H004, H005, H006.

```typescript
expect(assertClientIsolation(result.environment).codeEdges).toHaveLength(3)
```

### R041 — TSTYPES-12 traverses diagnostics-clean combined %s then %s channels

Original lines 1994–2010. Callback SHA-256 `0d50392be990bb0995ae2607960dd6e69e822ef4c5d62ea4ed809d7fc829ae51`; registration SHA-256 `ec0020df6f72952b5465aab58028abadf647c5c568c81ede73723b18aeabda33`. Explicit timeout: inherited unchanged. Helper contracts: H011, H012, H003, H004, H005, H006.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R042 — TSTYPES-13 rejects diagnostics-clean direct adapter declaration reference

Original lines 2012–2024. Callback SHA-256 `eb7fe0336d694cba4676b02a850ce6658c7c330a373966abbdcffb4d682b96a5`; registration SHA-256 `dc5fc9b6a8095b71f123f222f38aa29023f04e04741fdf9124c77761c236ef3d`. Explicit timeout: inherited unchanged. Helper contracts: H011, H012, H003, H004, H005, H006.

```typescript
expect(current.program.getSourceFile(path.join(moduleRoot, '__b-types-direct.d.ts'))).toBeDefined()
```

### R043 — TSTYPES-14 permits diagnostics-clean ordinary sources without references

Original lines 2026–2039. Callback SHA-256 `919b5336d26c8ae709c61a631906e96b7f66c818d71c0efecc51ef8d62f4c429`; registration SHA-256 `ca4ff92e782498891c31bcbab9146e501c7cc6ce0711e243e823d82daa42ae33`. Explicit timeout: inherited unchanged. Helper contracts: H011, H003, H004, H012, H005, H006.

```typescript
expect(
  dependencies(
    current.program.getSourceFile(path.join(projectRoot, clientName))!,
    current.program.getTypeChecker(),
  ),
).toEqual([])
expect(assertClientIsolation(current.environment).codeEdges).toEqual([])
```

### R044 — TSTYPES-EXT allows effective diagnostics-clean local %s declarations

Original lines 2041–2057. Callback SHA-256 `6cad73bcd3d07075eea41890dbf6ad37957ee82c878e84dbc12eda57c35c11bc`; registration SHA-256 `58d2d4d3deae4f238b8fca9a4388b43cfad4fc5ec4a9403c10ad0563ebff804c`. Explicit timeout: inherited unchanged. Helper contracts: H011, H003, H004, H012, H005, H006.

```typescript
expect(result.program.getSourceFile(path.join(projectRoot, name))).toBeDefined()
expect(edges).toHaveLength(1)
expect(edges[0]!.target).toBe(path.join(projectRoot, name))
```

### R045 — TSTYPES-EXT rejects diagnostics-clean adapter ownership through local %s declarations

Original lines 2059–2073. Callback SHA-256 `1d9a2b5c46473ef289a8c2b1b437a19ddb72d7402b65bf9a63656468e3dd7119`; registration SHA-256 `1a01cb9d2f7396b06f685246cd3d59480eb6284c85dafa640d902f5c996ff6a7`. Explicit timeout: inherited unchanged. Helper contracts: H011, H012, H003, H004, H005, H006.

```typescript
expect(result.program.getSourceFile(path.join(projectRoot, name))).toBeDefined()
```

### R046 — TSTYPES-MODE preserves public directive resolution-mode=%s

Original lines 2075–2102. Callback SHA-256 `0c599566bc6c64040bb1518bff4bf3873d836835b56167fa8c74ad08297727f7`; registration SHA-256 `697d2445e57abee07f8395134702b56891c7b06999ed573902cb630259146229`. Explicit timeout: inherited unchanged. Helper contracts: H011, H012, H003, H004, H005, H006.

```typescript
expect(edges).toHaveLength(1)
expect(edge.resolutionMode).toBe(mode === 'import' ? ts.ModuleKind.ESNext : ts.ModuleKind.CommonJS)
expect(
  current.environment.resolveDependency(
    edge.name,
    source.fileName,
    edge.origin,
    edge.resolutionMode,
  ),
).toBe(path.join(projectRoot, wrapperName))
```

### R047 — TSTYPES-BOUNDED fails closed for unsupported explicit-local %s

Original lines 2104–2120. Callback SHA-256 `b7dbe297959956044a110faff0b4f9981b7137f229796aef721f765237e25597`; registration SHA-256 `77ee1f14c1b4a926e70f86adf63d7a318ff4e314fea48c2d48075b2f1fa5eef4`. Explicit timeout: inherited unchanged. Helper contracts: H012, H003, H004, H005, H006.

```typescript
expect(
  result.environment.resolveDependency(
    reference,
    path.join(projectRoot, clientName),
    'triple-slash-types-local',
  ),
).toBeUndefined()
```

### R048 — TSTYPES-LOCAL-SEPARATOR rejects diagnostics-clean Windows-relative wrapper ownership

Original lines 2122–2132. Callback SHA-256 `0706c3834cf5b0574e2ab8a76e1392d98b23515efb2cf9290bdf7b92c3ca8d54`; registration SHA-256 `b3877ac80960d40f3ee66503e401ccf92f64d9056afb53f398851a3fa2f272bd`. Explicit timeout: inherited unchanged. Helper contracts: H011, H012, H003, H004, H005, H006.

```typescript
expect(result.program.getSourceFile(path.join(projectRoot, wrapperName))).toBeDefined()
```

### R049 — TSTYPES-CONSUMER rejects diagnostics-clean adapter-local types reaching a consumer module

Original lines 2134–2163. Callback SHA-256 `fd9cc1945d8398a15c911d11970fed116fdb010ce25bff1956a4ac1c1b8b9663`; registration SHA-256 `ee15e7bf77a1d744788e6cc0a349a92baf203749551df137d16002ba2d8d3794`. Explicit timeout: inherited unchanged. Helper contracts: H011, H005, H006, H003, H004.

```typescript
expect(
  result.environment.internalTarget(
    '../catalog/__b-types-consumer.d.ts',
    '__b-types-consumer.d.ts',
    'triple-slash-types-local',
  ),
).toBeUndefined()
expect(
  result.environment.resolveDependency(
    '../catalog/__b-types-consumer.d.ts',
    path.join(moduleRoot, '__b-types-consumer.d.ts'),
    'triple-slash-types-local',
  ),
).toBe(path.join(projectRoot, 'src/modules/catalog/__b-types-consumer.d.ts'))
expect(() => assertBoundary(sources, clients)).toThrow(/consumer dependency/)
```

### R050 — TSTYPES-ADAPTER-MISSING fails closed for missing adapter-local declarations

Original lines 2165–2181. Callback SHA-256 `3888b734fb036b57b4bd483e258686c9bb0168cdadc46afb48d342d3b917091b`; registration SHA-256 `f74feb68496c3af69828261395b16df365d4c714c5c55c568b678a6920845040`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(result.program).map((diagnostic) => diagnostic.code)).toEqual([
  2688,
])
expect(() => assertBoundary(sources)).toThrow(unresolved)
```

### R051 — TSREF-01 rejects diagnostics-clean triple-slash declaration wrapper ownership

Original lines 2184–2231. Callback SHA-256 `b692b2a9deee514a34aacac040d675c6cadb6b6ce0ea3497a4fb069ab4b1f966`; registration SHA-256 `8b08d5723ff10e70eba23d985fac8b768372aae781baa6601e359e050e3e765b`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(source.referencedFiles.map((reference) => reference.fileName)).toEqual([
  './__tsref-globals.d.ts',
])
expect(program.getSourceFile(path.join(projectRoot, 'src/__tsref-globals.d.ts'))).toBeDefined()
expect(dependencies(source, program.getTypeChecker())).toEqual([
  {
    name: './__tsref-globals.d.ts',
    runtime: false,
    explicitMarker: false,
    origin: 'triple-slash-path',
    node: source,
  },
])
expect(() => assertClientIsolation(environment)).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
expect(() => assertBoundary(sources, clients)).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
```

### R052 — TSREF-02 traverses two diagnostics-clean declaration wrappers

Original lines 2279–2298. Callback SHA-256 `b1bbee125159dcd618e658f1aef64f93ad5fd6bcac2befce1509006906ba9c55`; registration SHA-256 `6c0e450e142a6709fba8b150044f9f9243a48ab570ceef36b616c871a098f404`. Explicit timeout: inherited unchanged. Helper contracts: H014, H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(program.getSourceFile(path.join(projectRoot, 'src/__tsref-second.d.ts'))).toBeDefined()
```

### R053 — TSREF-03 allows a diagnostics-clean harmless declaration wrapper

Original lines 2300–2317. Callback SHA-256 `25e70f5ae25aa351fb557b341e8a0b57e7e41e66d8a1739e68cee358a289f71e`; registration SHA-256 `63c0adb96bb9f24606d27a24d80c545008b6d87e7ea622f9c5a60958e0fe4d79`. Explicit timeout: inherited unchanged. Helper contracts: H014, H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
expect(assertClientIsolation(result.environment).codeEdges).toEqual([
  {
    importer: path.join(projectRoot, clientName),
    name: './__tsref-wrapper.d.ts',
    target: path.join(projectRoot, wrapperName),
    origin: 'triple-slash-path',
    runtime: false,
    explicitMarker: false,
  },
])
```

### R054 — TSREF-04 fails closed for missing exact project-local paths

Original lines 2319–2331. Callback SHA-256 `30751a4545aecff0b6740bb739ee03686bb302b3eeae5bc4450e12808f1321d3`; registration SHA-256 `7fd1c9a5fa453c702f769a8150a10a4854b84d2785634ffdd1fd493c903ead28`. Explicit timeout: inherited unchanged. Helper contracts: H014, H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(result.program).map((diagnostic) => diagnostic.code)).toContain(
  6053,
)
expect(
  result.environment.resolveReferencePath(
    './__tsref-missing.d.ts',
    path.join(projectRoot, clientName),
  ),
).toBeUndefined()
```

### R055 — TSREF-05 rejects a diagnostics-clean direct adapter declaration reference

Original lines 2333–2348. Callback SHA-256 `c89dfc90106d54bf4212a2cfd9ba70911ab4dedb6e956a43b3016f82b4c50921`; registration SHA-256 `00f72db1e1cbd8d18041e9f10f3da650ca8a71d91b6ac61da5a3f22711dd4ce5`. Explicit timeout: inherited unchanged. Helper contracts: H014, H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(program.getSourceFile(path.join(moduleRoot, '__tsref-direct.d.ts'))).toBeDefined()
```

### R056 — TSREF-06 rejects diagnostics-clean global namespace wrapper ownership

Original lines 2350–2359. Callback SHA-256 `0fe47d8384c4dbfe1c468b41e123237413eaedd88f17a482a21a06a82a1dc211`; registration SHA-256 `f4a47d12afaeba81d9413ce0f45e41dc38f6d762c3ca8a62d989423e23c129f1`. Explicit timeout: inherited unchanged. Helper contracts: H014, H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
```

### R057 — TSREF-07 allows diagnostics-clean sources without triple-slash references

Original lines 2361–2379. Callback SHA-256 `f21191fc2c77859afffc709ebc5ef9662cbd8723a7636b8a2156eb110c555dbf`; registration SHA-256 `1cc163fbe14cf45fa2976ea087a80af03019603a2c27dc8230984557a2e92a3d`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(
  dependencies(
    program.getSourceFile(path.join(projectRoot, clientName))!,
    program.getTypeChecker(),
  ),
).toEqual([])
expect(assertClientIsolation(environment).codeEdges).toEqual([])
expect(() => assertBoundary(result.sources, result.clients)).not.toThrow()
```

### R058 — %s keeps other directive channels separate

Original lines 2405–2408. Callback SHA-256 `29c995c93275a6662ddfca9dfe2d75289112eb710c6a0e9abd4b48cd4fb61b7b`; registration SHA-256 `6d8818b36b5bf844a03073cdd0f701022b7cc8f66e6867b0a559be8b763041c3`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(source.referencedFiles).toEqual([])
expect(
  channel === 'lib' ? source.libReferenceDirectives : source.typeReferenceDirectives,
).toHaveLength(1)
expect(dependencies(source, program.getTypeChecker())).toEqual([])
expect(assertClientIsolation(environment).codeEdges).toEqual([])
expect(() => assertBoundary(result.sources, result.clients)).not.toThrow()
```

### R059 — TSREF-09 keeps other directive channels separate

Original lines 2410–2412. Callback SHA-256 `ff2eb4fee193d05ab09e0bafe7faa04e1ddf5db6cb11cd1a5936f9ca248ce80f`; registration SHA-256 `1efa3cc0486b4482971c8d4ca559ebb3ebf002fdfd1b38bb65e9ebfef58ebc8e`. Explicit timeout: { timeout: 10000 }. Helper contracts: H015, H003, H004, H005, H006.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R060 — %s cannot fabricate positive runtime guards

Original lines 2414–2457. Callback SHA-256 `a547fa5817a071d0296ed3ad515f34b85af371b03b0ed4ef698ff625480a0ed5`; registration SHA-256 `d3d2bac3369b79e539f8ffb14776d385ca800071ecc61d48ea66034f3187493a`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(reference).toMatchObject({ runtime: false, explicitMarker: false })
expect(environment.internalTarget(reference.name, filename, reference.origin)).toBe(
  filename === 'index.ts' && _id === 'TSREF-10-MARKER' ? 'server-only.ts' : 'server/index.ts',
)
expect(assertClientIsolation(environment).codeEdges).toEqual([])
expect(() => assertBoundary(sources)).toThrow(message)
```

### R061 — %s terminates declaration cycles (adapter branch: %s)

Original lines 2459–2482. Callback SHA-256 `46287bb5a52f9f2b7be1e96e9a2fd9979ccf67114d1726c4379a41025f119987`; registration SHA-256 `557c996f7bc1bd9056560b3853827e5eb0511c43bcc17fd42ca92d0ad8f54763`. Explicit timeout: inherited unchanged. Helper contracts: H014, H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(assertClientIsolation(environment).codeEdges).toHaveLength(3)
```

### R062 — converges exact reference %s to compiler and overlay identity

Original lines 2484–2501. Callback SHA-256 `c557410830356ca1b5708c55aa9344b415cc6ff8f72c75a0d597cdfd90cd9b15`; registration SHA-256 `159fa17576af7c8707ddfbb557d6321c3f4ae17a4517b098d8615ef7a833286b`. Explicit timeout: inherited unchanged. Helper contracts: H014, H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
expect(target).toBe(path.join(projectRoot, wrapperName))
expect(result.program.getSourceFile(target!)?.fileName).toBe(target)
expect(assertClientIsolation(result.environment).codeEdges.map((edge) => edge.target)).toEqual([
  target,
])
```

### R063 — fails closed for bounded unsupported %s (%s)

Original lines 2503–2522. Callback SHA-256 `a58926eda3bf1710874b8c45758c9641c151c3cf9994707130978b29a00e88e2`; registration SHA-256 `5cdf1c7081802afba9429e22b94834d51b79520f2b610027256ccd7038c633de`. Explicit timeout: inherited unchanged. Helper contracts: H014, H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
expect(result.program.getSourceFile(path.join(projectRoot, wrapperName))).toBeDefined()
expect(
  result.environment.resolveReferencePath(reference, path.join(projectRoot, clientName)),
).toBeUndefined()
```

### R064 — resolves adapter server-to-root reference paths without module extension substitution

Original lines 2524–2542. Callback SHA-256 `19994cb33775198ba22e5ff759275fd6e509c7fc679a8fc684c26fcd277f1569`; registration SHA-256 `5e609529db1e672a345c75d1242bb71eff16369306db9c3200d7e8f8b60e8df7`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(
  environment.internalTarget('../index.ts', 'server/__tsref-root.d.ts', 'triple-slash-path'),
).toBe('index.ts')
expect(() => assertBoundary(sources)).toThrow(/server must not depend on root/)
```

### R065 — SECRET-DIAGNOSTICS keeps every static and harmless secret fixture diagnostics-clean

Original lines 2587–2600. Callback SHA-256 `fe793674852406560ec4ca20f7d2d3099dd625f82ee51f09f2c67eaa4091efe6`; registration SHA-256 `603078af9419e1cdeee41042a53de9c9c4866806c02d30ababaf8956dc9606a6`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
```

### R066 — %s rejects unguarded static ambient process.env through the full boundary

Original lines 2602–2609. Callback SHA-256 `d2d0ce59b9854892573da89a5f1d6daffc4c21ebb55934d9f1854f9c2bc0539e`; registration SHA-256 `4ce30b078001f750dbdcc348718c765c0274e8114de9ee8ae4707718a64c9e69`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow(/contracts and secrets must remain server-only/)
```

### R067 — SECRET-GREEN-04 accepts guarded bracket process.env through the full boundary

Original lines 2611–2615. Callback SHA-256 `dce1fdcfcad2f037d1f1a2abeb93c3bd4f2a77496f5eed914156b359be10a475`; registration SHA-256 `819cdfcd9f6d120726b01d8a394813ac1b01239915fee8847ca62d099e936e99`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).not.toThrow()
```

### R068 — %s preserves harmless process-like sources through the full boundary

Original lines 2617–2624. Callback SHA-256 `3bcc8d4bada92280efc296a0065773482994d8b6fed5ff417d4674874b894941`; registration SHA-256 `efc65f42765b0d14f3371a9f4cd48fa37b09788921b9c7a0f5a486fabef82c82`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).not.toThrow()
```

### R069 — POST-RETIREMENT allows unrelated client %s types

Original lines 2626–2662. Callback SHA-256 `ee0aaf193fc2dba4dce4d040f20814cb81a34d6da9249872586dc75424b5ee3a`; registration SHA-256 `1f5a8870343761718d914fcd835d7093df340afd7c2c93b941a2c81d98f87f11`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(
  dependencies(program.getSourceFile(path.join(projectRoot, name))!, program.getTypeChecker()),
).toEqual([])
expect(() => assertBoundary(sources, clients)).not.toThrow()
```

### R070 — POST-RETIREMENT accepts exact CSS overlays through the full boundary

Original lines 2664–2677. Callback SHA-256 `7741dda31e01623f4a2dbca002d4a9285bcf6c5dbe8ac3407b7c163a32531667`; registration SHA-256 `68fd4469902e4d21029d62b33a15208af79b98d0b41965a28176f968cd917cbe`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(assertClientIsolation(sourceEnvironment(sources, clients)).terminalCssEdges).toHaveLength(1)
expect(() => assertBoundary(sources, clients)).not.toThrow()
```

### R071 — %s applies the whole-global root policy through graph and full boundary

Original lines 2679–2829. Callback SHA-256 `856ddc044b700ff62461d3d49b1330fd3b294d8e33d38eb7aacb868105b14bfb`; registration SHA-256 `4ffa65cb96580b6775eb7a7d99046f6dc16613b88d77b2f82dc9927feb3e9312`. Explicit timeout: 120000. Helper contracts: H003, H004, H005, H006.

```typescript
expect(diagnostics).toEqual([])
expect(collected).toEqual([])
expect(() => assertClientIsolation(environment)).not.toThrow()
expect(() => assertBoundary(sources, clients)).not.toThrow()
expect(() => assertClientIsolation(environment)).toThrow(message)
expect(() => assertBoundary(sources, clients)).toThrow(message)
expect(collected).toHaveLength(1)
expect(collected[0]).toMatchObject({
  name: '',
  runtime: true,
  unproven: true,
  node: expect.objectContaining({ kind: ts.SyntaxKind.Identifier }),
})
```

### R072 — %s applies the finite global capability policy through graph and full boundary

Original lines 2831–3233. Callback SHA-256 `b02b8a4352f0c9228eaeca78f1e38c17f48bb35ed0b9a3b4e448f4b5e8e89049`; registration SHA-256 `70c5fbf859bad5a8196adadd3ce3c3844bc8494f7a7fcd59b0dc8df3d3eec5e2`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(collected).toEqual([])
expect(() => assertClientIsolation(environment)).not.toThrow()
expect(() => assertBoundary(sources, clients)).not.toThrow()
expect(() => assertClientIsolation(environment)).toThrow(message)
expect(() => assertBoundary(sources, clients)).toThrow(message)
expect(collected).toHaveLength(1)
expect(collected[0]).toMatchObject({
  name: '@/modules/nuvemshop/contracts',
  runtime: true,
})
expect(target).toBe(environment.resolve(dependencies(direct)[0]!.name, filename))
expect(target).toBe(path.join(moduleRoot, 'contracts.ts'))
expect(collected[0]).toMatchObject({ name: '', runtime: true, unproven: true })
```

### R073 — %s rejects diagnostics-clean static module.require through the full boundary

Original lines 3235–3300. Callback SHA-256 `b4009f1550d5a6fa16776c4c6a25ee275ae1601983e410b244f2dbbc834e89cc`; registration SHA-256 `389fb4652cea5fbd2ab09b0e79de35dfa477d67d6908a7525b44f38f150d50cc`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(() => assertBoundary(sources, clients)).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
expect(() => assertClientIsolation(environment)).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
expect(collected).toHaveLength(1)
expect(collected[0]).toMatchObject({ name: '@/modules/nuvemshop/contracts', runtime: true })
expect(environment.resolve(collected[0]!.name, filename)).toBe(
  environment.resolve(dependencies(direct)[0]!.name, filename),
)
expect(environment.resolve(collected[0]!.name, filename)).toBe(
  path.join(moduleRoot, 'contracts.ts'),
)
expect(references.map(moduleConsumption)).toEqual(['SUPPORTED_MODULE_REQUIRE'])
```

### R074 — %s rejects diagnostics-clean unproven module capability use at acquisition

Original lines 3302–3378. Callback SHA-256 `d1aac9b75330fede11ba5b442ee747442bd706afc39551553f07e1f83ed40037`; registration SHA-256 `4e3cf73b7b2a51bba69df5d6861c92048076c2dad8515f91e418a087eb552962`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(() => assertBoundary(sources, clients)).toThrow(message)
expect(() => assertClientIsolation(environment)).toThrow(message)
expect(collected).toHaveLength(1)
expect(collected[0]).toMatchObject({ name: '', runtime: true, unproven: true })
```

### R075 — %s preserves diagnostics-clean local module shadows in graph and full boundary

Original lines 3380–3436. Callback SHA-256 `56731a1d7bd643f2893fb6039c0a3d8c89c8f2d34b5213c66c2d1eb8aec4c6ea`; registration SHA-256 `565e14317fa9426f97e136e9be85322e51e5f7a978d5c8dd07fa4fdc77b42f93`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(collected.filter((edge) => ts.isCallExpression(edge.node) || edge.unproven)).toEqual([])
expect(() => assertClientIsolation(environment)).not.toThrow()
expect(() => assertBoundary(sources, clients)).not.toThrow()
```

### R076 — preserves existing module.exports client consumption: %s

Original lines 3438–3472. Callback SHA-256 `f62c45bad73263a747b5e2e7c30beccd0d056600f4cd89784c631c39f08f8dd3`; registration SHA-256 `9404a0115fe9d42a71470803e873fc67c7b365652c18c6d2e1e32f61183a0a31`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(references.map(moduleConsumption)).toEqual(['EXISTING_MODULE_EXPORTS_POLICY'])
expect(dependencies(parsed, program.getTypeChecker())).toEqual([])
expect(() => assertClientIsolation(environment)).not.toThrow()
expect(() => assertBoundary(sources, clients)).not.toThrow()
```

### R077 — excludes property-name and type-only module tokens from runtime references

Original lines 3474–3494. Callback SHA-256 `4f6a36d8dac47dd8494f5da068723abcbfc6dcbe01c1e4fef9b1de5b198824fb`; registration SHA-256 `7ec2250b859bc0eb2ff7efaba7d2191144f08512d4ff7bacd6e3b2fd313e4fd0`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(
  dependencies(program.getSourceFile(path.join(projectRoot, name))!, program.getTypeChecker()),
).toEqual([])
expect(() => assertBoundary(sources, clients)).not.toThrow()
```

### R078 — traverses static module.require of unrelated project wrappers

Original lines 3496–3519. Callback SHA-256 `59b294e5a04ca2a7f551aba3220b86ab16acc09bca897f9e3ee5e0a415676430`; registration SHA-256 `252e15fe424c0db6bdd1bd2d0d592d33b573d30e1e1ebcad27d55d142498a374`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(assertClientIsolation(environment).codeEdges.map((edge) => edge.target)).toEqual([
  path.join(projectRoot, 'src/__fixture-module-wrapper.ts'),
  path.join(projectRoot, 'src/__fixture-module-safe.ts'),
])
expect(() => assertBoundary(sources, clients)).not.toThrow()
```

### R079 — %s preserves local require binding classification in the full boundary

Original lines 3521–3565. Callback SHA-256 `f30f4391b61b59bd98838be9069374aca6b3a9911108b77132ae870bdb873d96`; registration SHA-256 `2c5e8d7f38bb394532b3ac721fd7758fba1e10c240c53e3137475eceae06b3be`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(
  dependencies(
    program.getSourceFile(path.join(projectRoot, name))!,
    program.getTypeChecker(),
  ).filter((edge) => ts.isCallExpression(edge.node) || edge.unproven),
).toEqual([])
expect(() => assertClientIsolation(environment)).not.toThrow()
expect(() => assertBoundary(sources, clients)).not.toThrow()
```

### R080 — %s rejects diagnostics-clean acquisition of the require capability

Original lines 3567–3603. Callback SHA-256 `dce47a85dded7ed2326e221f9c38821e0d91f8e0a264483a4885666dba465b8a`; registration SHA-256 `0c4538babfaf7b02003e69155df55f36c18142416296a039fdeb38353ef8c850`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(() => assertBoundary(sources, clients)).toThrow(/unsupported require capability reference/)
expect(() => assertClientIsolation(environment)).toThrow(/unsupported require capability reference/)
```

### R081 — %s allows diagnostics-clean proven local runtime bindings

Original lines 3605–3657. Callback SHA-256 `bc161675f831fb73743b7c732a84c198b03e205ab4c40b3bc3a302af62f9da48`; registration SHA-256 `46d1fdbb78f6729df77bfd228e989a59540e0074d4623f84cafa8a92d78c1b4e`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(collected.filter((edge) => ts.isCallExpression(edge.node) || edge.unproven)).toEqual([])
expect(() => assertBoundary(sources, clients)).not.toThrow()
expect(() => assertClientIsolation(environment)).not.toThrow()
```

### R082 — excludes property-name and type-only require tokens from runtime capability references

Original lines 3659–3681. Callback SHA-256 `2a91b7cc6ddaccd2b64ebf71b8c539e80a5fb29edd874c230c02a9b24fd84d1f`; registration SHA-256 `857fbd77c696d40e9060eb8b7556cdd15123f5e9eb2c06e2e6545b0476d2c952`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(
  dependencies(
    program.getSourceFile(path.join(projectRoot, 'src/__fixture-capability-client.ts'))!,
    program.getTypeChecker(),
  ),
).toEqual([])
expect(() => assertBoundary(sources, clients)).not.toThrow()
```

### R083 — %s rejects diagnostics-clean direct require.call of adapter code

Original lines 3683–3731. Callback SHA-256 `a21cfe604ecf785bcf076dc4b3a053b96bd4be8961311f5298d6677a2520d9b2`; registration SHA-256 `e13274794365440700f446cce20a7bfbcd630577638b6574aff74d5cefc7ddaa`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(() => assertBoundary(sources, clients)).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
expect(() => assertClientIsolation(environment)).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
expect(collected).toHaveLength(1)
expect(collected[0]!.runtime).toBe(true)
expect(collected[0]!.unproven).not.toBe(true)
expect(environment.resolve(collected[0]!.name, filename)).toBe(
  environment.resolve(dependencies(bare)[0]!.name, filename),
)
expect(environment.resolve(collected[0]!.name, filename)).toBe(
  path.join(moduleRoot, '__fixture-contracts.ts'),
)
```

### R084 — %s rejects diagnostics-clean unproven direct require invocation

Original lines 3733–3769. Callback SHA-256 `159de77e15bc53e232c4fe8af650d673e8ebeae5f022a8116de0681ac4d35964`; registration SHA-256 `9e888e3aa3f7a3f84d8c7156ea13c31d88de2bcd56945b951f6f087990d001bc`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(() => assertBoundary(sources, clients)).toThrow(/unproven computed client dependency/)
expect(() => assertClientIsolation(environment)).toThrow(/unproven computed client dependency/)
expect(collected).toHaveLength(1)
expect(collected[0]).toMatchObject({ name: '', runtime: true, unproven: true })
```

### R085 — allows static direct require.call of unrelated project code

Original lines 3771–3795. Callback SHA-256 `18261e8f854b29eb5550ee18b3052ea2fa6e52d99281df2f1e7d70a83bcf301f`; registration SHA-256 `61b7db9f41b720cd3509f92d184047646996e73e0fa7ea3e5eb93c47253a2f13`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(assertClientIsolation(environment).codeEdges).toEqual([
  {
    importer: path.join(projectRoot, name),
    name: './__fixture-safe',
    target: path.join(projectRoot, 'src/__fixture-safe.ts'),
  },
])
```

### R086 — %s rejects diagnostics-clean transparent direct require of adapter code

Original lines 3797–3844. Callback SHA-256 `fc67bb948458de1494668d88772cfc5c07fe47953726eed87a8d2ae2740de369`; registration SHA-256 `c2c05ac642e7d59f8a9e2af7b958eece6f014f9cd43fc529f58d066f0eb9efa7`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(() => assertClientIsolation(environment)).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
expect(() => assertBoundary(sources, clients)).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
expect(collected).toHaveLength(1)
expect(collected[0]!.runtime).toBe(true)
expect(environment.resolve(collected[0]!.name, filename)).toBe(
  environment.resolve(dependencies(bare)[0]!.name, filename),
)
expect(environment.resolve(collected[0]!.name, filename)).toBe(
  path.join(moduleRoot, '__fixture-contracts.ts'),
)
```

### R087 — allows transparent direct require wrappers for unrelated project code

Original lines 3846–3871. Callback SHA-256 `345fbd08c14a4b4be8c3fd0f9df0749a59a2f6de246c177f37ff282caabebc43`; registration SHA-256 `fcd8809f2cbb874dde926d001277e01b62c92eefdbf076dd2a02767048e4e1bd`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(inventory.codeEdges).toEqual([
  {
    importer: path.join(projectRoot, name),
    name: './__fixture-safe',
    target: path.join(projectRoot, 'src/__fixture-safe.ts'),
  },
])
```

### R088 — %s rejects adapter ownership through transparent require parentheses

Original lines 3873–3908. Callback SHA-256 `98173ef83b60d437c15b6d0a66c5b8be267c494030085f46e9e6026a1d2f590e`; registration SHA-256 `7ab2ad3d11d49dbc2277218c8edb65c03b1fd832b7ae15679f34f08c29101062`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004, H005, H006.

```typescript
expect(() => assertClientIsolation(environment)).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
expect(() => assertBoundary(sources, clients)).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
expect(collected).toHaveLength(1)
expect(collected[0]!.runtime).toBe(true)
expect(environment.resolve(collected[0]!.name, filename)).toBe(
  environment.resolve(dependencies(bare)[0]!.name, filename),
)
expect(environment.resolve(collected[0]!.name, filename)).toBe(
  path.join(moduleRoot, '__fixture-contracts.ts'),
)
```

### R089 — allows a parenthesized direct require of an unrelated project dependency

Original lines 3910–3924. Callback SHA-256 `30e83222144516cf68bfc536c6b2dd430931117d1939738e8b7eacbd10506d13`; registration SHA-256 `6821822080e441b611b1875ea821b083357d66c6777555160b064f9f7693bf45`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(inventory.codeEdges).toEqual([
  {
    importer: path.join(projectRoot, 'src/__fixture-client.tsx'),
    name: './__fixture-safe',
    target: path.join(projectRoot, 'src/__fixture-safe.ts'),
  },
])
```

### R090 — %s blocks by source dependency

Original lines 3926–3989. Callback SHA-256 `4fd633663fc9b824afdb71ec0a47bffa299a8416d89e75777650e8b962a10992`; registration SHA-256 `ea9818ad5decd25cf18734a48f832f7bd826a5979b6320766c45fa9f2388837b`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004.

```typescript
expect(() => assertClientIsolation(sourceEnvironment(sources, clients))).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
```

### R091 — isolates conventional runtime/type edge %s

Original lines 3991–4006. Callback SHA-256 `611b2696212e5d7e1d2d75c975861bb657643bf4358e627368365d94b6c633f4`; registration SHA-256 `ceebf0e780d7d2ce8acc530b07749493ea83976ed30dec15f3f3d12aab5ff234`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004.

```typescript
expect(() => assertClientIsolation(sourceEnvironment(readSources(), clients))).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
```

### R092 — terminates canonical graph cycles (adapter branch: %s)

Original lines 4008–4020. Callback SHA-256 `4c9f1962b6415faac6d18489740b82aa874ee0eec681181e1b6ef6e733fef12b`; registration SHA-256 `8f815244a97d46afe1a25cf2778778a929f124387faed8a34270eea87ef6424e`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004.

```typescript
expect(check).toThrow(/client runtime\/type dependency reaches adapter/)
expect(check().codeEdges).toHaveLength(3)
```

### R093 — rejects unproven loader in checked client wrapper: %s

Original lines 4022–4035. Callback SHA-256 `7a9070e031b13e49d1b9132855d0c746638cb616b5e03e2cb735c75bb27a28d2`; registration SHA-256 `36ba2ba7e6707a3311cb622cb9ca6c059d2f799fc1a068a3317f9b505436114a`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004.

```typescript
expect(() => assertClientIsolation(sourceEnvironment(readSources(), clients))).toThrow(
  /unproven computed client dependency/,
)
```

### R094 — allows unrelated client type expressions and a server consumer adapter dependency

Original lines 4037–4047. Callback SHA-256 `c8f8e5fb7c578a81a20bf1109f35e5e16c489c37d280eb727f774c9390250a79`; registration SHA-256 `546c87ecf36208987c05b5951a428368e0c4622f7257a451c7e75987051bfd49`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004.

```typescript
expect(() => assertClientIsolation(sourceEnvironment(readSources(), clients))).not.toThrow()
```

### R095 — treats exact CSS as terminal without reading or parsing code-looking contents

Original lines 4049–4064. Callback SHA-256 `29fb69e14c09affd7a8a4a03384c025abe6f2d503dbe38003e506523ae95fd09`; registration SHA-256 `7b23e61367c39d19a9d62229ffcc60067dca10c947e7663496918d6627dd0af5`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004.

```typescript
expect(inventory.terminalCssEdges).toHaveLength(1)
expect(read.mock.calls.some(([filename]) => filename.endsWith('__fixture-wrapper.css'))).toBe(false)
```

### R096 — keeps missing, unsupported and code edges fail-closed: %s

Original lines 4066–4084. Callback SHA-256 `99699acfddb354adb0143defcdedb13677c6f2c31c681080a51da4da8b11f8dd`; registration SHA-256 `b5a8e9257553196ab04ccc8071447dccf2353d73ef6c44be9b35157ce0af0ad5`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004.

```typescript
expect(() => assertClientIsolation(sourceEnvironment(readSources(), clients))).toThrow(
  /unresolved project-local dependency/,
)
```

### R097 — rejects multiple viable CSS alias targets and requires an exact CSS file

Original lines 4086–4104. Callback SHA-256 `224ea26d11fbda0ac66c0c0d05df2c935ceb25de0f94d3e7abeac410f0d3fee3`; registration SHA-256 `670571722095a108de1c810d75d4ab067efc4f3d31e33fba10dad8b6be9c3954`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(resolveCssAsset('__fixture/style.css', importer, host, options)).toEqual({
  target: undefined,
  ambiguous: true,
})
expect(resolveCssAsset('./__fixture-directory.css', importer, host).target).toBeUndefined()
expect(resolveCssAsset('../../../../outside.css', importer, host).target).toBeUndefined()
```

### R098 — inventories actual repository client closures with the real terminal CSS edge

Original lines 4106–4120. Callback SHA-256 `8cfe0671c7334cddb82f7965e19a3e844980ac4597755de0fbf46b22900f9bff`; registration SHA-256 `64ba87edaf8c3bf09261e05a7a4a0299612075304a3dae11356666427513e623`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004.

```typescript
expect(inventory.clientRoots.length).toBeGreaterThan(0)
expect(inventory.terminalCssEdges).toContainEqual({
  importer: path.join(projectRoot, 'src/app/global-error.tsx'),
  name: '@/styles/globals.css',
  target: path.join(projectRoot, 'src/styles/globals.css'),
})
```

### R099 — %s

Original lines 4122–4151. Callback SHA-256 `c165cc3e683243357ecf1dd2455618a6dda9e794bfb3071bec54ccb68145d35e`; registration SHA-256 `2660691d82224057f5f1186e59067adfe650ba6345bce5e324468163ef29f7f0`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004.

```typescript
expect(check).not.toThrow()
expect(check).toThrow(
  /unresolved project-local dependency|client runtime\/type dependency reaches adapter/,
)
```

### R100 — %s

Original lines 4153–4205. Callback SHA-256 `cb27d668d1d6e81995105fdaf36cfbf03170e60f1288e9080ef5a7a463374ff3`; registration SHA-256 `c2fe8a399955715f06caebf5a37192b06c512175ae731edbeeef3908a921123a`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources, clients)).toThrow(
  /client runtime\/type dependency reaches adapter/,
)
```

### R101 — preserves required entrypoints, explicit markers and dependency direction as owners add files

Original lines 4207–4217. Callback SHA-256 `8ca49d500414a397db3a2a95ae7c92b3c0c9915db5f2957526de848dea5fac8d`; registration SHA-256 `5247a66720e2a4db032bc698e139304af49bc3cc75406ad3e72f86637d92f8fd`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R102 — imports the entrypoints without provider configuration

Original lines 4219–4227. Callback SHA-256 `34ae149417b0667161b1947d47bbc2c177dcc091062c903d0da427c8029f5354`; registration SHA-256 `5e530e41f2b6bc6d4ce564a50a9c92db2913685d1a18b3bb5048e3c651c46845`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(import(publicEntry)).resolves.toBeDefined()
expect(import(serverEntry)).resolves.toBeDefined()
```

### R103 — rejects a client import through the public entrypoint using the real marker

Original lines 4229–4236. Callback SHA-256 `7a1aa0a41757bbf91a52d196f0e8794b11883dee2500cc4c4ce266a4afc665e6`; registration SHA-256 `e15d3cbe7c267f387182df1eb2908aa71ccceca4b3428a9eb37bc08ff4358ced`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(import(publicEntry)).rejects.toThrow(/cannot be imported from a Client Component/)
```

### R104 — rejects a direct client import of the server entrypoint using the real marker

Original lines 4238–4243. Callback SHA-256 `132a214d22dfbf9520de43b1214c652c9aebae640dd99e081abbe09f7d60f6bd`; registration SHA-256 `52de3151dd2c045e3c731d70cabffbcd7d5ba5ce4f02e47bde3609cdf60842bd`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(import(serverEntry)).rejects.toThrow(/cannot be imported from a Client Component/)
```

### R105 — allows an additional internal owner file without freezing the module tree

Original lines 4246–4250. Callback SHA-256 `3c4c36b5925a4ddc06952a06ff655bafadf5d6819661656279d977bbee8ee817`; registration SHA-256 `151add7c0ac3866fe451c567d8a432cf7291cfa3ba0f81db81efc8b402774e77`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R106 — allows guarded normalized contracts for server consumers

Original lines 4252–4268. Callback SHA-256 `3838615374d84a7aa03184660438231bca362b6ff2ff6d40471edb658337b2c0`; registration SHA-256 `81daec22bb7b9103fd85097c7c10844eeee9bdd8026d4f4a3fe95cb6cca58a56`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R107 — detects removal of required entrypoint %s

Original lines 4270–4274. Callback SHA-256 `3bfc4a8d3bcb028e87a62cf375f9392f4b78d2fe3d1e78279cab477cf85ec071`; registration SHA-256 `affa42f1f34c942d6c2783870ca7be1789cf1eb432ad63b25e18d264fc2dde9d`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow()
```

### R108 — detects removal of the server-only marker from %s

Original lines 4276–4280. Callback SHA-256 `59b461f03ea0cc4fd8fc9df6aa771890a43e7bf3eb476b49cbfcd7e754553834`; registration SHA-256 `63d3f15d3e3a329077fb5384f48a13cd199556e0455c5bc4ce1a6f07d49bd635`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow()
```

### R109 — detects removal of the root → server dependency

Original lines 4282–4286. Callback SHA-256 `5783e2b6599399587b74b61de21ce18d0028aba8802375553144fcf5d51d654f`; registration SHA-256 `d433cea77a2d06b55a79f583bc436c26a5e271fbd1658135e4ee81871010634f`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow()
```

### R110 — %s rejects local require as positive proof through the full boundary

Original lines 4288–4321. Callback SHA-256 `0556c571eff240cbd52bd7feeacae993f3e1fceb595fbedad19b58720616c29d`; registration SHA-256 `890829038bbd39db99a75cf437e45b0e48de5904408aba58bb22d74a147cefd2`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(() => assertBoundary(sources)).toThrow(message)
```

### R111 — %s retains genuine positive proof through the full boundary

Original lines 4323–4357. Callback SHA-256 `e816589d5f85c889db6a78a772e603827b14bcf0df6c34790f79da48610c9298`; registration SHA-256 `a44b4ba0efdcb6285bd41d5a9fb742d6f8dcefb69ef84372ded7fe86da2c0dd4`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(() => assertBoundary(sources)).not.toThrow()
```

### R112 — GUARD-PROGRAM-IDENTITY collects guard evidence with one Program and its checker

Original lines 4359–4398. Callback SHA-256 `d6d69a95f7b2d7f35475db26df4d5741a7edb28b6a6718ec547188be2bf9a09a`; registration SHA-256 `6e294ad23e52aed8719d6377833193fc54ea07279f1c45c22ced3b1b889a398e`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(ts.getPreEmitDiagnostics(diagnosticsProgram)).toEqual([])
expect(environment.program()).toBe(program)
expect(environment.program().getTypeChecker()).toBe(checker)
expect(source).toBe(environment.program().getSourceFile(path.resolve(moduleRoot, name)))
expect(collected.map(({ name }) => name)).toEqual(['./index'])
expect(collected.every(({ node }) => node.getSourceFile() === source)).toBe(true)
expect(references).toHaveLength(1)
expect(isProvenLocalRuntimeBinding(references[0]!, checker)).toBe(true)
expect(
  checker
    .getSymbolAtLocation(references[0]!)!
    .getDeclarations()!
    .every((declaration) => declaration.getSourceFile() === source),
).toBe(true)
expect(() => assertBoundary(sources)).not.toThrow()
```

### R113 — rejects server → root dependency: %s

Original lines 4400–4408. Callback SHA-256 `7cba742fe72031edc3b4617148aca8246656be3631d8c4665c92fd4fca3ac5d6`; registration SHA-256 `e380176af360c4874f02e5664fdf87e92d10802cf3e6c295427da18ec2f908b0`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow()
```

### R114 — detects an unauthorized %s in entrypoints and internal files

Original lines 4410–4427. Callback SHA-256 `b2c1743dfe711ca0715e3c532920eb5374822cda73057831c38908da913dbd04`; registration SHA-256 `40c596e008ff649d8632efcc880e120898f8b7af66147917f8485b996b0d791e`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow()
```

### R115 — rejects an internal JSX UI surface

Original lines 4429–4433. Callback SHA-256 `4ecaa464dabdd36ee43fe14213b246a61389ecb115f6f3e408ee192a3c1545e3`; registration SHA-256 `450b70168e6fa584ff29a520079c44631a096b7b85196b3689b1a86580698530`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow()
```

### R116 — rejects an unguarded CommonJS facade: %s

Original lines 4435–4467. Callback SHA-256 `42033fd9515be53396078555c79b822ccc1c97a7deb147e66df9c23af2e5ed14`; registration SHA-256 `8669b267a58a75889a1b317424a8037014ff232fabe290c9ec95398e6627e10a`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow(/contracts and secrets must remain server-only/)
```

### R117 — allows CommonJS-like text and unrelated properties: %s

Original lines 4469–4487. Callback SHA-256 `3031b6412f2850f42fad287060ced8d9eddd45fb9b3ec7fa6b9bf0da3cb6864c`; registration SHA-256 `f0ca5f55b2a4dd96441d5fefbb3625260608088215c10c725a505ad624b9e7ec`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R118 — continues rejecting an unguarded ESM facade: %s

Original lines 4489–4500. Callback SHA-256 `625726fe84814bf1ff726f576ca4b456851bf5a523f92bc0d1015043e3fe1e2e`; registration SHA-256 `f4ded415c99af7b9bb688595382757f8d3490025a14604b69931c4c3070990ff`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow(/contracts and secrets must remain server-only/)
```

### R119 — rejects an unguarded %s bypassing the entrypoints

Original lines 4502–4519. Callback SHA-256 `d024cb8cfc16b7e0bb0336be036587209c5314181b595fd59bf9400a6f55eb04`; registration SHA-256 `3a4a00d35155bdd4e052795609dbe2257f49cc8a805a89eba618f9df9ec43055`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow()
```

### R120 — RED-B rejects TypeScript JS-extension substitution into root

Original lines 4521–4525. Callback SHA-256 `1defe6940e61643545de3b0198bd2c473ed81db0204b5c3b1b41940e5e6984dc`; registration SHA-256 `ce5c226e1e7d7d4e33bf348a2a43e7cd8ee867cb6f67244ad5063cfd1a87caea`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow(/server must not depend on root/)
```

### R121 — RED-C rejects conventional call facade: %s

Original lines 4527–4536. Callback SHA-256 `1579930db3664200981618ba9970938dde44bef4785a2cc0ff4b8d00b3953e06`; registration SHA-256 `e8d191b62cdf8c0ba8388917f349355cad18991d3600627e37ec37aa1234c141`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow(/contracts and secrets must remain server-only/)
```

### R122 — uses compiler resolution for %s → %s in synthetic Sources

Original lines 4538–4555. Callback SHA-256 `8f6cfd2ec49f2ef93ff8cacbb3addb5ddebe33ce698967d2225bef1007a710bc`; registration SHA-256 `392422c2d5f337e7b71ef51ccd0efc2fd714afa592e6bfadc1874ebc398403ab`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(environment.resolve(name, path.join(moduleRoot, 'server/index.ts'))).toBe(
  path.join(moduleRoot, target),
)
```

### R123 — does not restore deleted candidate files from physical module sources

Original lines 4557–4566. Callback SHA-256 `5e735774ce2b3f917886fba7fda31679f190132402a1a69359cf7245f1676067`; registration SHA-256 `d0d89943c5e75d05d8b716c11e20a3e8702b36dd00aa80968c3a2ad2ae83339d`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(
  sourceEnvironment(sources, new Map()).resolve(
    '../index.js',
    path.join(moduleRoot, 'server/index.ts'),
  ),
).toBeUndefined()
```

### R124 — blocks resolved server → root mutation: %s

Original lines 4568–4580. Callback SHA-256 `72e8766b3e66abc62c2e719431b66d47ed2745a58eae0d1cf44ba720c0909ea4`; registration SHA-256 `9980690c92d234a28350f3d6730fedf94a840421f6be712375d4d222bef92514`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow(/server must not depend on root/)
```

### R125 — preserves exported internal PII contracts for server consumers

Original lines 4582–4597. Callback SHA-256 `e146d95f9f1958f245729fcbdb9c702835c0483a42bda2ef5666771839ed0674`; registration SHA-256 `f989e8ad86109e18d2f1ab2d34844ebcad9a861036037166a151783b0879790c`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R126 — blocks client runtime module imports: %s

Original lines 4599–4614. Callback SHA-256 `22fb7fde28cd7194bdb06939af2a7cb8f396f71ed1ad6ab2cf605de933db8cc8`; registration SHA-256 `09c5461857e4d449197d82493b41e0734285dd50504d5aa89277eb1fd9ef572d`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() =>
  assertBoundary(sources, new Map([['src/__fixture-client.tsx', `'use client'\n${statement}`]])),
).toThrow(/client runtime\/type dependency reaches adapter/)
```

### R127 — does not treat directive-like text as a client importer

Original lines 4616–4626. Callback SHA-256 `932fade4b69f708a02d9862287007eab8558ac80481bdc373b6d2b5174fed211`; registration SHA-256 `a3a490b94070c31bd71d6c9cc4a2ab72ee2c02d1b6fae217af3804f58e41672e`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R128 — rejects conventional static call-based CommonJS mutations: %s

Original lines 4628–4647. Callback SHA-256 `d3475e04ba8169c7f951846342357e811c4e06c9592e30ed58c860732913acff`; registration SHA-256 `192ef2795c0ea3a686fc14bdcf53d11e5a0f7171cd880d3f4f6e37eef74179de`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(() => assertBoundary(sources)).toThrow(/contracts and secrets must remain server-only/)
```

### R129 — allows call-like text and unrelated mutation targets: %s

Original lines 4649–4662. Callback SHA-256 `3031b6412f2850f42fad287060ced8d9eddd45fb9b3ec7fa6b9bf0da3cb6864c`; registration SHA-256 `0157bb2d3819fd7c9963a899b66fbc3b2b1341de977aef0bd294f380b857cca1`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

Principal checks execute through referenced helpers (or direct `assertBoundary` call), as shown by the unchanged callback hash.

### R130 — resolves virtual intermediary directories before filesystem fallback

Original lines 4664–4675. Callback SHA-256 `b3e0d3f6421a913b804125a5278da7634ae39e2e06fb6e8c9d2720393096bb5f`; registration SHA-256 `c4cd14dddb59929f7b7b1e8aaaebc3c35a77d973f27c807aa9f9849be668f62f`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(
  sourceEnvironment(sources, clients).resolve(
    './__fixture-virtual/types.js',
    path.join(projectRoot, 'src/__fixture-client.ts'),
  ),
).toBe(path.join(projectRoot, 'src/__fixture-virtual/types.ts'))
```

### R131 — CACHE-SOURCE replaces one same-path source and restores the safe result

Original lines 4700–4708. Callback SHA-256 `25e87bf01520dcd063029dcc39cd8340ab545ada1cec3c20eff56de4e3c5461e`; registration SHA-256 `9b072a07c174ab489ed509e0f97d525d97edf2328c2575e9c86e3aa5803615f0`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(() => check(adapter, overlay)).not.toThrow()
expect(() => check(adapter, overlay)).toThrow(adapterRejected)
```

### R132 — CACHE-ADD-REMOVE keeps identical root text authoritative across membership changes

Original lines 4710–4723. Callback SHA-256 `8440c1c257f58ff3998dd53b183d794a4d712f0a6dcb42584f1bf1b279b0b228`; registration SHA-256 `30a9ff574ee1b5dbed4ddd5551e30da98164b85b6498122aa7842230f84055cf`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(() => check(adapter, overlay)).toThrow(unresolved)
expect(() => check(adapter, overlay)).not.toThrow()
expect(() => check(adapter, overlay)).toThrow(adapterRejected)
```

### R133 — CACHE-SNAPSHOT gives old and new environments independent authoritative overlays

Original lines 4725–4737. Callback SHA-256 `493b5ac9893cd71b431105dad1bfb9d639ac9c20efaca11d09eef7f7710291c6`; registration SHA-256 `404f359cc79b716e058e9d73d1ea142f3d53470fb3d21fee335a8bf2ea9baf5e`. Explicit timeout: inherited unchanged. Helper contracts: H003, H004.

```typescript
expect(() => assertClientIsolation(original)).not.toThrow()
expect(() => assertClientIsolation(changed)).toThrow(adapterRejected)
expect(() => assertClientIsolation(sourceEnvironment(adapter, overlay))).not.toThrow()
```

### R134 — CACHE-MODULE-TOMBSTONE never restores removed physical adapter sources

Original lines 4739–4756. Callback SHA-256 `6b5d9edb1d41db791abf0bc22ed2935ba11c1ad4d39dba08fe2cdfcada12f285`; registration SHA-256 `c952a71ca66eb6d205d6680bce88cb42771e5a5186d097cd460f8ab61f4058af`. Explicit timeout: inherited unchanged. Helper contracts: H005, H006, H003, H004.

```typescript
expect(
  sourceEnvironment(adapter, new Map()).host.getSourceFile(serverPath, ts.ScriptTarget.Latest),
).toBeDefined()
expect(removed.host.fileExists(serverPath)).toBe(false)
expect(removed.host.readFile(serverPath)).toBeUndefined()
expect(removed.host.getSourceFile(serverPath, ts.ScriptTarget.Latest)).toBeUndefined()
expect(() => assertBoundary(adapter)).toThrow(/required entrypoint server\/index.ts/)
expect(() => assertBoundary(adapter)).toThrow(/server must not depend on root/)
expect(() => assertBoundary(adapter)).not.toThrow()
```

### R135 — CACHE-BINDING invalidates checker ownership after local-to-ambient changes

Original lines 4758–4768. Callback SHA-256 `be5c9f2f734f8b32909b0fed814624e5b884f9836a0222be111667e2afe59501`; registration SHA-256 `949fcb0b071f9f77dbd6f51ae05729e4f53881929b88d892595c2da225772d8e`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(() => check(adapter, overlay)).not.toThrow()
expect(() => check(adapter, overlay)).toThrow(/unsupported require capability reference/)
```

### R136 — CACHE-ROOT-PATH changes and restores client root membership with a warm compiler lane

Original lines 4770–4782. Callback SHA-256 `9d28269fd5312c8d429edf400c9e5140dff345d89dd89fb969abb2f273a0cf01`; registration SHA-256 `e46850fb9f53a43c2a5d19808ba8221bf20063be41caae26ea4de99ba7101cc3`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(() => check(adapter, overlay)).not.toThrow()
expect(() => check(adapter, overlay)).toThrow(adapterRejected)
```

### R137 — CACHE-PATHS resolves a changed alias target and restores the previous graph

Original lines 4784–4802. Callback SHA-256 `be0145422bad93b32d725c6ec223d790fec1f5f2d36ce0fbb5a004b1a8855851`; registration SHA-256 `51987cc29790b56dd5c0a2d019ec84b91744c3277441717ce94560a8edf82cb1`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(() => check(adapter, overlay)).not.toThrow()
expect(() => check(adapter, overlay)).toThrow(adapterRejected)
```

### R138 — CACHE-PARSER respects language, module format, JSDoc mode and forced reparsing

Original lines 4804–4837. Callback SHA-256 `a1f46cf8ce2167b95f6eda5a74b4552f502fbfff9d4acd6cad2a8fc7c2f3d784`; registration SHA-256 `fba88f747044d04d070170106403313bbef091e8e41b97c4f4f724d0e1b41e8e`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(first.languageVersion).toBe(ts.ScriptTarget.ES2022)
expect(first.impliedNodeFormat).toBe(ts.ModuleKind.ESNext)
expect(dependencies(first).some((edge) => edge.origin === 'jsdoc-type-import')).toBe(true)
expect(changed.languageVersion).toBe(ts.ScriptTarget.ES2020)
expect(changed.impliedNodeFormat).toBe(ts.ModuleKind.CommonJS)
expect(dependencies(changed).some((edge) => edge.origin === 'jsdoc-type-import')).toBe(false)
expect(restored.impliedNodeFormat).toBe(ts.ModuleKind.ESNext)
expect(dependencies(restored).some((edge) => edge.origin === 'jsdoc-type-import')).toBe(true)
expect(forced).not.toBe(restored)
expect(forced.text).toBe(restored.text)
```

### R139 — CACHE-CALLBACK honors distinct external module indicator parser callbacks

Original lines 4839–4864. Callback SHA-256 `c8e6ed2c2e2f2f576ef2b09d0bdf4dc797b471c550536da24fcebcdb6b172ee1`; registration SHA-256 `7e0c4527f457f487fb7b399d26b584f3e83ef6f68d22dbe95291e1093c2d87e0`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(firstIndicator).toHaveBeenCalledTimes(1)
expect(secondIndicator).toHaveBeenCalledTimes(1)
expect(firstIndicator).toHaveBeenCalledTimes(2)
```

### R140 — CACHE-EXTENSION preserves identical-source compiler JSDoc policy for %s

Original lines 4866–4886. Callback SHA-256 `10d2682f699ef0fe1462bb701a28c32aeea5eb094f30df7dd5a6169791c10624`; registration SHA-256 `ee6ed436ce503eac6b78034f08fd67d8c1c2b79466d65cfc3b0110477d12442f`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(edges.some((edge) => edge.origin === 'jsdoc-type-import')).toBe(compilerRecognizesJSDoc)
expect(() => check(sources(), overlay)).toThrow(adapterRejected)
expect(() => check(sources(), overlay)).not.toThrow()
```

### R141 — CACHE-PROGRAM-OPTIONS changes and restores parser and semantic options through real factory

Original lines 4888–4932. Callback SHA-256 `7d75a819345cafa92333c4dc0860d15a10e3b9a7f1b9ad61b0582682fa13df87`; registration SHA-256 `5d65d3fd112f438f1aeedebdf7e13e8fefddebaa247b0d95e77918b53e8e3ad6`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(summarize(actual)).toEqual(summarize(reference))
expect(actual.getSourceFile(path.join(projectRoot, name))!.languageVersion).toBe(target)
expect(
  ts
    .getPreEmitDiagnostics(actual)
    .some(
      (diagnostic) =>
        diagnostic.code === 2322 && diagnostic.file?.fileName.endsWith('__ciopt-options.ts'),
    ),
).toBe(strictNullChecks)
expect(changed.getTypeChecker()).not.toBe(original.getTypeChecker())
expect(restored.getTypeChecker()).not.toBe(original.getTypeChecker())
```

### R142 — CACHE-DIAGNOSTICS uses fresh checker and matches compiler across ambient changes

Original lines 4934–4984. Callback SHA-256 `e7c17d406ef1eaaa22d1196b0e05e2c1bd721c5d9cc780088a5aaa7e089a9a8a`; registration SHA-256 `0f4790e3677e92dbd91b04dc683c7f8a59889aeb76ed2ff2297262efc924f5df`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(diagnostics(actual)).toEqual(diagnostics(reference))
expect(
  ts
    .getPreEmitDiagnostics(missing)
    .some(
      (diagnostic) =>
        diagnostic.code === 2304 && diagnostic.file?.fileName.endsWith('__ciopt-global.ts'),
    ),
).toBe(true)
expect(declared.getTypeChecker()).not.toBe(missing.getTypeChecker())
expect(
  ts
    .getPreEmitDiagnostics(declared)
    .some(
      (diagnostic) =>
        diagnostic.code === 2304 && diagnostic.file?.fileName.endsWith('__ciopt-global.ts'),
    ),
).toBe(false)
expect(changed.getTypeChecker()).not.toBe(declared.getTypeChecker())
expect(changed.getSourceFile(path.join(projectRoot, 'src/__ciopt-ambient.d.ts'))!.text).toBe(
  'declare const __cioptGlobal: number;',
)
expect(diagnostics(restored)).toEqual(diagnostics(missing))
```

### R143 — CACHE-PERFORMANCE reuses unchanged library parsing with fresh Programs and checkers

Original lines 5034–5043. Callback SHA-256 `0710f3f8435a9232e248e35435703af64bfc1ab4d3857fe66489c8ca952c015d`; registration SHA-256 `c951780837a3ad2e1bcd928c723372de053154ff441782b3e64b003ba0bb9b9a`. Explicit timeout: inherited unchanged. Helper contracts: H016.

```typescript
expect(first.getSourceFile(library)).toBeDefined()
expect(second.getSourceFile(library)).toBe(first.getSourceFile(library))
expect(second).not.toBe(first)
expect(second.getTypeChecker()).not.toBe(first.getTypeChecker())
```

### R144 — CACHE-SEMANTIC replaces source, diagnostic positions and related information then restores

Original lines 5045–5055. Callback SHA-256 `c4bba9532651e8a633a2ab77637795ed9509544c8bf6116460d4f75739040abe`; registration SHA-256 `ae76ec729dfb7e56af47c01545011e10b87d6a6cabae0e3b7b8e480db1125b15`. Explicit timeout: inherited unchanged. Helper contracts: H016.

```typescript
expect(codes(safe)).toEqual([])
expect(codes(compile(overlay))).toContain(2322)
expect(diagnostics(compile(overlay))).toEqual(diagnostics(safe))
```

### R145 — CACHE-SEMANTIC-MEMBERSHIP refreshes unchanged importers after add, change, delete and restore

Original lines 5057–5070. Callback SHA-256 `88f97326de075e99cd1de623f801b168d80be581abf81637f29b78a8946eab5c`; registration SHA-256 `c4d85cd125561dc1852629f13986237ee1fe8dced7c8ca6c2971c880c9ff561e`. Explicit timeout: inherited unchanged. Helper contracts: H016.

```typescript
expect(codes(compile(overlay))).toContain(2307)
expect(codes(compile(overlay))).toEqual([])
expect(codes(compile(overlay))).toContain(2322)
```

### R146 — CACHE-SEMANTIC-ALIAS snapshots nested paths and renews unchanged importer resolution

Original lines 5072–5085. Callback SHA-256 `2fdeeb6e78ed328878ade51221de4ce21de34be68d029cb955f372381e2af04e`; registration SHA-256 `c48922b2497a7ae51ac94d9228bc984686920e94df5fee80955249622e15d7a2`. Explicit timeout: inherited unchanged. Helper contracts: H016.

```typescript
expect(codes(first)).toEqual([])
expect(codes(compile(overlay, effective))).toContain(2322)
expect(codes(compile(overlay, effective))).toEqual([])
```

### R147 — CACHE-SEMANTIC-GLOBAL invalidates unchanged clients for ambient type changes and deletion

Original lines 5087–5096. Callback SHA-256 `8f7975a71f212884ffbcd3bb109a9144a1c874c0b95884931902d15303df7d99`; registration SHA-256 `acc8bea7df0463813fb19957b99d17f6ace0fc61b55222db9dd67b94da5b0ef8`. Explicit timeout: inherited unchanged. Helper contracts: H016.

```typescript
expect(codes(compile(overlay))).toContain(2304)
expect(codes(compile(overlay))).toEqual([])
expect(codes(compile(overlay))).toContain(2322)
```

### R148 — CACHE-SEMANTIC-LIB refreshes real standard library augmentation under skipLibCheck false

Original lines 5098–5112. Callback SHA-256 `558b25e0ef53f8b251a38774b15543d7b657da2df302b4cbc2d02b7b3d5e9268`; registration SHA-256 `153beccff99f7f16ef3271429ffb13a64c5dc9a5cca8aa8ea031143a76394792`. Explicit timeout: inherited unchanged. Helper contracts: H016.

```typescript
expect(codes(compile(overlay))).toEqual([])
expect(codes(compile(overlay))).toContain(2322)
expect(codes(compile(overlay))).toContain(2339)
```

### R149 — CACHE-SEMANTIC-LIB-ERROR preserves library diagnostics and removes them after restoration

Original lines 5114–5130. Callback SHA-256 `7e1769a9fc813f429111044abd78f192004a3e91f4a2e940655d44f5dd0dbcd2`; registration SHA-256 `308a800c2a9d5012e274316c78bd5696108644c6f6531b693d829757819319f8`. Explicit timeout: inherited unchanged. Helper contracts: H016.

```typescript
expect(codes(compile(overlay))).toEqual([])
expect(codes(compile(overlay))).toContain(2717)
```

### R150 — CACHE-SEMANTIC-OPTION preserves diagnostics across %s epochs

Original lines 5132–5172. Callback SHA-256 `0f6aa59b428dd3353d4d32442cdfa7237bb4e1ec528f63abf407f4b2c126d9d9`; registration SHA-256 `dde2d7adb5d0f7dcad5cbb48ffd92503d7f20e91a7523f5cdb2c0a430b64c921`. Explicit timeout: inherited unchanged. Helper contracts: H016.

```typescript
expect(codes(compile(overlay, { ...options, ...safe }))).toEqual([])
expect(codes(compile(overlay, { ...options, ...unsafe })).length).toBeGreaterThan(0)
```

### R151 — CACHE-OPTION-EPOCH does not reuse orphaned library ASTs after full to noLib changes

Original lines 5174–5182. Callback SHA-256 `148a7e17012b7bb37f4948d84b0b3de18786027afd3939ff63b0c19cf7265e5b`; registration SHA-256 `715bf305ece29b60beb2ea854637fd4ce22304a482cdaf46175e7afad52845a1`. Explicit timeout: inherited unchanged. Helper contracts: H016.

```typescript
expect(changed.getSourceFile(library)).not.toBe(first.getSourceFile(library))
```

### R152 — CACHE-LIB-LOOKUP adds and deletes a virtual standard library replacement with fixed roots

Original lines 5186–5306. Callback SHA-256 `9c573e2304efe35ba32c857a10135162707ab613daad120ccfa067f3e41d8130`; registration SHA-256 `aad1ee860a2be35362ea46c4fbb179e69189c9fa037f927b0a50bf94c3644ee0`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(ts.sys.fileExists(packageJson)).toBe(false)
expect(original).toBeDefined()
expect(firstReference.getSourceFile(installedLibrary)).toBeDefined()
expect(ts.getPreEmitDiagnostics(firstReference).map((diagnostic) => diagnostic.code)).toContain(
  2339,
)
expect(diagnostics(first)).toEqual(diagnostics(firstReference))
expect(addedReference.getSourceFile(replacementLibrary)).toBeDefined()
expect(ts.getPreEmitDiagnostics(addedReference)).toEqual([])
expect(diagnostics(added)).toEqual(diagnostics(addedReference))
expect(added.getSourceFile(replacementLibrary)).toBeDefined()
expect(added.getSourceFile(installedLibrary)).toBeUndefined()
expect(added.getTypeChecker()).not.toBe(first.getTypeChecker())
expect(redirectedReference.getSourceFile(redirectedLibrary)).toBeDefined()
expect(ts.getPreEmitDiagnostics(redirectedReference).map((diagnostic) => diagnostic.code)).toEqual([
  2322,
])
expect(diagnostics(redirected)).toEqual(diagnostics(redirectedReference))
expect(redirected.getSourceFile(redirectedLibrary)).toBeDefined()
expect(redirected.getSourceFile(replacementLibrary)).toBeUndefined()
expect(diagnostics(candidate())).toEqual(diagnostics(plain()))
expect(ts.getPreEmitDiagnostics(candidate())).toEqual([])
expect(restoredReference.getSourceFile(installedLibrary)).toBeDefined()
expect(restoredReference.getSourceFile(replacementLibrary)).toBeUndefined()
expect(diagnostics(restored)).toEqual(diagnostics(restoredReference))
expect(diagnostics(restored)).toEqual(diagnostics(firstReference))
expect(restored.getSourceFile(replacementLibrary)).toBeUndefined()
expect(restored.getSourceFile(installedLibrary)).toBeDefined()
```

### R153 — NODE-DIAGNOSTIC includes real installed declarations without weakening complete adapter diagnostics

Original lines 5310–5347. Callback SHA-256 `6dc90943fcf7f02a64f8d10008aac23291c17500f81267ab04689b66e1a9a534`; registration SHA-256 `980a7b772b13d9155c84d271d75b85123123cd2542b6e61cb2b4c05c7adbf0dd`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(typeof createAdapterDiagnosticProgram, 'adapter diagnostic capability is absent').toBe(
  'function',
)
expect(nodeDeclaration).toBeDefined()
expect(program.getCompilerOptions()).toEqual(options)
expect(program.getRootFileNames()).toEqual(expect.arrayContaining(roots))
expect(program.getRootFileNames()).toContain(nodeDeclaration)
expect(program.getSourceFile(nodeDeclaration!)).toBeDefined()
expect(
  diagnostics.map((diagnostic) => ({ code: diagnostic.code, file: diagnostic.file?.fileName })),
).toEqual([{ code: 2345, file: fixtureName }])
```

### R154 — NODE-DIAGNOSTIC-CLIENT keeps the existing client program without Node roots or globals

Original lines 5349–5368. Callback SHA-256 `1807a9ea95e1253caa910366063e54eef80117d4a47887072324aaabd4d1a344`; registration SHA-256 `713366280c92a738e1c98213410be33b31080132175714692514eef0b6a3b00f`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(program.getCompilerOptions()).toEqual(options)
expect(program.getRootFileNames()).toEqual(roots)
expect(
  program.getSourceFiles().some((file) => /[/\\]@types[/\\]node[/\\]/.test(file.fileName)),
).toBe(false)
expect(
  program.getTypeChecker().resolveName('process', source, ts.SymbolFlags.Value, false),
).toBeUndefined()
expect(ts.getPreEmitDiagnostics(program).map((diagnostic) => diagnostic.code)).toEqual([2591])
```

### R155 — NODE-DIAGNOSTIC-BINDING preserves the noLib types-empty binding environment without Node globals

Original lines 5370–5389. Callback SHA-256 `e7a19760dafe5a0725a8109ffee735871465f01127d96d15dbd6edd5ceeaa606`; registration SHA-256 `ab8470eb204d625866b24304b42b006d4ff9af5855c4faaa423cd0f6fc3a995b`. Explicit timeout: inherited unchanged. Helper contracts: none.

```typescript
expect(program.getCompilerOptions().types).toEqual([])
expect(program.getCompilerOptions().noLib).toBe(true)
expect(program.getRootFileNames()).toEqual([...environment.files.keys()])
expect(
  program.getSourceFiles().some((file) => /[/\\]@types[/\\]node[/\\]/.test(file.fileName)),
).toBe(false)
expect(
  program.getTypeChecker().resolveName(name, source, ts.SymbolFlags.Value, false),
).toBeUndefined()
```

## Interned helper expectation contracts

Names with different original locations are distinct lexical helpers. Helper code is not expanded or shared as mutable cross-worker state by this appendix.

### H001 — clean (original line 1128)

```typescript
expect(result.program.getCompilerOptions().allowJs).toBe(true)
expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
```

### H002 — checks (original line 1119)

```typescript
expect(() => assertClientIsolation(result.environment)).toThrow(message)
expect(() => assertBoundary(result.sources, result.clients)).toThrow(message)
expect(() => assertClientIsolation(result.environment)).not.toThrow()
expect(() => assertBoundary(result.sources, result.clients)).not.toThrow()
```

### H003 — assertClientIsolation (original line 753)

```typescript
expect(source, `${filename}: unreadable project dependency`).toBeDefined()
expect(
  unproven,
  `${filename}: ${globalRootCapability === 'WHOLE_ROOT_ESCAPE' ? 'unsupported whole-global capability escape' : globalRootCapability === 'COMPUTED_GLOBAL_PROPERTY' ? 'unproven global property' : globalCapability ? `unsupported ${globalCapability} capability reference` : moduleCapability ? `unsupported ${moduleCapability} capability reference` : unsupportedCapability ? 'unsupported require capability reference' : 'unproven computed client dependency'}`,
).not.toBe(true)
expect(
  target,
  `${filename}: unresolved or unsupported project-local triple-slash path ${name}`,
).toBeDefined()
expect(target, `${filename}: UNRESOLVED PROJECT-LOCAL TRIPLE-SLASH TYPES ${name}`).toBeDefined()
expect(asset.ambiguous, `${filename}: ambiguous CSS asset ${name}`).toBe(false)
expect(asset.target, `${filename}: unresolved project-local dependency ${name}`).toBeDefined()
expect(target, `${filename}: unresolved project-local dependency ${name}`).toBeDefined()
expect(
  target !== undefined && inModule(target),
  `${filename}: client runtime/type dependency reaches adapter ${name}`,
).toBe(false)
```

### H004 — visit (original line 786)

```typescript
expect(source, `${filename}: unreadable project dependency`).toBeDefined()
expect(
  unproven,
  `${filename}: ${globalRootCapability === 'WHOLE_ROOT_ESCAPE' ? 'unsupported whole-global capability escape' : globalRootCapability === 'COMPUTED_GLOBAL_PROPERTY' ? 'unproven global property' : globalCapability ? `unsupported ${globalCapability} capability reference` : moduleCapability ? `unsupported ${moduleCapability} capability reference` : unsupportedCapability ? 'unsupported require capability reference' : 'unproven computed client dependency'}`,
).not.toBe(true)
expect(
  target,
  `${filename}: unresolved or unsupported project-local triple-slash path ${name}`,
).toBeDefined()
expect(target, `${filename}: UNRESOLVED PROJECT-LOCAL TRIPLE-SLASH TYPES ${name}`).toBeDefined()
expect(asset.ambiguous, `${filename}: ambiguous CSS asset ${name}`).toBe(false)
expect(asset.target, `${filename}: unresolved project-local dependency ${name}`).toBeDefined()
expect(target, `${filename}: unresolved project-local dependency ${name}`).toBeDefined()
expect(
  target !== undefined && inModule(target),
  `${filename}: client runtime/type dependency reaches adapter ${name}`,
).toBe(false)
```

### H005 — assertBoundary (original line 952)

```typescript
expect(source, `${filename}: unreadable adapter source`).toBeDefined()
expect(sources.has(entrypoint), `required entrypoint ${entrypoint}`).toBe(true)
expect(hasMarker(entrypoint), `${entrypoint} must explicitly protect itself`).toBe(true)
expect(
  imports
    .get('index.ts')
    ?.some(
      ({ name, runtime, origin, resolutionMode }) =>
        runtime && internalTarget(name, 'index.ts', origin, resolutionMode) === 'server/index.ts',
    ),
  'root must depend on server at runtime',
).toBe(true)
expect(
  /^(?:next\/cache|react(?:-dom)?(?:\/|$)|zustand(?:\/|$)|client-only$)/.test(name),
  `${filename}: forbidden client/cache dependency ${name}`,
).toBe(false)
expect(
  referenceTarget,
  `${filename}: UNRESOLVED PROJECT-LOCAL TRIPLE-SLASH TYPES ${name}`,
).toBeDefined()
expect(
  /(?:^|\/)modules\/(?:orders|cart|catalog)(?:\/|$)/.test(resolved),
  `${filename}: consumer dependency ${name}`,
).toBe(false)
expect(
  internalTarget(name, filename, origin, resolutionMode),
  'server must not depend on root',
).not.toBe('index.ts')
expect(
  ts.isExpressionStatement(node) &&
    ts.isStringLiteral(node.expression) &&
    ['use client', 'use cache', 'use server'].includes(node.expression.text),
  `${filename}: client, cache or callable client action directive`,
).toBe(false)
expect(
  ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node),
  `${filename}: UI surface`,
).toBe(false)
expect(
  /^(?:checkout|createCart|createCheckoutSession|createDraftOrder|checkoutUrl|Customer|getCustomer|listCustomers|window|document|localStorage|sessionStorage)$/.test(
    node.text,
  ),
  `${filename}: forbidden checkout/Customer/client surface ${node.text}`,
).toBe(false)
expect(isGuarded(filename), `${filename}: contracts and secrets must remain server-only`).toBe(true)
```

### H006 — visit (original line 1035)

```typescript
expect(
  ts.isExpressionStatement(node) &&
    ts.isStringLiteral(node.expression) &&
    ['use client', 'use cache', 'use server'].includes(node.expression.text),
  `${filename}: client, cache or callable client action directive`,
).toBe(false)
expect(
  ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node),
  `${filename}: UI surface`,
).toBe(false)
expect(
  /^(?:checkout|createCart|createCheckoutSession|createDraftOrder|checkoutUrl|Customer|getCustomer|listCustomers|window|document|localStorage|sessionStorage)$/.test(
    node.text,
  ),
  `${filename}: forbidden checkout/Customer/client surface ${node.text}`,
).toBe(false)
```

### H007 — typeEdge (original line 1151)

```typescript
expect(jsdocImports(result)).toHaveLength(1)
expect(edges).toHaveLength(1)
expect(edges[0]).toMatchObject({
  name: specifier,
  origin: 'jsdoc-type-import',
  runtime: false,
  explicitMarker: false,
})
expect(result.environment.resolve(specifier, result.source.fileName)).toBeDefined()
```

### H008 — jsdocImports (original line 1132)

```typescript
expect(found.every((node) => node.getSourceFile() === result.source)).toBe(true)
```

### H009 — clean (original line 1396)

```typescript
expect(result.program.getCompilerOptions().allowJs).toBe(true)
expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
```

### H010 — checks (original line 1387)

```typescript
expect(() => assertClientIsolation(result.environment)).toThrow(message)
expect(() => assertBoundary(result.sources, result.clients)).toThrow(message)
expect(() => assertClientIsolation(result.environment)).not.toThrow()
expect(() => assertBoundary(result.sources, result.clients)).not.toThrow()
```

### H011 — clean (original line 1787)

```typescript
expect(ts.getPreEmitDiagnostics(result.program)).toEqual([])
```

### H012 — assertRealChecks (original line 1778)

```typescript
expect(() => assertClientIsolation(result.environment)).toThrow(message)
expect(() => assertBoundary(result.sources, result.clients)).toThrow(message)
expect(() => assertClientIsolation(result.environment)).not.toThrow()
expect(() => assertBoundary(result.sources, result.clients)).not.toThrow()
```

### H013 — preservesSeparatePackageLibraryChannel (original line 1894)

```typescript
expect(
  channel === 'types' ? source.typeReferenceDirectives : source.libReferenceDirectives,
).toHaveLength(1)
expect(dependencies(source, current.program.getTypeChecker())).toEqual([])
expect(assertClientIsolation(current.environment).codeEdges).toEqual([])
```

### H014 — assertRealChecks (original line 2261)

```typescript
expect(edges.filter((edge) => edge.origin === 'triple-slash-path')).toHaveLength(1)
expect(edges[0]).toMatchObject({
  runtime: false,
  explicitMarker: false,
  origin: 'triple-slash-path',
})
expect(() => assertClientIsolation(result.environment)).toThrow(message)
expect(() => assertBoundary(result.sources, result.clients)).toThrow(message)
expect(() => assertClientIsolation(result.environment)).not.toThrow()
expect(() => assertBoundary(result.sources, result.clients)).not.toThrow()
```

### H015 — keepsOtherDirectiveChannelsSeparate (original line 2381)

```typescript
expect(ts.getPreEmitDiagnostics(program)).toEqual([])
expect(source.referencedFiles).toEqual([])
expect(
  channel === 'lib' ? source.libReferenceDirectives : source.typeReferenceDirectives,
).toHaveLength(1)
expect(dependencies(source, program.getTypeChecker())).toEqual([])
expect(assertClientIsolation(environment).codeEdges).toEqual([])
expect(() => assertBoundary(result.sources, result.clients)).not.toThrow()
```

### H016 — compile (original line 5013)

```typescript
expect(diagnostics(actual)).toEqual(diagnostics(reference))
expect(actual.getSourceFiles().map((source) => [source.fileName, source.text])).toEqual(
  reference.getSourceFiles().map((source) => [source.fileName, source.text]),
)
expect(actual).not.toBe(reference)
expect(actual.getTypeChecker()).not.toBe(reference.getTypeChecker())
```
