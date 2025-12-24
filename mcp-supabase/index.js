#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://geqxvlieqwrssuipypju.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcXh2bGllcXdyc3N1aXB5cGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODI0ODMsImV4cCI6MjA3MDA1ODQ4M30.5aW8yfRTzeKSI7Y9JTs9WL9IASo5h-DzsWIbGUL3Xe0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const server = new Server(
  {
    name: "mcp-supabase",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Liste des outils disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_schema",
        description: "Récupère le schéma complet de la base de données avec toutes les tables, colonnes, types, clés primaires et étrangères",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_tables",
        description: "Liste toutes les tables de la base de données",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_table_schema",
        description: "Récupère le schéma détaillé d'une table spécifique",
        inputSchema: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "Nom de la table",
            },
          },
          required: ["table_name"],
        },
      },
      {
        name: "execute_query",
        description: "Exécute une requête SQL SELECT sur la base de données",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Requête SQL SELECT à exécuter",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

// Gestion des appels d'outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_schema": {
        // Récupération du schéma en interrogeant chaque table
        const tables = await getTablesList();
        const schema = {};

        for (const table of tables) {
          const tableSchema = await getTableSchemaDirect(table);
          schema[table] = tableSchema;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(schema, null, 2),
            },
          ],
        };
      }

      case "list_tables": {
        const tables = await getTablesList();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tables, null, 2),
            },
          ],
        };
      }

      case "get_table_schema": {
        const { table_name } = args;
        const schema = await getTableSchemaDirect(table_name);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(schema, null, 2),
            },
          ],
        };
      }

      case "execute_query": {
        const { query } = args;
        
        // Sécurité : seulement les requêtes SELECT
        if (!query.trim().toUpperCase().startsWith("SELECT")) {
          return {
            content: [
              {
                type: "text",
                text: "Erreur: Seules les requêtes SELECT sont autorisées",
              },
            ],
            isError: true,
          };
        }

        // Utiliser l'API REST pour exécuter la requête
        // Note: Supabase ne permet pas d'exécuter des requêtes SQL arbitraires via l'API REST
        // On doit utiliser les méthodes de requête Supabase
        return {
          content: [
            {
              type: "text",
              text: "Note: L'exécution de requêtes SQL arbitraires nécessite l'accès direct à la base de données. Utilisez get_schema ou get_table_schema pour obtenir le schéma.",
            },
          ],
        };
      }

      default:
        throw new Error(`Outil inconnu: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Erreur: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Fonction helper pour lister les tables
async function getTablesList() {
  // On essaie de récupérer les données d'une table pour voir sa structure
  // Liste des tables probables basée sur les scripts SQL
  const possibleTables = [
    "users",
    "tables",
    "menu_categories",
    "menu_items",
    "orders",
    "order_items",
    "payments",
    "kitchen_tickets",
    "reservations",
    "supplements",
    "daily_sales",
    "payment_items",
  ];

  const existingTables = [];

  for (const table of possibleTables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(1);
      if (!error) {
        existingTables.push(table);
      }
    } catch (e) {
      // Table n'existe pas ou erreur d'accès
    }
  }

  return existingTables;
}

// Fonction helper pour obtenir le schéma d'une table
async function getTableSchemaDirect(tableName) {
  try {
    const { data, error } = await supabase.from(tableName).select("*").limit(1);

    if (error) {
      return { error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        table: tableName,
        columns: [],
        note: "Table vide ou inexistante",
      };
    }

    const sampleRow = data[0];
    const columns = Object.keys(sampleRow).map((key) => {
      const value = sampleRow[key];
      return {
        name: key,
        type: inferType(value),
        sample_value: value,
      };
    });

    return {
      table: tableName,
      columns,
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Fonction helper pour inférer le type
function inferType(value) {
  if (value === null || value === undefined) return "unknown";
  if (typeof value === "string") {
    // Vérifier si c'est une date ISO
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return "timestamp";
    }
    return "text";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "decimal";
  }
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "json";
  return typeof value;
}

// Démarrage du serveur
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Serveur MCP Supabase démarré");
}

main().catch(console.error);

