# supabase-mcp-server

MCP server for Supabase database introspection and query generation.

## Tools

| Tool | Description |
|---|---|
| `get_tables` | Returns all tables and columns from the `api` schema |
| `get_rls_policies` | Returns all Row Level Security policies |
| `generate_query` | Generates a typed Supabase query from a natural language description |
| `run_query` | Executes a raw SQL query and returns results |

## Setup

### Environment variables

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### Build

```bash
yarn install
yarn build
```

### .mcp.json entry

```json
"supabase": {
  "type": "stdio",
  "command": "node",
  "args": ["/path/to/supabase-mcp-server/dist/index.js"]
}
```
