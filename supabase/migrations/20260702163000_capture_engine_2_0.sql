-- Alter inbox_items table
ALTER TABLE public.inbox_items DROP CONSTRAINT IF EXISTS inbox_items_type_check;
ALTER TABLE public.inbox_items DROP CONSTRAINT IF EXISTS inbox_items_status_check;

-- Add new columns to inbox_items
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS ai_suggested_type text;
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS ai_suggested_destination text;
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS ai_suggested_action text;
ALTER TABLE public.inbox_items ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;

-- Add updated check constraints to inbox_items
ALTER TABLE public.inbox_items ADD CONSTRAINT inbox_items_type_check 
    CHECK (type = ANY (ARRAY['text'::text, 'url'::text, 'snippet'::text, 'thought'::text, 'idea'::text, 'task'::text, 'photo'::text, 'quote'::text, 'code'::text, 'question'::text, 'journal'::text, 'book_note'::text, 'course_note'::text, 'decision'::text, 'resource'::text]));

ALTER TABLE public.inbox_items ADD CONSTRAINT inbox_items_status_check 
    CHECK (status = ANY (ARRAY['unprocessed'::text, 'processed'::text, 'snoozed'::text, 'archived'::text, 'unsorted'::text, 'task'::text, 'academy'::text, 'knowledge'::text]));

-- Migrate existing inbox items
UPDATE public.inbox_items SET status = 'unprocessed' WHERE status = 'unsorted';
UPDATE public.inbox_items SET status = 'processed' WHERE status IN ('task', 'academy', 'knowledge');

-- Create processing_actions table
CREATE TABLE IF NOT EXISTS public.processing_actions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    inbox_item_id uuid REFERENCES public.inbox_items(id) ON DELETE CASCADE,
    action_type text NOT NULL,
    target_type text,
    target_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on processing_actions
ALTER TABLE public.processing_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for processing_actions
DROP POLICY IF EXISTS "Allow authenticated users access to own processing_actions" ON public.processing_actions;
CREATE POLICY "Allow authenticated users access to own processing_actions" 
    ON public.processing_actions 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Create knowledge_items table
CREATE TABLE IF NOT EXISTS public.knowledge_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    title text NOT NULL,
    content text,
    type text,
    source_url text,
    topic text,
    summary text,
    created_from_inbox_item_id uuid REFERENCES public.inbox_items(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on knowledge_items
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;

-- Create policies for knowledge_items
DROP POLICY IF EXISTS "Allow authenticated users access to own knowledge_items" ON public.knowledge_items;
CREATE POLICY "Allow authenticated users access to own knowledge_items" 
    ON public.knowledge_items 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Create object_links table
CREATE TABLE IF NOT EXISTS public.object_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    relationship_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on object_links
ALTER TABLE public.object_links ENABLE ROW LEVEL SECURITY;

-- Create policies for object_links
DROP POLICY IF EXISTS "Allow authenticated users access to own object_links" ON public.object_links;
CREATE POLICY "Allow authenticated users access to own object_links" 
    ON public.object_links 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Create daily_digests table
CREATE TABLE IF NOT EXISTS public.daily_digests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    date date NOT NULL UNIQUE,
    summary text,
    captured_count integer DEFAULT 0 NOT NULL,
    processed_count integer DEFAULT 0 NOT NULL,
    knowledge_count integer DEFAULT 0 NOT NULL,
    tasks_created_count integer DEFAULT 0 NOT NULL,
    flashcards_created_count integer DEFAULT 0 NOT NULL,
    open_questions text[] DEFAULT '{}'::text[] NOT NULL,
    important_insights text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on daily_digests
ALTER TABLE public.daily_digests ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_digests
DROP POLICY IF EXISTS "Allow authenticated users access to own daily_digests" ON public.daily_digests;
CREATE POLICY "Allow authenticated users access to own daily_digests" 
    ON public.daily_digests 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
