-- Ajouter les colonnes out_of_stock et out_of_stock_date
ALTER TABLE menu_items 
ADD COLUMN out_of_stock BOOLEAN DEFAULT FALSE,
ADD COLUMN out_of_stock_date DATE;

-- Créer un index pour optimiser la recherche des articles en stock
CREATE INDEX idx_menu_items_out_of_stock ON menu_items(out_of_stock, out_of_stock_date);
