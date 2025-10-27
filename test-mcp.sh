#!/bin/bash

echo "=== Testing Altegio MCP Server in Docker ==="
echo

# 1. Health check
echo "1. Health Check:"
curl -s http://localhost:3000/health | jq .
echo

# 2. Test SSE endpoint is available
echo "2. SSE Endpoint Check:"
timeout 2 curl -s -N http://localhost:3000/mcp -H "Accept: text/event-stream" | head -1 || echo "SSE endpoint available"
echo

# 3. Get MCP server info via tools/list (simulated client)
echo "3. List available MCP tools:"
echo "Creating test session..."

# First, establish SSE connection to get session ID
SESSION_ID=$(curl -s -N http://localhost:3000/mcp -H "Accept: text/event-stream" -D - 2>&1 | grep -i "x-session-id" | cut -d: -f2 | tr -d ' \r\n' | head -1)

if [ -z "$SESSION_ID" ]; then
    echo "❌ Failed to get session ID from SSE endpoint"
else
    echo "✓ Session ID: $SESSION_ID"

    # Now send tools/list request
    echo
    echo "4. Requesting tools list via MCP protocol:"
    curl -s -X POST http://localhost:3000/mcp \
        -H "Content-Type: application/json" \
        -H "X-Session-Id: $SESSION_ID" \
        -d '{
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list",
            "params": {}
        }' | jq .
fi

echo
echo "=== Testing Complete ==="
echo
echo "Docker container logs:"
docker-compose logs --tail=10 2>/dev/null | grep -v "warning msg"
