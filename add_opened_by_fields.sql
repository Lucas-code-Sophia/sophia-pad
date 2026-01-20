-- Ajouter les champs pour suivre qui a ouvert la table
ALTER TABLE tables 
ADD COLUMN opened_by TEXT REFERENCES users(id),
ADD COLUMN opened_by_name TEXT;

-- Créer un index pour optimiser les recherches par serveur
CREATE INDEX idx_tables_opened_by ON tables(opened_by);
