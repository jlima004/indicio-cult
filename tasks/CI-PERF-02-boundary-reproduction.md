# CI-PERF-02 — Boundary: reprodução exata

Estes scripts foram usados apenas na worktree de medição descartável. Não são alterações no código produtivo, no gate ou na configuração versionada. O diretório de evidência é privado e durável; use outro diretório/labels ou preserve os arquivos existentes antes de uma nova medição. Paths absolutos identificam a máquina medida; numa reprodução independente ajuste apenas os prefixes de workspace/evidência e registre essa alteração.

## Condições

Head b305d8aa9771aafc8b08d73856412a8604c8f787; Node22.23.1/npm10.9.8/TypeScript5.9.3/Vitest5.0.1/@typesNode22.20.3; node_modules copiado com cachesVite, SO não forçado frio. Sem mudar timeouts, assertions, versões ou configuração. `--testNamePattern/-t`, `--reporter=json`, `--outputFile` e `--includeTaskLocation` foram confirmados no help e reporter instalados. Sem envlocal/credentials provider reais.

Todos os scripts abaixo terminam em newline. Os SHA256 validam os bytes do conteúdo dos fences extraídos incluindo o newline final. Prettier deve preservar os fences marcados.

| Arquivo local                | SHA256 exato                                                       |
| ---------------------------- | ------------------------------------------------------------------ |
| boundary-run-d1.py           | `bb5ccacbeb7f46f198f98f129c702fec5cc4adb3cdb37ad76994b8ce45132406` |
| boundary-run.py              | `4e97ef9344ffc6a29347b3ce9bd7c99dd710311d2b17ab2306e66816865b7794` |
| boundary-profile-prelude.txt | `7b753a63755c5432dca4d5ac51cf0e07367d6786ef79c345b33c1362e30efef4` |
| boundary-instrument.mjs      | `c648190d456828dcfeb63b9e2efd4f988225aac92434ae49771379d945488850` |
| boundary-analyze.py          | `ef41d71a42956a83667bbecddf55d3f93afb5c7d8602dd931c8293511983a028` |

D1 originally executed the body now preserved as `boundary-run-d1.py` while that body was named `boundary-run.py`. The later wrapper added the environment allowlist. The reproduction command uses the preserved D1 filename; its Vitest subprocess and inherited environment match the actual D1 execution.

## boundary-run-d1.py

<!-- prettier-ignore -->
```python
import subprocess,time,resource,json,sys,os
from pathlib import Path
root=Path('/home/jlima/.codex/evidence/ci-perf-02/2026-10-22')
label=sys.argv[1]; cmd=sys.argv[2:]
t0=time.perf_counter_ns(); utc=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
with (root/(label+'.log')).open('w') as log:
 p=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT)
 _,status,usage=os.wait4(p.pid,0)
code=os.waitstatus_to_exitcode(status)
r={'label':label,'command':cmd,'cwd':os.getcwd(),'started_utc':utc,'wall_s':(time.perf_counter_ns()-t0)/1e9,'exit_code':code,'user_s':usage.ru_utime,'system_s':usage.ru_stime,'maxrss_kib':usage.ru_maxrss,'inblock':usage.ru_inblock,'oublock':usage.ru_oublock,'minor_faults':usage.ru_minflt,'major_faults':usage.ru_majflt,'voluntary_context_switches':usage.ru_nvcsw,'involuntary_context_switches':usage.ru_nivcsw}
(root/(label+'.metrics.json')).write_text(json.dumps(r,indent=2)+'\n'); print(json.dumps(r),flush=True)
sys.exit(code)
```

## boundary-run.py

<!-- prettier-ignore -->
```python
import subprocess,time,resource,json,sys,os
from pathlib import Path
root=Path('/home/jlima/.codex/evidence/ci-perf-02/2026-10-22')
label=sys.argv[1]; cmd=sys.argv[2:]
t0=time.perf_counter_ns(); utc=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
with (root/(label+'.log')).open('w') as log:
 allowed={"PATH","HOME","TMPDIR","TMP","TEMP","LANG","LC_ALL","LC_CTYPE","TZ","CI","NODE_ENV","BOUNDARY_PROFILE"}
 env={k:v for k,v in os.environ.items() if k in allowed}
 p=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,env=env)
 _,status,usage=os.wait4(p.pid,0)
code=os.waitstatus_to_exitcode(status)
r={'label':label,'command':cmd,'cwd':os.getcwd(),'started_utc':utc,'wall_s':(time.perf_counter_ns()-t0)/1e9,'exit_code':code,'user_s':usage.ru_utime,'system_s':usage.ru_stime,'maxrss_kib':usage.ru_maxrss,'inblock':usage.ru_inblock,'oublock':usage.ru_oublock,'minor_faults':usage.ru_minflt,'major_faults':usage.ru_majflt,'voluntary_context_switches':usage.ru_nvcsw,'involuntary_context_switches':usage.ru_nivcsw}
(root/(label+'.metrics.json')).write_text(json.dumps(r,indent=2)+'\n'); print(json.dumps(r),flush=True)
sys.exit(code)
```

## boundary-profile-prelude.txt

<!-- prettier-ignore -->
```typescript
import { appendFileSync as boundaryAppend } from 'node:fs'
import { createHash as boundaryHash } from 'node:crypto'
import { beforeEach as boundaryBeforeEach, afterEach as boundaryAfterEach } from 'vitest'
const boundaryOutput = process.env.BOUNDARY_PROFILE!
let boundaryCurrent: any
const boundaryStack: string[] = []
function boundaryDigest(value: unknown) { return boundaryHash('sha256').update(JSON.stringify(value)).digest('hex') }
function boundaryPath(value: string) { return value.replaceAll(process.cwd(), '<root>') }
function boundaryMeasure<T>(name: string, run: () => T): T {
  const start = performance.now(); const cpu = process.cpuUsage()
  const bucket = boundaryCurrent?.helpers[name] ?? {count:0, wall_ms:0, cpu_us:0, errors:0}
  if (boundaryCurrent) boundaryCurrent.helpers[name] = bucket
  bucket.count++; boundaryStack.push(name)
  try { return run() } catch (error) { bucket.errors++; if (boundaryCurrent && (name === 'assertBoundary' || name === 'assertClientIsolation')) boundaryCurrent.rejections.push([name, boundaryPath(String((error as Error).message))]); throw error }
  finally { boundaryStack.pop(); const used = process.cpuUsage(cpu); bucket.wall_ms += performance.now()-start; bucket.cpu_us += used.user+used.system }
}
const boundarySourceHash = new WeakMap<ts.SourceFile,string>()
function boundarySourceDigest(source: ts.SourceFile) {
  let digest=boundarySourceHash.get(source)
  if(!digest) { digest=boundaryDigest([boundaryPath(source.fileName),source.text]); boundarySourceHash.set(source,digest) }
  return digest
}
function boundaryCreateProgram(...args: any[]): ts.Program {
  const program=boundaryMeasure('ts.createProgram',()=> (ts.createProgram as any)(...args))
  const files=program.getSourceFiles(); const options=program.getCompilerOptions()
  if(boundaryCurrent) boundaryCurrent.programs.push({lane:boundaryStack.includes('createBindingProgram')?'binding':boundaryStack.includes('createAdapterDiagnosticProgram')?'adapter-diagnostic':boundaryStack.includes('createTestProgram')?'diagnostic':'reference',roots:program.getRootFileNames().length,rootDigest:boundaryDigest(program.getRootFileNames().map(boundaryPath)),files:files.length,declarations:files.filter(x=>x.isDeclarationFile).length,nodeFiles:files.filter(x=>x.fileName.includes('/@types/node/')).length,noLib:options.noLib===true,types:options.types,skipLibCheck:options.skipLibCheck,sourceDigest:boundaryDigest(files.map(boundarySourceDigest))})
  return program
}
function boundaryDiagnostics(...args: any[]): readonly ts.Diagnostic[] {
  const result=boundaryMeasure('ts.getPreEmitDiagnostics',()=> (ts.getPreEmitDiagnostics as any)(...args))
  const normalize=(d: ts.Diagnostic): unknown => ({code:d.code,category:d.category,file:d.file ? boundaryPath(d.file.fileName):undefined,text:d.file?.text,start:d.start,length:d.length,message:d.messageText,source:d.source,unnecessary:d.reportsUnnecessary,deprecated:d.reportsDeprecated,related:d.relatedInformation?.map(normalize)})
  if(boundaryCurrent) boundaryCurrent.diagnostics.push({count:result.length,digest:boundaryDigest(result.map(normalize)),codes:result.map(d=>d.code)})
  return result
}
function boundaryResolveModule(...args: any[]): any {return boundaryMeasure('ts.resolveModuleName',()=> (ts.resolveModuleName as any)(...args))}
function boundaryResolveType(...args: any[]): any {return boundaryMeasure('ts.resolveTypeReferenceDirective',()=> (ts.resolveTypeReferenceDirective as any)(...args))}
function boundaryCreateSource(...args: any[]): any {return boundaryMeasure('ts.createSourceFile',()=> (ts.createSourceFile as any)(...args))}
boundaryBeforeEach(()=> {boundaryCurrent={name:expect.getState().currentTestName,started:performance.now(),cpu:process.cpuUsage(),heap_start:process.memoryUsage().heapUsed,rss_start:process.memoryUsage().rss,helpers:{},programs:[],diagnostics:[],rejections:[],ast_reuses:0}})
boundaryAfterEach(()=> {const cpu=process.cpuUsage(boundaryCurrent.cpu);const memory=process.memoryUsage();boundaryCurrent.wall_ms=performance.now()-boundaryCurrent.started;boundaryCurrent.cpu_us=cpu.user+cpu.system;boundaryCurrent.heap_end=memory.heapUsed;boundaryCurrent.rss_end=memory.rss;boundaryCurrent.assertions=expect.getState().assertionCalls;delete boundaryCurrent.started;delete boundaryCurrent.cpu;boundaryAppend(boundaryOutput,JSON.stringify(boundaryCurrent)+'\n');boundaryCurrent=undefined})
```

## boundary-instrument.mjs

<!-- prettier-ignore -->
```javascript
import fs from 'node:fs'; import path from 'node:path'; import {createRequire} from 'node:module';
const root=process.cwd(), evidence='/home/jlima/.codex/evidence/ci-perf-02/2026-10-22';
const require=createRequire(path.join(root,'package.json')),ts=require('typescript');
const target=path.join(root,'tests/unit/modules/nuvemshop/boundary.test.ts');
const source=fs.readFileSync(target,'utf8');
if(source.includes('boundaryMeasure')) throw Error('Already instrumented');
fs.writeFileSync(path.join(evidence,'boundary-original.test.ts'),source);
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
result=fs.readFileSync(path.join(evidence,'boundary-profile-prelude.txt'),'utf8')+'\n'+result;
fs.writeFileSync(target,result);fs.writeFileSync(path.join(evidence,'boundary-instrumented.test.ts'),result);
console.log(JSON.stringify({edits:edits.length,bytes:result.length}));
```

## boundary-analyze.py

<!-- prettier-ignore -->
```python
import json,hashlib,statistics,collections
from pathlib import Path
E=Path('/home/jlima/.codex/evidence/ci-perf-02/2026-10-22')
def family(t):
 a=t['ancestorTitles'];line=t.get('location',{}).get('line',0)
 for s in a:
  if s.startswith(('CI-OPT-01','native Node','JSDoc','triple-slash')):return s
 if 2587<=line<2626 or 2679<=line<3235:return 'Ambient process/global capabilities'
 if 3235<=line<3926:return 'CommonJS runtime capabilities and local bindings'
 if 2626<=line<2679 or 3926<=line<4207:return 'Browser/client import graph and CSS'
 if 4288<=line<4400:return 'Guard binding and Program identity'
 if 4435<=line<4489 or 4527<=line<4538 or 4628<=line<4664:return 'CommonJS/ESM export surfaces'
 if 4538<=line<4568 or 4664<=line<4678:return 'Canonical resolver and tombstones'
 return 'Module boundaries and real entrypoint imports'
baseline=json.loads((E/'boundary-d1-full-1.results.json').read_text());boundary=next(t for t in baseline['testResults'] if t['name'].endswith('/boundary.test.ts'));tests=boundary['assertionResults'];by_name={t['fullName']:t for t in tests};profile_names={' > '.join(t['ancestorTitles']+[t['title']]):t['fullName'] for t in tests}
def canonical_records(path):
 records=[json.loads(l)for l in path.read_text().splitlines()]
 for r in records:r['name']=profile_names[r['name']]
 return records
summary={'D1':{'total':baseline['numTotalTests'],'passed':baseline['numPassedTests'],'failed':baseline['numFailedTests'],'boundary_count':len(tests),'boundary_passed':sum(t['status']=='passed' for t in tests),'boundary_reporter_timestamp_span_ms_NOT_MONOTONIC':boundary['endTime']-boundary['startTime'],'serial_test_duration_sum_ms_NOT_FILE_WALL':sum(t.get('duration') or 0 for t in tests),'boundary_identity_digest':hashlib.sha256(json.dumps([t['fullName'] for t in tests]).encode()).hexdigest()},'families':{},'top_tests':sorted([{'name':t['fullName'],'duration_ms':t.get('duration'),'line':t.get('location',{}).get('line'),'family':family(t)} for t in tests],key=lambda x:x['duration_ms']or 0,reverse=True)[:20]}
for t in tests:
 f=summary['families'].setdefault(family(t),{'count':0,'D1_test_wall_sum_ms':0,'D1_worst_test_ms':0,'D3_worst_test_ms':0,'D3_cpu_us':0,'D3_test_wall_sum_ms':0,'D3_max_heap_bytes':0,'D3_max_rss_bytes':0,'D3_programs':0,'D3_program_file_inclusions':0,'D3_diagnostics_calls':0,'D3_diagnostics_count':0,'D3_ast_reuses':0,'D3_assertions':0})
 f['count']+=1;f['D1_test_wall_sum_ms']+=t.get('duration')or 0;f['D1_worst_test_ms']=max(f['D1_worst_test_ms'],t.get('duration')or 0)
profile=E/'boundary-d3-programs.jsonl'
if profile.exists():
 records=canonical_records(profile);helpers=collections.defaultdict(lambda:{'count':0,'wall_ms':0,'cpu_us':0,'errors':0})
 summary['D3']={'profile_tests':len(records),'identity_match':collections.Counter(r['name'] for r in records)==collections.Counter(t['fullName']for t in tests),'programs':sum(len(r['programs'])for r in records),'max_files_per_program':max((p['files']for r in records for p in r['programs']),default=0),'node_programs':sum(p['nodeFiles']>0 for r in records for p in r['programs']),'binding_noLib_programs':sum(p['noLib'] for r in records for p in r['programs']),'source_program_digest_unique':len({p['sourceDigest']for r in records for p in r['programs']}),'assertions':sum(r['assertions']for r in records),'ast_reuses':sum(r['ast_reuses']for r in records),'diagnostics_count':sum(d['count']for r in records for d in r['diagnostics']),'program_root_counts':dict(collections.Counter(p['roots']for r in records for p in r['programs'])),'program_file_counts':dict(collections.Counter(p['files']for r in records for p in r['programs']))}
 for r in records:
  if r['name']not in by_name:raise Exception('Unmapped profile identity '+r['name'])
  f=summary['families'][family(by_name[r['name']])];f['D3_worst_test_ms']=max(f['D3_worst_test_ms'],r['wall_ms']);f['D3_cpu_us']+=r['cpu_us'];f['D3_test_wall_sum_ms']+=r['wall_ms'];f['D3_max_heap_bytes']=max(f['D3_max_heap_bytes'],r['heap_start'],r['heap_end']);f['D3_max_rss_bytes']=max(f['D3_max_rss_bytes'],r['rss_start'],r['rss_end']);f['D3_programs']+=len(r['programs']);f['D3_program_file_inclusions']+=sum(p['files']for p in r['programs']);f['D3_diagnostics_calls']+=len(r['diagnostics']);f['D3_diagnostics_count']+=sum(d['count']for d in r['diagnostics']);f['D3_ast_reuses']+=r['ast_reuses'];f['D3_assertions']+=r['assertions']
  for name,h in r['helpers'].items():
   for k,v in h.items():helpers[name][k]+=v
 d3_result=E/'boundary-d3-programs.results.json'
 if d3_result.exists():
  reported=json.loads(d3_result.read_text());dt=reported['testResults'][0]['assertionResults'];summary['D3']['reported_total']=reported['numTotalTests'];summary['D3']['reported_passed']=reported['numPassedTests'];summary['D3']['reported_failed']=reported['numFailedTests'];summary['D3']['reported_pending']=reported['numPendingTests'];summary['D3']['reported_ordered_identities_match_D1']=[t['fullName']for t in dt]==[t['fullName']for t in tests];summary['D3']['outcome_differences_from_D1']=[{'name':t['fullName'],'D1':by_name[t['fullName']]['status'],'D3':t['status']}for t in dt if t['status']!=by_name[t['fullName']]['status']]
 summary['D3']['program_lanes']=dict(collections.Counter(p['lane']for r in records for p in r['programs']))
 summary['D3']['source_file_inclusions']=sum(p['files']for r in records for p in r['programs'])
 summary['D3']['per_test_monotonic_wall_sum_ms']=sum(r['wall_ms']for r in records)
 summary['D3']['per_test_cpu_us_sum']=sum(r['cpu_us']for r in records)
 summary['D3']['max_endpoint_heap_bytes']=max(max(r['heap_start'],r['heap_end'])for r in records)
 summary['D3']['max_endpoint_rss_bytes']=max(max(r['rss_start'],r['rss_end'])for r in records)
 diagnostic_records=[r for r in records if r['diagnostics']]
 summary['D3']['type_diagnostics_crosscut']={'tests':len(diagnostic_records),'phase_wall_ms':sum(r['helpers'].get('ts.getPreEmitDiagnostics',{}).get('wall_ms',0)for r in diagnostic_records),'phase_cpu_us':sum(r['helpers'].get('ts.getPreEmitDiagnostics',{}).get('cpu_us',0)for r in diagnostic_records),'phase_mean_per_test_ms':sum(r['helpers'].get('ts.getPreEmitDiagnostics',{}).get('wall_ms',0)for r in diagnostic_records)/len(diagnostic_records),'phase_worst_per_test_ms':max(r['helpers'].get('ts.getPreEmitDiagnostics',{}).get('wall_ms',0)for r in diagnostic_records),'programs_in_these_tests':sum(len(r['programs'])for r in diagnostic_records)}
 summary['D3']['helpers_inclusive']=dict(helpers)
 summary['D3']['diagnostic_test_costs']=sorted([{'name':r['name'],'wall_ms':r['helpers'].get('ts.getPreEmitDiagnostics',{}).get('wall_ms',0),'programs':len(r['programs']),'max_files':max((p['files']for p in r['programs']),default=0),'node_programs':sum(p['nodeFiles']>0 for p in r['programs'])}for r in records],key=lambda x:x['wall_ms'],reverse=True)[:20]
 for selection in ['cache','native']:
  p=E/('boundary-d2-'+selection+'.jsonl')
  if p.exists():
   selected=canonical_records(p);full={r['name']:r for r in records};differences=[]
   fields=['assertions','programs','diagnostics','rejections']
   for r in selected:
    for key in fields:
     if r[key]!=full[r['name']][key]:differences.append({'name':r['name'],'field':key})
   focused=E/('boundary-d2-'+selection+'.results.json');outcomes=[]
   if focused.exists() and d3_result.exists():
    d3_status={t['fullName']:t['status'] for t in dt};focused_tests=json.loads(focused.read_text())['testResults'][0]['assertionResults'];outcomes=[{'name':t['fullName'],'D3':d3_status[t['fullName']],'D2':t['status']}for t in focused_tests if t['status']!='skipped' and t['status']!=d3_status[t['fullName']]]
   summary.setdefault('D5',{})[selection]={'tests':len(selected),'compared_fields':fields,'differences':differences,'outcome_differences':outcomes,'identity_matches_full':all(r['name']in full for r in selected)}
for f in summary['families'].values():
 f['D1_mean_test_ms']=f['D1_test_wall_sum_ms']/f['count'];f['D3_mean_test_ms']=f['D3_test_wall_sum_ms']/f['count']
(E/'boundary-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
```

## Comandos executados

Executar cada medição e aguardar a conclusão antes da próxima; os exits1 de D1/D3/Node são evidência negativa e não devem impedir a coleta das demais variantes, nem ser mascarados como PASS. Não usar estes comandos como script set-e que abandone a restauração após falha; a sessão real observou cada resultado e restaurou a própria edição.

<!-- prettier-ignore -->
```bash
cd /home/jlima/Projetos/indicio-cult-ci-perf-02-bench
# D1 ocorreu ANTES de qualquer instrumentação.
python3 /home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-run-d1.py boundary-d1-full-1 node node_modules/vitest/vitest.mjs run --reporter=json --outputFile=/home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-d1-full-1.results.json --includeTaskLocation
# D3 só começou depois de D1 concluir; uma carga pesada de cada vez.
node /home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-instrument.mjs
BOUNDARY_PROFILE=/home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-d3-programs.jsonl python3 /home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-run.py boundary-d3-programs node node_modules/vitest/vitest.mjs run tests/unit/modules/nuvemshop/boundary.test.ts --reporter=json --outputFile=/home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-d3-programs.results.json --includeTaskLocation
# D2 mede seleções com lanes inicialmente vazias em processos separados.
BOUNDARY_PROFILE=/home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-d2-cache.jsonl python3 /home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-run.py boundary-d2-cache node node_modules/vitest/vitest.mjs run tests/unit/modules/nuvemshop/boundary.test.ts -t CI-OPT-01 --reporter=json --outputFile=/home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-d2-cache.results.json --includeTaskLocation
BOUNDARY_PROFILE=/home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-d2-native.jsonl python3 /home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-run.py boundary-d2-native node node_modules/vitest/vitest.mjs run tests/unit/modules/nuvemshop/boundary.test.ts -t 'native Node diagnostic opt-in isolation' --reporter=json --outputFile=/home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-d2-native.results.json --includeTaskLocation
python3 /home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-analyze.py > /home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-full-summary.txt
# Restaure só a própria edição temporária; não use comandos destrutivos de Git.
cp /home/jlima/.codex/evidence/ci-perf-02/2026-10-22/boundary-original.test.ts tests/unit/modules/nuvemshop/boundary.test.ts
sha256sum tests/unit/modules/nuvemshop/boundary.test.ts package-lock.json
git status --short
```

## Rastreabilidade

Instrumentador:92 edições por AST e inserções controladas; fonte instrumentada228805bytes. Fonte original/lockfile têm os hashes citados no relatório. A fonte temporária original foi preservada e restaurada exatamente. Nenhuma configuração Vitest versionada mudou. D4 não executado; a comparaçãoD5 é consistência de34 controles da instrumentação, sem equivalência green-to-green de candidato.
