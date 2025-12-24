# Récupération du Schéma de la Base de Données

Ce dossier contient plusieurs outils pour récupérer le schéma complet de votre base de données Supabase.

## 🚀 Méthode Rapide (Recommandée)

### Option 1: SQL Editor Supabase

1. Allez sur le [Dashboard Supabase](https://supabase.com/dashboard/project/geqxvlieqwrssuipypju)
2. Cliquez sur **"SQL Editor"** dans le menu de gauche
3. Copiez et collez cette requête :

```sql
-- Schéma complet de la base de données
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable,
    c.column_default,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'PK'
        ELSE ''
    END as is_primary_key,
    CASE 
        WHEN fk.column_name IS NOT NULL THEN 
            fk.foreign_table_name || '(' || fk.foreign_column_name || ')'
        ELSE ''
    END as foreign_key
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
LEFT JOIN (
    SELECT 
        ku.table_name,
        ku.column_name,
        ccu.table_name as foreign_table_name,
        ccu.column_name as foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku 
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku 
        ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;
```

4. Cliquez sur **"Run"** pour exécuter la requête
5. Exportez les résultats en CSV ou copiez-les

## 📁 Fichiers Disponibles

### `get_schema_simple.sql`
Requête SQL simplifiée avec deux vues :
- Vue d'ensemble des tables avec leurs colonnes
- Détails complets avec types, contraintes, clés étrangères

### `get_schema.sql`
Requête SQL complète qui récupère :
- Liste de toutes les tables
- Détails des colonnes
- Contraintes de clés étrangères
- Indexes
- Contraintes CHECK
- Politiques RLS (Row Level Security)
- Séquences

### `get_schema.py`
Script Python qui tente de récupérer le schéma via l'API REST (limité).

### `get_schema.js`
Script Node.js pour récupérer le schéma (nécessite des permissions spéciales).

## 🔑 Informations de Connexion

- **URL Supabase**: `https://geqxvlieqwrssuipypju.supabase.co`
- **Anon Key**: Configurée dans les scripts

## 💡 Note

Pour obtenir le schéma complet avec toutes les métadonnées (contraintes, index, RLS), la méthode recommandée est d'utiliser le **SQL Editor** de Supabase Dashboard car il a accès direct aux tables système PostgreSQL (`information_schema` et `pg_*`).


