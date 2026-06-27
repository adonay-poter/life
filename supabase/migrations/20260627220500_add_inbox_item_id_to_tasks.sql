-- Add inbox_item_id column to tasks table to trace back task origin
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS inbox_item_id UUID;
