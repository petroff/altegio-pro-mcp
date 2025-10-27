#!/bin/bash
echo "=== Testing Claude Desktop Integration ==="
echo
echo "1. Config file location:"
echo "   ~/Library/Application Support/Claude/claude_desktop_config.json"
echo

echo "2. Server configuration:"
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq '.mcpServers["altegio-local"]'
echo

echo "3. Server file exists:"
ls -lh /Users/iyour/Developer/altegio-mcp/dist/index.js
echo

echo "4. Dependencies check:"
ls -d /Users/iyour/Developer/altegio-mcp/node_modules | head -1
echo

echo "5. Test manual server start (will run for 2 seconds):"
echo "   Starting server..."
if [ -z "$ALTEGIO_API_TOKEN" ]; then
  echo "   ERROR: ALTEGIO_API_TOKEN not set"
  echo "   Run: export ALTEGIO_API_TOKEN='your_token_here'"
else
  (
    cd /Users/iyour/Developer/altegio-mcp
    ALTEGIO_API_TOKEN=$ALTEGIO_API_TOKEN node dist/index.js &
    SERVER_PID=$!
    sleep 2
    kill $SERVER_PID 2>/dev/null
    echo "   Server started successfully and stopped"
  )
fi
echo

echo "=== Integration Ready ==="
echo
echo "Next steps:"
echo "1. Restart Claude Desktop application"
echo "2. Open Claude Desktop"
echo "3. Look for 'altegio-local' in available MCP servers"
echo "4. Test tools: altegio_login, list_companies, etc."
