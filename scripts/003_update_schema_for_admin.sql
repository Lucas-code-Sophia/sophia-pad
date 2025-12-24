-- Add location field to tables (T=Terrace, I=Interior, C=Canapé)
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'I' CHECK (location IN ('T', 'I', 'C'));

-- Add tax_rate field to menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00;

-- Add routing field to menu_items (kitchen or bar)
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS routing TEXT NOT NULL DEFAULT 'kitchen' CHECK (routing IN ('kitchen', 'bar'));

-- Create print_settings table
CREATE TABLE IF NOT EXISTS public.print_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sales_records table for daily tracking
CREATE TABLE IF NOT EXISTS public.sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.print_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on print_settings" ON public.print_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on sales_records" ON public.sales_records FOR ALL USING (true) WITH CHECK (true);

-- Insert default print settings
INSERT INTO public.print_settings (setting_key, setting_value) 
VALUES 
  ('kitchen_printer', '{"enabled": true, "printer_name": "Kitchen Printer", "copies": 1}'::jsonb),
  ('bar_printer', '{"enabled": true, "printer_name": "Bar Printer", "copies": 1}'::jsonb),
  ('receipt_printer', '{"enabled": true, "printer_name": "Receipt Printer", "copies": 1}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
