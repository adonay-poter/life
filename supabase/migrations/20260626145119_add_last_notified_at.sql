-- Add last_notified_at to tasks
alter table public.tasks add column if not exists last_notified_at timestamp with time zone;

-- Add last_notified_at to flashcards
alter table public.flashcards add column if not exists last_notified_at timestamp with time zone;

-- Add last_notified_at to inbox_items
alter table public.inbox_items add column if not exists last_notified_at timestamp with time zone;

-- Update the cron schedule to run every 15 minutes
select cron.unschedule('invoke-pushover-hourly');

select cron.schedule(
  'invoke-pushover-quarterly',
  '*/15 * * * *',
  'select public.invoke_pushover_notification();'
);
