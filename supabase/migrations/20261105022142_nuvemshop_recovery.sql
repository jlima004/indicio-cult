-- NUV-17: private, fenced transitions. No credentials or remote activation.
CREATE ROLE nuvemshop_intake_operator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
SET ROLE nuvemshop_intake_owner;
-- Close the PUBLIC EXECUTE window even if the migration runner autocommits.
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER TABLE nuvemshop_intake.work DROP CONSTRAINT work_state_check;
ALTER TABLE nuvemshop_intake.work DROP CONSTRAINT work_terminal_at_check;
ALTER TABLE nuvemshop_intake.work
  ADD COLUMN claim_token uuid,
  ADD COLUMN generation bigint NOT NULL DEFAULT 0 CHECK (generation >= 0),
  ADD COLUMN lease_until timestamptz,
  ADD COLUMN heartbeat_at timestamptz,
  ADD COLUMN attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  ADD COLUMN max_attempts integer CHECK (max_attempts BETWEEN 1 AND 20),
  ADD COLUMN next_attempt_at timestamptz,
  ADD COLUMN failure_code text CHECK (failure_code ~ '^[A-Z][A-Z0-9_]{0,63}$'),
  ADD CONSTRAINT work_state_check CHECK (state IN ('received','claimed','processing','succeeded','retryable','quarantined')),
  ADD CONSTRAINT work_terminal_check CHECK ((state IN ('succeeded','quarantined')) = (terminal_at IS NOT NULL)),
  ADD CONSTRAINT work_lease_check CHECK ((state IN ('claimed','processing')) = (claim_token IS NOT NULL AND lease_until IS NOT NULL AND heartbeat_at IS NOT NULL)),
  ADD CONSTRAINT work_attempt_limit_check CHECK (max_attempts IS NULL OR attempts <= max_attempts),
  ADD CONSTRAINT work_retry_check CHECK ((state = 'retryable') = (next_attempt_at IS NOT NULL));
COMMENT ON COLUMN nuvemshop_intake.work.state IS 'Pending and in-flight work and quarantine must never be purged; transitions are fenced database functions.';
COMMENT ON COLUMN nuvemshop_intake.work.terminal_at IS 'Terminal time for the 14-day minimum after terminal; retain also at least 14 days from intake and never purge quarantine or holds.';
CREATE UNIQUE INDEX work_claim_token_unique ON nuvemshop_intake.work (claim_token) WHERE claim_token IS NOT NULL;
CREATE INDEX work_claim_candidates ON nuvemshop_intake.work (state, next_attempt_at, lease_until);
-- FORCE RLS remains enabled; the non-login owner is allowed only the reads and
-- work updates needed by the fixed-search-path functions below.
CREATE POLICY recovery_owner_receipts ON nuvemshop_intake.receipts FOR SELECT TO nuvemshop_intake_owner USING (true);
CREATE POLICY recovery_owner_work_select ON nuvemshop_intake.work FOR SELECT TO nuvemshop_intake_owner USING (true);
CREATE POLICY recovery_owner_work_update ON nuvemshop_intake.work FOR UPDATE TO nuvemshop_intake_owner USING (true) WITH CHECK (true);

CREATE FUNCTION nuvemshop_intake.claim_work(p_claim uuid, p_lease_seconds integer, p_max_attempts integer)
RETURNS TABLE (receipt_id uuid, claim_token uuid, generation bigint, lease_until timestamptz, projection jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF p_claim IS NULL OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 1 AND 3600 OR p_max_attempts IS NULL OR p_max_attempts NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'invalid claim parameters' USING ERRCODE = '22023';
  END IF;
  -- Expired processing may have made external effects: quarantine for manual
  -- investigation. Also terminate expired last claims even if no work is due.
  WITH expired AS (
    SELECT w.receipt_id FROM nuvemshop_intake.work w
    WHERE w.state IN ('claimed','processing') AND w.lease_until <= clock_timestamp()
      AND (w.state = 'processing' OR w.attempts >= w.max_attempts)
    ORDER BY w.lease_until FOR UPDATE SKIP LOCKED LIMIT 100
  )
  UPDATE nuvemshop_intake.work w SET state='quarantined', terminal_at=clock_timestamp(),
    failure_code=CASE WHEN w.state='processing' THEN 'LEASE_EXPIRED_PROCESSING' ELSE 'ATTEMPTS_EXHAUSTED' END,
    claim_token=NULL, lease_until=NULL, heartbeat_at=NULL
  FROM expired e WHERE w.receipt_id=e.receipt_id;
  RETURN QUERY
  WITH candidate AS (
    SELECT w.receipt_id FROM nuvemshop_intake.work w
    WHERE w.state='received' OR (w.state='retryable' AND w.next_attempt_at <= clock_timestamp())
      OR (w.state='claimed' AND w.lease_until <= clock_timestamp() AND w.attempts < w.max_attempts)
    ORDER BY w.receipt_id FOR UPDATE SKIP LOCKED LIMIT 1
  ), changed AS (
    UPDATE nuvemshop_intake.work w SET state='claimed', claim_token=p_claim,
      generation=w.generation+1, attempts=w.attempts+1,
      max_attempts=COALESCE(w.max_attempts,p_max_attempts),
      lease_until=clock_timestamp()+make_interval(secs => p_lease_seconds), heartbeat_at=clock_timestamp(),
      next_attempt_at=NULL, terminal_at=NULL, failure_code=NULL
    FROM candidate c WHERE w.receipt_id=c.receipt_id
    RETURNING w.receipt_id,w.claim_token,w.generation,w.lease_until
  )
  SELECT c.receipt_id,c.claim_token,c.generation,c.lease_until,r.projection
  FROM changed c JOIN nuvemshop_intake.receipts r ON r.attempt_id=c.receipt_id;
END $$;

CREATE FUNCTION nuvemshop_intake.reconcile_claim(p_claim uuid)
RETURNS TABLE (receipt_id uuid, claim_token uuid, generation bigint, lease_until timestamptz, projection jsonb)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT w.receipt_id,w.claim_token,w.generation,w.lease_until,r.projection
  FROM nuvemshop_intake.work w JOIN nuvemshop_intake.receipts r ON r.attempt_id=w.receipt_id
  WHERE w.claim_token=p_claim AND w.state IN ('claimed','processing') AND w.lease_until > clock_timestamp()
$$;
CREATE FUNCTION nuvemshop_intake.start_work(p_id uuid,p_token uuid,p_generation bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  -- Check expiry only after acquiring the row lock, including after a lock wait.
  PERFORM 1 FROM nuvemshop_intake.work WHERE receipt_id=p_id FOR UPDATE;
  UPDATE nuvemshop_intake.work SET state='processing' WHERE receipt_id=p_id AND claim_token=p_token
    AND generation=p_generation AND state='claimed' AND lease_until > clock_timestamp();
  RETURN FOUND;
END $$;
CREATE FUNCTION nuvemshop_intake.heartbeat_work(p_id uuid,p_token uuid,p_generation bigint,p_lease_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 1 AND 3600 THEN RAISE EXCEPTION 'invalid lease' USING ERRCODE='22023'; END IF;
  -- Check expiry only after acquiring the row lock, including after a lock wait.
  PERFORM 1 FROM nuvemshop_intake.work WHERE receipt_id=p_id FOR UPDATE;
  UPDATE nuvemshop_intake.work SET heartbeat_at=clock_timestamp(), lease_until=clock_timestamp()+make_interval(secs => p_lease_seconds)
    WHERE receipt_id=p_id AND claim_token=p_token AND generation=p_generation
    AND state IN ('claimed','processing') AND lease_until > clock_timestamp();
  RETURN FOUND;
END $$;
CREATE FUNCTION nuvemshop_intake.succeed_work(p_id uuid,p_token uuid,p_generation bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  -- Check expiry only after acquiring the row lock, including after a lock wait.
  PERFORM 1 FROM nuvemshop_intake.work WHERE receipt_id=p_id FOR UPDATE;
  UPDATE nuvemshop_intake.work SET state='succeeded',terminal_at=clock_timestamp(),claim_token=NULL,lease_until=NULL,heartbeat_at=NULL,failure_code=NULL
    WHERE receipt_id=p_id AND claim_token=p_token AND generation=p_generation AND state='processing' AND lease_until > clock_timestamp();
  RETURN FOUND;
END $$;
CREATE FUNCTION nuvemshop_intake.fail_work(p_id uuid,p_token uuid,p_generation bigint,p_recoverable boolean,p_code text,p_backoff_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF p_recoverable IS NULL OR p_code IS NULL OR p_code !~ '^[A-Z][A-Z0-9_]{0,63}$' OR p_backoff_seconds IS NULL OR p_backoff_seconds NOT BETWEEN 0 AND 86400 THEN
    RAISE EXCEPTION 'invalid failure parameters' USING ERRCODE='22023';
  END IF;
  -- Check expiry only after acquiring the row lock, including after a lock wait.
  PERFORM 1 FROM nuvemshop_intake.work WHERE receipt_id=p_id FOR UPDATE;
  UPDATE nuvemshop_intake.work SET
    state=CASE WHEN p_recoverable AND attempts < max_attempts THEN 'retryable' ELSE 'quarantined' END,
    terminal_at=CASE WHEN p_recoverable AND attempts < max_attempts THEN NULL ELSE clock_timestamp() END,
    next_attempt_at=CASE WHEN p_recoverable AND attempts < max_attempts THEN clock_timestamp()+make_interval(secs => p_backoff_seconds) ELSE NULL END,
    failure_code=p_code,claim_token=NULL,lease_until=NULL,heartbeat_at=NULL
    WHERE receipt_id=p_id AND claim_token=p_token AND generation=p_generation AND state IN ('claimed','processing') AND lease_until > clock_timestamp();
  RETURN FOUND;
END $$;
-- Replay authority is deliberately separate from the runtime role; no login is provisioned.
CREATE FUNCTION nuvemshop_intake.replay_work(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  -- Evaluate the replay deadline after any wait for the work row.
  PERFORM 1 FROM nuvemshop_intake.work WHERE receipt_id=p_id FOR UPDATE;
  UPDATE nuvemshop_intake.work w SET state='received',terminal_at=NULL,attempts=0,max_attempts=NULL,failure_code=NULL
  FROM nuvemshop_intake.receipts r WHERE w.receipt_id=p_id AND r.attempt_id=w.receipt_id AND w.state='quarantined'
    AND r.intake_at <= clock_timestamp() AND r.intake_at >= clock_timestamp()-interval '7 days';
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION nuvemshop_intake.claim_work(uuid,integer,integer),nuvemshop_intake.reconcile_claim(uuid),nuvemshop_intake.start_work(uuid,uuid,bigint),nuvemshop_intake.heartbeat_work(uuid,uuid,bigint,integer),nuvemshop_intake.succeed_work(uuid,uuid,bigint),nuvemshop_intake.fail_work(uuid,uuid,bigint,boolean,text,integer),nuvemshop_intake.replay_work(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nuvemshop_intake.claim_work(uuid,integer,integer),nuvemshop_intake.reconcile_claim(uuid),nuvemshop_intake.start_work(uuid,uuid,bigint),nuvemshop_intake.heartbeat_work(uuid,uuid,bigint,integer),nuvemshop_intake.succeed_work(uuid,uuid,bigint),nuvemshop_intake.fail_work(uuid,uuid,bigint,boolean,text,integer) TO nuvemshop_intake_runtime;
GRANT USAGE ON SCHEMA nuvemshop_intake TO nuvemshop_intake_operator;
GRANT EXECUTE ON FUNCTION nuvemshop_intake.replay_work(uuid) TO nuvemshop_intake_operator;
RESET ROLE;
