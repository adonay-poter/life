-- Remove old Web Push pg_cron job
select cron.unschedule('invoke-push-hourly');

-- Drop the old Web Push helper function
drop function if exists public.invoke_push_notification();

-- Drop the Web Push subscriptions table
drop table if exists public.push_subscriptions;

-- Create a helper function to invoke the new Pushover Edge Function
create or replace function public.invoke_pushover_notification()
returns void
language plpgsql
security definer
as $$
declare
  request_id bigint;
begin
  -- Use pg_net to make an async HTTP POST request to the Pushover Edge Function
  select net.http_post(
      url:='https://olkecrtlffoqrttobosg.supabase.co/functions/v1/pushover-cron',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body:='{}'::jsonb
  ) into request_id;
end;
$$;

-- Schedule the Pushover job to run every hour
select cron.schedule(
  'invoke-pushover-hourly',
  '0 * * * *', -- Every hour on the hour
  'select public.invoke_pushover_notification();'
);
