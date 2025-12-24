#!/usr/bin/env node

/**
 * Script pour récupérer le schéma complet de la base de données Supabase
 * Usage: node scripts/get_schema.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://geqxvlieqwrssuipypju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcXh2bGllcXdyc3N1aXB5cGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODI0ODMsImV4cCI6MjA3MDA1ODQ4M30.5aW8yfRTzeKSI7Y9JTs9WL9IASo5h-DzsWIbGUL3Xe0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getSchema() {
  console.log('🔍 Récupération du schéma de la base de données...\n');

  try {
    // 1. Liste des tables
    console.log('📋 TABLES:');
    console.log('='.repeat(80));
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          tableowner,
          hasindexes,
          hasrules,
          hastriggers
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `
    });

    if (tablesError) {
      // Si RPC n'existe pas, essayons une autre approche
      console.log('⚠️  RPC exec_sql non disponible, utilisation d\'une approche alternative...\n');
      
      // Utilisons les requêtes directes sur les tables système via une connexion directe
      // Pour cela, nous devons utiliser l'API REST directement
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          query: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log(JSON.stringify(tables, null, 2));
    console.log('\n');

    // 2. Colonnes détaillées
    console.log('📊 COLONNES:');
    console.log('='.repeat(80));
    const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          t.table_name,
          c.column_name,
          c.ordinal_position,
          c.data_type,
          c.character_maximum_length,
          c.is_nullable,
          c.column_default
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
        ORDER BY t.table_name, c.ordinal_position;
      `
    });

    if (!columnsError) {
      console.log(JSON.stringify(columns, null, 2));
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n💡 Note: Pour exécuter ces requêtes, vous devez:');
    console.log('   1. Aller dans le SQL Editor de Supabase Dashboard');
    console.log('   2. Copier le contenu de scripts/get_schema.sql');
    console.log('   3. Exécuter les requêtes une par une');
  }
}

// Fonction alternative qui génère un rapport formaté
async function generateSchemaReport() {
  console.log('📄 Génération du rapport de schéma...\n');
  
  // Cette fonction nécessite des permissions admin
  // Pour l'instant, affichons les instructions
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    RAPPORT DE SCHÉMA SUPABASE                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

Pour obtenir le schéma complet de votre base de données:

1. Allez sur https://supabase.com/dashboard/project/geqxvlieqwrssuipypju
2. Cliquez sur "SQL Editor" dans le menu de gauche
3. Copiez et exécutez les requêtes du fichier: scripts/get_schema.sql

OU utilisez cette requête complète dans le SQL Editor:

${await require('fs').promises.readFile('scripts/get_schema.sql', 'utf-8')}

═══════════════════════════════════════════════════════════════════════════════
  `);
}

// Exécution
if (require.main === module) {
  generateSchemaReport().catch(console.error);
}

module.exports = { getSchema, generateSchemaReport };


