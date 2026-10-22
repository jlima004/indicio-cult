import importlib.util
import json
import pathlib
import unittest
import tempfile
import os
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('measure', pathlib.Path(__file__).with_name('measure.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ExtractionTests(unittest.TestCase):
    def test_http_attempt_cache_and_secret_exclusion(self):
        lines = [
            'npm http fetch POST 200 https://registry.npmjs.org/-/npm/v1/security/advisories/bulk 416000ms',
            'npm http fetch GET https://registry.npmjs.org/a attempt 1 failed with ETIMEDOUT',
            'npm http fetch GET 200 https://registry.npmjs.org/a 23ms attempt #2 (cache miss)',
            'npm http cache https://registry.npmjs.org/a/-/a-1.tgz 2ms (cache hit)',
            'npm http fetch GET 200 https://secret:FAKE_TOKEN@registry.npmjs.org/a?secret=FAKE_TOKEN 2ms',
            'npm http fetch GET 200 https://evil.invalid/FAKE_TOKEN 3ms',
            'npm error FAKE_TOKEN Authorization: Bearer FAKE_TOKEN',
        ]
        out = m.extract_logs(lines)
        self.assertEqual(len(out['http']), 4)
        self.assertEqual(out['http'][0]['endpoint_class'], 'bulk-audit')
        self.assertIsNone(out['http'][0]['attempt'])
        self.assertEqual(out['http'][1]['error'], 'ETIMEDOUT')
        self.assertEqual(out['http'][2]['attempt'], 2)
        self.assertEqual(out['http'][3]['event'], 'cache')
        self.assertIsNone(out['http'][3]['method'])
        self.assertEqual(out['http_unparsed'], 2)
        self.assertNotIn('FAKE_TOKEN', json.dumps(out))
        self.assertNotIn('https', json.dumps(out))

    def test_scoped_metadata_and_quick_fallback_keep_only_classes(self):
        out = m.extract_logs([
            'npm http fetch GET 200 https://registry.npmjs.org/@sentry%2fcore 40ms (cache revalidated)',
            'npm http fetch POST 400 https://registry.npmjs.org/-/npm/v1/security/advisories/bulk 50ms',
            'npm http fetch POST 200 https://registry.npmjs.org/-/npm/v1/security/audits/quick 60ms',
        ])
        self.assertEqual([row['endpoint_class'] for row in out['http']], ['metadata', 'bulk-audit', 'quick-audit'])
        self.assertTrue(all(row['attempt'] is None for row in out['http']))
        self.assertNotIn('sentry', json.dumps(out))

    def test_timer_keys_and_non_finite_values_fail_closed(self):
        out = m.extract_timers({'timers': {'reify': 200, 'reify:unpack': 100,
              'reify:FAKE_TOKEN': 2, 'auditReport:getReport': float('nan'),
              'build:run:postinstall:node_modules/FAKE_TOKEN': 4},
              'unfinishedTimers': {'FAKE_TOKEN': [1, 2]}})
        self.assertEqual(out['timers_ms'], {'reify': 200, 'reify:unpack': 100})
        self.assertEqual(out['timer_dropped'], 2)
        self.assertEqual(out['lifecycle_timer_count'], 1)
        self.assertEqual(out['unfinished_timer_count'], 1)
        self.assertNotIn('FAKE_TOKEN', json.dumps(out))

    def test_config_rejects_behavior_change_and_arbitrary_values(self):
        cfg = {key: False for key in m.CONFIG_BOOL}
        cfg.update({'audit': True, 'strict-ssl': True, 'registry': m.REGISTRY})
        cfg.update({key: 100 for key in m.CONFIG_INT})
        cfg.update({'logs-max': 0, 'loglevel': 'info'})
        good = m.extract_config(cfg, 'original')
        self.assertEqual(good['registry'], m.REGISTRY)
        cfg['audit'] = False
        self.assertFalse(m.extract_config(cfg, 'no-audit')['audit'])
        cfg['audit'] = True
        cfg['ignore-scripts'] = True
        with self.assertRaises(m.Blocked):
            m.extract_config(cfg, 'original')
        cfg['ignore-scripts'] = False
        cfg['registry'] = 'https://secret:FAKE_TOKEN@registry.npmjs.org/'
        with self.assertRaises(m.Blocked):
            m.extract_config(cfg, 'original')

    def test_final_validator_rejects_unknown_fields_and_strings(self):
        with self.assertRaises(m.Blocked):
            m.validate_public({'private_token': 'FAKE_TOKEN'})
        with self.assertRaises(m.Blocked):
            m.validate_public({'status': 'FAKE_TOKEN'})
        with self.assertRaises(m.Blocked):
            m.validate_public({'wall_seconds': float('inf')})


class SyntheticProcessTests(unittest.TestCase):
    def test_failed_install_is_preserved_without_private_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            work, cache, binaries = (root / name for name in ('work', 'cache', 'bin'))
            for directory in (work, cache, binaries):
                directory.mkdir()
            lock = pathlib.Path(__file__).resolve().parents[2] / 'package-lock.json'
            (work / 'package-lock.json').write_bytes(lock.read_bytes())
            cfg = {key: False for key in m.CONFIG_BOOL}
            cfg.update({'audit': True, 'strict-ssl': True, 'registry': m.REGISTRY})
            cfg.update({key: 100 for key in m.CONFIG_INT})
            cfg.update({'logs-max': 0, 'loglevel': 'info', 'cache': str(cache)})
            script = """#!/usr/bin/python3
import json, os, pathlib, sys
name = pathlib.Path(sys.argv[0]).name
if name == 'node': print('v22.23.1')
elif name == 'git':
    if '--porcelain' not in sys.argv:
        print('""" + m.BASELINE + """' if 'HEAD^{tree}' not in sys.argv else 'a' * 40)
elif '--version' in sys.argv: print('10.9.8')
elif 'config' in sys.argv: print(""" + repr(json.dumps(cfg)) + """)
else:
    (pathlib.Path.cwd() / 'synthetic-ci-ran').touch()
    assert 'SYNTHETIC_SECRET' not in os.environ
    logs = pathlib.Path(os.environ['npm_config_logs_dir'])
    (logs / 'test-timing.json').write_text(json.dumps({'metadata': {'secret': 'FAKE_TOKEN'}, 'timers': {'reify': 40}, 'unfinishedTimers': {}}))
    print('npm http fetch POST 200 https://registry.npmjs.org/-/npm/v1/security/advisories/bulk 30ms')
    print('Authorization: Bearer FAKE_TOKEN')
    print('npm error code ETIMEDOUT')
    sys.exit(3)
"""
            for name in ('git', 'node', 'npm'):
                executable = binaries / name
                executable.write_text(script)
                executable.chmod(0o700)
            output = root / 'public' / 'evidence.json'
            with patch.object(m.shutil, 'which', side_effect=lambda name: str(binaries / name)), patch.dict(os.environ, {'SYNTHETIC_SECRET': 'FAKE_TOKEN'}):
                (binaries / 'npm').write_text(script.replace(str(cache), str(root / 'unrestored')))
                with self.assertRaises(m.Blocked):
                    m.run(work, cache, output, 'original')
                self.assertFalse(output.exists())
                self.assertFalse((work / 'synthetic-ci-ran').exists())
                (binaries / 'npm').write_text(script)
                result = m.run(work, cache, output, 'original')
            self.assertEqual(result, 0)
            data = json.loads(output.read_text())
            self.assertEqual(data['exit_code'], 3)
            self.assertTrue(data['private_cleanup_complete'])
            self.assertEqual(data['timers_ms']['reify'], 40)
            self.assertEqual(data['http'][0]['endpoint_class'], 'bulk-audit')
            self.assertEqual(data['error_codes'], ['ETIMEDOUT'])
            self.assertNotIn('FAKE_TOKEN', output.read_text())
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)


if __name__ == '__main__':
    unittest.main()
