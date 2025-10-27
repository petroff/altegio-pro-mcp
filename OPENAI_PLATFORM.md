# OpenAI Platform Integration

## Overview

The Altegio.Pro MCP Server supports integration with OpenAI Platform via Server-Sent Events (SSE) transport.

## Configuration

### Option 1: SSE (Recommended for real-time streaming)
```
https://your-service-name.run.app/sse
```
✅ Works with HTTP/2
✅ Real-time streaming
✅ Full MCP protocol support
⚠️ Direct Cloud Run URL (not through Firebase CDN)

### Option 2: JSON-RPC (Recommended for stability)
```
https://altegio-mcp.web.app/rpc
```
✅ Works with HTTP/2
✅ Works through Firebase CDN
✅ Stable and cacheable
⚠️ Request/response only (no streaming)

### Endpoints

**SSE Stream (Server → Client)**
```
GET https://your-service-name.run.app/sse
```
Establishes a persistent connection for receiving events from the server.
**Note:** Use Cloud Run URL directly. Firebase CDN buffers SSE responses.

**Send Message (Client → Server)**
```
POST https://your-service-name.run.app/sse/message
Content-Type: application/json

{
  "sessionId": "your-session-id",
  "message": {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }
}
```
**Note:** Use same domain as SSE stream endpoint.

### Alternative: Direct JSON-RPC

For simpler integration, use the direct JSON-RPC endpoint:

```
POST https://altegio-mcp.web.app/rpc
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

## OpenAI Platform Setup

### Option 1: MCP Server (Recommended)

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Navigate to your project settings
3. Add MCP Server:
   - **Name:** Altegio
   - **URL:** `https://your-service-name.run.app/sse`
   - **Transport:** Server-Sent Events
   - **Authentication:** None (or Bearer token if configured)

### Option 2: Custom GPT with Actions

1. Go to [ChatGPT](https://chat.openai.com/gpts/editor)
2. Create a Custom GPT
3. In Configure → Actions:
   - Import the OpenAPI schema from `openapi.yaml`
   - Or manually add:

```yaml
servers:
  - url: https://altegio-mcp.web.app

paths:
  /rpc:
    post:
      operationId: callMcpTool
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                jsonrpc:
                  type: string
                  default: "2.0"
                id:
                  type: integer
                method:
                  type: string
                params:
                  type: object
```

## Available Tools

Once connected, the following tools are available:

- `altegio_login` - Authenticate with email/password
- `altegio_logout` - Clear credentials
- `list_companies` - Get all accessible companies
- `list_bookings` - Query bookings with date range
- `get_booking` - Get specific booking details

## Example Usage

### 1. Login
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "altegio_login",
    "arguments": {
      "email": "your@email.com",
      "password": "your_password"
    }
  }
}
```

### 2. List Companies
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "list_companies",
    "arguments": {}
  }
}
```

### 3. Get Bookings
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "list_bookings",
    "arguments": {
      "company_id": 123456,
      "start_date": "2024-01-01",
      "end_date": "2024-01-31"
    }
  }
}
```

## Testing

### Test SSE Connection
```bash
curl -N https://your-service-name.run.app/sse
```

Expected output: Server-Sent Events stream with connection info and keep-alive messages.

### Test JSON-RPC
```bash
curl -X POST https://altegio-mcp.web.app/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

Expected output: JSON response with list of available tools.

## Troubleshooting

### "Establishing connection" hangs

**Issue:** OpenAI Platform can't connect to SSE endpoint.

**Solutions:**
1. Use Cloud Run URL directly: `https://your-service-name.run.app/sse`
2. Check if the server is running: `curl https://your-service-name.run.app/health`
3. Verify SSE works: `curl -N https://your-service-name.run.app/sse`
4. Try JSON-RPC as alternative: `https://altegio-mcp.web.app/rpc`

### "Authentication failed"

**Issue:** Server requires authentication.

**Solution:** Currently, the server doesn't require authentication. If you see this error, ensure you're not sending any auth headers.

### "Tool not found"

**Issue:** Requested tool doesn't exist.

**Solution:** List available tools first:
```bash
curl https://altegio-mcp.web.app/tools
```

## Support

- GitHub: [petroff/altegio-mcp](https://github.com/petroff/altegio-mcp)
- Issues: [GitHub Issues](https://github.com/petroff/altegio-mcp/issues)
- Altegio Support: [support.alteg.io](https://support.alteg.io)
