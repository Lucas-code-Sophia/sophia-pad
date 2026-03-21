-- Add optional details/description under menu item names (e.g. wines)
ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS details TEXT;

-- Example seed for quick visual test in ordering screen
-- Applied only when details are still empty.
UPDATE public.menu_items
SET details = 'Sec, rond et fruité'
WHERE lower(name) IN ('vin blanc', 'chardonnay')
  AND coalesce(trim(details), '') = '';
