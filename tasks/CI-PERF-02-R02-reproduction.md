# CI-PERF-02-R02 — Reproduction and immutable local scripts

This appendix preserves local experimental scripts as documentary evidence. No script, test reorganization, compiler cache or CI configuration is installed by this PR. The prototype was not approved for adoption. Read [the evidence report](CI-PERF-02-R02-evidence.md) and its failures before interpreting any command below.

These are the original recorded machine paths and labels. Before independent reproduction, use new isolated worktrees and a new private evidence directory, adapt only the workspace/evidence prefixes consistently, and record the adapted script hashes. Never overwrite retained samples; the runners refuse existing output labels. A new execution is a new observation, not the original R02 result. The frozen family JSON is an archived R02 design record; its timing/SHA provenance is not evidence for a new measurement. Reproducing this exact prototype retains that mapping; choosing a new mapping requires a new current-baseline freeze and a separately identified prototype.

Both worktrees start at `42bb6e4f21254854d232ae8e8422c949234e3c0f`, with identical dependencies/configuration. No dependency installation, real provider credential, original `.env`, remote experimental workflow, timeout increase or assertion edit belongs to this protocol. Full runs use the original defaults (three scheduler workers on this host); detailed boundary runs use symmetric CLI `--maxWorkers=2`. Full failures remain FAIL regardless of later focused results. Child commands run serially under the shared lock.

The original source is read from the uninstrumented baseline for manifest generation and copied to `c-boundary-original.test.ts` before splitting. Run the installed Vitest list twice (static and dynamic) with the recorded output names, then run `a-manifest.cjs`; static list has 155 templates, dynamic list has 598 expanded identities. The resulting local JSON is generated data, not omitted test coverage. The complete public identity/expectation contract is [the manifest](CI-PERF-02-R02-identities.md).

Run the C guard self-test before splitting. The C splitter uses the preserved original source and frozen family mapping, writes the two files/support, and removes only the experimental monolith. Format those three files with the installed Prettier before static equivalence and dynamic identity guards. The original afterEach callback must occur once in each partition.

For detailed profiling, instrument baseline `boundary.test.ts` in standalone mode. Instrument candidate `boundary-support.ts` in support mode and both partition files in registration mode. Each target is backed up before alteration. Use the exact same prelude/transform bytes on both sides; the registration mode redirects direct TypeScript calls to support-owned measurement wrappers. Restore these temporary alterations from their verified backups before normal check/build. The C rollback additionally verifies the uninstrumented prototype hashes before reinstating the exact original monolith and deleting only the three known prototype files.

The instrumentation adds observation, including WeakMap source-content fingerprints; it does not introduce a Program, TypeChecker or diagnostics cache. Assertions, negative paths, callback epochs and original timeouts remain unchanged. Its observer substitutes exact workspace text wherever that token occurs; the independent review checked actual captured paths for prefix-at-path behavior. The derived analyzer additionally normalizes the raw resolution name's exact worktree text, preserving the initial mismatch and unchanged JSONL. It does not remove diagnostic codes/messages/positions. Heap values are worker endpoints, RSS tree values are sampled sums with shared-page double counting, and reporter file timestamps are explicitly non-monotonic. Full-command wall is external monotonic time. Per-family sums cannot be added to parallel command wall.

The command ledger below contains every timed child command, including separately labelled setup/formatting, and the explicit profile destination. Preparation is not folded into test-command wall. For resource collection, invoke the corresponding Python runner with the label before that child command: `run.py` for untouched full/check/build/setup commands, `run-instrumented.py` for profile commands. Supply BOUNDARY_PROFILE to the runner environment for profile commands. The source/hash table and exact fences make the observer and comparison behavior reviewable. Original raw stdout/stderr, memory samples and per-case compiler traces remain private local evidence; reviewed aggregate observations and every failing identity are in the report. No remote performance extrapolation or validated speedup is implied.

## Measured command ledger

### baseline-a

Started UTC `2026-10-23T05:05:17Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-baseline/indicioCult`; retained exit `1`. Monotonic wall `644.545189843` s; CPU `924.954637000` s; max single-process RSS `1490000` KiB; sampled tree RSS peak `1884389376` bytes.

<!-- prettier-ignore -->
```sh
npm run test -- --reporter=json --outputFile=/home/jlima/.codex/evidence/ci-perf-02-r02/baseline-a.results.json --includeTaskLocation
```

### candidate-a

Started UTC `2026-10-23T05:18:20Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-experimental/indicioCult`; retained exit `1`. Monotonic wall `395.497544446` s; CPU `994.366639000` s; max single-process RSS `1471204` KiB; sampled tree RSS peak `3201122304` bytes.

<!-- prettier-ignore -->
```sh
npm run test -- --reporter=json --outputFile=/home/jlima/.codex/evidence/ci-perf-02-r02/candidate-a.results.json --includeTaskLocation
```

### baseline-profile

Started UTC `2026-10-23T05:25:58Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-baseline/indicioCult`; retained exit `1`. Monotonic wall `646.319522894` s; CPU `823.086060000` s; max single-process RSS `1465028` KiB; sampled tree RSS peak `1814867968` bytes.

<!-- prettier-ignore -->
```sh
BOUNDARY_PROFILE=/home/jlima/.codex/evidence/ci-perf-02-r02/baseline-profile.jsonl npm run test -- tests/unit/modules/nuvemshop/boundary.test.ts --maxWorkers=2 --reporter=json --outputFile=/home/jlima/.codex/evidence/ci-perf-02-r02/baseline-profile.results.json --includeTaskLocation
```

### candidate-profile-setup

Started UTC `2026-10-23T05:37:32Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-experimental/indicioCult`; retained exit `0`. Monotonic wall `0.442488418` s; CPU `0.551600000` s; max single-process RSS `108660` KiB; sampled tree RSS peak `23674880` bytes.

<!-- prettier-ignore -->
```sh
node /home/jlima/.codex/evidence/ci-perf-02-r02/scripts/instrument.mjs tests/unit/modules/nuvemshop/boundary-support.ts support
```

### candidate-profile-setup-a

Started UTC `2026-10-23T05:37:42Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-experimental/indicioCult`; retained exit `0`. Monotonic wall `0.354769111` s; CPU `0.502332000` s; max single-process RSS `109332` KiB; sampled tree RSS peak `19628032` bytes.

<!-- prettier-ignore -->
```sh
node /home/jlima/.codex/evidence/ci-perf-02-r02/scripts/instrument.mjs tests/unit/modules/nuvemshop/boundary-partition-a.test.ts registration
```

### candidate-profile-setup-b

Started UTC `2026-10-23T05:37:48Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-experimental/indicioCult`; retained exit `0`. Monotonic wall `0.389551808` s; CPU `0.565797000` s; max single-process RSS `120040` KiB; sampled tree RSS peak `20557824` bytes.

<!-- prettier-ignore -->
```sh
node /home/jlima/.codex/evidence/ci-perf-02-r02/scripts/instrument.mjs tests/unit/modules/nuvemshop/boundary-partition-b.test.ts registration
```

### candidate-profile

Started UTC `2026-10-23T05:38:03Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-experimental/indicioCult`; retained exit `1`. Monotonic wall `366.836056566` s; CPU `866.774771000` s; max single-process RSS `1439452` KiB; sampled tree RSS peak `3164692480` bytes.

<!-- prettier-ignore -->
```sh
BOUNDARY_PROFILE=/home/jlima/.codex/evidence/ci-perf-02-r02/candidate-profile.jsonl npm run test -- tests/unit/modules/nuvemshop/boundary-partition-a.test.ts tests/unit/modules/nuvemshop/boundary-partition-b.test.ts --maxWorkers=2 --reporter=json --outputFile=/home/jlima/.codex/evidence/ci-perf-02-r02/candidate-profile.results.json --includeTaskLocation
```

### candidate-a-shuffle

Started UTC `2026-10-23T13:48:58Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-experimental/indicioCult`; retained exit `0`. Monotonic wall `29.323955653` s; CPU `43.238622000` s; max single-process RSS `1078040` KiB; sampled tree RSS peak `1347993600` bytes.

<!-- prettier-ignore -->
```sh
BOUNDARY_PROFILE=/home/jlima/.codex/evidence/ci-perf-02-r02/candidate-a-shuffle.jsonl npm run test -- tests/unit/modules/nuvemshop/boundary-partition-a.test.ts -t 'JSDoc ScriptKind dependency matrix' --sequence.shuffle.tests --sequence.seed=2302 --maxWorkers=2 --reporter=json --outputFile=/home/jlima/.codex/evidence/ci-perf-02-r02/candidate-a-shuffle.results.json --includeTaskLocation
```

### candidate-b-shuffle

Started UTC `2026-10-23T13:50:05Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-experimental/indicioCult`; retained exit `1`. Monotonic wall `20.462839555` s; CPU `38.218624000` s; max single-process RSS `831140` KiB; sampled tree RSS peak `1121767424` bytes.

<!-- prettier-ignore -->
```sh
BOUNDARY_PROFILE=/home/jlima/.codex/evidence/ci-perf-02-r02/candidate-b-shuffle.jsonl npm run test -- tests/unit/modules/nuvemshop/boundary-partition-b.test.ts -t 'CI-OPT-01|native Node diagnostic opt-in isolation' --sequence.shuffle.tests --sequence.seed=2303 --maxWorkers=2 --reporter=json --outputFile=/home/jlima/.codex/evidence/ci-perf-02-r02/candidate-b-shuffle.results.json --includeTaskLocation
```

### candidate-doc-format

Started UTC `2026-10-23T13:51:16Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-experimental/indicioCult`; retained exit `0`. Monotonic wall `2.157899344` s; CPU `3.542303000` s; max single-process RSS `197832` KiB; sampled tree RSS peak `195760128` bytes.

<!-- prettier-ignore -->
```sh
node node_modules/prettier/bin/prettier.cjs --write tasks/CI-PERF-02-R02-evidence.md tasks/CI-PERF-02-R02-identities.md
```

### candidate-check

Started UTC `2026-10-23T13:51:28Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-experimental/indicioCult`; retained exit `1`. Monotonic wall `437.605149676` s; CPU `1038.503655000` s; max single-process RSS `1498376` KiB; sampled tree RSS peak `3458981888` bytes.

<!-- prettier-ignore -->
```sh
npm run check
```

### candidate-build

Started UTC `2026-10-23T13:59:18Z`; cwd `/home/jlima/.codex/worktrees/ci-perf-02-r02-experimental/indicioCult`; retained exit `0`. Monotonic wall `24.639858420` s; CPU `62.772341000` s; max single-process RSS `1222068` KiB; sampled tree RSS peak `2073300992` bytes.

<!-- prettier-ignore -->
```sh
env NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SITE_URL=https://ci-perf-r02.invalid NEXT_PUBLIC_SUPABASE_URL=https://supabase-ci-perf-r02.invalid NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-unused-r02-anon SUPABASE_SERVICE_ROLE_KEY=ci-unused-r02-build APP_VERSION=42bb6e4f21254854d232ae8e8422c949234e3c0f npm run build
```

## Exact script SHA-256

| Local artifact                       | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| a-manifest.cjs                       | `c6ac1335a23ddb7c924695b6c0e3d094015e9e94c49427ac7c4deb4661f2042d` |
| a-compare-identities.cjs             | `be3f748a62fe8ae9950256170d378b2b309073b4c1c9cbe680ff59990c59d39a` |
| c-partition-lib.cjs                  | `51dcce64897c9f83615e7bebe1d4efc83dcaa3839a88b2ac46eaabbdad6966c9` |
| c-split.cjs                          | `4ff9e406c21377824a8cf36dff509ec953d59b504c138beba2a7940978f06af9` |
| c-equivalence.cjs                    | `77f0f18d393c5718ecb8eadb7a7b6c6a4fd42cda225d7516f78dae4f5535a595` |
| c-identity-check.cjs                 | `4f7c904edc6cba983346dcd34c25e8f6b8440b60ed80e073d35997bc5627f130` |
| c-restore-original.cjs               | `4dfc99dc3c61b6397cbca90745f4cb657082873ac8093ebd692a6b95ee6f7590` |
| c-family-freeze.json                 | `f3fee15f788dc260436894d8d8901d0cbe36f16b660533a983af5e96c002d6c5` |
| scripts/run.py                       | `1f74e4117165d2337c5feef1b76c3da2941a37732e2d151152e057e2c17d97b9` |
| scripts/run-instrumented.py          | `39ec40bbf4dd1d5fecf528b6264ced23d78fc9ebd53d10172df0b9c9a0c38be9` |
| scripts/instrument.mjs               | `3c374e7bb7a1019e5149fffd65bf2b1980493d8a455afc3bf74efe5452217be2` |
| scripts/boundary-profile-prelude.txt | `91dadeb11c31d5f873ce85f49db5fa6f8f84e9e9b17040e42c830a37bb0ebef3` |
| scripts/analyze-unmodified.py        | `82b665ce77b9e3eae26dec72997f465d21b1c7cf22fb244308072a093d2f83c0` |
| scripts/analyze-profile.py           | `8f570090c305fe2e7fd42e1c28726ead4873f0b23f7b9829a0af1025650fc131` |
| scripts/compare-full.py              | `75bd70cd547ab51341b82f89118c67ae81f8025ca9e984ba77658187164b873f` |
| scripts/compare-profiles.py          | `413e6127521c8432cd5479ef3435a190828abf5fa1cb1a497100fd99f5545d9b` |
| scripts/compare-focused.py           | `0fa017c946a0528386fc434cafa9cbca7247f4f30f2ba149d2872f6c253fb644` |

Every fence below includes its final newline in the hash. Prettier-ignore preserves the executed source bytes.

## a-manifest.cjs

<!-- prettier-ignore -->
```javascript
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = process.argv[2] || '/home/jlima/.codex/worktrees/ci-perf-02-r02-baseline/indicioCult';
const out = process.argv[3] || '/home/jlima/.codex/evidence/ci-perf-02-r02';
const ts = require(path.join(root, 'node_modules/typescript'));
const relative = 'tests/unit/modules/nuvemshop/boundary.test.ts';
const code = fs.readFileSync(path.join(root, relative),'utf8');
const source = ts.createSourceFile(relative, code, ts.ScriptTarget.Latest, true);
const collected = JSON.parse(fs.readFileSync(path.join(out,'a-baseline-vitest-collected.json'),'utf8'));
const staticList = JSON.parse(fs.readFileSync(path.join(out,'a-baseline-vitest-list.json'),'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const loc = node => { const a=source.getLineAndCharacterOfPosition(node.getStart(source)); const b=source.getLineAndCharacterOfPosition(node.end); return {file:relative,line:a.line+1,column:a.character+1,endLine:b.line+1}; };
const calls=[], functions=[];
function walk(n, visit) { visit(n); ts.forEachChild(n,c=>walk(c,visit)); }
walk(source,n=> { if(ts.isCallExpression(n) && (n.expression.getText(source)==='it'||(ts.isCallExpression(n.expression)&&n.expression.expression.getText(source)==='it.each'))) calls.push(n); if(ts.isFunctionDeclaration(n)&&n.name)functions.push(n); });
if(calls.length!==155)throw Error(`registration count ${calls.length}`);
function scope(n) { let p=n.parent;while(p&&!ts.isBlock(p)&&!ts.isSourceFile(p))p=p.parent;return p; }
function resolveFunction(name, origin) { let best; for(const f of functions.filter(f=>f.name.text===name)){const p=scope(f);if(origin.pos>=p.pos&&origin.end<=p.end&&(!best||p.pos>scope(best).pos))best=f;}return best; }
function callback(call){ const value = [...call.arguments].reverse().find(a=>ts.isArrowFunction(a)||ts.isFunctionExpression(a)||ts.isIdentifier(a));return ts.isIdentifier(value)?resolveFunction(value.text,call):value; }
function helpers(node) { const result=new Map(); const visitNode=n=>{walk(n,c=>{if(ts.isCallExpression(c)&&ts.isIdentifier(c.expression)){const f=resolveFunction(c.expression.text,c); if(f&&!result.has(f.pos)){result.set(f.pos,f);visitNode(f);}}});};visitNode(node);return [...result.values()]; }
function expectations(node) { const result=[];walk(node,n=>{if(ts.isCallExpression(n)&&n.expression.getText(source).startsWith('expect(')&&!/^expect\(/.test(n.getText(source).replace(/^expect\([^]*?\)/,''))){if(ts.isPropertyAccessExpression(n.expression)||ts.isElementAccessExpression(n.expression))result.push(n.getText(source));}});return [...new Set(result)]; }
function family(h,line) {for(const s of h)if(/^(CI-OPT-01|native Node|JSDoc|triple-slash)/.test(s))return s;if((2587<=line&&line<2626)||(2679<=line&&line<3235))return 'Ambient process/global capabilities';if(3235<=line&&line<3926)return 'CommonJS runtime capabilities and local bindings';if((2626<=line&&line<2679)||(3926<=line&&line<4207))return 'Browser/client import graph and CSS';if(4288<=line&&line<4400)return 'Guard binding and Program identity';if((4435<=line&&line<4489)||(4527<=line&&line<4538)||(4628<=line&&line<4664))return 'CommonJS/ESM export surfaces';if((4538<=line&&line<4568)||(4664<=line&&line<4678))return 'Canonical resolver and tombstones';return 'Module boundaries and real entrypoint imports';}
const registrations=calls.map(c=>{const cb=callback(c), h=[]; let p=c.parent;while(p){if(ts.isCallExpression(p)&&p.expression.getText(source)==='describe')h.unshift(p.arguments[0].text);p=p.parent;}const title=c.arguments[0].text;const helperNodes=helpers(cb);const text=[cb,...helperNodes].map(n=>n.getText(source)).join('\n');const line=loc(c).line;const noCompiler=/^uses compiler resolution|^does not restore deleted candidate|^resolves virtual intermediary/.test(title)||title==='rejects multiple viable CSS alias targets and requires an exact CSS file';const compile=!noCompiler&&!/^CACHE-PARSER|^CACHE-CALLBACK/.test(title)&&!(/imports the entrypoints|rejects a client import through|rejects a direct client import/.test(title));return {call:c,callback:cb,helperNodes,template:title,hierarchy:h,family:family(h,line),originalLocation:loc(c),callbackSha256:hash(cb.getText(source)),registrationSha256:hash(c.getText(source)),principalExpectationSummary:title,principalExpectations:expectations(cb),helperContracts:helperNodes.filter(n=>expectations(n).length).map(n=>({name:n.name.text,location:loc(n),expectations:expectations(n)})),usesTypeScriptCompilation:compile,modifies:{sourceOverlay:/(?:sources|clients|overlay|adapter)\.(?:set|delete)\(/.test(cb.getText(source)),sourceOverlayFromHelper:helperNodes.some(n=>/(?:sources|clients|overlay|adapter)\.(?:set|delete)\(/.test(n.getText(source))),compilerOptions:/compilerOptions\.paths\s*=|effective\.paths|\.\.\.options, \.\.\.safe|\.\.\.options, \.\.\.unsafe|const compile = \(target/.test(cb.getText(source)),aliases:/compilerOptions\.paths\s*=|effective\.paths|paths: \{/.test(cb.getText(source)),resolution:/resolveCssAsset|\.resolve\(|resolveDependency|internalTarget|resolveReference/.test(cb.getText(source)),roots:/roots|ROOT|MEMBERSHIP|ADD-REMOVE|TOMBSTONE/.test(title+' '+cb.getText(source))},dependsOnStateBetweenTests:false,betweenTestStateReason:'Predecessor lanes may be warm; correctness must be independent. All fixture mutations and sequential canary epochs are callback-local. CACHE-PATHS alone restores shared compilerOptions.paths in finally.',exercisesSecurityControl:true,usesPredecessorCache:compile&&!/rejects multiple viable CSS alias/.test(title),requiresIndependentExecution:true,requiresIndependentCompilation:compile,independentCompilationReason:/CACHE-|NODE-DIAGNOSTIC|GUARD-PROGRAM-IDENTITY/.test(title)?'Keep sequential calls and compiler/reference/checker ownership in this callback intact; fresh Programs remain mandatory.':'Fresh Program/checker state remains supplied by unchanged helpers; no separate-worker correctness requirement.',testTimeoutLiteral:c.arguments.find(a=>ts.isNumericLiteral(a))?.text||c.arguments.find(a=>ts.isObjectLiteralExpression(a))?.getText(source)||null};});
// Match expanded names to original template. Ordered expansion guards ambiguous templates.
function reEscape(v){return v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
for(const r of registrations)r.regex=new RegExp('^'+reEscape([...r.hierarchy,r.template].join(' > ')).replace(/%[sdifjoO#\$]/g,'[\\s\\S]*')+'$');
let current=0;const counts=new Map();const records=collected.map((t,index)=>{const r=registrations.find(r=>{const start=source.getPositionOfLineAndCharacter(t.location.line-1,t.location.column-1);return start>=r.call.getStart(source)&&start<=r.call.end;});if(!r)throw Error('Unmatched '+t.name);const fullName=t.name.replaceAll(root,'<PROJECT_ROOT>');const occurrence=(counts.get(fullName)||0)+1;counts.set(fullName,occurrence);const {call,callback,helperNodes,regex,...serial}=r;return {logicalId:'boundary-'+hash(JSON.stringify([fullName,occurrence])).slice(0,24),ordinal:index+1,describeHierarchy:r.hierarchy,title:t.name.slice([...r.hierarchy,''].join(' > ').length),fullName,originalFullName:t.name,multiplicityOrdinal:occurrence,...serial};});
// Manual control audit: these flags describe each callback's deliberate epochs,
// not incidental reads or creation of initial fixture Maps. Parser-only controls
// intentionally invoke direct host methods, bypassing Program construction.
const criticalEpochs = {
 'CACHE-SOURCE': ['source'], 'CACHE-ADD-REMOVE': ['source','roots','resolution'],
 'CACHE-SNAPSHOT': ['source'], 'CACHE-MODULE-TOMBSTONE': ['source','roots','resolution'],
 'CACHE-BINDING': ['source'], 'CACHE-ROOT-PATH': ['source','roots','resolution'],
 'CACHE-PATHS': ['source','options','aliases','resolution'],
 'CACHE-PARSER': ['parser','options','forcedFresh'], 'CACHE-CALLBACK': ['parser','options','forcedFresh'],
 'CACHE-EXTENSION': ['parser'], 'CACHE-PROGRAM-OPTIONS': ['parser','options'],
 'CACHE-DIAGNOSTICS': ['source','roots'], 'CACHE-PERFORMANCE': [],
 'CACHE-SEMANTIC': ['source'], 'CACHE-SEMANTIC-MEMBERSHIP': ['source','roots','resolution'],
 'CACHE-SEMANTIC-ALIAS': ['options','aliases','resolution'],
 'CACHE-SEMANTIC-GLOBAL': ['source','roots'], 'CACHE-SEMANTIC-LIB': ['source','library','resolution'],
 'CACHE-SEMANTIC-LIB-ERROR': ['source','library','resolution'], 'CACHE-SEMANTIC-OPTION': ['options'],
 'CACHE-OPTION-EPOCH': ['options','library','resolution'],
 'CACHE-LIB-LOOKUP': ['source','library','resolution'],
 'NODE-DIAGNOSTIC': ['nodeOptIn','rootOverride'], 'NODE-DIAGNOSTIC-CLIENT': ['nodeExclusion'],
 'NODE-DIAGNOSTIC-BINDING': ['nodeExclusion','noLib'],
};
for (const r of records) {
 const key=r.template.split(' ')[0], epochs=criticalEpochs[key];
 r.createsTypeScriptProgram=r.usesTypeScriptCompilation;
 r.testsCacheOrParserBoundary=/^(CACHE-|NODE-DIAGNOSTIC)/.test(key);
 if(epochs) {
  r.criticalAudit='manually traced callback, compiler factory and fixture scope';
  r.exercisedEpochs=epochs;
  r.modifies={sourceOverlay:epochs.includes('source'),sourceOverlayFromHelper:false,
   compilerOptions:epochs.includes('options'),aliases:epochs.includes('aliases'),
   resolution:epochs.includes('resolution'),roots:epochs.includes('roots')};
  if(key==='CACHE-PARSER'||key==='CACHE-CALLBACK') {
   r.usesTypeScriptCompilation=true;r.createsTypeScriptProgram=false;r.usesPredecessorCache=false;
   r.requiresIndependentCompilation=true;
   r.independentCompilationReason='Direct CompilerHost.getSourceFile must preserve fresh parsing, forceFresh and caller callback identity; these controls deliberately bypass compiler-internal predecessor reuse and construct no Program.';
  }
 }
}
const familyCounts={};for(const r of records)familyCounts[r.family]=(familyCounts[r.family]||0)+1;
if(records.length!==598||new Set(records.map(r=>r.logicalId)).size!==598)throw Error('Identity mismatch');
const expected=[18,18,33,52,23,180,58,101,62,9,10,17,13,1,3].sort((a,b)=>a-b);if(JSON.stringify(Object.values(familyCounts).sort((a,b)=>a-b))!==JSON.stringify(expected))throw Error('Family mismatch '+JSON.stringify(familyCounts));
fs.writeFileSync(path.join(out,'a-identities.json'),JSON.stringify({schema:1,requestedModel:'GPT-6.1 Sol Alto',acceptedSpawnParameters:'Parent records actual accepted spawn arguments; no separate runtime attestation available here',runtimeModelAttested:false,baseline:'42bb6e4f21254854d232ae8e8422c949234e3c0f',sourceSha256:hash(code),method:'Vitest 5.0.1 dynamic list --staticParse=false; TypeScript AST original callback and transitive helper expectations; historical family rule reconciled against source.',normalization:'Replace exact baseline project-root prefix in fixture-generated full names only. Full raw name retained. ID includes full normalized hierarchy/title and duplicate occurrence ordinal, never file.',count:records.length,familyCounts,cases:records},null,2)+'\n');
fs.writeFileSync(path.join(out,'a-registrations.json'),JSON.stringify(registrations.map(({call,callback,helperNodes,regex,...r})=>r),null,2)+'\n');
console.log(JSON.stringify({count:records.length,registrations:registrations.length,sourceSha256:hash(code),familyCounts},null,2));
```

## a-compare-identities.cjs

<!-- prettier-ignore -->
```javascript
// Usage: node a-compare-identities.cjs CANDIDATE_DYNAMIC_LIST_JSON CANDIDATE_ROOT OUTPUT_JSON
const fs=require('node:fs'),crypto=require('node:crypto');
const baseline=JSON.parse(fs.readFileSync('/home/jlima/.codex/evidence/ci-perf-02-r02/a-identities-compact.json'));
const collected=JSON.parse(fs.readFileSync(process.argv[2]));
const root=process.argv[3],out=process.argv[4];
const counts=new Map();
const candidate=collected.map(t=>{const name=t.name.replaceAll(root,'<PROJECT_ROOT>');const occurrence=(counts.get(name)||0)+1;counts.set(name,occurrence);return {logicalId:'boundary-'+crypto.createHash('sha256').update(JSON.stringify([name,occurrence])).digest('hex').slice(0,24),name,occurrence,file:t.file,location:t.location};});
const wanted=new Set(baseline.cases.map(t=>t.logicalId)),actual=new Set(candidate.map(t=>t.logicalId));
const missing=baseline.cases.filter(t=>!actual.has(t.logicalId)).map(t=>({id:t.logicalId,name:t.fullName}));
const unexpected=candidate.filter(t=>!wanted.has(t.logicalId));
const duplicates=[...counts].filter(([name,count])=>count>(baseline.cases.filter(t=>t.fullName===name).length||1));
const result={baseline:baseline.count,candidate:candidate.length,missing,unexpected,duplicates,state:candidate.length===598&&!missing.length&&!unexpected.length&&!duplicates.length?'IDENTITIES_MATCH':'BLOCKED_TEST_IDENTITY_MISMATCH',candidateCases:candidate};
if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,candidateCases:undefined},null,2));if(result.state!=='IDENTITIES_MATCH')process.exitCode=1;
```

## c-partition-lib.cjs

<!-- prettier-ignore -->
```javascript
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { createRequire } = require('node:module')
const root = process.env.R02_CANDIDATE || '/home/jlima/.codex/worktrees/ci-perf-02-r02-experimental/indicioCult'
const evidence = '/home/jlima/.codex/evidence/ci-perf-02-r02'
const ts = createRequire(path.join(root, 'package.json'))('typescript')
const relative = 'tests/unit/modules/nuvemshop/'
const source = fs.readFileSync(path.join(evidence, 'c-boundary-original.test.ts'), 'utf8')
const file = ts.createSourceFile('original.ts', source, ts.ScriptTarget.Latest, true)
const registrations = JSON.parse(fs.readFileSync(path.join(evidence, 'a-registrations.json'), 'utf8'))
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const line = node => file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1
const endLine = node => file.getLineAndCharacterOfPosition(node.end).line + 1
const isDescribe = node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(file) === 'describe'
const describes = [...file.statements].filter(isDescribe)
const main = describes[0]
const hook = [...file.statements].find(node => ts.isExpressionStatement(node) && node.getText(file).startsWith('afterEach('))
const imports = [...file.statements].filter(ts.isImportDeclaration)
const helpers = [...file.statements].filter(node => !ts.isImportDeclaration(node) && node !== hook && !isDescribe(node))
const families = node => [...new Set(registrations.filter(r => r.originalLocation.line >= line(node) && r.originalLocation.endLine <= endLine(node)).map(r => r.family))]
const units = [...main.expression.arguments[1].body.statements].map(node => ({node, families: families(node), outer: true}))
for (const node of describes.slice(1)) units.push({node, families: families(node), outer: false})
for (const unit of units) {
  if (unit.families.length === 0 && unit.node.getText(file).startsWith('const ')) unit.families = ['Ambient process/global capabilities']
  if (unit.families.length !== 1) throw Error(`Nonatomic unit ${line(unit.node)}: ${unit.families}`)
  unit.family = unit.families[0]
}
function multiset(values) { const out = new Map(); for (const value of values) out.set(value, (out.get(value) || 0) + 1); return out }
function compare(expected, actual) {
  const left = multiset(expected), right = multiset(actual)
  const missing = [], duplicated = [], unexpected = []
  for (const [name, count] of left) if ((right.get(name) || 0) < count) missing.push([name, count - (right.get(name) || 0)])
  for (const [name, count] of right) { if (!left.has(name)) unexpected.push([name, count]); else if (count > left.get(name)) duplicated.push([name, count - left.get(name)]) }
  return {expected: expected.length, actual: actual.length, missing, duplicated, unexpected, pass: !missing.length && !duplicated.length && !unexpected.length}
}
function parseRegistrations(text, name) {
  const sf = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true)
  if (sf.parseDiagnostics.length) throw Error(`Parse errors ${name}`)
  const result = []
  const functions = []
  function collect(node) { if (ts.isFunctionDeclaration(node) && node.name) functions.push(node); ts.forEachChild(node, collect) }
  collect(sf)
  function scope(node) { let parent = node.parent; while (parent && !ts.isBlock(parent) && !ts.isSourceFile(parent)) parent = parent.parent; return parent }
  function callbackFor(node) {
    const arg = [...node.arguments].reverse().find(value => ts.isArrowFunction(value) || ts.isFunctionExpression(value) || ts.isIdentifier(value))
    if (!arg || !ts.isIdentifier(arg)) return arg
    return functions.filter(value => value.name.text === arg.text && node.pos >= scope(value).pos && node.end <= scope(value).end).sort((a, b) => scope(b).pos - scope(a).pos)[0]
  }
  function walk(node) {
    if (ts.isCallExpression(node)) {
      const expression = node.expression.getText(sf)
      if (expression === 'it' || expression === 'test' || expression.startsWith('it.each(') || expression.startsWith('test.each(')) {
        const callback = callbackFor(node)
        if (!callback) throw Error(`Unresolved callback ${name}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`)
        result.push({registration: hash(node.getText(sf)), callback: hash(callback.getText(sf)), line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1})
      }
    }
    ts.forEachChild(node, walk)
  }
  walk(sf)
  return result
}
module.exports = {fs, path, root, evidence, ts, relative, source, file, registrations, hash, line, endLine, isDescribe, describes, main, hook, imports, helpers, units, compare, parseRegistrations}
```

## c-split.cjs

<!-- prettier-ignore -->
```javascript
const lib = require('./c-partition-lib.cjs')
const {fs, path, root, evidence, ts, relative, source, imports, helpers, units, hook, hash, line, endLine} = lib
const freezePath = path.join(evidence, 'c-family-freeze.json')
if (!fs.existsSync(freezePath)) throw Error('Current-baseline-informed family freeze required before mutation')
const freeze = JSON.parse(fs.readFileSync(freezePath, 'utf8'))
if (!freeze.currentBaselineMetrics || !freeze.familyGroups) throw Error('Incomplete baseline provenance')
const filename = path.join(root, relative, 'boundary.test.ts')
const originalSf = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true)
const options = {noLib: true, noResolve: true, types: [], target: ts.ScriptTarget.Latest}
const host = ts.createCompilerHost(options)
host.getSourceFile = name => name === filename ? originalSf : undefined
const checker = ts.createProgram([filename], options, host).getTypeChecker()
const bound = new Map()
for (const statement of originalSf.statements) {
  if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) bound.set(declaration.name.getText(originalSf), {symbol: checker.getSymbolAtLocation(declaration.name), type: false})
  else if ((ts.isFunctionDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && statement.name) bound.set(statement.name.text, {symbol: checker.getSymbolAtLocation(statement.name), type: ts.isTypeAliasDeclaration(statement)})
}
function symbols(nodes) {
  const found = new Set()
  function walk(node) { if (ts.isIdentifier(node)) { const symbol = checker.getSymbolAtLocation(node); if (symbol) found.add(symbol) }; ts.forEachChild(node, walk) }
  for (const node of nodes) walk(node)
  return found
}
function corresponding(node) {
  let found
  function walk(value) { if (value.pos === node.pos && value.end === node.end && value.kind === node.kind) found = value; else if (!found) ts.forEachChild(value, walk) }
  walk(originalSf)
  if (!found) throw Error(`Cannot remap node ${line(node)}`)
  return found
}
function selectedImports(used) {
  const texts = []
  for (const declaration of originalSf.statements.filter(ts.isImportDeclaration)) {
    const clause = declaration.importClause
    if (!clause) { texts.push(declaration.getText(originalSf)); continue }
    const pieces = []
    if (clause.name && used.has(checker.getSymbolAtLocation(clause.name))) pieces.push(clause.name.text)
    const bindings = clause.namedBindings
    if (bindings && ts.isNamedImports(bindings)) {
      const names = bindings.elements.filter(value => used.has(checker.getSymbolAtLocation(value.name))).map(value => value.getText(originalSf))
      if (names.length) pieces.push(`{ ${names.join(', ')} }`)
    }
    if (pieces.length) texts.push(`import ${pieces.join(', ')} from ${declaration.moduleSpecifier.getText(originalSf)}`)
  }
  return texts.join('\n')
}
const groups = {a: [], b: []}
for (const unit of units) {
  const group = freeze.familyGroups[unit.family]
  if (!groups[group]) throw Error(`Unassigned family ${unit.family}`)
  groups[group].push(unit)
}
const exported = new Set()
const output = new Map()
for (const [group, selected] of Object.entries(groups)) {
  const used = symbols([...selected.map(unit => corresponding(unit.node)), corresponding(hook)])
  const values = [], types = []
  for (const [name, binding] of bound) if (used.has(binding.symbol)) { (binding.type ? types : values).push(name); exported.add(name) }
  const supportImports = []
  if (values.length) supportImports.push(`import { ${values.join(', ')} } from './boundary-support'`)
  if (types.length) supportImports.push(`import type { ${types.join(', ')} } from './boundary-support'`)
  const outer = selected.filter(unit => unit.outer).map(unit => unit.node.getFullText(lib.file)).join('')
  const top = selected.filter(unit => !unit.outer).map(unit => unit.node.getFullText(lib.file)).join('')
  output.set(`boundary-partition-${group}.test.ts`, `${selectedImports(used)}\n\n${supportImports.join('\n')}\n\n${hook.getText(lib.file)}\n\ndescribe('Nuvemshop server-only boundary', () => {${outer}\n})\n${top}\n`)
}
const helperUsed = symbols(helpers.map(corresponding))
const exportBindings = [...bound].filter(([name]) => exported.has(name))
const helperText = source.slice(helpers[0].getFullStart(), hook.getFullStart())
const footer = []
for (const type of [false, true]) {
  const names = exportBindings.filter(([, binding]) => binding.type === type).map(([name]) => name)
  if (names.length) footer.push(`export ${type ? 'type ' : ''}{ ${names.join(', ')} }`)
}
output.set('boundary-support.ts', `${selectedImports(helperUsed)}\n${helperText}\n${footer.join('\n')}\n`)
if (!process.argv.includes('--write')) { console.log(JSON.stringify({phase: 'DRY_RUN', files: [...output].map(([name, text]) => ({name, sha256: hash(text)}))})); process.exit(0) }
if (fs.existsSync(filename) && hash(fs.readFileSync(filename, 'utf8')) !== hash(source)) throw Error('Original monolith changed')
for (const [name, text] of output) fs.writeFileSync(path.join(root, relative, name), text)
if (fs.existsSync(filename)) fs.unlinkSync(filename)
// Formatting is part of deterministic generation; it changes only the new import/export layout.
const formatted = require('node:child_process').spawnSync(process.execPath, [path.join(root, 'node_modules/prettier/bin/prettier.cjs'), '--write', ...[...output.keys()].map(name => path.join(root, relative, name))], {cwd: root, encoding: 'utf8'})
if (formatted.status !== 0) throw Error(`Formatting failed: ${formatted.stderr}`)
const mapping = {sourceSha256: hash(source), freezeSha256: hash(fs.readFileSync(freezePath)), supportExports: [...exportBindings].map(([name, value]) => ({name, typeOnly: value.type})), units: units.map(unit => ({originalStartLine: line(unit.node), originalEndLine: endLine(unit.node), family: unit.family, partition: freeze.familyGroups[unit.family], sha256: hash(unit.node.getText(lib.file))})), output: [...output.keys()].map(name => ({name, sha256: hash(fs.readFileSync(path.join(root, relative, name)))}))}
fs.writeFileSync(path.join(evidence, 'c-split-mapping.json'), JSON.stringify(mapping, null, 2) + '\n')
console.log(JSON.stringify({phase: 'GREEN_CANDIDATE_WRITTEN', files: mapping.output, exports: mapping.supportExports}))
```

## c-equivalence.cjs

<!-- prettier-ignore -->
```javascript
const lib = require('./c-partition-lib.cjs')
const {fs, path, root, evidence, ts, relative, source, file, hash, hook, imports, helpers, units, compare, parseRegistrations} = lib
const original = parseRegistrations(source, 'original.ts')
const identity = JSON.parse(fs.readFileSync(path.join(evidence, 'a-identities.json'), 'utf8')).cases
const names = identity.map(x => JSON.stringify([x.describeHierarchy, x.fullName, x.logicalId]))
const selfTest = {
  originalPasses: compare(names, names).pass,
  missingRejected: !compare(names, names.slice(1)).pass,
  duplicateRejected: !compare(names, [...names, names[0]]).pass,
  sameCountReplacementRejected: !compare(names, [...names.slice(1), names[1]]).pass,
  changedCallbackRejected: !compare(original.map(x => x.callback), [...original.slice(1).map(x => x.callback), hash('changed callback')]).pass,
}
if (Object.values(selfTest).some(value => !value)) throw Error('Guard self-test failed')
fs.writeFileSync(path.join(evidence, 'c-red-guard-self-test.json'), JSON.stringify({selfTest, identityCount: names.length, originalRegistrations: original.length}, null, 2) + '\n')
if (process.argv.includes('--self-test-only')) {console.log(JSON.stringify({phase: 'RED', selfTest})); process.exit(0)}
const paths = ['boundary-partition-a.test.ts', 'boundary-partition-b.test.ts']
const candidate = paths.map(name => ({name, text: fs.readFileSync(path.join(root, relative, name), 'utf8')}))
const actual = candidate.flatMap(value => parseRegistrations(value.text, value.name))
const registrationCheck = compare(original.map(x => x.registration), actual.map(x => x.registration))
const callbackCheck = compare(original.map(x => x.callback), actual.map(x => x.callback))
const support = fs.readFileSync(path.join(root, relative, 'boundary-support.ts'), 'utf8')
const supportSf = ts.createSourceFile('boundary-support.ts', support, ts.ScriptTarget.Latest, true)
const supportHelpers = supportSf.statements.filter(node => !ts.isImportDeclaration(node) && !ts.isExportDeclaration(node))
const helperCheck = compare(helpers.map(node => hash(node.getText(file))), supportHelpers.map(node => hash(node.getText(supportSf))))
const hookChecks = candidate.map(value => ({file: value.name, count: value.text.split(hook.getText(file)).length - 1}))
// Full-unit byte hashes cover table fixtures, nested describe closures and helper closures.
const unitChecks = units.map(unit => ({originalLine: lib.line(unit.node), family: unit.family, sha256: hash(unit.node.getText(file)), occurrences: candidate.reduce((count, value) => count + value.text.split(unit.node.getText(file)).length - 1, 0)}))
const result = {originalSha256: hash(source), originalRegistrationCount: original.length, candidateRegistrationCount: actual.length, registrationCheck, callbackCheck, helperCheck, hookChecks, unitChecks, monolithAbsent: !fs.existsSync(path.join(root, relative, 'boundary.test.ts'))}
result.pass = registrationCheck.pass && callbackCheck.pass && helperCheck.pass && hookChecks.every(x => x.count === 1) && unitChecks.every(x => x.occurrences === 1) && result.monolithAbsent
fs.writeFileSync(path.join(evidence, 'c-static-equivalence.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({pass: result.pass, registrations: actual.length, helpers: helperCheck.actual, units: unitChecks.length, monolithAbsent: result.monolithAbsent}))
if (!result.pass) process.exitCode = 1
```

## c-identity-check.cjs

<!-- prettier-ignore -->
```javascript
const {fs, path, root, evidence, hash, compare} = require('./c-partition-lib.cjs')
const manifest = JSON.parse(fs.readFileSync(path.join(evidence, 'a-identities.json'), 'utf8'))
const input = process.argv[2]
if (!input) throw Error('Usage: node c-identity-check.cjs <vitest-dynamic-list.json>')
const collected = JSON.parse(fs.readFileSync(input, 'utf8'))
if (!Array.isArray(collected)) throw Error('Expected dynamically collected Vitest list array')
const normalized = collected.map(value => value.name.replaceAll(root, '<PROJECT_ROOT>'))
const expected = manifest.cases.map(value => value.fullName)
const multiplicity = new Map()
const candidateCases = collected.map((value, index) => {
  const fullName = normalized[index]
  const ordinal = (multiplicity.get(fullName) || 0) + 1
  multiplicity.set(fullName, ordinal)
  return {logicalId: 'boundary-' + hash(JSON.stringify([fullName, ordinal])).slice(0,24), fullName, multiplicityOrdinal: ordinal, file: value.file, location: value.location}
})
const result = compare(expected, normalized)
const identities = compare(manifest.cases.map(value => value.logicalId), candidateCases.map(value => value.logicalId))
const fileCounts = {}
for (const value of candidateCases) fileCounts[path.basename(value.file)] = (fileCounts[path.basename(value.file)] || 0) + 1
const fileCheck = Object.keys(fileCounts).sort().join(',') === 'boundary-partition-a.test.ts,boundary-partition-b.test.ts'
const summary = {baselineIdentities: manifest.count, candidateIdentities: candidateCases.length, names: result, identities, fileCounts, fileCheck, pass: result.pass && identities.pass && candidateCases.length === 598 && fileCheck, candidateCases}
fs.writeFileSync(path.join(evidence, 'c-identity-equivalence.json'), JSON.stringify(summary, null, 2) + '\n')
console.log(JSON.stringify({...summary, candidateCases: undefined}))
if (!summary.pass) process.exitCode = 1
```

## c-restore-original.cjs

<!-- prettier-ignore -->
```javascript
const {fs, path, root, evidence, relative, source, hash} = require('./c-partition-lib.cjs')
const manifest = JSON.parse(fs.readFileSync(path.join(evidence, 'prototype/manifest.json'), 'utf8'))
const monolith = path.join(root, relative, 'boundary.test.ts')
if (hash(source) !== manifest.originalSha256) throw Error('Original snapshot SHA mismatch')
if (fs.existsSync(monolith) && hash(fs.readFileSync(monolith)) !== manifest.originalSha256) throw Error('Refusing to overwrite modified monolith')
for (const value of manifest.files) {
  const target = path.join(root, relative, value.name)
  if (fs.existsSync(target) && hash(fs.readFileSync(target)) !== value.sha256) throw Error(`Refusing to remove modified candidate file ${value.name}; restore temporary instrumentation first`)
}
if (!process.argv.includes('--write')) { console.log('Verified rollback prerequisites; pass --write to restore experimental tree original suite'); process.exit(0) }
fs.writeFileSync(monolith, source)
for (const value of manifest.files) {
  const target = path.join(root, relative, value.name)
  if (fs.existsSync(target)) fs.unlinkSync(target)
}
console.log(JSON.stringify({restored: monolith, sha256: hash(fs.readFileSync(monolith))}))
```

## c-family-freeze.json

<!-- prettier-ignore -->
```json
{
  "currentBaselineMetrics": "/home/jlima/.codex/evidence/ci-perf-02-r02/baseline-a.summary.json",
  "currentBaselineSha256": "bd8e4fa5bbad8e728ef8c388ee16934e8ff4b115508e2e8542a299a08993aa08",
  "familyGroups": {
    "JSDoc type dependency matrix": "a",
    "JSDoc ScriptKind dependency matrix": "a",
    "triple-slash local types dependency matrix": "b",
    "Module boundaries and real entrypoint imports": "a",
    "triple-slash path dependency matrix": "b",
    "Ambient process/global capabilities": "a",
    "Browser/client import graph and CSS": "a",
    "CommonJS runtime capabilities and local bindings": "b",
    "Guard binding and Program identity": "b",
    "CommonJS/ESM export surfaces": "b",
    "Canonical resolver and tombstones": "b",
    "CI-OPT-01 cache invalidation canaries": "b",
    "CI-OPT-01 compiler equivalence": "b",
    "CI-OPT-01 library resolution": "b",
    "native Node diagnostic opt-in isolation": "b"
  },
  "loads": {
    "a": {
      "count": 326,
      "baseline_body_sum_s": 320.2549696909999
    },
    "b": {
      "count": 272,
      "baseline_body_sum_s": 316.3842999039999
    }
  },
  "reason": "Balance measured current family body durations with complete families atomic. Current weights move Guard binding/Program identity to B beside compiler/cache canaries; historical draft had Guard in A. Keep Ambient separated from CommonJS runtime, JSDoc and ScriptKind closures together, and all CI-OPT-01 families with native Node controls in B. Historical Programs and per-family endpoint heap informed resource risk; no claimed speedup. Baseline JSDoc three timeout failures retained.",
  "historicalProgramTotals": {
    "a": 744,
    "b": 760
  },
  "historicalHeapEndpointUpperMiB": {
    "a": 1187.5,
    "b": 1218.5
  },
  "baselineFailureCount": 3
}
```

## scripts/run.py

<!-- prettier-ignore -->
```python
import subprocess,time,json,sys,os,fcntl,threading
from pathlib import Path
os.umask(0o077)
E=Path('/home/jlima/.codex/evidence/ci-perf-02-r02')
label=sys.argv[1];cmd=sys.argv[2:]
lock=(E/'heavy-command.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
allowed={'PATH','HOME','TMPDIR','TMP','TEMP','LANG','LC_ALL','LC_CTYPE','TZ','CI','NODE_ENV','BOUNDARY_PROFILE'}
env={k:v for k,v in os.environ.items() if k in allowed}
for suffix in ['log','metrics.json','memory.jsonl']:
 if (E/(label+'.'+suffix)).exists():raise RuntimeError('Refusing overwrite '+label)
t0=time.perf_counter_ns();utc=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());stop=threading.Event();peak=0;samples=0;pids=set()
def monitor(pid):
 global peak,samples
 with (E/(label+'.memory.jsonl')).open('w') as out:
  while not stop.is_set():
   allproc={}
   for entry in Path('/proc').iterdir():
    if not entry.name.isdigit():continue
    try:
     raw=(entry/'stat').read_text();tail=raw[raw.rindex(')')+2:].split();allproc[int(entry.name)]=(int(tail[1]),int(tail[21])*os.sysconf('SC_PAGE_SIZE'))
    except (FileNotFoundError,ProcessLookupError,PermissionError):pass
   descendants={pid};changed=True
   while changed:
    added={n for n,(parent,_) in allproc.items() if parent in descendants}-descendants;changed=bool(added);descendants.update(added)
   measured={n:allproc[n][1] for n in descendants if n in allproc};rss=sum(measured.values());peak=max(peak,rss);samples+=1;pids.update(measured)
   out.write(json.dumps({'monotonic_ns':time.perf_counter_ns(),'elapsed_s':(time.perf_counter_ns()-t0)/1e9,'rss_bytes':rss,'processes':measured})+'\n');out.flush();stop.wait(.5)
with (E/(label+'.log')).open('w') as log:
 p=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,env=env)
 thread=threading.Thread(target=monitor,args=(p.pid,),daemon=True);thread.start()
 _,status,usage=os.wait4(p.pid,0);stop.set();thread.join()
code=os.waitstatus_to_exitcode(status)
r={'label':label,'command':cmd,'cwd':os.getcwd(),'started_utc':utc,'wall_s':(time.perf_counter_ns()-t0)/1e9,'exit_code':code,'user_s':usage.ru_utime,'system_s':usage.ru_stime,'cpu_s':usage.ru_utime+usage.ru_stime,'maxrss_kib':usage.ru_maxrss,'sampled_process_tree_peak_rss_bytes':peak,'rss_sampling_interval_s':.5,'rss_samples':samples,'observed_pids':sorted(pids),'environment_keys':sorted(env),'heap':'not observable without instrumentation; separate instrumented cohort','minor_faults':usage.ru_minflt,'major_faults':usage.ru_majflt,'voluntary_context_switches':usage.ru_nvcsw,'involuntary_context_switches':usage.ru_nivcsw}
(E/(label+'.metrics.json')).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r),flush=True);sys.exit(code)
```

## scripts/run-instrumented.py

<!-- prettier-ignore -->
```python
import subprocess,time,json,sys,os,fcntl,threading
from pathlib import Path
os.umask(0o077)
E=Path('/home/jlima/.codex/evidence/ci-perf-02-r02')
label=sys.argv[1];cmd=sys.argv[2:]
lock=(E/'heavy-command.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
allowed={'PATH','HOME','TMPDIR','TMP','TEMP','LANG','LC_ALL','LC_CTYPE','TZ','CI','NODE_ENV','BOUNDARY_PROFILE'}
env={k:v for k,v in os.environ.items() if k in allowed}
for suffix in ['log','metrics.json','memory.jsonl']:
 if (E/(label+'.'+suffix)).exists():raise RuntimeError('Refusing overwrite '+label)
t0=time.perf_counter_ns();utc=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());stop=threading.Event();peak=0;samples=0;pids=set()
def monitor(pid):
 global peak,samples
 with (E/(label+'.memory.jsonl')).open('w') as out:
  while not stop.is_set():
   allproc={}
   for entry in Path('/proc').iterdir():
    if not entry.name.isdigit():continue
    try:
     raw=(entry/'stat').read_text();tail=raw[raw.rindex(')')+2:].split();allproc[int(entry.name)]=(int(tail[1]),int(tail[21])*os.sysconf('SC_PAGE_SIZE'),int(tail[11]),int(tail[12]))
    except (FileNotFoundError,ProcessLookupError,PermissionError):pass
   descendants={pid};changed=True
   while changed:
    added={n for n,(parent,*_) in allproc.items() if parent in descendants}-descendants;changed=bool(added);descendants.update(added)
   measured={n:allproc[n][1] for n in descendants if n in allproc};rss=sum(measured.values());peak=max(peak,rss);samples+=1;pids.update(measured)
   out.write(json.dumps({'monotonic_ns':time.perf_counter_ns(),'elapsed_s':(time.perf_counter_ns()-t0)/1e9,'rss_bytes':rss,'processes':measured,'process_cpu_ticks':{n:{'user':allproc[n][2],'system':allproc[n][3]} for n in measured},'clock_ticks_per_second':os.sysconf('SC_CLK_TCK')})+'\n');out.flush();stop.wait(.5)
with (E/(label+'.log')).open('w') as log:
 p=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,env=env)
 thread=threading.Thread(target=monitor,args=(p.pid,),daemon=True);thread.start()
 _,status,usage=os.wait4(p.pid,0);stop.set();thread.join()
code=os.waitstatus_to_exitcode(status)
r={'label':label,'command':cmd,'cwd':os.getcwd(),'started_utc':utc,'wall_s':(time.perf_counter_ns()-t0)/1e9,'exit_code':code,'user_s':usage.ru_utime,'system_s':usage.ru_stime,'cpu_s':usage.ru_utime+usage.ru_stime,'maxrss_kib':usage.ru_maxrss,'sampled_process_tree_peak_rss_bytes':peak,'rss_sampling_interval_s':.5,'process_cpu_sampling_interval_s':.5,'rss_samples':samples,'observed_pids':sorted(pids),'environment_keys':sorted(env),'heap':'not observable without instrumentation; separate instrumented cohort','minor_faults':usage.ru_minflt,'major_faults':usage.ru_majflt,'voluntary_context_switches':usage.ru_nvcsw,'involuntary_context_switches':usage.ru_nivcsw}
(E/(label+'.metrics.json')).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r),flush=True);sys.exit(code)
```

## scripts/instrument.mjs

<!-- prettier-ignore -->
```javascript
import fs from 'node:fs'; import path from 'node:path'; import {createRequire} from 'node:module';
const root=process.cwd(), evidence='/home/jlima/.codex/evidence/ci-perf-02-r02/scripts';
const require=createRequire(path.join(root,'package.json')),ts=require('typescript');
const target=path.resolve(root,process.argv[2] ?? 'tests/unit/modules/nuvemshop/boundary.test.ts');
const source=fs.readFileSync(target,'utf8');
const mode=process.argv[3] ?? 'standalone';
if(!['standalone','support','registration'].includes(mode))throw Error('Unknown mode');
if(source.includes('boundaryMeasure')) throw Error('Already instrumented');
const backup=path.join(evidence,path.basename(target)+'.original');if(fs.existsSync(backup))throw Error('Backup exists');fs.writeFileSync(backup,source);
const parsed=ts.createSourceFile(target,source,ts.ScriptTarget.Latest,true),edits=[];
const names=new Set(['createProgramWithPredecessor','createTestProgram','createAdapterDiagnosticProgram','createBindingProgram','sourceEnvironment','readSources','assertBoundary','assertClientIsolation','dependencies']);
const methods={createProgram:'boundaryCreateProgram',getPreEmitDiagnostics:'boundaryDiagnostics',resolveModuleName:'boundaryResolveModule',resolveTypeReferenceDirective:'boundaryResolveType',createSourceFile:'boundaryCreateSource'};
function visit(node){
 if(ts.isFunctionDeclaration(node)&&node.name&&names.has(node.name.text)&&node.body){ edits.push([node.body.getStart(parsed)+1,node.body.getStart(parsed)+1,`\nreturn boundaryMeasure(${JSON.stringify(node.name.text)}, () => {\n`]);edits.push([node.body.end-1,node.body.end-1,'\n})\n']);}
 if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(parsed)==='ts'&&methods[node.expression.name.text])edits.push([node.expression.getStart(parsed),node.expression.end,methods[node.expression.name.text]]);
 ts.forEachChild(node,visit);
}
visit(parsed);
let result=source;
for(const [start,end,value]of edits.sort((a,b)=>b[0]-a[0]))result=result.slice(0,start)+value+result.slice(end);
result=result.replace('  const resolve = (name: string, filename: string) =>', `  for (const method of ['readFile','fileExists','directoryExists','getSourceFile'] as const) {\n    const originalMethod = host[method]!; (host as any)[method] = (...args: any[]) => boundaryMeasure('host.'+method,()=> (originalMethod as any)(...args))\n  }\n  const resolve = (name: string, filename: string) =>`);
result=result.replace('? candidate\n', '? (boundaryCurrent && boundaryCurrent.ast_reuses++, candidate)\n');
if(mode==='registration') {
 result="import { boundaryCreateProgram, boundaryDiagnostics, boundaryResolveModule, boundaryResolveType, boundaryCreateSource } from './boundary-support'\n"+result;
} else {
 result=fs.readFileSync(path.join(evidence,'boundary-profile-prelude.txt'),'utf8')+'\n'+result;
 if(mode==='support')result+='\nexport { boundaryCreateProgram, boundaryDiagnostics, boundaryResolveModule, boundaryResolveType, boundaryCreateSource }\n';
}
fs.writeFileSync(target,result);fs.writeFileSync(path.join(evidence,path.basename(target)+'.instrumented'),result);
console.log(JSON.stringify({edits:edits.length,bytes:result.length}));
```

## scripts/boundary-profile-prelude.txt

<!-- prettier-ignore -->
```typescript
import { appendFileSync as boundaryAppend } from 'node:fs'
import { createHash as boundaryHash } from 'node:crypto'
import { beforeEach as boundaryBeforeEach, afterEach as boundaryAfterEach, expect as boundaryExpect } from 'vitest'
import { threadId as boundaryThreadId } from 'node:worker_threads'
const boundaryOutput = process.env.BOUNDARY_PROFILE!
let boundaryCurrent: any
const boundaryStack: string[] = []
function boundaryDigest(value: unknown) { return boundaryHash('sha256').update(JSON.stringify(value)).digest('hex') }
function boundaryNormalize(value: any): any {
 if (typeof value === 'string') return boundaryPath(value)
 if (Array.isArray(value)) return value.map(boundaryNormalize)
 if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, boundaryNormalize(item)]))
 return value
}
function boundaryPath(value: string) { return value.replaceAll(process.cwd(), '<root>') }
function boundaryMeasure<T>(name: string, run: () => T): T {
  const start = performance.now(); const cpu = process.cpuUsage(); const compilerStart = name === 'ts.createProgram' || name === 'ts.getPreEmitDiagnostics' ? process.hrtime.bigint().toString() : undefined
  const bucket = boundaryCurrent?.helpers[name] ?? {count:0, wall_ms:0, cpu_us:0, errors:0}
  if (boundaryCurrent) boundaryCurrent.helpers[name] = bucket
  bucket.count++; boundaryStack.push(name)
  try { return run() } catch (error) { bucket.errors++; if (boundaryCurrent && (name === 'assertBoundary' || name === 'assertClientIsolation')) boundaryCurrent.rejections.push([name, boundaryPath(String((error as Error).message))]); throw error }
  finally { boundaryStack.pop(); const used = process.cpuUsage(cpu); bucket.wall_ms += performance.now()-start; bucket.cpu_us += used.user+used.system; if(compilerStart && boundaryCurrent)boundaryCurrent.compiler_spans.push({name,start_ns:compilerStart,end_ns:process.hrtime.bigint().toString(),cpu_us:used.user+used.system}) }
}
const boundarySourceHash = new WeakMap<ts.SourceFile,string>()
function boundarySourceDigest(source: ts.SourceFile) {
  let digest=boundarySourceHash.get(source)
  if(!digest) { digest=boundaryDigest([boundaryPath(source.fileName),boundaryPath(source.text)]); boundarySourceHash.set(source,digest) }
  return digest
}
function boundaryCreateProgram(...args: any[]): ts.Program {
  const program=boundaryMeasure('ts.createProgram',()=> (ts.createProgram as any)(...args))
  const files=program.getSourceFiles(); const options=program.getCompilerOptions()
  if(boundaryCurrent) boundaryCurrent.programs.push({lane:boundaryStack.includes('createBindingProgram')?'binding':boundaryStack.includes('createAdapterDiagnosticProgram')?'adapter-diagnostic':boundaryStack.includes('createTestProgram')?'diagnostic':'reference',rootNames:program.getRootFileNames().map(boundaryPath),options:boundaryNormalize(options),roots:program.getRootFileNames().length,rootDigest:boundaryDigest(program.getRootFileNames().map(boundaryPath)),files:files.length,declarations:files.filter(x=>x.isDeclarationFile).length,nodeFiles:files.filter(x=>x.fileName.includes('/@types/node/')).length,noLib:options.noLib===true,types:options.types,skipLibCheck:options.skipLibCheck,sourceDigest:boundaryDigest(files.map(boundarySourceDigest))})
  return program
}
function boundaryDiagnostics(...args: any[]): readonly ts.Diagnostic[] {
  const result=boundaryMeasure('ts.getPreEmitDiagnostics',()=> (ts.getPreEmitDiagnostics as any)(...args))
  const normalize=(d: ts.Diagnostic): unknown => ({code:d.code,category:d.category,file:d.file ? boundaryPath(d.file.fileName):undefined,text:d.file?.text,start:d.start,length:d.length,message:d.messageText,source:d.source,unnecessary:d.reportsUnnecessary,deprecated:d.reportsDeprecated,related:d.relatedInformation?.map(normalize)})
  if(boundaryCurrent) boundaryCurrent.diagnostics.push({count:result.length,signature:boundaryNormalize(result.map(normalize)).map(({text,...rest}:any)=>rest),digest:boundaryDigest(boundaryNormalize(result.map(normalize))),codes:result.map(d=>d.code)})
  return result
}
function boundaryResolveModule(...args: any[]): any {const result=boundaryMeasure('ts.resolveModuleName',()=> (ts.resolveModuleName as any)(...args));if(boundaryCurrent)boundaryCurrent.resolutions.push({kind:'module',name:args[0],containing:boundaryPath(args[1]),result:boundaryNormalize(result.resolvedModule)});return result}
function boundaryResolveType(...args: any[]): any {const result=boundaryMeasure('ts.resolveTypeReferenceDirective',()=> (ts.resolveTypeReferenceDirective as any)(...args));if(boundaryCurrent)boundaryCurrent.resolutions.push({kind:'types',name:args[0],containing:boundaryPath(args[1]),result:boundaryNormalize(result.resolvedTypeReferenceDirective)});return result}
function boundaryCreateSource(...args: any[]): any {return boundaryMeasure('ts.createSourceFile',()=> (ts.createSourceFile as any)(...args))}
boundaryBeforeEach(()=> {boundaryCurrent={name:boundaryExpect.getState().currentTestName,pid:process.pid,threadId:boundaryThreadId,workerId:process.env.VITEST_WORKER_ID,poolId:process.env.VITEST_POOL_ID,started_monotonic_ns:process.hrtime.bigint().toString(),started:performance.now(),cpu:process.cpuUsage(),heap_start:process.memoryUsage().heapUsed,rss_start:process.memoryUsage().rss,helpers:{},compiler_spans:[],programs:[],diagnostics:[],resolutions:[],rejections:[],ast_reuses:0}})
boundaryAfterEach(()=> {const cpu=process.cpuUsage(boundaryCurrent.cpu);const memory=process.memoryUsage();boundaryCurrent.ended_monotonic_ns=process.hrtime.bigint().toString();boundaryCurrent.wall_ms=performance.now()-boundaryCurrent.started;boundaryCurrent.cpu_us=cpu.user+cpu.system;boundaryCurrent.heap_end=memory.heapUsed;boundaryCurrent.rss_end=memory.rss;boundaryCurrent.assertions=boundaryExpect.getState().assertionCalls;delete boundaryCurrent.started;delete boundaryCurrent.cpu;boundaryAppend(boundaryOutput,JSON.stringify(boundaryCurrent)+'\n');boundaryCurrent=undefined})
```

## scripts/analyze-unmodified.py

<!-- prettier-ignore -->
```python
import json,sys,collections
from pathlib import Path
E=Path('/home/jlima/.codex/evidence/ci-perf-02-r02'); label=sys.argv[1]
r=json.loads((E/(label+'.results.json')).read_text()); m=json.loads((E/(label+'.metrics.json')).read_text())
manifest=json.loads((E/'a-identities.json').read_text())
cases={c['fullName']:c for c in manifest['cases']}
def canonical(t):return ' > '.join(t['ancestorTitles']+[t['title']]).replace(m['cwd'],'<PROJECT_ROOT>')
def family(t):return cases[canonical(t)]['family']

boundary=[f for f in r['testResults'] if '/boundary' in f['name']];bt=[t for f in boundary for t in f['assertionResults']]
s={'metrics':m,'total':r['numTotalTests'],'passed':r['numPassedTests'],'failed':r['numFailedTests'],'boundary_count':len(bt),'boundary_passed':sum(t['status']=='passed' for t in bt),'boundary_duration_sum_s_NOT_file_wall':sum(t.get('duration')or 0 for t in bt)/1000,'reporter_file_spans_s_NOT_monotonic':{f['name']:(f['endTime']-f['startTime'])/1000 for f in boundary},'other_tests_duration_sum_s_NOT_wall':sum(t.get('duration')or 0 for f in r['testResults'] if f not in boundary for t in f['assertionResults'])/1000,'failures':[{'file':f['name'],'name':t['fullName'],'duration_ms':t.get('duration'),'failureMessages':t.get('failureMessages')} for f in r['testResults'] for t in f['assertionResults'] if t['status']=='failed'],'families':{}}
for t in bt:
 f=s['families'].setdefault(family(t),{'count':0,'test_duration_sum_s':0,'worst_s':0,'failed':0});d=(t.get('duration')or 0)/1000;f['count']+=1;f['test_duration_sum_s']+=d;f['worst_s']=max(f['worst_s'],d);f['failed']+=t['status']=='failed'
s['registration_weights']={}
for t in bt:
 c=cases[canonical(t)];f=s['registration_weights'].setdefault(c['registrationSha256'],{'line':c['originalLocation']['line'],'family':c['family'],'template':c['template'],'count':0,'test_duration_sum_s':0})
 f['count']+=1;f['test_duration_sum_s']+=(t.get('duration')or 0)/1000
(E/(label+'.summary.json')).write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s,indent=2))
```

## scripts/analyze-profile.py

<!-- prettier-ignore -->
```python
import json,sys,collections,bisect
from pathlib import Path
E=Path('/home/jlima/.codex/evidence/ci-perf-02-r02');label=sys.argv[1];cwd=json.loads((E/(label+'.metrics.json')).read_text())['cwd']
records=[json.loads(l) for l in (E/(label+'.jsonl')).read_text().splitlines()]
manifest=json.loads((E/'a-identities.json').read_text());cases={c['fullName']:c for c in manifest['cases']}
for r in records:
 for trace in r['resolutions']:
  trace['name']=trace['name'].replace(cwd,'<root>')
 r['canonical_name']=r['name'].replace(cwd,'<PROJECT_ROOT>');r['logicalId']=cases[r['canonical_name']]['logicalId'];r['family']=cases[r['canonical_name']]['family']
workers={};families={};helpers={}
for r in records:
 w=workers.setdefault(str(r['pid']),{'pid':r['pid'],'workerId':r['workerId'],'poolId':r['poolId'],'threadId':r['threadId'],'count':0,'start_ns':int(r['started_monotonic_ns']),'end_ns':0,'cpu_us':0})
 w['count']+=1;w['start_ns']=min(w['start_ns'],int(r['started_monotonic_ns']));w['end_ns']=max(w['end_ns'],int(r['ended_monotonic_ns']));w['cpu_us']+=r['cpu_us']
 f=families.setdefault(r['family'],{'count':0,'wall_sum_ms':0,'cpu_us':0,'assertions':0,'programs':0,'diagnostic_calls':0,'diagnostic_count':0,'ast_reuses':0,'resolution_calls':0,'rejections':0,'max_endpoint_heap_bytes':0,'max_endpoint_rss_bytes':0})
 f['count']+=1;f['wall_sum_ms']+=r['wall_ms'];f['cpu_us']+=r['cpu_us'];f['assertions']+=r['assertions'];f['programs']+=len(r['programs']);f['diagnostic_calls']+=len(r['diagnostics']);f['diagnostic_count']+=sum(d['count'] for d in r['diagnostics']);f['ast_reuses']+=r['ast_reuses'];f['resolution_calls']+=len(r['resolutions']);f['rejections']+=len(r['rejections']);f['max_endpoint_heap_bytes']=max(f['max_endpoint_heap_bytes'],r['heap_start'],r['heap_end']);f['max_endpoint_rss_bytes']=max(f['max_endpoint_rss_bytes'],r['rss_start'],r['rss_end'])
 for name,h in r['helpers'].items():
  hh=helpers.setdefault(name,dict.fromkeys(h,0))
  for k,v in h.items():hh[k]+=v
start=min(w['start_ns'] for w in workers.values());end=max(w['end_ns'] for w in workers.values());overlap=0
if len(workers)==2:
 a,b=workers.values();overlap=max(0,min(a['end_ns'],b['end_ns'])-max(a['start_ns'],b['start_ns']))/1e9
intervals={pid:sorted((int(r['started_monotonic_ns']),int(r['ended_monotonic_ns'])) for r in records if str(r['pid'])==pid) for pid in workers}
compiler_intervals={pid:sorted((int(span['start_ns']),int(span['end_ns'])) for r in records if str(r['pid'])==pid for span in r['compiler_spans']) for pid in workers}
def intersect_duration(groups):
 if len(groups)!=2:return 0
 a,b=list(groups.values());i=j=0;total=0
 while i<len(a) and j<len(b):
  total+=max(0,min(a[i][1],b[j][1])-max(a[i][0],b[j][0]))
  if a[i][1]<b[j][1]:i+=1
  else:j+=1
 return total/1e9
def contains(ranges,start,end):
 i=bisect.bisect_right(ranges,(start,float('inf')))-1
 return i>=0 and ranges[i][0]<=start and end<=ranges[i][1]
samples=[json.loads(l) for l in (E/(label+'.memory.jsonl')).read_text().splitlines()];both_cpu=0;test_cpu=0;compiler_cpu=0;both_ticks=collections.Counter()
for prev,cur in zip(samples,samples[1:]):
 if 'process_cpu_ticks' not in cur:continue
 active=[]
 for pid,w in workers.items():
  if not(w['start_ns']<=prev['monotonic_ns']<cur['monotonic_ns']<=w['end_ns']):continue
  a=prev['process_cpu_ticks'].get(pid);b=cur['process_cpu_ticks'].get(pid)
  if a and b:
   delta=b['user']+b['system']-a['user']-a['system']
   if delta>0:active.append(pid);both_ticks[pid]+=delta
 if len(active)>=2:
  both_cpu+=1
  if all(contains(intervals[pid],prev['monotonic_ns'],cur['monotonic_ns']) for pid in active):test_cpu+=1
  if all(contains(compiler_intervals[pid],prev['monotonic_ns'],cur['monotonic_ns']) for pid in active):compiler_cpu+=1
s={'label':label,'records':len(records),'identity_multiset_matches':collections.Counter(r['logicalId'] for r in records)==collections.Counter(c['logicalId'] for c in manifest['cases']),'monotonic_first_test_to_last_hook_s':(end-start)/1e9,'workers':workers,'worker_span_overlap_s':overlap,'actual_test_interval_intersection_s':intersect_duration(intervals),'actual_compiler_interval_intersection_s':intersect_duration(compiler_intervals),'samples_both_cpu_inside_actual_test_intervals':test_cpu,'samples_both_cpu_inside_actual_compiler_intervals':compiler_cpu,'samples_both_workers_cpu_increasing_inside_spans':both_cpu,'cpu_ticks_observed_inside_worker_spans':dict(both_ticks),'families':families,'totals':{k:sum(f[k] for f in families.values()) for k in ['count','wall_sum_ms','cpu_us','assertions','programs','diagnostic_calls','diagnostic_count','ast_reuses','resolution_calls','rejections']},'max_endpoint_heap_bytes':max(f['max_endpoint_heap_bytes'] for f in families.values()),'max_endpoint_rss_bytes':max(f['max_endpoint_rss_bytes'] for f in families.values()),'helpers_inclusive_do_not_sum':helpers}
(E/(label+'.profile-summary.json')).write_text(json.dumps(s,indent=2)+'\n');(E/(label+'.canonical.json')).write_text(json.dumps(records)+'\n');print(json.dumps(s,indent=2))
```

## scripts/compare-full.py

<!-- prettier-ignore -->
```python
import json,sys,collections
from pathlib import Path
E=Path('/home/jlima/.codex/evidence/ci-perf-02-r02');labels=sys.argv[1:3]
manifest=json.loads((E/'a-identities.json').read_text());cases={c['fullName']:c for c in manifest['cases']}
def load(label):
 m=json.loads((E/(label+'.metrics.json')).read_text());r=json.loads((E/(label+'.results.json')).read_text());tests={};bc=collections.Counter();occurrences=collections.Counter();all_identities=collections.Counter()
 for f in r['testResults']:
  boundary='/boundary' in f['name']
  for t in f['assertionResults']:
   name=' > '.join(t['ancestorTitles']+[t['title']]).replace(m['cwd'],'<PROJECT_ROOT>')
   key=cases[name]['logicalId'] if boundary else f['name'].replace(m['cwd'],'<PROJECT_ROOT>')+' > '+name
   all_identities[key]+=1;occurrences[key]+=1;instance_key=key+' [occurrence '+str(occurrences[key])+']'
   tests[instance_key]={'name':name,'status':t['status'],'duration_ms':t.get('duration'),'boundary':boundary}
   if boundary:bc[key]+=1
 return {'label':label,'total':r['numTotalTests'],'passed':r['numPassedTests'],'failed':r['numFailedTests'],'boundary_count':sum(bc.values()),'boundary_identity_multiset':bc,'full_identity_multiset':all_identities,'metrics':m,'tests':tests}
a,b=map(load,labels)
s={'baseline':a['label'],'candidate':b['label'],'cohort':'single full unmodified primary pair, normal defaults3; observation only, not validated speedup','rows':[{k:x[k] for k in ['label','total','passed','failed','boundary_count','metrics']} for x in [a,b]],'full_identity_multiset_matches':a['full_identity_multiset']==b['full_identity_multiset'],'multiplicity_accounted_full_cases':[sum(x['full_identity_multiset'].values()) for x in [a,b]],'distinct_full_identity_keys':[len(x['full_identity_multiset']) for x in [a,b]],'boundary_multiset_matches':a['boundary_identity_multiset']==b['boundary_identity_multiset'],'missing':list(a['tests'].keys()-b['tests'].keys()),'unexpected':list(b['tests'].keys()-a['tests'].keys()),'outcome_differences':[{'name':a['tests'][key]['name'],'baseline':a['tests'][key]['status'],'candidate':b['tests'][key]['status']} for key in a['tests'].keys()&b['tests'].keys() if a['tests'][key]['status']!=b['tests'][key]['status']], 'nonpassing':{x['label']:[t for t in x['tests'].values() if t['status']!='passed'] for x in [a,b]}}
s['full_green_equivalence']=not(s['missing'] or s['unexpected'] or s['outcome_differences'] or any(s['nonpassing'].values()))
(E/'full-pair-comparison.json').write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s,indent=2))
```

## scripts/compare-profiles.py

<!-- prettier-ignore -->
```python
import collections,json,sys
from pathlib import Path
E=Path('/home/jlima/.codex/evidence/ci-perf-02-r02');a,b=sys.argv[1:3]
def load(label):
 r=json.loads((E/(label+'.canonical.json')).read_text());d={x['logicalId']:x for x in r}
 if len(d)!=len(r):raise ValueError('duplicate identity '+label)
 return d
x,y=load(a),load(b);fields=['assertions','programs','diagnostics','resolutions','rejections'];diff=[]
for key in x.keys()&y.keys():
 for field in fields:
  if x[key][field]!=y[key][field]:
   va,vb=x[key][field],y[key][field]
   detail={'logicalId':key,'name':x[key]['canonical_name'],'field':field}
   if isinstance(va,list) and isinstance(vb,list):
    detail['baseline_length']=len(va);detail['candidate_length']=len(vb);detail['first_differing_index']=next((i for i,(p,q) in enumerate(zip(va,vb)) if p!=q),None)
   else:detail['baseline']=va;detail['candidate']=vb
   diff.append(detail)
s={'baseline':a,'candidate':b,'compared_fields':fields,'baseline_count':len(x),'candidate_count':len(y),'missing':sorted(x.keys()-y.keys()),'unexpected':sorted(y.keys()-x.keys()),'differences':diff,'ast_reuse_deltas':[{'logicalId':key,'name':x[key]['canonical_name'],'baseline':x[key]['ast_reuses'],'candidate':y[key]['ast_reuses']} for key in x.keys()&y.keys() if x[key]['ast_reuses']!=y[key]['ast_reuses']]}
def statuses(label):
 cwd=json.loads((E/(label+'.metrics.json')).read_text())['cwd'];report=json.loads((E/(label+'.results.json')).read_text())
 return {' > '.join(t['ancestorTitles']+[t['title']]).replace(cwd,'<PROJECT_ROOT>'):t['status'] for f in report['testResults'] for t in f['assertionResults']}
sa,sb=statuses(a),statuses(b)
s['outcome_differences']=[{'name':name,'baseline':sa[name],'candidate':sb.get(name)} for name in sa if sa[name]!=sb.get(name)]
s['baseline_nonpassing']={k:v for k,v in sa.items() if v!='passed'};s['candidate_nonpassing']={k:v for k,v in sb.items() if v!='passed'}
s['equivalent_recorded_fields']=not(s['missing'] or s['unexpected'] or diff)
s['full_green_equivalence']=s['equivalent_recorded_fields'] and not s['outcome_differences'] and not s['baseline_nonpassing'] and not s['candidate_nonpassing']
(E/(a+'-vs-'+b+'.json')).write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s,indent=2))
```

## scripts/compare-focused.py

<!-- prettier-ignore -->
```python
import collections,json,sys
from pathlib import Path
E=Path('/home/jlima/.codex/evidence/ci-perf-02-r02');full,focused=sys.argv[1:3]
a=json.loads((E/(full+'.canonical.json')).read_text());b=json.loads((E/(focused+'.canonical.json')).read_text());byid={r['logicalId']:r for r in a};fields=['assertions','programs','diagnostics','resolutions','rejections'];diff=[]
for r in b:
 if r['logicalId'] not in byid:diff.append({'logicalId':r['logicalId'],'field':'unexpected_identity'});continue
 for field in fields:
  if byid[r['logicalId']][field]!=r[field]:diff.append({'logicalId':r['logicalId'],'name':r['canonical_name'],'field':field})
rep=json.loads((E/(focused+'.results.json')).read_text())
def reported_statuses(label):
 cwd=json.loads((E/(label+'.metrics.json')).read_text())['cwd'];q=json.loads((E/(label+'.results.json')).read_text())
 return {' > '.join(t['ancestorTitles']+[t['title']]).replace(cwd,'<PROJECT_ROOT>'):t['status'] for f in q['testResults'] for t in f['assertionResults']}
fs,ss=reported_statuses(full),reported_statuses(focused)
statusdiff=[{'name':r['canonical_name'],'full':fs[r['canonical_name']],'focused':ss[r['canonical_name']]} for r in b if fs[r['canonical_name']]!=ss[r['canonical_name']]]
selected={r['logicalId'] for r in b};full_order=[r['logicalId'] for r in a if r['logicalId'] in selected];focused_order=[r['logicalId'] for r in b]
s={'outcome_differences_from_full':statusdiff,'selected_logical_ids_subset_of_full':all(r['logicalId'] in byid for r in b),'execution_order_differs_from_full_filtered_order':full_order!=focused_order,'full_filtered_order':full_order,'focused_execution_order':focused_order,'full':full,'focused':focused,'profile_records':len(b),'reported_total_including_filtered':rep['numTotalTests'],'passed':rep['numPassedTests'],'failed':rep['numFailedTests'],'filtered_pending':rep['numPendingTests'],'selected_identity_unique':len({r['logicalId'] for r in b})==len(b),'compared_fields':fields,'differences':diff,'subset_recorded_fields_equivalent':not diff,'ast_reuse_differences':[{'logicalId':r['logicalId'],'full':byid[r['logicalId']]['ast_reuses'],'focused':r['ast_reuses']} for r in b if r['logicalId'] in byid and byid[r['logicalId']]['ast_reuses']!=r['ast_reuses']]}
(E/(focused+'.comparison.json')).write_text(json.dumps(s,indent=2)+'\n');print(json.dumps(s,indent=2))
```
