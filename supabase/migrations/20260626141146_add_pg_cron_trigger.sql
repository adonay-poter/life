-- Enable the pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Create a helper function to invoke the edge function
create or replace function public.invoke_push_notification()
returns void
language plpgsql
security definer
as $$
declare
  request_id bigint;
begin
  -- Use pg_net to make an async HTTP POST request to the Edge Function
  -- Note: Replace the URL with your actual project URL or use local host for local dev
  select net.http_post(
      url:='https://olkecrtlffoqrttobosg.supabase.co/functions/v1/send-push',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body:='{"title": "Hulu Reminders", "message": "You have pending tasks, flashcards, or habits."}'::jsonb
  ) into request_id;
end;
$$;

-- Schedule the job to run every hour
select cron.schedule(
  'invoke-push-hourly',
  '0 * * * *', -- Every hour on the hour
  'select public.invoke_push_notification();'
);
