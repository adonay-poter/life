CREATE TABLE IF NOT EXISTS public.activity_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid DEFAULT auth.uid() NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users access to own activity_events" ON public.activity_events;
CREATE POLICY "Allow authenticated users access to own activity_events"
    ON public.activity_events
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS activity_events_user_id_idx ON public.activity_events(user_id);
CREATE INDEX IF NOT EXISTS activity_events_created_at_idx ON public.activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_event_type_idx ON public.activity_events(event_type);
CREATE INDEX IF NOT EXISTS activity_events_entity_type_idx ON public.activity_events(entity_type);

COMMENT ON TABLE public.activity_events IS 'Compact activity/change log used to regenerate Soul Blueprint snapshots without rescanning the entire system.';

CREATE TABLE IF NOT EXISTS public.soul_blueprint_snapshots (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid DEFAULT auth.uid() NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version integer DEFAULT 1 NOT NULL,
    content_markdown text NOT NULL,
    content_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    core_markdown text,
    projects_markdown text,
    learning_markdown text,
    journal_markdown text,
    review_markdown text,
    token_estimate integer,
    source_hash text,
    last_event_id uuid REFERENCES public.activity_events(id) ON DELETE SET NULL,
    window_start timestamp with time zone,
    window_end timestamp with time zone,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.soul_blueprint_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users access to own soul_blueprint_snapshots" ON public.soul_blueprint_snapshots;
CREATE POLICY "Allow authenticated users access to own soul_blueprint_snapshots"
    ON public.soul_blueprint_snapshots
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS soul_blueprint_snapshots_user_generated_at_idx
    ON public.soul_blueprint_snapshots(user_id, generated_at DESC);

COMMENT ON TABLE public.soul_blueprint_snapshots IS 'Generated AI context snapshots for Soul Blueprint. Supabase tables remain the source of truth.';

CREATE OR REPLACE FUNCTION private.invoke_soul_blueprint_generation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, net, vault, pg_temp
AS $$
DECLARE
  project_url text;
  cron_secret text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret
  INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  LIMIT 1;

  SELECT decrypted_secret
  INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'soul_blueprint_cron_secret'
  LIMIT 1;

  IF project_url IS NULL OR cron_secret IS NULL THEN
    RAISE NOTICE 'Soul Blueprint cron not scheduled: set vault secrets project_url and soul_blueprint_cron_secret first.';
    RETURN;
  END IF;

  SELECT net.http_post(
      url := project_url || '/functions/v1/generate-soul-blueprint',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', cron_secret
      ),
      body := '{"mode":"scheduled"}'::jsonb
  ) INTO request_id;
END;
$$;

REVOKE ALL ON FUNCTION private.invoke_soul_blueprint_generation() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.invoke_soul_blueprint_generation() FROM anon;
REVOKE ALL ON FUNCTION private.invoke_soul_blueprint_generation() FROM authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('invoke-soul-blueprint-hourly');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

DO $$
DECLARE
  has_project_url boolean;
  has_cron_secret boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url'
  ) INTO has_project_url;

  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'soul_blueprint_cron_secret'
  ) INTO has_cron_secret;

  IF has_project_url AND has_cron_secret THEN
    PERFORM cron.schedule(
      'invoke-soul-blueprint-hourly',
      '15 * * * *',
      'select private.invoke_soul_blueprint_generation();'
    );
  ELSE
    RAISE NOTICE 'Skipped scheduling Soul Blueprint cron. Add vault secrets project_url and soul_blueprint_cron_secret, then rerun the schedule statement.';
  END IF;
END;
$$;
