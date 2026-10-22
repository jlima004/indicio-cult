#!/usr/bin/env python3
"""Temporary R01 harness. Public output contains only validated scalar metrics.

No raw output or npm metadata is published. npm phase timers overlap and use
Date.now; only the external install wall uses monotonic_ns. wait4 RSS is a
maximum process RSS, not concurrent tree memory. I/O counters are operations.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
from urllib.parse import unquote, urlsplit

BASELINE = '9249a1efe8c1703408a2ebb9828d41341dd6cd74'
LOCK = '2a6e6077d46d953ee4fbeac8a776d3e0d0c79f996edcca7e3c045c740bf8d14b'
REGISTRY = 'https://registry.npmjs.org/'
TIMERS = frozenset(('npm', 'command:ci', 'idealTree', 'idealTree:init',
    'idealTree:buildDeps', 'idealTree:fixDepFlags', 'reify', 'reify:loadTrees',
    'reify:diffTrees', 'reify:retireShallow', 'reify:createSparse',
    'reify:loadBundles', 'reify:unpack', 'reify:unretire', 'reify:build',
    'reify:trash', 'reify:save', 'reify:audit', 'auditReport:getReport',
    'auditReport:init', 'build', 'build:deps', 'build:queue', 'build:link',
    'build:run:preinstall', 'build:run:install', 'build:run:postinstall',
    'build:run:prepare'))
CONFIG_BOOL = ('audit', 'ignore-scripts', 'offline', 'strict-ssl',
               'prefer-offline', 'prefer-online', 'foreground-scripts')
CONFIG_INT = ('fetch-retries', 'fetch-retry-factor', 'fetch-retry-mintimeout',
              'fetch-retry-maxtimeout', 'fetch-timeout', 'maxsockets', 'logs-max')
ERRORS = frozenset(('ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND',
    'EAI_AGAIN', 'FETCH_ERROR', 'ERR_SOCKET_TIMEOUT', 'ECONNABORTED',
    'ENETUNREACH', 'EINTEGRITY', 'E404', 'E401', 'E403', 'UNKNOWN'))
EVENTS = ('preinstall', 'install', 'postinstall', 'prepare')
MAX_HTTP = 5000


class Blocked(Exception):
    """Intentionally contains no untrusted diagnostic text."""


def number(value):
    return type(value) in (int, float) and math.isfinite(value) and value >= 0


def endpoint(url):
    try:
        p = urlsplit(url)
        if (p.scheme != 'https' or p.hostname != 'registry.npmjs.org' or
            p.port not in (None, 443) or p.username or p.password or p.query or
            p.fragment or '\\' in p.path):
            return None
        if p.path == '/-/npm/v1/security/advisories/bulk':
            return 'bulk-audit'
        if p.path == '/-/npm/v1/security/audits/quick':
            return 'quick-audit'
        if '/-/' in p.path and p.path.endswith('.tgz'):
            return 'tarball'
        if re.fullmatch(r'/@?[A-Za-z0-9_.~/-]+', unquote(p.path)) and '/-/' not in p.path:
            return 'metadata'
        return 'other-public-registry'
    except ValueError:
        return None


def extract_logs(lines):
    out = {'http': [], 'http_observed': 0, 'http_unparsed': 0,
           'http_truncated': 0, 'oversize_lines': 0,
           'lifecycle_start_counts': {k: 0 for k in EVENTS},
           'lifecycle_completion_counts': {k: 0 for k in EVENTS},
           'error_codes': []}
    for line in lines:
        if len(line) > 1048576:
            out['oversize_lines'] += 1
            continue
        if line.startswith('npm http '):
            out['http_observed'] += 1
            row = None
            match = re.fullmatch(r'npm http fetch (GET|POST|PUT|DELETE|HEAD|PATCH) (\d{3}) (\S+) (\d+)ms(?: attempt #(\d+))?(?: \(cache (hit|miss|revalidated|stale|updated|skip)\))?\s*', line)
            cache = re.fullmatch(r'npm http cache (\S+) (\d+)ms(?: attempt #(\d+))? \(cache hit\)\s*', line)
            failure = re.fullmatch(r'npm http fetch (GET|POST|PUT|DELETE|HEAD|PATCH) (\S+) attempt (\d+) failed with ([A-Z_0-9]+)\s*', line)
            if match:
                method, status, url, duration, attempt, cached = match.groups()
                row = {'event': 'fetch', 'method': method, 'status': int(status),
                       'duration_ms': int(duration), 'attempt': int(attempt) if attempt else None,
                       'cache': cached, 'error': None}
            elif cache:
                url, duration, attempt = cache.groups()
                row = {'event': 'cache', 'method': None, 'status': None,
                       'duration_ms': int(duration), 'attempt': int(attempt) if attempt else None,
                       'cache': 'hit', 'error': None}
            elif failure:
                method, url, attempt, error = failure.groups()
                row = {'event': 'attempt-failure', 'method': method,
                       'status': int(error) if re.fullmatch(r'\d{3}', error) else None,
                       'duration_ms': None, 'attempt': int(attempt), 'cache': None,
                       'error': error if error in ERRORS else 'UNKNOWN'}
            kind = endpoint(url) if row else None
            if row and kind:
                row['endpoint_class'] = kind
                if len(out['http']) < MAX_HTTP:
                    out['http'].append(row)
                else:
                    out['http_truncated'] += 1
            else:
                out['http_unparsed'] += 1
        match = re.match(r'npm info run \S+ (preinstall|install|postinstall|prepare) (.*)', line)
        if match:
            key = 'lifecycle_completion_counts' if re.match(r'\{\s*code:', match[2]) else 'lifecycle_start_counts'
            out[key][match[1]] += 1
        match = re.fullmatch(r'npm error code ([A-Z_0-9]+)\s*', line)
        if match:
            code = match[1] if match[1] in ERRORS else 'UNKNOWN'
            if code not in out['error_codes']:
                out['error_codes'].append(code)
    return out


def extract_timers(data):
    out = {'timers_ms': {}, 'timer_dropped': 0, 'lifecycle_timer_count': 0,
           'lifecycle_timer_max_ms': None, 'unfinished_timer_count': 0}
    if not isinstance(data, dict) or not isinstance(data.get('timers'), dict):
        raise Blocked()
    for key, value in data['timers'].items():
        if key in TIMERS and number(value):
            out['timers_ms'][key] = value
        elif (isinstance(key, str) and key.startswith(tuple('build:run:' + e + ':' for e in EVENTS)) and number(value)):
            out['lifecycle_timer_count'] += 1
            out['lifecycle_timer_max_ms'] = max(out['lifecycle_timer_max_ms'] or 0, value)
        else:
            out['timer_dropped'] += 1
    unfinished = data.get('unfinishedTimers', {})
    if not isinstance(unfinished, dict):
        raise Blocked()
    out['unfinished_timer_count'] = len(unfinished)
    return out


def extract_config(config, variant):
    if not isinstance(config, dict) or config.get('registry') != REGISTRY:
        raise Blocked()
    out = {'registry': REGISTRY}
    if config.get('loglevel') != 'info' or config.get('logs-max') != 0:
        raise Blocked()
    out['loglevel'] = 'info'
    for key in CONFIG_BOOL:
        if type(config.get(key)) is not bool:
            raise Blocked()
        out[key] = config[key]
    for key in CONFIG_INT:
        if type(config.get(key)) is not int or not 0 <= config[key] <= 10**9:
            raise Blocked()
        out[key] = config[key]
    if (out['audit'] != (variant == 'original') or out['ignore-scripts'] or
        out['offline'] or not out['strict-ssl']):
        raise Blocked()
    return out


# A second boundary rejects unforeseen fields/strings even in generated output.
KEYS = frozenset(('schema', 'status', 'variant', 'baseline_sha', 'baseline_tree',
 'lock_sha256', 'harness_sha', 'harness_file_sha256', 'node', 'npm', 'started_utc',
 'setup_seconds', 'wall_seconds', 'finalization_seconds', 'total_before_publish_seconds',
 'clock_resolution_seconds', 'exit_code', 'user_cpu_seconds', 'system_cpu_seconds',
 'max_process_rss_kib', 'filesystem_input_operations', 'filesystem_output_operations',
 'voluntary_context_switches', 'involuntary_context_switches', 'effective_config',
 'node_modules_existed_at_start', 'lock_unchanged', 'baseline_unchanged',
 'cache_path_matches', 'loglevel',
 'private_cleanup_complete', 'timing_files', 'timing_parse_failures', 'proc_io_samples',
 'proc_io_errors', 'proc_root_sampled_max', 'rchar', 'wchar', 'syscr', 'syscw',
 'read_bytes', 'write_bytes', 'cancelled_write_bytes', 'http', 'http_observed',
 'http_unparsed', 'http_truncated', 'oversize_lines', 'lifecycle_start_counts',
 'lifecycle_completion_counts', 'error_codes', 'event', 'method', 'duration_ms',
 'attempt', 'cache', 'error', 'endpoint_class', 'timers_ms', 'timer_dropped',
 'lifecycle_timer_count', 'lifecycle_timer_max_ms', 'unfinished_timer_count',
 'missing_required_timers', 'instrumentation')) | TIMERS | set(EVENTS) | set(CONFIG_BOOL) | set(CONFIG_INT) | {'registry'}
STRINGS = frozenset(('complete', 'blocked', 'original', 'no-audit', '22.23.1',
 '10.9.8', 'info', REGISTRY, 'fetch', 'cache', 'attempt-failure', 'GET', 'POST', 'PUT',
 'DELETE', 'HEAD', 'PATCH', 'hit', 'miss', 'revalidated', 'stale', 'updated', 'skip',
 'bulk-audit', 'quick-audit', 'tarball', 'metadata', 'other-public-registry',
 'monotonic-wall; npm-Date.now-overlapping; wait4-operations; proc-root-sampled-bounds')) | ERRORS | TIMERS


def validate_public(value):
    if isinstance(value, dict):
        if any(key not in KEYS for key in value):
            raise Blocked()
        for item in value.values():
            validate_public(item)
    elif isinstance(value, list):
        for item in value:
            validate_public(item)
    elif isinstance(value, str):
        if value not in STRINGS and not re.fullmatch(r'(?:[0-9a-f]{40}|[0-9a-f]{64}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)', value):
            raise Blocked()
    elif value is not None and type(value) is not bool:
        if type(value) not in (int, float) or not math.isfinite(value):
            raise Blocked()


def capture(command, work, env):
    result = subprocess.run(command, cwd=work, env=env, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, check=False)
    if result.returncode:
        raise Blocked()
    return result.stdout.decode('utf-8', errors='strict').strip()


def identity(work, env):
    sha = capture(['git', 'rev-parse', 'HEAD'], work, env)
    tree = capture(['git', 'rev-parse', 'HEAD^{tree}'], work, env)
    lock = hashlib.sha256((work / 'package-lock.json').read_bytes()).hexdigest()
    if (sha != BASELINE or lock != LOCK or (work / '.npmrc').exists() or
        capture(['git', 'status', '--porcelain', '--untracked-files=no'], work, env)):
        raise Blocked()
    return tree


def sample_io(pid, stop, out):
    while not stop.wait(0.05):
        try:
            pairs = dict(line.split(': ', 1) for line in Path(f'/proc/{pid}/io').read_text().splitlines())
            for key in ('rchar', 'wchar', 'syscr', 'syscw', 'read_bytes', 'write_bytes', 'cancelled_write_bytes'):
                value = int(pairs[key])
                if value < 0:
                    raise ValueError()
                out['proc_root_sampled_max'][key] = max(out['proc_root_sampled_max'].get(key, 0), value)
            out['proc_io_samples'] += 1
        except (OSError, ValueError, KeyError):
            out['proc_io_errors'] += 1


def run(work, cache, output, variant):
    start = time.monotonic_ns()
    os.umask(0o077)
    work, cache, output = work.resolve(), cache.resolve(), output.absolute()
    if (not work.is_dir() or not cache.is_dir() or output.exists() or
        output.is_symlink() or not hasattr(os, 'wait4') or not sys.platform.startswith('linux')):
        raise Blocked()
    npm = shutil.which('npm')
    node = shutil.which('node')
    if not npm or not node:
        raise Blocked()
    public = {'schema': 1, 'variant': variant, 'status': 'complete',
        'baseline_sha': BASELINE, 'lock_sha256': LOCK, 'node': '22.23.1', 'npm': '10.9.8',
        'started_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'clock_resolution_seconds': time.get_clock_info('monotonic').resolution,
        'node_modules_existed_at_start': (work / 'node_modules').exists(),
        'proc_io_samples': 0, 'proc_io_errors': 0, 'proc_root_sampled_max': {},
        'instrumentation': 'monotonic-wall; npm-Date.now-overlapping; wait4-operations; proc-root-sampled-bounds'}
    with tempfile.TemporaryDirectory(prefix='r01-private-') as temp:
        private = Path(temp)
        private.chmod(0o700)
        for child in ('home', 'logs', 'tmp'):
            (private / child).mkdir(mode=0o700)
        for name in ('user.npmrc', 'global.npmrc'):
            (private / name).touch(mode=0o600)
        env = {'PATH': str(Path(node).parent) + ':' + str(Path(npm).parent) + ':/usr/bin:/bin',
            'HOME': str(private / 'home'), 'TMPDIR': str(private / 'tmp'),
            'LANG': 'C.UTF-8', 'CI': 'true',
            'npm_config_userconfig': str(private / 'user.npmrc'),
            'npm_config_globalconfig': str(private / 'global.npmrc'),
            'npm_config_cache': str(cache), 'npm_config_registry': REGISTRY,
            'npm_config_logs_dir': str(private / 'logs'), 'npm_config_logs_max': '0',
            'npm_config_loglevel': 'info'}
        public['baseline_tree'] = identity(work, env)
        harness_repo = Path(__file__).resolve().parents[2]
        public['harness_sha'] = capture(['git', 'rev-parse', 'HEAD'], harness_repo, env)
        public['harness_file_sha256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
        if (capture([node, '--version'], work, env) != 'v22.23.1' or
            capture([npm, '--version'], work, env) != '10.9.8'):
            raise Blocked()
        config_cmd = [npm, 'config', 'list', '--json']
        if variant == 'no-audit':
            config_cmd.append('--no-audit')
        effective = json.loads(capture(config_cmd, work, env))
        public['cache_path_matches'] = isinstance(effective.get('cache'), str) and Path(effective['cache']).resolve() == cache
        if not public['cache_path_matches']:
            raise Blocked()
        public['effective_config'] = extract_config(effective, variant)
        command = [npm, 'ci', '--timing'] + (['--no-audit'] if variant == 'no-audit' else [])
        public['setup_seconds'] = (time.monotonic_ns() - start) / 1e9
        with (private / 'output.log').open('wb') as log:
            install_start = time.monotonic_ns()
            process = subprocess.Popen(command, cwd=work, env=env, stdout=log, stderr=subprocess.STDOUT,
                                       stdin=subprocess.DEVNULL, start_new_session=True)
            stop = threading.Event()
            sampler = threading.Thread(target=sample_io, args=(process.pid, stop, public), daemon=True)
            sampler.start()
            try:
                _, status, usage = os.wait4(process.pid, 0)
                install_end = time.monotonic_ns()
                process.returncode = os.waitstatus_to_exitcode(status)
            except BaseException:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                    os.wait4(process.pid, 0)
                except (ProcessLookupError, ChildProcessError):
                    pass
                raise
            finally:
                stop.set()
                sampler.join()
        public.update(wall_seconds=(install_end - install_start) / 1e9,
            exit_code=process.returncode, user_cpu_seconds=usage.ru_utime,
            system_cpu_seconds=usage.ru_stime, max_process_rss_kib=usage.ru_maxrss,
            filesystem_input_operations=usage.ru_inblock, filesystem_output_operations=usage.ru_oublock,
            voluntary_context_switches=usage.ru_nvcsw, involuntary_context_switches=usage.ru_nivcsw)
        with (private / 'output.log').open(errors='replace') as lines:
            public.update(extract_logs(lines))
        files = list((private / 'logs').glob('*-timing.json'))
        public['timing_files'] = len(files)
        public['timing_parse_failures'] = 0
        public.update(extract_timers({'timers': {}}))
        if len(files) == 1:
            try:
                if files[0].stat().st_size > 16777216:
                    raise Blocked()
                public.update(extract_timers(json.loads(files[0].read_text())))
            except (OSError, ValueError, Blocked):
                public['timing_parse_failures'] += 1
        elif files:
            public['timing_parse_failures'] += 1
        public['missing_required_timers'] = sorted({'reify', 'reify:unpack', 'reify:audit', 'auditReport:getReport', 'auditReport:init'} - public['timers_ms'].keys())
        public['lock_unchanged'] = hashlib.sha256((work / 'package-lock.json').read_bytes()).hexdigest() == LOCK
        try:
            public['baseline_unchanged'] = identity(work, env) == public['baseline_tree']
        except Blocked:
            public['baseline_unchanged'] = False
        if not public['lock_unchanged'] or not public['baseline_unchanged']:
            public['status'] = 'blocked'
    public['private_cleanup_complete'] = not private.exists()
    if not public['private_cleanup_complete']:
        raise Blocked()
    public['finalization_seconds'] = (time.monotonic_ns() - install_end) / 1e9
    public['total_before_publish_seconds'] = (time.monotonic_ns() - start) / 1e9
    validate_public(public)
    output.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    # Exclusive creation prevents overwriting an earlier sample or following a symlink.
    with output.open('x') as handle:
        json.dump(public, handle, allow_nan=False, sort_keys=True, indent=2)
        handle.write('\n')
    return 0 if public['status'] == 'complete' else 2


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=Path, required=True)
    parser.add_argument('--cache', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--variant', choices=('original', 'no-audit'), default='original')
    args = parser.parse_args()
    def interrupted(signum, frame):
        raise Blocked()
    signal.signal(signal.SIGTERM, interrupted)
    try:
        return run(args.work, args.cache, args.output, args.variant)
    except (Exception, KeyboardInterrupt):
        # Exception text may include private paths, subprocess output or credentials.
        print('BLOCKED_EVIDENCE_EXPOSURE_RISK_OR_PREFLIGHT', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
