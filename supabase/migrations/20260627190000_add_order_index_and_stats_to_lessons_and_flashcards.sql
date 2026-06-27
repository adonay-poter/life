-- Add order_index to lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- Add stats tracking to flashcards table
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS correct_reviews integer DEFAULT 0;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS total_reviews integer DEFAULT 0;
