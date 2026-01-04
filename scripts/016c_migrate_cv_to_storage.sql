-- Migration pour passer de cv_base64 à cv_file_path
-- À exécuter si vous avez déjà des données avec cv_base64

-- Ajouter la nouvelle colonne si elle n'existe pas
ALTER TABLE applicants ADD COLUMN IF NOT EXISTS cv_file_path TEXT DEFAULT '';

-- Optionnel: Supprimer l'ancienne colonne cv_base64 après migration
-- ALTER TABLE applicants DROP COLUMN IF EXISTS cv_base64;

-- Note: Les données existantes avec cv_base64 devront être migrées manuellement
-- ou vous pouvez conserver les deux colonnes pendant la transition

SELECT 'Migration script executed - cv_file_path column added to applicants table';
