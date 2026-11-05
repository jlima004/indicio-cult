-- NUV-18: bounded, fenced deferral for work that has not performed an effect.
SET ROLE nuvemshop_intake_owner;
CREATE FUNCTION nuvemshop_intake.defer_work(p_id uuid, p_token uuid, p_generation bigint, p_reason text, p_backoff_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF p_reason IS NULL OR p_reason NOT IN ('NO_CONSUMER','OPERATION_PAUSED','DISPATCH_BUSY','RECONCILIATION_PENDING')
     OR p_backoff_seconds IS NULL OR p_backoff_seconds NOT BETWEEN 1 AND 86400 THEN
    RAISE EXCEPTION 'invalid deferral' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM nuvemshop_intake.work WHERE receipt_id=p_id FOR UPDATE;
  UPDATE nuvemshop_intake.work SET state='retryable', terminal_at=NULL,
    next_attempt_at=clock_timestamp()+make_interval(secs => p_backoff_seconds),
    attempts=greatest(0,attempts-1), failure_code=p_reason,
    claim_token=NULL,lease_until=NULL,heartbeat_at=NULL
  WHERE receipt_id=p_id AND claim_token=p_token AND generation=p_generation
    AND state='processing' AND lease_until > clock_timestamp();
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION nuvemshop_intake.defer_work(uuid,uuid,bigint,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nuvemshop_intake.defer_work(uuid,uuid,bigint,text,integer) TO nuvemshop_intake_runtime;

-- All state lives in the private schema, with the same non-login owner as NUV-17.
CREATE TABLE nuvemshop_intake.dispatch_operation (
  store_id text PRIMARY KEY CHECK (store_id ~ '^[1-9][0-9]{0,39}$'),
  status text NOT NULL DEFAULT 'paused' CHECK (status IN ('paused','reconciling','active','disconnected')),
  epoch bigint NOT NULL DEFAULT 0 CHECK (epoch >= 0),
  resume_requested boolean NOT NULL DEFAULT false,
  access_confirmed boolean NOT NULL DEFAULT false,
  reason text NOT NULL DEFAULT 'CONFIGURATION_UNPROVEN'
);
CREATE TABLE nuvemshop_intake.dispatch_consumer (
  store_id text NOT NULL REFERENCES nuvemshop_intake.dispatch_operation,
  consumer_id text NOT NULL CHECK (consumer_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  reconciled_epoch bigint,
  reconcile_receipt uuid,
  reconcile_token uuid,
  reconcile_work_generation bigint,
  reconcile_epoch bigint,
  reconcile_uncertain boolean NOT NULL DEFAULT false,
  CHECK ((reconcile_receipt IS NULL AND reconcile_token IS NULL AND reconcile_work_generation IS NULL AND reconcile_epoch IS NULL AND NOT reconcile_uncertain) OR
         (reconcile_receipt IS NOT NULL AND reconcile_token IS NOT NULL AND reconcile_work_generation IS NOT NULL AND reconcile_epoch IS NOT NULL)),
  PRIMARY KEY(store_id,consumer_id)
);
CREATE TABLE nuvemshop_intake.dispatch_lifecycle (
  receipt_id uuid PRIMARY KEY REFERENCES nuvemshop_intake.receipts(attempt_id)
);
CREATE TABLE nuvemshop_intake.dispatch_target (
  store_id text NOT NULL,
  consumer_id text NOT NULL,
  family text NOT NULL CHECK (family IN ('product','order')),
  resource_id text NOT NULL CHECK (resource_id ~ '^[1-9][0-9]{0,39}$'),
  pending_generation bigint NOT NULL DEFAULT 0,
  completed_generation bigint NOT NULL DEFAULT 0,
  active_receipt uuid,
  active_token uuid,
  active_work_generation bigint,
  active_generation bigint,
  uncertain boolean NOT NULL DEFAULT false,
  PRIMARY KEY(store_id,consumer_id,family,resource_id),
  FOREIGN KEY(store_id,consumer_id) REFERENCES nuvemshop_intake.dispatch_consumer,
  CHECK (completed_generation <= pending_generation),
  CHECK ((active_receipt IS NULL AND active_token IS NULL AND active_work_generation IS NULL AND active_generation IS NULL) OR
         (active_receipt IS NOT NULL AND active_token IS NOT NULL AND active_work_generation IS NOT NULL AND active_generation IS NOT NULL))
);
CREATE TABLE nuvemshop_intake.dispatch_signal (
  receipt_id uuid NOT NULL REFERENCES nuvemshop_intake.receipts(attempt_id),
  consumer_id text NOT NULL,
  store_id text NOT NULL,
  family text NOT NULL,
  resource_id text NOT NULL,
  generation bigint NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  PRIMARY KEY(receipt_id,consumer_id),
  FOREIGN KEY(store_id,consumer_id,family,resource_id) REFERENCES nuvemshop_intake.dispatch_target
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['dispatch_operation','dispatch_consumer','dispatch_lifecycle','dispatch_target','dispatch_signal'] LOOP
    EXECUTE format('ALTER TABLE nuvemshop_intake.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE nuvemshop_intake.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY owner_access ON nuvemshop_intake.%I TO nuvemshop_intake_owner USING (true) WITH CHECK (true)',t);
    EXECUTE format('REVOKE ALL ON nuvemshop_intake.%I FROM PUBLIC',t);
  END LOOP;
END $$;

CREATE FUNCTION nuvemshop_intake.register_dispatch_consumer(p_store text,p_consumer text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF p_store IS NULL OR p_store !~ '^[1-9][0-9]{0,39}$' OR p_consumer IS NULL OR p_consumer !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$' THEN
    RAISE EXCEPTION 'invalid consumer' USING ERRCODE='22023';
  END IF;
  INSERT INTO nuvemshop_intake.dispatch_operation(store_id) VALUES(p_store) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM nuvemshop_intake.dispatch_operation WHERE store_id=p_store FOR UPDATE;
  INSERT INTO nuvemshop_intake.dispatch_consumer(store_id,consumer_id) VALUES(p_store,p_consumer) ON CONFLICT DO NOTHING;
  RETURN (SELECT c.reconciled_epoch IS DISTINCT FROM o.epoch FROM nuvemshop_intake.dispatch_consumer c JOIN nuvemshop_intake.dispatch_operation o ON o.store_id=c.store_id WHERE c.store_id=p_store AND c.consumer_id=p_consumer);
END $$;
CREATE FUNCTION nuvemshop_intake.get_dispatch_operation(p_store text)
RETURNS TABLE(store_id text,status text,epoch bigint,resume_requested boolean,access_confirmed boolean,reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF p_store IS NULL OR p_store !~ '^[1-9][0-9]{0,39}$' THEN RAISE EXCEPTION 'invalid store' USING ERRCODE='22023'; END IF;
  INSERT INTO nuvemshop_intake.dispatch_operation(store_id) VALUES(p_store) ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT o.store_id,o.status,o.epoch,o.resume_requested,o.access_confirmed,o.reason FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=p_store;
END $$;
CREATE FUNCTION nuvemshop_intake.apply_dispatch_lifecycle(p_id uuid,p_token uuid,p_generation bigint)
RETURNS TABLE(store_id text,status text,epoch bigint,resume_requested boolean,access_confirmed boolean,reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_projection jsonb; v_store text; v_event text;
BEGIN
  PERFORM 1 FROM nuvemshop_intake.work WHERE receipt_id=p_id FOR UPDATE;
  SELECT r.projection INTO v_projection FROM nuvemshop_intake.work w JOIN nuvemshop_intake.receipts r ON r.attempt_id=w.receipt_id
    WHERE w.receipt_id=p_id AND w.claim_token=p_token AND w.generation=p_generation AND w.state='processing' AND w.lease_until>clock_timestamp() AND r.family='lifecycle';
  IF NOT FOUND THEN RAISE EXCEPTION 'ownership lost' USING ERRCODE='P0001'; END IF;
  v_store:=v_projection->>'storeId'; v_event:=v_projection->>'event';
  INSERT INTO nuvemshop_intake.dispatch_operation(store_id) VALUES(v_store) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=v_store FOR UPDATE;
  -- Check the lease again after waiting on the store lock.
  IF NOT EXISTS(SELECT 1 FROM nuvemshop_intake.work w WHERE w.receipt_id=p_id AND w.claim_token=p_token AND w.generation=p_generation AND w.state='processing' AND w.lease_until>clock_timestamp()) THEN RAISE EXCEPTION 'ownership lost' USING ERRCODE='P0001'; END IF;
  INSERT INTO nuvemshop_intake.dispatch_lifecycle(receipt_id) VALUES(p_id) ON CONFLICT DO NOTHING;
  IF FOUND THEN
    UPDATE nuvemshop_intake.dispatch_operation o SET
      status=CASE WHEN o.status='disconnected' OR v_event='app/uninstalled' THEN 'disconnected' ELSE 'paused' END,
      epoch=o.epoch+1, access_confirmed=false,
      resume_requested=(v_event='app/resumed' AND o.status<>'disconnected'),
      reason=CASE WHEN o.status='disconnected' OR v_event='app/uninstalled' THEN 'UNINSTALLED' WHEN v_event='app/suspended' THEN 'SUSPENDED' ELSE 'RESUME_REQUESTED' END
      WHERE o.store_id=v_store;
  END IF;
  RETURN QUERY SELECT o.store_id,o.status,o.epoch,o.resume_requested,o.access_confirmed,o.reason FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=v_store;
END $$;
CREATE FUNCTION nuvemshop_intake.record_dispatch_probe(p_store text,p_epoch bigint,p_result text)
RETURNS TABLE(store_id text,status text,epoch bigint,resume_requested boolean,access_confirmed boolean,reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF p_result IS NULL OR p_result NOT IN ('ready','unauthorized','suspended','indeterminate') THEN RAISE EXCEPTION 'invalid probe' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=p_store FOR UPDATE;
  UPDATE nuvemshop_intake.dispatch_operation o SET
    status=CASE WHEN p_result='ready' THEN 'reconciling' ELSE 'paused' END,
    access_confirmed=(p_result='ready'),
    epoch=CASE WHEN p_result='ready' THEN o.epoch ELSE o.epoch+1 END,
    reason=CASE p_result WHEN 'ready' THEN 'RECONCILIATION_PENDING' WHEN 'unauthorized' THEN 'UNAUTHORIZED' WHEN 'suspended' THEN 'SUSPENDED' ELSE 'PROBE_INDETERMINATE' END
  WHERE o.store_id=p_store AND o.epoch=p_epoch AND o.status<>'disconnected'
    AND (p_result<>'ready' OR o.resume_requested);
  IF FOUND AND p_result='ready' AND NOT EXISTS(SELECT 1 FROM nuvemshop_intake.dispatch_consumer c WHERE c.store_id=p_store AND c.reconciled_epoch IS DISTINCT FROM p_epoch) THEN
    UPDATE nuvemshop_intake.dispatch_operation o SET status='active',reason='READY',resume_requested=false WHERE o.store_id=p_store;
  END IF;
  RETURN QUERY SELECT o.store_id,o.status,o.epoch,o.resume_requested,o.access_confirmed,o.reason FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=p_store;
END $$;
CREATE FUNCTION nuvemshop_intake.complete_dispatch_reconciliation(p_store text,p_consumer text,p_epoch bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  PERFORM 1 FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=p_store FOR UPDATE;
  UPDATE nuvemshop_intake.dispatch_consumer c SET reconciled_epoch=p_epoch FROM nuvemshop_intake.dispatch_operation o
    WHERE c.store_id=p_store AND c.consumer_id=p_consumer AND o.store_id=c.store_id AND o.epoch=p_epoch AND o.access_confirmed AND o.status IN ('reconciling','active');
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE nuvemshop_intake.dispatch_operation o SET status='active',reason='READY',resume_requested=false
    WHERE o.store_id=p_store AND NOT EXISTS(SELECT 1 FROM nuvemshop_intake.dispatch_consumer c WHERE c.store_id=p_store AND c.reconciled_epoch IS DISTINCT FROM p_epoch);
  RETURN true;
END $$;
-- Reconciliation can run effects: its in-flight identity survives process death.
CREATE FUNCTION nuvemshop_intake.begin_dispatch_reconciliation(p_id uuid,p_token uuid,p_work_generation bigint,p_consumer text,p_epoch bigint)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_store text; v_consumer nuvemshop_intake.dispatch_consumer%ROWTYPE; v_operation nuvemshop_intake.dispatch_operation%ROWTYPE;
BEGIN
  PERFORM 1 FROM nuvemshop_intake.work WHERE receipt_id=p_id FOR UPDATE;
  SELECT r.projection->>'storeId' INTO v_store FROM nuvemshop_intake.work w JOIN nuvemshop_intake.receipts r ON r.attempt_id=w.receipt_id
    WHERE w.receipt_id=p_id AND w.claim_token=p_token AND w.generation=p_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'ownership lost' USING ERRCODE='P0001'; END IF;
  SELECT * INTO v_operation FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=v_store FOR UPDATE;
  SELECT * INTO v_consumer FROM nuvemshop_intake.dispatch_consumer c WHERE c.store_id=v_store AND c.consumer_id=p_consumer FOR UPDATE;
  IF NOT FOUND THEN RETURN 'paused'; END IF;
  IF NOT EXISTS(SELECT 1 FROM nuvemshop_intake.work w WHERE w.receipt_id=p_id AND w.claim_token=p_token AND w.generation=p_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp()) THEN RAISE EXCEPTION 'ownership lost' USING ERRCODE='P0001'; END IF;
  IF v_consumer.reconcile_uncertain THEN RETURN 'uncertain'; END IF;
  IF v_consumer.reconcile_receipt IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM nuvemshop_intake.work w WHERE w.receipt_id=v_consumer.reconcile_receipt AND w.claim_token=v_consumer.reconcile_token AND w.generation=v_consumer.reconcile_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp()) THEN RETURN 'busy'; END IF;
    UPDATE nuvemshop_intake.dispatch_consumer c SET reconcile_uncertain=true WHERE c.store_id=v_store AND c.consumer_id=p_consumer;
    RETURN 'uncertain';
  END IF;
  IF v_operation.epoch IS DISTINCT FROM p_epoch OR NOT v_operation.access_confirmed OR v_operation.status NOT IN ('active','reconciling') THEN RETURN 'paused'; END IF;
  IF v_consumer.reconciled_epoch=p_epoch THEN RETURN 'completed'; END IF;
  UPDATE nuvemshop_intake.dispatch_consumer c SET reconcile_receipt=p_id,reconcile_token=p_token,reconcile_work_generation=p_work_generation,reconcile_epoch=p_epoch WHERE c.store_id=v_store AND c.consumer_id=p_consumer;
  RETURN 'ready';
END $$;
CREATE FUNCTION nuvemshop_intake.finish_dispatch_reconciliation(p_id uuid,p_token uuid,p_work_generation bigint,p_consumer text,p_epoch bigint,p_outcome text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_store text; v_operation nuvemshop_intake.dispatch_operation%ROWTYPE;
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('applied','retry_safe','indeterminate') THEN RAISE EXCEPTION 'invalid outcome' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM nuvemshop_intake.work WHERE receipt_id=p_id FOR UPDATE;
  SELECT r.projection->>'storeId' INTO v_store FROM nuvemshop_intake.work w JOIN nuvemshop_intake.receipts r ON r.attempt_id=w.receipt_id
    WHERE w.receipt_id=p_id AND w.claim_token=p_token AND w.generation=p_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp();
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO v_operation FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=v_store FOR UPDATE;
  PERFORM 1 FROM nuvemshop_intake.dispatch_consumer c WHERE c.store_id=v_store AND c.consumer_id=p_consumer FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM nuvemshop_intake.work w WHERE w.receipt_id=p_id AND w.claim_token=p_token AND w.generation=p_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp()) THEN RETURN false; END IF;
  IF p_outcome='applied' AND (v_operation.epoch IS DISTINCT FROM p_epoch OR NOT v_operation.access_confirmed OR v_operation.status NOT IN ('active','reconciling')) THEN RETURN false; END IF;
  UPDATE nuvemshop_intake.dispatch_consumer c SET
    reconciled_epoch=CASE WHEN p_outcome='applied' THEN p_epoch ELSE c.reconciled_epoch END,
    reconcile_receipt=CASE WHEN p_outcome='indeterminate' THEN c.reconcile_receipt ELSE NULL END,
    reconcile_token=CASE WHEN p_outcome='indeterminate' THEN c.reconcile_token ELSE NULL END,
    reconcile_work_generation=CASE WHEN p_outcome='indeterminate' THEN c.reconcile_work_generation ELSE NULL END,
    reconcile_epoch=CASE WHEN p_outcome='indeterminate' THEN c.reconcile_epoch ELSE NULL END,
    reconcile_uncertain=(p_outcome='indeterminate')
    WHERE c.store_id=v_store AND c.consumer_id=p_consumer AND c.reconcile_receipt=p_id AND c.reconcile_token=p_token AND c.reconcile_work_generation=p_work_generation AND c.reconcile_epoch=p_epoch AND NOT c.reconcile_uncertain;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_outcome='applied' THEN PERFORM nuvemshop_intake.complete_dispatch_reconciliation(v_store,p_consumer,p_epoch); END IF;
  RETURN true;
END $$;
CREATE FUNCTION nuvemshop_intake.resolve_dispatch_reconciliation(p_store text,p_consumer text,p_epoch bigint,p_outcome text,p_expected_receipt uuid,p_expected_token uuid,p_expected_work_generation bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_consumer nuvemshop_intake.dispatch_consumer%ROWTYPE; v_operation nuvemshop_intake.dispatch_operation%ROWTYPE;
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('applied','retry_safe') THEN RAISE EXCEPTION 'invalid outcome' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_operation FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=p_store FOR UPDATE;
  SELECT * INTO v_consumer FROM nuvemshop_intake.dispatch_consumer c WHERE c.store_id=p_store AND c.consumer_id=p_consumer FOR UPDATE;
  IF NOT FOUND OR v_consumer.reconcile_receipt IS NULL OR v_consumer.reconcile_epoch IS DISTINCT FROM p_epoch OR v_consumer.reconcile_receipt IS DISTINCT FROM p_expected_receipt OR v_consumer.reconcile_token IS DISTINCT FROM p_expected_token OR v_consumer.reconcile_work_generation IS DISTINCT FROM p_expected_work_generation THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM nuvemshop_intake.work w WHERE w.receipt_id=v_consumer.reconcile_receipt AND w.claim_token=v_consumer.reconcile_token AND w.generation=v_consumer.reconcile_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp()) THEN RETURN false; END IF;
  IF p_outcome='applied' AND (v_operation.epoch IS DISTINCT FROM p_epoch OR NOT v_operation.access_confirmed OR v_operation.status NOT IN ('active','reconciling')) THEN RETURN false; END IF;
  UPDATE nuvemshop_intake.dispatch_consumer c SET reconciled_epoch=CASE WHEN p_outcome='applied' THEN p_epoch ELSE c.reconciled_epoch END,
    reconcile_receipt=NULL,reconcile_token=NULL,reconcile_work_generation=NULL,reconcile_epoch=NULL,reconcile_uncertain=false
    WHERE c.store_id=p_store AND c.consumer_id=p_consumer;
  IF p_outcome='applied' THEN PERFORM nuvemshop_intake.complete_dispatch_reconciliation(p_store,p_consumer,p_epoch); END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION nuvemshop_intake.complete_dispatch_reconciliation(text,text,bigint),nuvemshop_intake.begin_dispatch_reconciliation(uuid,uuid,bigint,text,bigint),nuvemshop_intake.finish_dispatch_reconciliation(uuid,uuid,bigint,text,bigint,text),nuvemshop_intake.resolve_dispatch_reconciliation(text,text,bigint,text,uuid,uuid,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nuvemshop_intake.begin_dispatch_reconciliation(uuid,uuid,bigint,text,bigint),nuvemshop_intake.finish_dispatch_reconciliation(uuid,uuid,bigint,text,bigint,text) TO nuvemshop_intake_runtime;
GRANT EXECUTE ON FUNCTION nuvemshop_intake.resolve_dispatch_reconciliation(text,text,bigint,text,uuid,uuid,bigint) TO nuvemshop_intake_operator;
CREATE FUNCTION nuvemshop_intake.begin_dispatch_signal(p_id uuid,p_token uuid,p_work_generation bigint,p_consumer text)
RETURNS TABLE(status text,generation bigint,epoch bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_projection jsonb; v_store text; v_family text; v_resource text; v_epoch bigint; v_status text; v_reconciled bigint; v_gen bigint; v_completed boolean; v_target nuvemshop_intake.dispatch_target%ROWTYPE;
BEGIN
  PERFORM 1 FROM nuvemshop_intake.work WHERE receipt_id=p_id FOR UPDATE;
  SELECT r.projection INTO v_projection FROM nuvemshop_intake.work w JOIN nuvemshop_intake.receipts r ON r.attempt_id=w.receipt_id
    WHERE w.receipt_id=p_id AND w.claim_token=p_token AND w.generation=p_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp() AND r.family='business';
  IF NOT FOUND THEN RAISE EXCEPTION 'ownership lost' USING ERRCODE='P0001'; END IF;
  v_store:=v_projection->>'storeId'; v_family:=split_part(v_projection->>'event','/',1); v_resource:=v_projection->>'resourceId';
  INSERT INTO nuvemshop_intake.dispatch_operation(store_id) VALUES(v_store) ON CONFLICT DO NOTHING;
  SELECT o.status,o.epoch INTO v_status,v_epoch FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=v_store FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM nuvemshop_intake.work w WHERE w.receipt_id=p_id AND w.claim_token=p_token AND w.generation=p_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp()) THEN RAISE EXCEPTION 'ownership lost' USING ERRCODE='P0001'; END IF;
  SELECT c.reconciled_epoch INTO v_reconciled FROM nuvemshop_intake.dispatch_consumer c WHERE c.store_id=v_store AND c.consumer_id=p_consumer;
  IF NOT FOUND OR v_status NOT IN ('active','reconciling') OR v_reconciled IS DISTINCT FROM v_epoch THEN
    RETURN QUERY SELECT 'paused'::text,NULL::bigint,v_epoch; RETURN;
  END IF;
  INSERT INTO nuvemshop_intake.dispatch_target(store_id,consumer_id,family,resource_id) VALUES(v_store,p_consumer,v_family,v_resource) ON CONFLICT DO NOTHING;
  SELECT * INTO v_target FROM nuvemshop_intake.dispatch_target t WHERE t.store_id=v_store AND t.consumer_id=p_consumer AND t.family=v_family AND t.resource_id=v_resource FOR UPDATE;
  SELECT s.generation,s.completed INTO v_gen,v_completed FROM nuvemshop_intake.dispatch_signal s WHERE s.receipt_id=p_id AND s.consumer_id=p_consumer;
  IF NOT FOUND THEN
    v_gen:=v_target.pending_generation+1;
    UPDATE nuvemshop_intake.dispatch_target t SET pending_generation=v_gen WHERE t.store_id=v_store AND t.consumer_id=p_consumer AND t.family=v_family AND t.resource_id=v_resource;
    INSERT INTO nuvemshop_intake.dispatch_signal(receipt_id,consumer_id,store_id,family,resource_id,generation) VALUES(p_id,p_consumer,v_store,v_family,v_resource,v_gen);
  END IF;
  IF (v_family='order' AND COALESCE(v_completed,false)) OR (v_family='product' AND v_gen<=v_target.completed_generation) THEN RETURN QUERY SELECT 'completed'::text,v_gen,v_epoch; RETURN; END IF;
  IF v_target.uncertain THEN RETURN QUERY SELECT 'uncertain'::text,v_gen,v_epoch; RETURN; END IF;
  IF v_target.active_receipt IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM nuvemshop_intake.work w WHERE w.receipt_id=v_target.active_receipt AND w.claim_token=v_target.active_token AND w.generation=v_target.active_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp()) THEN
      RETURN QUERY SELECT 'busy'::text,v_gen,v_epoch; RETURN;
    END IF;
    UPDATE nuvemshop_intake.dispatch_target t SET uncertain=true WHERE t.store_id=v_store AND t.consumer_id=p_consumer AND t.family=v_family AND t.resource_id=v_resource;
    RETURN QUERY SELECT 'uncertain'::text,v_gen,v_epoch; RETURN;
  END IF;
  UPDATE nuvemshop_intake.dispatch_target t SET active_receipt=p_id,active_token=p_token,active_work_generation=p_work_generation,active_generation=v_gen WHERE t.store_id=v_store AND t.consumer_id=p_consumer AND t.family=v_family AND t.resource_id=v_resource;
  RETURN QUERY SELECT 'ready'::text,v_gen,v_epoch;
END $$;
CREATE FUNCTION nuvemshop_intake.finish_dispatch_signal(p_id uuid,p_token uuid,p_work_generation bigint,p_consumer text,p_target_generation bigint,p_epoch bigint,p_outcome text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_projection jsonb; v_store text; v_family text; v_resource text;
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('applied','retry_safe','indeterminate') THEN RAISE EXCEPTION 'invalid outcome' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM nuvemshop_intake.work WHERE receipt_id=p_id FOR UPDATE;
  SELECT r.projection INTO v_projection FROM nuvemshop_intake.work w JOIN nuvemshop_intake.receipts r ON r.attempt_id=w.receipt_id
    WHERE w.receipt_id=p_id AND w.claim_token=p_token AND w.generation=p_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp() AND r.family='business';
  IF NOT FOUND THEN RETURN false; END IF;
  v_store:=v_projection->>'storeId'; v_family:=split_part(v_projection->>'event','/',1); v_resource:=v_projection->>'resourceId';
  PERFORM 1 FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=v_store FOR UPDATE;
  PERFORM 1 FROM nuvemshop_intake.dispatch_target t WHERE t.store_id=v_store AND t.consumer_id=p_consumer AND t.family=v_family AND t.resource_id=v_resource FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM nuvemshop_intake.work w WHERE w.receipt_id=p_id AND w.claim_token=p_token AND w.generation=p_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp()) THEN RETURN false; END IF;
  UPDATE nuvemshop_intake.dispatch_target t SET
    completed_generation=CASE WHEN p_outcome='applied' THEN greatest(t.completed_generation,p_target_generation) ELSE t.completed_generation END,
    uncertain=(p_outcome='indeterminate'),
    active_receipt=CASE WHEN p_outcome='indeterminate' THEN t.active_receipt ELSE NULL END,
    active_token=CASE WHEN p_outcome='indeterminate' THEN t.active_token ELSE NULL END,
    active_work_generation=CASE WHEN p_outcome='indeterminate' THEN t.active_work_generation ELSE NULL END,
    active_generation=CASE WHEN p_outcome='indeterminate' THEN t.active_generation ELSE NULL END
  WHERE t.store_id=v_store AND t.consumer_id=p_consumer AND t.family=v_family AND t.resource_id=v_resource
    AND t.active_receipt=p_id AND t.active_token=p_token AND t.active_work_generation=p_work_generation AND t.active_generation=p_target_generation
    AND EXISTS(SELECT 1 FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=v_store AND o.epoch=p_epoch AND o.status IN ('active','reconciling') AND o.access_confirmed);
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_outcome='applied' THEN UPDATE nuvemshop_intake.dispatch_signal s SET completed=true WHERE s.receipt_id=p_id AND s.consumer_id=p_consumer AND s.generation=p_target_generation; END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION nuvemshop_intake.register_dispatch_consumer(text,text),nuvemshop_intake.get_dispatch_operation(text),nuvemshop_intake.apply_dispatch_lifecycle(uuid,uuid,bigint),nuvemshop_intake.record_dispatch_probe(text,bigint,text),nuvemshop_intake.begin_dispatch_signal(uuid,uuid,bigint,text),nuvemshop_intake.finish_dispatch_signal(uuid,uuid,bigint,text,bigint,bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nuvemshop_intake.register_dispatch_consumer(text,text),nuvemshop_intake.get_dispatch_operation(text),nuvemshop_intake.apply_dispatch_lifecycle(uuid,uuid,bigint),nuvemshop_intake.record_dispatch_probe(text,bigint,text),nuvemshop_intake.begin_dispatch_signal(uuid,uuid,bigint,text),nuvemshop_intake.finish_dispatch_signal(uuid,uuid,bigint,text,bigint,bigint,text) TO nuvemshop_intake_runtime;
-- Operator must establish canonical proof externally before resolving an uncertain effect.
-- Replay of any quarantined receipt remains a separate operator action.
CREATE FUNCTION nuvemshop_intake.resolve_dispatch_signal(p_store text,p_consumer text,p_family text,p_resource text,p_target_generation bigint,p_outcome text,p_expected_receipt uuid,p_expected_token uuid,p_expected_work_generation bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE v_target nuvemshop_intake.dispatch_target%ROWTYPE;
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('applied','retry_safe') THEN RAISE EXCEPTION 'invalid resolution' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=p_store FOR UPDATE;
  SELECT * INTO v_target FROM nuvemshop_intake.dispatch_target t WHERE t.store_id=p_store AND t.consumer_id=p_consumer AND t.family=p_family AND t.resource_id=p_resource FOR UPDATE;
  IF NOT FOUND OR v_target.active_generation IS DISTINCT FROM p_target_generation OR v_target.active_receipt IS NULL OR v_target.active_receipt IS DISTINCT FROM p_expected_receipt OR v_target.active_token IS DISTINCT FROM p_expected_token OR v_target.active_work_generation IS DISTINCT FROM p_expected_work_generation THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM nuvemshop_intake.work w WHERE w.receipt_id=v_target.active_receipt AND w.claim_token=v_target.active_token AND w.generation=v_target.active_work_generation AND w.state='processing' AND w.lease_until>clock_timestamp()) THEN RETURN false; END IF;
  UPDATE nuvemshop_intake.dispatch_target t SET
    completed_generation=CASE WHEN p_outcome='applied' THEN greatest(t.completed_generation,p_target_generation) ELSE t.completed_generation END,
    uncertain=false,active_receipt=NULL,active_token=NULL,active_work_generation=NULL,active_generation=NULL
    WHERE t.store_id=p_store AND t.consumer_id=p_consumer AND t.family=p_family AND t.resource_id=p_resource;
  IF p_outcome='applied' THEN UPDATE nuvemshop_intake.dispatch_signal s SET completed=true WHERE s.receipt_id=p_expected_receipt AND s.consumer_id=p_consumer AND s.generation=p_target_generation; END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION nuvemshop_intake.resolve_dispatch_signal(text,text,text,text,bigint,text,uuid,uuid,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nuvemshop_intake.resolve_dispatch_signal(text,text,text,text,bigint,text,uuid,uuid,bigint) TO nuvemshop_intake_operator;
-- Only after independently authorized and verified reinstallation/configuration.
-- This does not perform installation, probe access, reconcile consumers, or resolve uncertain effects.
CREATE FUNCTION nuvemshop_intake.authorize_dispatch_reinstallation(p_store text,p_expected_epoch bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  PERFORM 1 FROM nuvemshop_intake.dispatch_operation o WHERE o.store_id=p_store FOR UPDATE;
  UPDATE nuvemshop_intake.dispatch_operation o SET status='paused',epoch=o.epoch+1,
    resume_requested=true,access_confirmed=false,reason='REINSTALLATION_AUTHORIZED'
    WHERE o.store_id=p_store AND o.status='disconnected' AND o.epoch=p_expected_epoch;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION nuvemshop_intake.authorize_dispatch_reinstallation(text,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nuvemshop_intake.authorize_dispatch_reinstallation(text,bigint) TO nuvemshop_intake_operator;
RESET ROLE;
