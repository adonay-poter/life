-- Enable Row Level Security (RLS) on all dashboard tables
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated select" ON public.habits;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.habits;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.habits;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.habits;

DROP POLICY IF EXISTS "Allow authenticated select" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.projects;

DROP POLICY IF EXISTS "Allow authenticated select" ON public.lessons;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.lessons;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.lessons;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.lessons;

DROP POLICY IF EXISTS "Allow authenticated select" ON public.daily_logs;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.daily_logs;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.daily_logs;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.daily_logs;

DROP POLICY IF EXISTS "Allow authenticated select" ON public.habit_records;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.habit_records;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.habit_records;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.habit_records;

DROP POLICY IF EXISTS "Allow authenticated select" ON public.courses;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.courses;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.courses;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.courses;

DROP POLICY IF EXISTS "Allow authenticated select" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.tasks;

DROP POLICY IF EXISTS "Allow authenticated select" ON public.flashcards;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.flashcards;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.flashcards;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.flashcards;

DROP POLICY IF EXISTS "Allow authenticated select" ON public.journal_entries;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.journal_entries;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.journal_entries;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.journal_entries;

DROP POLICY IF EXISTS "Allow authenticated select" ON public.inbox_items;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.inbox_items;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.inbox_items;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.inbox_items;

DROP POLICY IF EXISTS "Allow authenticated select" ON public.course_modules;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.course_modules;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.course_modules;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.course_modules;

-- Create policies allowing full access to authenticated users only
-- Habits
CREATE POLICY "Allow authenticated select" ON public.habits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.habits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.habits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.habits FOR DELETE TO authenticated USING (true);

-- Projects
CREATE POLICY "Allow authenticated select" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.projects FOR DELETE TO authenticated USING (true);

-- Lessons
CREATE POLICY "Allow authenticated select" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.lessons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.lessons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.lessons FOR DELETE TO authenticated USING (true);

-- Daily Logs
CREATE POLICY "Allow authenticated select" ON public.daily_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.daily_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.daily_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.daily_logs FOR DELETE TO authenticated USING (true);

-- Habit Records
CREATE POLICY "Allow authenticated select" ON public.habit_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.habit_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.habit_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.habit_records FOR DELETE TO authenticated USING (true);

-- Courses
CREATE POLICY "Allow authenticated select" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.courses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.courses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.courses FOR DELETE TO authenticated USING (true);

-- Tasks
CREATE POLICY "Allow authenticated select" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.tasks FOR DELETE TO authenticated USING (true);

-- Flashcards
CREATE POLICY "Allow authenticated select" ON public.flashcards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.flashcards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.flashcards FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.flashcards FOR DELETE TO authenticated USING (true);

-- Journal Entries
CREATE POLICY "Allow authenticated select" ON public.journal_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.journal_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.journal_entries FOR DELETE TO authenticated USING (true);

-- Inbox Items
CREATE POLICY "Allow authenticated select" ON public.inbox_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.inbox_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.inbox_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.inbox_items FOR DELETE TO authenticated USING (true);

-- Course Modules
CREATE POLICY "Allow authenticated select" ON public.course_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON public.course_modules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.course_modules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete" ON public.course_modules FOR DELETE TO authenticated USING (true);
