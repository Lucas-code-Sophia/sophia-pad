-- ═══════════════════════════════════════════════════════════════════════════
-- REQUÊTE SQL POUR RÉCUPÉRER LE SCHÉMA COMPLET
-- ═══════════════════════════════════════════════════════════════════════════
-- Copiez cette requête dans le SQL Editor de Supabase Dashboard
-- https://supabase.com/dashboard/project/geqxvlieqwrssuipypju
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    t.table_name as "Table",
    c.column_name as "Colonne",
    c.data_type as "Type",
    CASE 
        WHEN c.character_maximum_length IS NOT NULL 
        THEN c.character_maximum_length::text
        WHEN c.numeric_precision IS NOT NULL 
        THEN c.numeric_precision::text || ',' || c.numeric_scale::text
        ELSE ''
    END as "Taille/Précision",
    CASE WHEN c.is_nullable = 'NO' THEN '❌' ELSE '✅' END as "Nullable",
    COALESCE(c.column_default, '') as "Valeur par défaut",
    CASE 
        WHEN pk.column_name IS NOT NULL THEN '🔑 PK'
        ELSE ''
    END as "Clé primaire",
    CASE 
        WHEN fk.column_name IS NOT NULL THEN 
            '🔗 → ' || fk.foreign_table_name || '(' || fk.foreign_column_name || ')'
        ELSE ''
    END as "Clé étrangère"
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
        AND tc.table_schema = 'public'
) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku 
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;


