-- Add is_complimentary flag to order_items to track free items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS is_complimentary BOOLEAN NOT NULL DEFAULT false;

-- Create index for complimentary items queries
CREATE INDEX IF NOT EXISTS idx_order_items_complimentary ON public.order_items(is_complimentary) WHERE is_complimentary = true;

-- Add complimentary_reason column to track why items were offered
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS complimentary_reason TEXT;

ALTER TABLE public.supplements 
ADD COLUMN IF NOT EXISTS complimentary_reason TEXT;
