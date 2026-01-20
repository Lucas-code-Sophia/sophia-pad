-- Add support for to_follow_1 and to_follow_2 statuses in order_items
-- This allows proper tracking of "à suivre" items across server shifts and devices

-- First, update existing to_follow items to to_follow_1 for backward compatibility
UPDATE public.order_items 
SET status = 'to_follow_1' 
WHERE status = 'to_follow';

-- Check if there are any other invalid statuses and fix them
UPDATE public.order_items 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'to_follow_1', 'to_follow_2', 'fired', 'completed');

-- Now drop and recreate the constraint
ALTER TABLE public.order_items 
DROP CONSTRAINT IF EXISTS order_items_status_check;

-- Add the new constraint with all supported statuses
ALTER TABLE public.order_items 
ADD CONSTRAINT order_items_status_check 
CHECK (status IN ('pending', 'to_follow_1', 'to_follow_2', 'fired', 'completed'));

-- Create indexes for better performance on to_follow queries
CREATE INDEX IF NOT EXISTS idx_order_items_to_follow_1 ON public.order_items(status) WHERE status = 'to_follow_1';
CREATE INDEX IF NOT EXISTS idx_order_items_to_follow_2 ON public.order_items(status) WHERE status = 'to_follow_2';

-- Add a column to track which server created the to_follow item (useful for shift changes)
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS created_by_server_id UUID REFERENCES public.users(id);

-- Create index for server queries
CREATE INDEX IF NOT EXISTS idx_order_items_created_by_server ON public.order_items(created_by_server_id) WHERE created_by_server_id IS NOT NULL;

-- Update existing to_follow items to to_follow_1 for backward compatibility
UPDATE public.order_items 
SET status = 'to_follow_1' 
WHERE status = 'to_follow';

-- Add comment for documentation
COMMENT ON COLUMN public.order_items.status IS 'Order status: pending (in cart), to_follow_1 (first service), to_follow_2 (second service), fired (sent to kitchen), completed';
COMMENT ON COLUMN public.order_items.created_by_server_id IS 'Server who initially added this item (useful for shift changes)';
