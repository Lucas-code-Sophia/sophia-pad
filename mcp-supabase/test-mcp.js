#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMCPServer() {
  console.log("🧪 Test du serveur MCP Supabase...\n");

  // Démarrer le serveur MCP
  const serverProcess = spawn("node", [join(__dirname, "index.js")], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  const transport = new StdioClientTransport({
    command: "node",
    args: [join(__dirname, "index.js")],
  });

  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    console.log("✅ Connexion au serveur MCP établie\n");

    // Test 1: Lister les outils
    console.log("📋 Test 1: Liste des outils disponibles");
    const tools = await client.listTools();
    console.log(`   ✅ ${tools.tools.length} outils trouvés:`);
    tools.tools.forEach((tool) => {
      console.log(`      - ${tool.name}: ${tool.description}`);
    });
    console.log("");

    // Test 2: Lister les tables
    console.log("📋 Test 2: Liste des tables");
    const tablesResult = await client.callTool({
      name: "list_tables",
      arguments: {},
    });
    console.log("   Résultat:");
    console.log(JSON.stringify(JSON.parse(tablesResult.content[0].text), null, 2));
    console.log("");

    // Test 3: Obtenir le schéma d'une table
    console.log("📋 Test 3: Schéma de la table 'users'");
    const schemaResult = await client.callTool({
      name: "get_table_schema",
      arguments: { table_name: "users" },
    });
    console.log("   Résultat:");
    console.log(JSON.stringify(JSON.parse(schemaResult.content[0].text), null, 2));
    console.log("");

    // Test 4: Obtenir le schéma complet
    console.log("📋 Test 4: Schéma complet de la base de données");
    const fullSchemaResult = await client.callTool({
      name: "get_schema",
      arguments: {},
    });
    const fullSchema = JSON.parse(fullSchemaResult.content[0].text);
    console.log(`   ✅ Schéma récupéré pour ${Object.keys(fullSchema).length} tables`);
    Object.keys(fullSchema).forEach((table) => {
      const cols = fullSchema[table].columns || [];
      console.log(`      - ${table}: ${cols.length} colonnes`);
    });

    console.log("\n✅ Tous les tests sont passés avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors du test:", error);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

testMCPServer().catch(console.error);





