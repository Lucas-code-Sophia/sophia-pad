-- Create inventory table for stock management
-- This allows tracking stock levels for menu items

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to ensure one inventory record per menu item
ALTER TABLE public.inventory 
ADD CONSTRAINT inventory_menu_item_unique 
UNIQUE (menu_item_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_menu_item ON public.inventory(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON public.inventory(quantity) WHERE quantity = 0;

-- Add comment for documentation
COMMENT ON TABLE public.inventory IS 'Stock management for menu items. One record per menu item.';
COMMENT ON COLUMN public.inventory.quantity IS 'Current stock level. 0 means out of stock.';
COMMENT ON COLUMN public.inventory.last_updated IS 'Last time the stock was modified.';
COMMENT ON COLUMN public.inventory.created_by IS 'Admin who initially created this inventory record.';

-- Enable Row Level Security
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (since we're using PIN auth, not Supabase auth)
CREATE POLICY "Allow all operations on inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
