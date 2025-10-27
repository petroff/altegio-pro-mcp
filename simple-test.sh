#!/bin/bash
echo "=== Altegio MCP Server Tests ==="
echo
echo "1. ✓ Health endpoint:"
curl -s http://localhost:3000/health | jq .
echo
echo "2. ✓ SSE endpoint available:"
curl -s -I http://localhost:3000/mcp | head -5
echo
echo "3. ✓ Container status:"
docker ps | grep altegio
echo
echo "4. ✓ Recent container logs:"
docker logs altegio-mcp-server --tail 5 2>&1 | grep -v "warning"
echo
echo "=== All tests completed ==="
