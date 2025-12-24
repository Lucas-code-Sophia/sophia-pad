# Serveur MCP Supabase

Serveur MCP (Model Context Protocol) pour interroger votre base de données Supabase.

## Installation

```bash
cd mcp-supabase
npm install
```

## Configuration dans Cursor

Ajoutez cette configuration dans les paramètres MCP de Cursor :

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/Users/lucascharles/Desktop/remix-of-restaurant-pos-app-v-2/mcp-supabase/index.js"]
    }
  }
}
```

## Outils disponibles

1. **get_schema** - Récupère le schéma complet de toutes les tables
2. **list_tables** - Liste toutes les tables de la base de données
3. **get_table_schema** - Récupère le schéma détaillé d'une table spécifique
4. **execute_query** - Exécute une requête SQL SELECT (limité)

## Utilisation

Le serveur MCP sera automatiquement disponible dans Cursor une fois configuré. Vous pourrez utiliser les outils pour interroger votre base de données Supabase.


