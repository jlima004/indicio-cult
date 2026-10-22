# Reproducing the npm measurements

Temporary measurement script, embedded as documentation only. It was not installed in the production CI. Run only in a baseline detached disposable worktree, with no other heavy measurement running. Cache seeding and installation must be serialized with boundary profiling. Private paths are sample paths for the stated WSL environment; adapt ROOT/WORK/NPM and the source cache path together on another machine and report the new environment. Never copy npmrc or the global cache index.

The source requires Python3 and the already installed Node22.23.1/npm10.9.8; it adds no dependencies. The npm subprocess receives an explicit environment allowlist with private empty npmrc and public registry. Log stdout/stderr stay in memory; debug files are disabled. Numeric timing files are reduced to allowlisted fields then removed. The reproduction retains scripts/audit for the original variant.

<!-- prettier-ignore -->
```python
#!/usr/bin/env python3
"""Temporary private CI-PERF-02 measurement; never commit this script."""
import argparse, base64, hashlib, json, os, pathlib, re, resource, shutil
import subprocess, threading, time, platform

ROOT = pathlib.Path('/home/jlima/.codex/evidence/ci-perf-02/2026-10-22')
WORK = pathlib.Path('/home/jlima/Projetos/indicio-cult-ci-perf-02-npm')
SHA = 'b305d8aa9771aafc8b08d73856412a8604c8f787'
LOCK = '2a6e6077d46d953ee4fbeac8a776d3e0d0c79f996edcca7e3c045c740bf8d14b'
NPM = '/home/jlima/.nvm/versions/node/v22.23.1/bin/npm'
CACHE = ROOT / 'npm-cache'
LOCAL = ROOT / 'npm-private'

def write(name, data):
    p = ROOT / name
    p.write_text(json.dumps(data, indent=2, sort_keys=True) + '\n')
    p.chmod(0o600)

def check():
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=WORK, text=True).strip() == SHA
    assert hashlib.sha256((WORK / 'package-lock.json').read_bytes()).hexdigest() == LOCK
    assert not (WORK / '.npmrc').exists()
    for p in [LOCAL, CACHE, LOCAL/'home', LOCAL/'logs']:
        p.mkdir(mode=0o700, parents=True, exist_ok=True)
    for p in [LOCAL/'user.npmrc', LOCAL/'global.npmrc']:
        p.write_text('')
        p.chmod(0o600)

def environment():
    return {
        'PATH': str(pathlib.Path(NPM).parent)+':/usr/bin:/bin',
        'HOME': str(LOCAL/'home'), 'CI':'true', 'LANG':'C.UTF-8',
        'npm_config_userconfig':str(LOCAL/'user.npmrc'),
        'npm_config_globalconfig':str(LOCAL/'global.npmrc'),
        'npm_config_cache':str(CACHE),
        'npm_config_registry':'https://registry.npmjs.org/',
        'npm_config_logs_dir':str(LOCAL/'logs'),
        'npm_config_logs_max':'0',
    }

def prepare():
    from urllib.parse import urlsplit
    packages=json.loads((WORK/'package-lock.json').read_text())['packages']
    out={'eligible':0,'copied':0,'missing':0,'mismatch':0,'bytes':0,
         'policy':'public lock tarball content only; no cache index/npmrc/metadata'}
    seen=set()
    for pkg in packages.values():
        if not pkg.get('resolved'): continue
        u=urlsplit(pkg['resolved'])
        assert u.scheme=='https' and u.hostname=='registry.npmjs.org'
        assert not (u.username or u.password or u.query or u.fragment)
        integrity=pkg.get('integrity','')
        if not integrity or integrity in seen: continue
        seen.add(integrity)
        algo, digest=integrity.split('-',1)
        assert algo in ['sha512','sha1']
        hexval=base64.b64decode(digest,validate=True).hex()
        rel=pathlib.Path('content-v2')/algo/hexval[:2]/hexval[2:4]/hexval[4:]
        src=pathlib.Path('/home/jlima/.npm/_cacache')/rel
        dest=CACHE/'_cacache'/rel
        out['eligible']+=1
        if not src.is_file():out['missing']+=1;continue
        content=src.read_bytes()
        if hashlib.new(algo,content).hexdigest()!=hexval:
            out['mismatch']+=1;continue
        dest.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
        dest.write_bytes(content)
        dest.chmod(0o600)
        out['copied']+=1;out['bytes']+=len(content)
    write('npm-cache-preparation.json',out)
    print(json.dumps(out),flush=True)

def sample(pid,stop,out):
    # Observational maximum root process /proc values; not summed across time.
    while not stop.wait(.05):
        try:
            status=pathlib.Path(f'/proc/{pid}/status').read_text()
            rss=int(re.search(r'^VmRSS:\s+(\d+) kB',status,re.M)[1])
            out['rootSampledPeakRssKiB']=max(out.get('rootSampledPeakRssKiB',0),rss)
            io=pathlib.Path(f'/proc/{pid}/io').read_text()
            out['rootProcIoAccessible']=True
            for key in ['rchar','wchar','read_bytes','write_bytes','syscr','syscw']:
                value=int(re.search(r'^'+key+r':\s+(\d+)',io,re.M)[1])
                out['rootSampledMax_'+key]=max(out.get('rootSampledMax_'+key,0),value)
        except OSError as err:
            out['rootProcSamplingErrorErrno']=err.errno
        except TypeError:pass

def installed_scripts():
    rows=[]
    for name,pkg in json.loads((WORK/'package-lock.json').read_text())['packages'].items():
        if not name or not pkg.get('hasInstallScript'):continue
        p=WORK/name/'package.json'
        if not p.exists():
            rows.append({'packagePath':name,'installed':False});continue
        data=json.loads(p.read_text())
        # These installed package script strings are public lock-bound source,
        # not lifecycle runtime output. Only lifecycle keys are retained.
        scripts={k:v for k,v in data.get('scripts',{}).items()
                 if k in ['preinstall','install','postinstall','prepare']}
        rows.append({'packagePath':name,'installed':True,'version':data['version'],'scripts':scripts})
    return rows

def run(variant,number):
    before=hashlib.sha256((WORK/'package-lock.json').read_bytes()).hexdigest()
    command=[NPM,'ci','--timing','--logs-max=0','--loglevel=info']
    if variant=='offline':command+=['--offline']
    elif variant=='no-audit':command+=['--no-audit']
    out={'schema':1,'variant':variant,'sample':number,'sha':SHA,'lockSha256':LOCK,
         'command':['npm']+command[1:],'node':'22.23.1','npm':'10.9.8',
         'platform':platform.platform(),'arch':platform.machine(),
         'cachePolicy':'private public-lock-content cache; evolves across serial samples',
         'nodeModulesExistedAtStart':(WORK/'node_modules').exists(),
         'concurrency':'serialized with boundary measurements by root authorization',
         'clock':'time.monotonic_ns; npm timers use Date.now',
         'startedUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    buffers=[]
    started=time.monotonic_ns()
    proc=subprocess.Popen(command,cwd=WORK,env=environment(),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    def drain(pipe):buffers.append(pipe.read().decode('utf-8',errors='replace'))
    threads=[threading.Thread(target=drain,args=(pipe,)) for pipe in [proc.stdout,proc.stderr]]
    for thread in threads:thread.start()
    stop=threading.Event();sampler=threading.Thread(target=sample,args=(proc.pid,stop,out));sampler.start()
    _,status,usage=os.wait4(proc.pid,0)
    proc.returncode=os.waitstatus_to_exitcode(status)
    ended=time.monotonic_ns()
    stop.set();sampler.join()
    for thread in threads:thread.join()
    text='\n'.join(buffers) # Never printed or written.
    out.update(exitCode=proc.returncode,wallSeconds=(ended-started)/1e9,
        userCpuSeconds=usage.ru_utime,systemCpuSeconds=usage.ru_stime,
        maxProcessRssKiB=usage.ru_maxrss,
        filesystemInputBlocks=usage.ru_inblock,filesystemOutputBlocks=usage.ru_oublock,
        voluntaryContextSwitches=usage.ru_nvcsw,involuntaryContextSwitches=usage.ru_nivcsw)
    out['ioUnits']='wait4 filesystem blocks (Linux blocks of 512 bytes), not logical bytes; root /proc sampled maxima are bounds'
    summary=re.search(r'added (\d+) packages(?:, and audited (\d+) packages)? in ([\w.]+)',text)
    out['packageSummary']={'added':int(summary[1]),'audited':int(summary[2]) if summary[2] else None} if summary else None
    out['timersMs']={}
    for p in (LOCAL/'logs').glob('*-timing.json'):
        data=json.loads(p.read_text())
        for k,v in data.get('timers',{}).items():
            if re.fullmatch(r'[A-Za-z0-9@_./:()=-]+',k) and isinstance(v,(int,float)):
                out['timersMs'][k]=v
        out['unfinishedTimerCount']=len(data.get('unfinishedTimers',{}))
        p.unlink()
    # Only method/status/duration and a coarse known endpoint class survive.
    http=[]
    for m in re.finditer(r'npm http fetch (GET|POST|PUT|DELETE|HEAD) (\d+) (https://registry\.npmjs\.org/\S+) (\d+)ms(?: \(([^\n)]*)\))?',text):
        url=m[3];kind='other-public-registry'
        if '/-/npm/v1/security/advisories/bulk' in url:kind='audit-bulk'
        elif '/-/npm/v1/security/audits/quick' in url:kind='audit-quick'
        elif '/-/' in url and '.tgz' in url:kind='tarball'
        cached=m[5] if m[5] in ['cache hit','cache miss','cache revalidated','cache stale'] else None
        http.append({'method':m[1],'status':int(m[2]),'endpointClass':kind,'durationMs':int(m[4]),'cache':cached})
    out['http']=http
    out['lifecycleEvents']=[{'name':m[1],'event':m[2],
        'stage':'completion' if re.search(r'\{\s*code:',m[3]) else 'start'}
        for m in re.finditer(r'npm info run ([A-Za-z0-9@_./+-]+) (preinstall|install|postinstall|prepare) ([^\n]*)',text)]
    out['errorCodes']=sorted(set(re.findall(r'npm error code ([A-Z0-9_]+)',text)))
    out['installedLifecycleInventory']=installed_scripts()
    out['lockUnchanged']=hashlib.sha256((WORK/'package-lock.json').read_bytes()).hexdigest()==before
    assert out['lockUnchanged']
    write(f'npm-local-{variant}-{number}.json',out)
    print(json.dumps({k:out[k] for k in ['variant','sample','exitCode','wallSeconds','userCpuSeconds','systemCpuSeconds','maxProcessRssKiB']}),flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--prepare',action='store_true')
    ap.add_argument('--variant',choices=['original','offline','no-audit'])
    ap.add_argument('--samples',type=int,default=3)
    ap.add_argument('--start-sample',type=int,default=1);args=ap.parse_args()
    check()
    if args.prepare:prepare()
    if args.variant:
        assert 1<=args.samples<=3 and 1<=args.start_sample<=3
        assert args.start_sample+args.samples-1<=3
        for number in range(args.start_sample,args.start_sample+args.samples):
            assert not (ROOT/f'npm-local-{args.variant}-{number}.json').exists()
            run(args.variant,number)
```

Save the fenced source outside the repository, then run adaptively and sequentially (the second and third original samples start with node_modules present and measure npm ci cleanup):

```bash
python3 /private/evidence/npm-benchmark.py --prepare
python3 /private/evidence/npm-benchmark.py --variant original --samples 1
python3 /private/evidence/npm-benchmark.py --variant no-audit --samples 1
python3 /private/evidence/npm-benchmark.py --variant original --start-sample 2 --samples 1
python3 /private/evidence/npm-benchmark.py --variant offline --samples 1
```

The seed report records coverage for all integrity-distinct public lock tarballs, including platform-ineligible entries. Missing other-platform tarballs alone do not prohibit an offline attempt; successful offline npm ci establishes sufficiency for the actual installed platform. A failed offline attempt must be retained as a negative result. Do not substitute offline/no-audit for the official CI install. npm offline mode also bypasses audit, so offline is not a pure tarball-network contrast.

Results are individual JSON files plus preparation/source identity. CPU values are wait4 usage; maxRSS is maximum process RSS rather than concurrent process-tree sum. wait4 filesystem counters measure physical block operations, not all logical cache traffic. root /proc samples are lower bounds and may miss short processes or final writes. Total resource timers and overlapping npm phase timers must not be summed as elapsed wall time. No test-suite success is implied by an install exit0.

REMOTE_INSTRUMENTATION_AUTHORIZATION_PENDING: this document does not authorize or launch GitHub workflows. R01 is first to instrument the original npm ci while preserving audit/scripts, then contrast a single auxiliary operation under the same pinned remote environment if explicitly authorized.

The cache evolves across samples; these contrasts are exploratory. If the first original install stalls for seven minutes, stop repeating that variant without a new discriminator and record the observed resource/phase evidence. Extend to at most three samples per variant only when viable. Samples never overwrite an existing result.

Executed order on2026-10-22: original1(76.219s), no-audit1(57.297s), original2(75.338s), offline1(81.971s), all exit0. Original n2 median75.779/min75.338/max76.219s; each auxiliary n1. No suite pass or causal speedup is claimed. Timing JSON produced751–792numeric phase timers per run, then was reduced/deleted; no debug log file retained. Root /proc I/O was unavailable; wait4 blocks0 do not prove no writes. npm offline is not a lifecycle network sandbox and printed audited544 despite absent audit HTTP/getReport. See npm-report.md and npm-local-summary.json for full limitations.
