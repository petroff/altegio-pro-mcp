# Altegio.Pro MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-green)](https://modelcontextprotocol.io)

MCP server for Altegio.Pro business management API - B2B integration for salon/spa owners and administrators.

**Target users:** Business owners managing their Altegio companies
**Authentication:** All operations require user login (obtained via `altegio_login`)
**Focus:** Administrative B2B operations only (no public booking features)

## Features

- **8 MCP tools** for business management (staff, services, bookings, schedules)
- **Dual transport:** stdio for Claude Desktop, HTTP for cloud deployments
- **TypeScript** with full type safety and comprehensive tests (68 passing)
- **Auto-deploy CI/CD** via Cloud Build on push to main
- **Rate limiting** and **retry logic** with exponential backoff
- **Secure credential storage** in `~/.altegio-mcp/`

## Available Tools

| Tool | Description | Auth Required |
|------|-------------|---------------|
| `altegio_login` | Authenticate with email/password | No |
| `altegio_logout` | Clear stored credentials | No |
| `list_companies` | Get managed companies | Yes |
| `get_bookings` | View company appointments | Yes |
| `get_staff` | View staff with admin details | Yes |
| `get_services` | View services with configuration | Yes |
| `get_service_categories` | View service categories | Yes |
| `get_schedule` | View employee schedules | Yes |

## Quick Start

### Prerequisites

- Node.js >= 18
- Altegio Partner Token from [developer.alteg.io](https://developer.alteg.io)

### Installation

```bash
git clone https://github.com/petroff/altegio-mcp.git
cd altegio-mcp
npm install
cp .env.example .env
# Edit .env and add ALTEGIO_API_TOKEN
npm run build
```

### Claude Desktop Setup

1. Build the server: `npm run build`
2. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "altegio-pro": {
      "command": "node",
      "args": ["/absolute/path/to/altegio-mcp/dist/index.js"],
      "env": {
        "ALTEGIO_API_TOKEN": "your_partner_token"
      }
    }
  }
}
```

3. Restart Claude Desktop

See [CLAUDE_DESKTOP_SETUP.md](CLAUDE_DESKTOP_SETUP.md) for detailed setup.

### Cloud Deployment

Automatic deployment to Cloud Run on push to `main`. See [CI-CD.md](CI-CD.md) for:
- GitHub → Cloud Build → Artifact Registry → Cloud Run pipeline
- Local Docker testing
- Secret management

```bash
# Local Docker test
docker build -t altegio-mcp:local .
docker run --rm -p 8080:8080 --env-file .env altegio-mcp:local
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ALTEGIO_API_TOKEN` | Yes | - | Partner API token |
| `ALTEGIO_API_BASE` | No | `https://api.alteg.io/api/v1` | API base URL |
| `LOG_LEVEL` | No | `info` | `debug\|info\|warn\|error` |
| `NODE_ENV` | No | `development` | `development\|production` |
| `RATE_LIMIT_REQUESTS` | No | `200` | Max requests per minute |

## Development

```bash
npm install          # Install dependencies
npm run dev          # Dev mode with hot reload
npm run build        # Build TypeScript
npm test             # Run tests
npm run test:watch   # Watch mode
npm run lint         # Check code style
```

### Project Structure

```
src/
  config/        # Configuration and validation
  providers/     # API clients (altegio-client.ts)
  tools/         # MCP tool handlers & registry
  types/         # TypeScript interfaces
  utils/         # Logging, errors, helpers
  __tests__/     # Jest unit tests
  index.ts       # stdio server entry
  http-server.ts # HTTP server entry
  server.ts      # Shared MCP server setup
```

### Testing

- **68 tests** covering authentication, all tools, error handling, pagination
- **Jest** for unit tests with mocked API responses
- **Test isolation** with temporary credentials directory
- Run: `npm test` or `npm run test:coverage`

## Integrations

- **Claude Desktop:** Native stdio transport (recommended)
- **OpenAI/ChatGPT:** SSE transport - see [OPENAI_PLATFORM.md](OPENAI_PLATFORM.md)
- **Other LLMs:** JSON-RPC endpoint at `/rpc`

## API Reference

Base URL: `https://api.alteg.io/api/v1`
Documentation: [developer.alteg.io/api](https://developer.alteg.io/api)

**Authentication:**
- Partner token: `Authorization: Bearer {token}`
- User token: `User-Token: {token}` (obtained via `altegio_login`)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Coding standards (TypeScript, Prettier, ESLint)
- Testing guidelines
- Commit conventions

Quick contribution flow:
1. Fork and create feature branch
2. Add tests for new features
3. Ensure `npm test` and `npm run lint` pass
4. Submit PR with clear description

## License

MIT License - see [LICENSE](LICENSE) file

## Support

- **Issues:** [GitHub Issues](https://github.com/petroff/altegio-mcp/issues)
- **Discussions:** [GitHub Discussions](https://github.com/petroff/altegio-mcp/discussions)
- **Altegio API:** [support.alteg.io](https://support.alteg.io)

## Acknowledgments

Built with [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic and [Altegio API](https://developer.alteg.io) for salon/spa management.
