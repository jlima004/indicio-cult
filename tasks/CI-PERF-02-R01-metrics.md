# CI-PERF-02-R01 — Sanitized measurement appendix

These are positive-schema fields from the two actual artifacts, with per-request HTTP rows reduced to enumerated aggregates. Original JSON SHA-256 values bind the downloaded artifacts; these projections have different bytes. Original artifacts expire after 14 days; this appendix preserves the reported measurements. No raw npm output, timing metadata, URL paths, headers, bodies, credentials or cache contents are included. See [analysis and limits](CI-PERF-02-R01-evidence.md).

## E1 — Run [39858620249](https://github.com/jlima004/indicio-cult/actions/runs/39858620249)

Original evidence.json SHA-256: `63902432fc8d2e14e1d74b8cbe84cb809631325438435870d589f93df0a18d07`. workflow-context.json SHA-256: `aca225262f2c68411341bbc5932e03fe0b448f77b2da9dd51a9389e9c1bc5ccd`.

```json
{
  "measurement": {
    "baseline_sha": "9249a1efe8c1703408a2ebb9828d41341dd6cd74",
    "baseline_tree": "5eaa7f347093fb810325dab8d9a2ea15f0bf3580",
    "baseline_unchanged": true,
    "cache_path_matches": true,
    "clock_resolution_seconds": 1e-9,
    "effective_config": {
      "audit": true,
      "fetch-retries": 2,
      "fetch-retry-factor": 10,
      "fetch-retry-maxtimeout": 60000,
      "fetch-retry-mintimeout": 10000,
      "fetch-timeout": 300000,
      "foreground-scripts": false,
      "ignore-scripts": false,
      "loglevel": "info",
      "logs-max": 0,
      "maxsockets": 15,
      "offline": false,
      "prefer-offline": false,
      "prefer-online": false,
      "registry": "https://registry.npmjs.org/",
      "strict-ssl": true
    },
    "error_codes": [],
    "exit_code": 0,
    "filesystem_input_operations": 232,
    "filesystem_output_operations": 2976720,
    "finalization_seconds": 0.035386186,
    "harness_file_sha256": "712432080834d9589dc26330a19acda66ba5d21c21e2ed9c3a34c83904726dd7",
    "harness_sha": "33f151beb54402278484e91d357ae4657cc1291b",
    "http_aggregates": [
      {
        "cache": null,
        "count": 1,
        "duration_ms_max": 650,
        "duration_ms_min": 650,
        "endpoint_class": "bulk-audit",
        "error": null,
        "event": "fetch",
        "explicit_attempt_count": 0,
        "method": "POST",
        "status": 200
      },
      {
        "cache": "miss",
        "count": 548,
        "duration_ms_max": 20862,
        "duration_ms_min": 788,
        "endpoint_class": "tarball",
        "error": null,
        "event": "fetch",
        "explicit_attempt_count": 0,
        "method": "GET",
        "status": 200
      },
      {
        "cache": "miss",
        "count": 10,
        "duration_ms_max": 4745,
        "duration_ms_min": 88,
        "endpoint_class": "metadata",
        "error": null,
        "event": "fetch",
        "explicit_attempt_count": 0,
        "method": "GET",
        "status": 200
      }
    ],
    "http_audit_rows": [
      {
        "attempt": null,
        "cache": null,
        "duration_ms": 650,
        "endpoint_class": "bulk-audit",
        "error": null,
        "event": "fetch",
        "method": "POST",
        "status": 200
      }
    ],
    "http_observed": 1107,
    "http_truncated": 0,
    "http_unparsed": 548,
    "instrumentation": "monotonic-wall; npm-Date.now-overlapping; wait4-operations; proc-root-sampled-bounds",
    "involuntary_context_switches": 12711,
    "lifecycle_completion_counts": {
      "install": 0,
      "postinstall": 1,
      "preinstall": 0,
      "prepare": 0
    },
    "lifecycle_start_counts": {
      "install": 0,
      "postinstall": 1,
      "preinstall": 0,
      "prepare": 0
    },
    "lifecycle_timer_count": 1,
    "lifecycle_timer_max_ms": 52,
    "lock_sha256": "2a6e6077d46d953ee4fbeac8a776d3e0d0c79f996edcca7e3c045c740bf8d14b",
    "lock_unchanged": true,
    "max_process_rss_kib": 662868,
    "missing_required_timers": [],
    "node": "22.23.1",
    "node_modules_existed_at_start": false,
    "npm": "10.9.8",
    "oversize_lines": 0,
    "private_cleanup_complete": true,
    "proc_io_errors": 1,
    "proc_io_samples": 438,
    "proc_root_sampled_max": {
      "cancelled_write_bytes": 3825664,
      "rchar": 345624556,
      "read_bytes": 118784,
      "syscr": 116790,
      "syscw": 239671,
      "wchar": 1425939104,
      "write_bytes": 1521836032
    },
    "schema": 1,
    "setup_seconds": 0.213361256,
    "started_utc": "2026-10-22T21:36:36Z",
    "status": "complete",
    "system_cpu_seconds": 5.406933,
    "timer_dropped": 816,
    "timers_ms": {
      "auditReport:getReport": 652,
      "auditReport:init": 11048,
      "build": 88,
      "build:deps": 88,
      "build:link": 16,
      "build:queue": 19,
      "build:run:postinstall": 52,
      "command:ci": 21712,
      "idealTree": 114,
      "idealTree:buildDeps": 1,
      "idealTree:fixDepFlags": 0,
      "idealTree:init": 105,
      "npm": 21973,
      "reify": 21412,
      "reify:audit": 11700,
      "reify:build": 89,
      "reify:createSparse": 89,
      "reify:diffTrees": 8,
      "reify:loadBundles": 12,
      "reify:loadTrees": 6,
      "reify:retireShallow": 0,
      "reify:trash": 16,
      "reify:unpack": 21099,
      "reify:unretire": 0
    },
    "timing_files": 1,
    "timing_parse_failures": 0,
    "total_before_publish_seconds": 22.35183132,
    "unfinished_timer_count": 0,
    "user_cpu_seconds": 27.131412,
    "variant": "original",
    "voluntary_context_switches": 645427,
    "wall_seconds": 22.103005011
  },
  "workflow_context": {
    "baseline_sha": "9249a1efe8c1703408a2ebb9828d41341dd6cd74",
    "baseline_tree": "5eaa7f347093fb810325dab8d9a2ea15f0bf3580",
    "cache_hit": false,
    "cache_key": "node-cache-Linux-x64-npm-d17d8a101ab44ecaa3d8d7d61fade855193577a41bae7040512491e0c001e69d",
    "cache_matched_key": "",
    "cache_restore_and_step_transition_seconds": 0.321039151,
    "harness_sha": "33f151beb54402278484e91d357ae4657cc1291b",
    "metadata_note": "Exact restore bytes and runner identity must be reconciled from public Actions job setup/cache logs; null means not observed here.",
    "node_setup_and_verification_seconds": 5.190671283,
    "pre_install_total_seconds": 7.205279186,
    "pre_node_setup_seconds": 1.693568752,
    "restored_bytes": null,
    "run_id": 39858620249,
    "runner_event_sha": "33f151beb54402278484e91d357ae4657cc1291b",
    "runner_image": null,
    "runner_provisioner": null,
    "runner_region": null,
    "started_utc": "2026-10-22T21:36:28Z"
  }
}
```

## E2 — Run [39859369212](https://github.com/jlima004/indicio-cult/actions/runs/39859369212)

Original evidence.json SHA-256: `8112383418ca4bf41039a85bccd37f41f80dbc67fc8707f8bb5154ff3f6c16c9`. workflow-context.json SHA-256: `e3c03cdd6a7e24c34b8c17ae763c3618fc41185cb3e906cde1ee687fda88bfde`.

```json
{
  "measurement": {
    "baseline_sha": "9249a1efe8c1703408a2ebb9828d41341dd6cd74",
    "baseline_tree": "5eaa7f347093fb810325dab8d9a2ea15f0bf3580",
    "baseline_unchanged": true,
    "cache_path_matches": true,
    "clock_resolution_seconds": 1e-9,
    "effective_config": {
      "audit": true,
      "fetch-retries": 2,
      "fetch-retry-factor": 10,
      "fetch-retry-maxtimeout": 60000,
      "fetch-retry-mintimeout": 10000,
      "fetch-timeout": 300000,
      "foreground-scripts": false,
      "ignore-scripts": false,
      "loglevel": "info",
      "logs-max": 0,
      "maxsockets": 15,
      "offline": false,
      "prefer-offline": false,
      "prefer-online": false,
      "registry": "https://registry.npmjs.org/",
      "strict-ssl": true
    },
    "error_codes": [],
    "exit_code": 0,
    "filesystem_input_operations": 120,
    "filesystem_output_operations": 2312040,
    "finalization_seconds": 0.046003475,
    "harness_file_sha256": "712432080834d9589dc26330a19acda66ba5d21c21e2ed9c3a34c83904726dd7",
    "harness_sha": "bdeff511b7bdefcde7eb4838fa982f15e84ef4a4",
    "http_aggregates": [
      {
        "cache": null,
        "count": 1,
        "duration_ms_max": 4563,
        "duration_ms_min": 4563,
        "endpoint_class": "bulk-audit",
        "error": null,
        "event": "fetch",
        "explicit_attempt_count": 0,
        "method": "POST",
        "status": 200
      },
      {
        "cache": "revalidated",
        "count": 3,
        "duration_ms_max": 678,
        "duration_ms_min": 71,
        "endpoint_class": "metadata",
        "error": null,
        "event": "fetch",
        "explicit_attempt_count": 0,
        "method": "GET",
        "status": 200
      },
      {
        "cache": "miss",
        "count": 5,
        "duration_ms_max": 1736,
        "duration_ms_min": 103,
        "endpoint_class": "metadata",
        "error": null,
        "event": "fetch",
        "explicit_attempt_count": 0,
        "method": "GET",
        "status": 200
      },
      {
        "cache": "updated",
        "count": 2,
        "duration_ms_max": 556,
        "duration_ms_min": 398,
        "endpoint_class": "metadata",
        "error": null,
        "event": "fetch",
        "explicit_attempt_count": 0,
        "method": "GET",
        "status": 200
      }
    ],
    "http_audit_rows": [
      {
        "attempt": null,
        "cache": null,
        "duration_ms": 4563,
        "endpoint_class": "bulk-audit",
        "error": null,
        "event": "fetch",
        "method": "POST",
        "status": 200
      }
    ],
    "http_observed": 559,
    "http_truncated": 0,
    "http_unparsed": 548,
    "instrumentation": "monotonic-wall; npm-Date.now-overlapping; wait4-operations; proc-root-sampled-bounds",
    "involuntary_context_switches": 13103,
    "lifecycle_completion_counts": {
      "install": 0,
      "postinstall": 1,
      "preinstall": 0,
      "prepare": 0
    },
    "lifecycle_start_counts": {
      "install": 0,
      "postinstall": 1,
      "preinstall": 0,
      "prepare": 0
    },
    "lifecycle_timer_count": 1,
    "lifecycle_timer_max_ms": 79,
    "lock_sha256": "2a6e6077d46d953ee4fbeac8a776d3e0d0c79f996edcca7e3c045c740bf8d14b",
    "lock_unchanged": true,
    "max_process_rss_kib": 1607608,
    "missing_required_timers": [],
    "node": "22.23.1",
    "node_modules_existed_at_start": false,
    "npm": "10.9.8",
    "oversize_lines": 0,
    "private_cleanup_complete": true,
    "proc_io_errors": 3,
    "proc_io_samples": 391,
    "proc_root_sampled_max": {
      "cancelled_write_bytes": 118784,
      "rchar": 344834121,
      "read_bytes": 61440,
      "syscr": 108118,
      "syscw": 206213,
      "wchar": 1088836435,
      "write_bytes": 1182470144
    },
    "schema": 1,
    "setup_seconds": 0.231829516,
    "started_utc": "2026-10-22T21:42:28Z",
    "status": "complete",
    "system_cpu_seconds": 5.731291,
    "timer_dropped": 813,
    "timers_ms": {
      "auditReport:getReport": 4566,
      "auditReport:init": 7165,
      "build": 114,
      "build:deps": 114,
      "build:link": 13,
      "build:queue": 22,
      "build:run:postinstall": 79,
      "command:ci": 19352,
      "idealTree": 115,
      "idealTree:buildDeps": 1,
      "idealTree:fixDepFlags": 0,
      "idealTree:init": 106,
      "npm": 19633,
      "reify": 19044,
      "reify:audit": 11731,
      "reify:build": 115,
      "reify:createSparse": 112,
      "reify:diffTrees": 7,
      "reify:loadBundles": 11,
      "reify:loadTrees": 6,
      "reify:retireShallow": 0,
      "reify:trash": 14,
      "reify:unpack": 18682,
      "reify:unretire": 1
    },
    "timing_files": 1,
    "timing_parse_failures": 0,
    "total_before_publish_seconds": 20.129888512,
    "unfinished_timer_count": 0,
    "user_cpu_seconds": 23.852066999999998,
    "variant": "original",
    "voluntary_context_switches": 573276,
    "wall_seconds": 19.851978277
  },
  "workflow_context": {
    "baseline_sha": "9249a1efe8c1703408a2ebb9828d41341dd6cd74",
    "baseline_tree": "5eaa7f347093fb810325dab8d9a2ea15f0bf3580",
    "cache_hit": true,
    "cache_key": "node-cache-Linux-x64-npm-d17d8a101ab44ecaa3d8d7d61fade855193577a41bae7040512491e0c001e69d",
    "cache_matched_key": "node-cache-Linux-x64-npm-d17d8a101ab44ecaa3d8d7d61fade855193577a41bae7040512491e0c001e69d",
    "cache_restore_and_step_transition_seconds": 5.377280597,
    "harness_sha": "bdeff511b7bdefcde7eb4838fa982f15e84ef4a4",
    "metadata_note": "Exact restore bytes and runner identity must be reconciled from public Actions job setup/cache logs; null means not observed here.",
    "node_setup_and_verification_seconds": 5.382061521,
    "pre_install_total_seconds": 12.737211258,
    "pre_node_setup_seconds": 1.97786914,
    "restored_bytes": null,
    "run_id": 39859369212,
    "runner_event_sha": "bdeff511b7bdefcde7eb4838fa982f15e84ef4a4",
    "runner_image": null,
    "runner_provisioner": null,
    "runner_region": null,
    "started_utc": "2026-10-22T21:42:15Z"
  }
}
```

## Interpretation contract

Wall/setup/finalization use monotonic_ns; npm timers use Date.now and overlap. Phase durations and concurrent HTTP durations must not be summed. wait4 CPU accounting is distinct from elapsed time; max RSS is a maximum process RSS, not simultaneous process-tree memory. filesystem_input_operations/filesystem_output_operations count operations, not bytes or 512-byte blocks. /proc root sampled maxima are incomplete bounds; rchar/wchar/read_bytes/write_bytes are byte counters, while syscr/syscw count syscalls. Samples may miss final values/short children; sampling errors are retained. The collector adds overhead that was not measured against an uninstrumented counterfactual.

A null attempt means no attempt count was observed, not zero retries. No parsed quick-audit/error line does not prove no such work occurred. Both runs had 548 unparsed HTTP-like lines, which remain unknown. Installed pacote source emits optimistic cache text using package specs before stream completion, consistent with a parser gap but insufficient to relabel these removed lines as successful cache hits. Completed timer names are deliberately allowlisted; dropped timers are counted, not claimed absent. Missing timing data and cleanup failures would have remained explicit.

workflow_context runner identity/restored_bytes fields were null at collection time; the analysis report reconciles public Actions metadata separately without mutating the artifact JSON. E1 restored no archive; do not substitute the existing archive size for its missing restored-byte measurement.
