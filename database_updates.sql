-- ========================================
-- MISES À JOUR DE LA BASE DE DONNÉES SUPABASE
-- ========================================

-- 1. Ajouter les champs pour suivre qui a ouvert la table (utilise UUID pour la clé étrangère)
ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS opened_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS opened_by_name TEXT;

-- 2. Ajouter le champ pour suivre qui a ajouté un article dans order_items (utilise UUID pour la clé étrangère)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS created_by_server_id UUID REFERENCES users(id);

-- 3. Ajouter les champs pour suivre les articles offerts dans les statistiques
ALTER TABLE daily_sales 
ADD COLUMN IF NOT EXISTS complimentary_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS complimentary_count INTEGER DEFAULT 0;

-- 4. Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_tables_opened_by ON tables(opened_by);
CREATE INDEX IF NOT EXISTS idx_order_items_created_by_server_id ON order_items(created_by_server_id);
CREATE INDEX IF NOT EXISTS idx_daily_sales_complimentary ON daily_sales(date, server_id);

-- 5. Mettre à jour les tables existantes (optionnel)
-- Décommentez si vous voulez nettoyer les données existantes
-- UPDATE tables SET opened_by = NULL, opened_by_name = NULL WHERE opened_by IS NOT NULL;
-- UPDATE order_items SET created_by_server_id = NULL WHERE created_by_server_id IS NOT NULL;
-- UPDATE daily_sales SET complimentary_amount = 0, complimentary_count = 0 WHERE complimentary_amount IS NOT NULL;

-- ========================================
-- VÉRIFICATION
-- ========================================

-- Vérifier que les colonnes ont été ajoutées
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('tables', 'order_items', 'daily_sales') 
AND column_name IN ('opened_by', 'opened_by_name', 'created_by_server_id', 'complimentary_amount', 'complimentary_count')
ORDER BY table_name, column_name;
