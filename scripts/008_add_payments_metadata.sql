-- Add metadata column to payments table to track split payment details
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN public.payments.metadata IS 'Stores split payment details: splitMode (full/equal/items) and itemIds for item-by-item payments';
