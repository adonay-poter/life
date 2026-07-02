-- Drop global unique constraint on daily_digests(date) if it exists, and replace with scoped unique key
ALTER TABLE public.daily_digests DROP CONSTRAINT IF EXISTS daily_digests_date_key;
ALTER TABLE public.daily_digests DROP CONSTRAINT IF EXISTS daily_digests_user_id_date_key;
ALTER TABLE public.daily_digests ADD CONSTRAINT daily_digests_user_id_date_key UNIQUE (user_id, date);

-- Add new columns to daily_digests to support output layer features
ALTER TABLE public.daily_digests ADD COLUMN IF NOT EXISTS journal_entries_count integer DEFAULT 0 NOT NULL;
ALTER TABLE public.daily_digests ADD COLUMN IF NOT EXISTS projects_touched_count integer DEFAULT 0 NOT NULL;
ALTER TABLE public.daily_digests ADD COLUMN IF NOT EXISTS tomorrow_inherits text;
ALTER TABLE public.daily_digests ADD COLUMN IF NOT EXISTS suggested_actions jsonb DEFAULT '[]'::jsonb NOT NULL;

-- Create review_entries table
CREATE TABLE IF NOT EXISTS public.review_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid DEFAULT auth.uid() NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    review_type text NOT NULL CHECK (review_type IN ('midday', 'evening', 'weekly')),
    review_date date NOT NULL,
    focus_text text,
    summary text,
    best_insight text,
    tomorrow_inherits text,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT review_entries_user_id_date_type_key UNIQUE (user_id, review_date, review_type)
);

-- Enable RLS on review_entries
ALTER TABLE public.review_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for review_entries
DROP POLICY IF EXISTS "Allow authenticated users access to own review_entries" ON public.review_entries;
CREATE POLICY "Allow authenticated users access to own review_entries" 
    ON public.review_entries 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Create review_queue_items table
CREATE TABLE IF NOT EXISTS public.review_queue_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid DEFAULT auth.uid() NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type text NOT NULL,
    item_id uuid NOT NULL,
    reason text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    suggested_action text,
    status text DEFAULT 'open'::text NOT NULL CHECK (status IN ('open', 'snoozed', 'resolved', 'archived')),
    snoozed_until timestamp with time zone,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT review_queue_items_user_item_key UNIQUE (user_id, item_type, item_id)
);

-- Enable RLS on review_queue_items
ALTER TABLE public.review_queue_items ENABLE ROW LEVEL SECURITY;

-- Create policy for review_queue_items
DROP POLICY IF EXISTS "Allow authenticated users access to own review_queue_items" ON public.review_queue_items;
CREATE POLICY "Allow authenticated users access to own review_queue_items" 
    ON public.review_queue_items 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS review_entries_user_id_idx ON public.review_entries(user_id);
CREATE INDEX IF NOT EXISTS review_entries_date_idx ON public.review_entries(review_date);
CREATE INDEX IF NOT EXISTS review_queue_items_user_id_idx ON public.review_queue_items(user_id);
CREATE INDEX IF NOT EXISTS review_queue_items_status_idx ON public.review_queue_items(status);
