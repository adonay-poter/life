-- Remove anonymous access to research jobs. The app is auth-gated, so this
-- table should follow the authenticated-only policy model used elsewhere.
DROP POLICY IF EXISTS "Allow anonymous full access to research_jobs" ON public.research_jobs;

DROP POLICY IF EXISTS "Allow authenticated select" ON public.research_jobs;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.research_jobs;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.research_jobs;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.research_jobs;

CREATE POLICY "Allow authenticated select"
ON public.research_jobs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert"
ON public.research_jobs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
ON public.research_jobs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
ON public.research_jobs
FOR DELETE
TO authenticated
USING (true);

-- SECURITY DEFINER functions should not live in exposed schemas. Move the
-- cron helper out of public and reschedule the job to call the private copy.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

CREATE OR REPLACE FUNCTION private.invoke_pushover_notification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, net, pg_temp
AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT net.http_post(
      url := 'https://olkecrtlffoqrttobosg.supabase.co/functions/v1/pushover-cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
  ) INTO request_id;
END;
$$;

REVOKE ALL ON FUNCTION private.invoke_pushover_notification() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.invoke_pushover_notification() FROM anon;
REVOKE ALL ON FUNCTION private.invoke_pushover_notification() FROM authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('invoke-pushover-hourly');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('invoke-pushover-quarterly');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

SELECT cron.schedule(
  'invoke-pushover-hourly',
  '0 * * * *',
  'select private.invoke_pushover_notification();'
);

DROP FUNCTION IF EXISTS public.invoke_pushover_notification();
