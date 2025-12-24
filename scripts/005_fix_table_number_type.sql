-- Update table_number from INTEGER to TEXT to support T1, I1, C1 format
ALTER TABLE public.tables 
  ALTER COLUMN table_number TYPE TEXT;

-- Update kitchen_tickets table_number as well
ALTER TABLE public.kitchen_tickets 
  ALTER COLUMN table_number TYPE TEXT;

-- Drop the old unique constraint and recreate it
ALTER TABLE public.tables 
  DROP CONSTRAINT IF EXISTS tables_table_number_key;

ALTER TABLE public.tables 
  ADD CONSTRAINT tables_table_number_key UNIQUE (table_number);
