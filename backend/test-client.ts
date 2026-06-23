import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function main() {
  console.log("Connecting to OstapMemory MCP SSE...");
  const transport = new SSEClientTransport(new URL('http://localhost:3001/mcp/sse'));
  
  const client = new Client(
    {
      name: "TestClient",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  console.log("Connected successfully!");

  const resources = await client.listResources();
  console.log("Available resources:", resources.resources.map(r => r.name));

  console.log("Reading rules...");
  const rules = await client.readResource({ uri: "rules://ostap-memory/immutable-rules" });
  
  console.log("\n=== RULES RECEIVED ===");
  if (rules.contents && rules.contents[0] && 'text' in rules.contents[0]) {
     console.log(rules.contents[0].text);
  }
  console.log("======================\n");
  
  process.exit(0);
}

main().catch(console.error);
