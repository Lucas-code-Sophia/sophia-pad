-- Add out of stock tracking to menu items
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS out_of_stock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS out_of_stock_date DATE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_menu_items_out_of_stock ON menu_items(out_of_stock);
