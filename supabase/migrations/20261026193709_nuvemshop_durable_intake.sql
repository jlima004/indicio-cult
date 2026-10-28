-- NUV-16 private durable intake. This migration does not provision credentials.
-- Both roles start NOLOGIN: enabling runtime login is a separate, reviewed
-- deployment operation. Never use an admin
-- account for the runtime. Name collisions fail rather than mutating a role.
-- No automatic down migration: preserve committed receipts when reverting code.
-- Cleanup/drop is permitted only after a separate retention/data-loss review.
CREATE ROLE nuvemshop_intake_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE nuvemshop_intake_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
-- PostgreSQL 17 CREATEROLE alone does not confer SET on a newly created role.
-- Give the migration authority explicit SET, without automatic inheritance,
-- only for this new ledger owner. Runtime never receives this membership.
GRANT nuvemshop_intake_owner TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
CREATE SCHEMA nuvemshop_intake AUTHORIZATION nuvemshop_intake_owner;
SET ROLE nuvemshop_intake_owner;
REVOKE ALL ON SCHEMA nuvemshop_intake FROM PUBLIC;
CREATE TABLE nuvemshop_intake.receipts (
  attempt_id uuid PRIMARY KEY,
  family text NOT NULL,
  contract_version smallint NOT NULL CHECK (contract_version = 1),
  classification text NOT NULL CHECK (classification IN ('received','ignored_unknown_event')),
  projection jsonb NOT NULL,
  retention_policy_key text NOT NULL,
  unknown_policy_key text,
  unknown_policy_version integer,
  intake_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  terminal_at timestamptz GENERATED ALWAYS AS (CASE WHEN classification = 'ignored_unknown_event' THEN intake_at END) STORED,
  work_id uuid GENERATED ALWAYS AS (CASE WHEN classification = 'received' THEN attempt_id END) STORED,
  incident_hold boolean NOT NULL DEFAULT false,
  UNIQUE (attempt_id,classification),
  CHECK ((
    (family = 'business' AND classification = 'received' AND retention_policy_key = 'business-v1') OR
    (family = 'lifecycle' AND classification = 'received' AND retention_policy_key = 'lifecycle-v1') OR
    (family = 'unknown' AND classification = 'ignored_unknown_event' AND retention_policy_key = 'unknown-v1')
  ) IS TRUE),
  CHECK ((
    (classification = 'received' AND unknown_policy_key IS NULL AND unknown_policy_version IS NULL) OR
    (classification = 'ignored_unknown_event' AND unknown_policy_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$' AND unknown_policy_version > 0)
  ) IS TRUE),
  CHECK ((
    jsonb_typeof(projection) = 'object' AND
    jsonb_typeof(projection->'event') = 'string' AND length(projection->>'event') <= 256 AND
    (projection->>'event') ~ '^[a-z][a-z0-9_]*/[a-z][a-z0-9_]*$' AND
    jsonb_typeof(projection->'storeId') = 'string' AND (projection->>'storeId') ~ '^[1-9][0-9]{0,39}$' AND
    jsonb_typeof(projection->'correlationId') = 'string' AND
    (projection->>'correlationId') ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$' AND
    (
      (family = 'business' AND (projection->>'event') IN ('product/updated','order/paid','order/fulfilled','order/cancelled') AND
        projection - ARRAY['event','storeId','correlationId','resourceId'] = '{}'::jsonb AND
        jsonb_typeof(projection->'resourceId') = 'string' AND (projection->>'resourceId') ~ '^[1-9][0-9]{0,39}$') OR
      (family = 'lifecycle' AND (projection->>'event') = 'app/uninstalled' AND
        projection - ARRAY['event','storeId','correlationId','appId'] = '{}'::jsonb AND
        jsonb_typeof(projection->'appId') = 'string' AND (projection->>'appId') ~ '^[1-9][0-9]{0,39}$') OR
      (family = 'lifecycle' AND (projection->>'event') IN ('app/suspended','app/resumed') AND
        projection - ARRAY['event','storeId','correlationId'] = '{}'::jsonb) OR
      (family = 'unknown' AND (projection->>'event') NOT IN (
        'product/updated','order/paid','order/fulfilled','order/cancelled','app/uninstalled','app/suspended','app/resumed',
        'app/store_redact','customer/redact','customers/data_request','store/redact','customers/redact') AND
        projection - ARRAY['event','storeId','correlationId'] = '{}'::jsonb)
    )
  ) IS TRUE)
);
CREATE TABLE nuvemshop_intake.work (
  receipt_id uuid PRIMARY KEY,
  required_classification text GENERATED ALWAYS AS ('received'::text) STORED,
  state text NOT NULL DEFAULT 'received' CHECK (state = 'received'),
  terminal_at timestamptz CHECK (terminal_at IS NULL),
  FOREIGN KEY (receipt_id,required_classification)
    REFERENCES nuvemshop_intake.receipts(attempt_id,classification)
    ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED
);
COMMENT ON COLUMN nuvemshop_intake.receipts.retention_policy_key IS
  'business-v1/lifecycle-v1/unknown-v1: retain at least 14 days from intake and 14 days from terminal, whichever is later; manual replay window 7 days from intake. No privacy policy. No purge job.';
COMMENT ON COLUMN nuvemshop_intake.receipts.incident_hold IS
  'A held receipt must never be purged. Runtime intake cannot change this metadata.';
COMMENT ON COLUMN nuvemshop_intake.work.state IS
  'Initial recoverable work only. Pending/in-flight/quarantine/incident-held work must never be purged; transitions and recovery belong to NUV-17.';
COMMENT ON COLUMN nuvemshop_intake.work.terminal_at IS
  'Initially null. Future terminal transitions must record this time for the 14-day terminal retention minimum. No purge allowed while work remains nonterminal.';
ALTER TABLE nuvemshop_intake.receipts ADD CONSTRAINT receipt_requires_work
  FOREIGN KEY (work_id) REFERENCES nuvemshop_intake.work(receipt_id)
  ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE nuvemshop_intake.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nuvemshop_intake.receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE nuvemshop_intake.work ENABLE ROW LEVEL SECURITY;
ALTER TABLE nuvemshop_intake.work FORCE ROW LEVEL SECURITY;
CREATE POLICY intake_read_receipts ON nuvemshop_intake.receipts FOR SELECT TO nuvemshop_intake_runtime USING (true);
CREATE POLICY intake_insert_receipts ON nuvemshop_intake.receipts FOR INSERT TO nuvemshop_intake_runtime WITH CHECK (true);
CREATE POLICY intake_read_work ON nuvemshop_intake.work FOR SELECT TO nuvemshop_intake_runtime USING (true);
CREATE POLICY intake_insert_work ON nuvemshop_intake.work FOR INSERT TO nuvemshop_intake_runtime WITH CHECK (true);
REVOKE ALL ON ALL TABLES IN SCHEMA nuvemshop_intake FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA nuvemshop_intake REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA nuvemshop_intake REVOKE ALL ON SEQUENCES FROM PUBLIC;
-- No functions needed. PUBLIC EXECUTE must be revoked explicitly on any future function;
-- schema-scoped default revoke alone cannot override global PUBLIC EXECUTE.
GRANT USAGE ON SCHEMA nuvemshop_intake TO nuvemshop_intake_runtime;
GRANT SELECT ON nuvemshop_intake.receipts,nuvemshop_intake.work TO nuvemshop_intake_runtime;
GRANT INSERT (attempt_id,family,contract_version,classification,projection,retention_policy_key,unknown_policy_key,unknown_policy_version)
  ON nuvemshop_intake.receipts TO nuvemshop_intake_runtime;
GRANT INSERT (receipt_id) ON nuvemshop_intake.work TO nuvemshop_intake_runtime;
-- Explicitly deny the API roles on these new objects only. The private schema
-- must remain absent from the remote Data API exposed-schema configuration.
DO $revoke_api_roles$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA nuvemshop_intake FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA nuvemshop_intake FROM %I', api_role);
    END IF;
  END LOOP;
END;
$revoke_api_roles$;
RESET ROLE;
