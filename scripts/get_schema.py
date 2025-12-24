#!/usr/bin/env python3
"""
Script Python pour récupérer le schéma de la base de données Supabase
Usage: python3 scripts/get_schema.py
"""

import requests
import json
from typing import Dict, Any

SUPABASE_URL = "https://geqxvlieqwrssuipypju.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcXh2bGllcXdyc3N1aXB5cGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODI0ODMsImV4cCI6MjA3MDA1ODQ4M30.5aW8yfRTzeKSI7Y9JTs9WL9IASo5h-DzsWIbGUL3Xe0"

def get_table_info() -> Dict[str, Any]:
    """Récupère les informations sur toutes les tables"""
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    
    # Note: Pour obtenir le schéma complet, vous devez utiliser le SQL Editor
    # ou avoir accès à la base de données directement
    # Cette fonction montre comment interroger les tables via l'API REST
    
    print("📋 Liste des tables accessibles via l'API REST:")
    print("=" * 80)
    
    # Exemple: récupérer les données d'une table pour voir sa structure
    tables_to_check = [
        "users",
        "tables", 
        "menu_categories",
        "menu_items",
        "orders",
        "order_items",
        "payments",
        "kitchen_tickets"
    ]
    
    schema_info = {}
    
    for table in tables_to_check:
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{table}?limit=1",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if data:
                    # Inférer la structure depuis les données
                    schema_info[table] = {
                        "columns": list(data[0].keys()) if data else [],
                        "sample_data": data[0] if data else None
                    }
                    print(f"✅ {table}: {len(schema_info[table]['columns'])} colonnes")
                else:
                    print(f"⚠️  {table}: Table vide")
            elif response.status_code == 404:
                print(f"❌ {table}: Table non trouvée")
            else:
                print(f"⚠️  {table}: Erreur {response.status_code}")
        except Exception as e:
            print(f"❌ {table}: Erreur - {str(e)}")
    
    return schema_info

def print_schema_report():
    """Affiche un rapport formaté"""
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║              RÉCUPÉRATION DU SCHÉMA SUPABASE                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

Pour obtenir le schéma COMPLET de votre base de données, vous avez 2 options:

OPTION 1: SQL Editor Supabase (RECOMMANDÉ)
───────────────────────────────────────────
1. Allez sur: https://supabase.com/dashboard/project/geqxvlieqwrssuipypju
2. Cliquez sur "SQL Editor" dans le menu de gauche
3. Copiez et exécutez le contenu de: scripts/get_schema_simple.sql

OPTION 2: Requête SQL directe
──────────────────────────────
Exécutez cette requête dans le SQL Editor:

SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'PK'
        ELSE ''
    END as is_primary_key
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku 
        ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

═══════════════════════════════════════════════════════════════════════════════
    """)

if __name__ == "__main__":
    print_schema_report()
    print("\n")
    schema_info = get_table_info()
    
    print("\n" + "=" * 80)
    print("📊 Détails des colonnes détectées:")
    print("=" * 80)
    
    for table, info in schema_info.items():
        print(f"\n📋 Table: {table}")
        for col in info["columns"]:
            print(f"   - {col}")


