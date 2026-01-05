-- Politiques RLS simplifiées pour la table applicants (temporaire pour debug)

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Only managers can access candidates" ON applicants;
DROP POLICY IF EXISTS "Only managers can insert candidates" ON applicants;
DROP POLICY IF EXISTS "Only managers can update candidates" ON applicants;
DROP POLICY IF EXISTS "Only managers can delete candidates" ON applicants;

-- Politique temporaire : permettre tout accès (pour debug)
CREATE POLICY "Allow all access for debugging" ON applicants
    FOR ALL USING (true);

-- Alternative : Permettre l'accès depuis les routes API de Next.js
-- CREATE POLICY "Allow access from Next.js API routes" ON applicants
--     FOR ALL USING (
--         current_setting('request.headers')::text ILIKE '%nextjs%' OR
--         current_setting('request.headers', true)::text ILIKE '%api%'
--     );

-- Alternative : Permettre l'accès si aucune authentification (pour les API routes)
-- CREATE POLICY "Allow unauthenticated access for API routes" ON applicants
--     FOR ALL USING (auth.uid() IS NULL);

SELECT 'RLS policies updated for applicants table';
