-- Create research_jobs table to track AI generation and enable Q&A context
CREATE TABLE IF NOT EXISTS public.research_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'quick',
    status TEXT NOT NULL DEFAULT 'researching',
    progress INTEGER NOT NULL DEFAULT 0,
    progress_message TEXT,
    sources JSONB DEFAULT '[]'::jsonb,
    raw_research TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.research_jobs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (matching the rest of the application)
CREATE POLICY "Allow anonymous full access to research_jobs" 
    ON public.research_jobs 
    FOR ALL 
    TO anon 
    USING (true) 
    WITH CHECK (true);

-- Index for querying by course_id (used for Q&A)
CREATE INDEX IF NOT EXISTS research_jobs_course_id_idx ON public.research_jobs(course_id);
