-- Create daily_sales table to track revenue per day
CREATE TABLE IF NOT EXISTS public.daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  server_id UUID NOT NULL REFERENCES public.users(id),
  server_name TEXT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)
);

-- Enable Row Level Security
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow all operations on daily_sales" ON public.daily_sales FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON public.daily_sales(date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_server ON public.daily_sales(server_id);
