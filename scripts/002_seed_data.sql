-- Insert sample users
INSERT INTO public.users (name, pin, role) VALUES
  ('Server 1', '1234', 'server'),
  ('Server 2', '5678', 'server'),
  ('Manager', '9999', 'manager')
ON CONFLICT DO NOTHING;

-- Insert sample tables (110 seats total)
INSERT INTO public.tables (table_number, seats, position_x, position_y, status) VALUES
  -- Section 1: 2-seaters
  (1, 2, 50, 50, 'available'),
  (2, 2, 150, 50, 'available'),
  (3, 2, 250, 50, 'available'),
  (4, 2, 350, 50, 'available'),
  (5, 2, 450, 50, 'available'),
  -- Section 2: 4-seaters
  (6, 4, 50, 150, 'available'),
  (7, 4, 200, 150, 'available'),
  (8, 4, 350, 150, 'available'),
  (9, 4, 500, 150, 'available'),
  (10, 4, 50, 250, 'available'),
  (11, 4, 200, 250, 'available'),
  (12, 4, 350, 250, 'available'),
  (13, 4, 500, 250, 'available'),
  -- Section 3: 6-seaters
  (14, 6, 50, 350, 'available'),
  (15, 6, 250, 350, 'available'),
  (16, 6, 450, 350, 'available'),
  -- Section 4: 8-seaters
  (17, 8, 50, 450, 'available'),
  (18, 8, 300, 450, 'available'),
  -- Section 5: Large tables
  (19, 10, 150, 550, 'available'),
  (20, 12, 400, 550, 'available')
ON CONFLICT DO NOTHING;

-- Insert menu categories
INSERT INTO public.menu_categories (name, type, sort_order) VALUES
  ('Entrées', 'food', 1),
  ('Plats', 'food', 2),
  ('Desserts', 'food', 3),
  ('Vins', 'drink', 4),
  ('Bières', 'drink', 5),
  ('Cocktails', 'drink', 6),
  ('Softs', 'drink', 7)
ON CONFLICT DO NOTHING;

-- Insert sample menu items
INSERT INTO public.menu_items (category_id, name, price, type)
SELECT 
  c.id,
  item.name,
  item.price,
  c.type
FROM public.menu_categories c
CROSS JOIN LATERAL (
  VALUES
    -- Entrées
    ('Salade César', 12.50),
    ('Soupe du jour', 8.00),
    ('Carpaccio de boeuf', 14.00),
    ('Tartare de saumon', 15.50)
) AS item(name, price)
WHERE c.name = 'Entrées'

UNION ALL

SELECT 
  c.id,
  item.name,
  item.price,
  c.type
FROM public.menu_categories c
CROSS JOIN LATERAL (
  VALUES
    -- Plats
    ('Steak frites', 24.00),
    ('Saumon grillé', 26.50),
    ('Risotto aux champignons', 19.00),
    ('Burger maison', 18.50),
    ('Pâtes carbonara', 16.00)
) AS item(name, price)
WHERE c.name = 'Plats'

UNION ALL

SELECT 
  c.id,
  item.name,
  item.price,
  c.type
FROM public.menu_categories c
CROSS JOIN LATERAL (
  VALUES
    -- Desserts
    ('Tiramisu', 8.50),
    ('Crème brûlée', 7.50),
    ('Tarte tatin', 9.00),
    ('Mousse au chocolat', 7.00)
) AS item(name, price)
WHERE c.name = 'Desserts'

UNION ALL

SELECT 
  c.id,
  item.name,
  item.price,
  c.type
FROM public.menu_categories c
CROSS JOIN LATERAL (
  VALUES
    -- Vins
    ('Bordeaux rouge', 6.50),
    ('Chardonnay', 7.00),
    ('Rosé de Provence', 6.00),
    ('Champagne', 12.00)
) AS item(name, price)
WHERE c.name = 'Vins'

UNION ALL

SELECT 
  c.id,
  item.name,
  item.price,
  c.type
FROM public.menu_categories c
CROSS JOIN LATERAL (
  VALUES
    -- Bières
    ('Pression 25cl', 4.50),
    ('Pression 50cl', 7.50),
    ('Bière artisanale', 6.50)
) AS item(name, price)
WHERE c.name = 'Bières'

UNION ALL

SELECT 
  c.id,
  item.name,
  item.price,
  c.type
FROM public.menu_categories c
CROSS JOIN LATERAL (
  VALUES
    -- Cocktails
    ('Mojito', 9.50),
    ('Margarita', 10.00),
    ('Gin Tonic', 8.50),
    ('Spritz', 8.00)
) AS item(name, price)
WHERE c.name = 'Cocktails'

UNION ALL

SELECT 
  c.id,
  item.name,
  item.price,
  c.type
FROM public.menu_categories c
CROSS JOIN LATERAL (
  VALUES
    -- Softs
    ('Coca-Cola', 3.50),
    ('Eau minérale', 3.00),
    ('Jus d''orange', 4.00),
    ('Café', 2.50)
) AS item(name, price)
WHERE c.name = 'Softs'
ON CONFLICT DO NOTHING;
