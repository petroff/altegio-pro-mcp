# Altegio.Pro MCP Server - Project Context

## Quick Start

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, Express (HTTP mode), Jest

**Build & Run:**
```bash
npm install
npm run build
npm start                    # stdio mode (Claude Desktop)
npm run dev                  # HTTP mode on port 8080
```

**Test:**
```bash
npm test                     # run tests
npm run test:watch         # watch mode
npm run lint               # check code style
npm run typecheck          # TypeScript validation
```

**Deploy:**
- Push to main → GitHub Actions → Cloud Build → Artifact Registry → Cloud Run (staging)
- GCP Project: `altegio-mcp` (project #767969350727)
- Staging URL: https://altegio-mcp-staging-767969350727.us-central1.run.app

---

## Project State (Altegio.Pro B2B Refactoring - COMPLETED)

### What This Server Does

MCP server for **B2B business management only** (Altegio.Pro, not public booking). Salon/spa business owners and admins manage their operations through authenticated tools.

### Tools Available (8 total)

**Authentication (no auth needed):**
- `altegio_login(email, password)` - Get user_token, save credentials locally
- `altegio_logout()` - Clear credentials

**Business Management (all require user_token):**
- `list_companies(my=1)` - Companies user manages
- `get_bookings(company_id, start_date, end_date)` - Appointments/records
- `get_staff(company_id)` - Staff list with admin details
- `get_services(company_id)` - Services with full config
- `get_schedule(company_id, staff_id, start_date, end_date)` - Employee schedule
- `get_service_categories(company_id)` - Service categories (public endpoint only)

### Architecture

**Transports:**
- **stdio** (default) → `dist/index.js` → Claude Desktop integration
- **HTTP** → `dist/http-server.js` → Cloud Run on port 8080
  - `/health` - health check
  - `/sse` - Server-Sent Events (OpenAI/ChatGPT)
  - `/rpc` - JSON-RPC 2.0
  - `/mcp` - MCP SSE

**Authentication:**
- Partner token: `ALTEGIO_API_TOKEN` (required, from https://developer.alteg.io)
- User token: obtained via `altegio_login`, saved to `~/.altegio-mcp/credentials.json`
- API headers: `Authorization: Bearer {partner_token}`, `User-Token: {user_token}` (B2B only)

**Key Files:**
- `src/index.ts` - stdio entry point
- `src/http-server.ts` - HTTP server entry point
- `src/providers/altegio-client.ts` - API client (auth, retry, rate-limit)
- `src/tools/handlers.ts` - tool implementations
- `src/tools/registry.ts` - MCP tool definitions
- `src/types/altegio.types.ts` - TypeScript types
- `src/utils/` - logging, errors, config, credential manager

### Refactoring History

**2025-01-25: MCP SDK Migration**
- Switched from custom JSON-RPC to `@modelcontextprotocol/sdk`
- Added stdio and SSE transports
- Tests: 64 passing

**2025-10-27: Altegio.Pro B2B Refactoring** ✅ COMPLETED
- **Removed 5 B2C tools:** get_company, get_booking_dates, get_booking_staff (no B2B alternatives)
- **Updated 2 tools to B2B:** get_staff, get_services (now require user_token)
- **Added 1 tool:** get_schedule (new admin schedule management)
- **Kept 1 public tool:** get_service_categories (only version available in API)
- All operations except login/logout now require user_token
- Tests: 68 passing
- Implementation method: Test-driven development (write failing test → implement → verify)
- Breaking change: B2C users have no access (intentional rebranding)

### API Reference

**Base URL:** `https://api.alteg.io/api/v1`

**B2B Endpoints (require user_token):**
- `GET /staff/{company_id}` - staff with admin details
- `GET /company/{company_id}/services` - services list (optional service_id)
- `GET /records/{company_id}` - bookings/appointments
- `GET /schedule/{company_id}/{staff_id}/{start_date}/{end_date}` - employee schedule

**Public Endpoint (partner_token only):**
- `GET /service_categories/{company_id}` - categories (no auth alternative)

### Common Patterns

**Authentication check in handlers:**
```typescript
if (!this.client.isAuthenticated()) {
  throw new Error('Authentication required');
}
```

**Authentication check in client methods:**
```typescript
async getStaff(companyId: number) {
  if (!this.userToken) {
    throw new Error('Not authenticated');
  }
  // ... API call
}
```

**Test isolation:**
- Tests default to `~/.altegio-mcp/` credentials
- Pass `testDir` parameter to use isolated test directory:
  ```typescript
  new AltegioClient(config, testDir)
  ```

**Build after changes:**
- Always run `npm run build` after source modifications
- Verify `dist/` is updated before commits
- CI/CD rebuilds automatically

---

## Environment Variables

```bash
# Required
ALTEGIO_API_TOKEN=your_partner_token

# Optional
ALTEGIO_API_BASE=https://api.alteg.io/api/v1
NODE_ENV=development|production
LOG_LEVEL=debug|info|warn|error
PORT=8080
CREDENTIALS_DIR=~/.altegio-mcp
RATE_LIMIT_REQUESTS=200
MAX_RETRY_ATTEMPTS=3
```

---

## Known Issues / Security Notes

**Credential storage:** User tokens stored in plaintext at `~/.altegio-mcp/credentials.json` - consider encryption for production

**Token expiration:** No automatic refresh handling - implement if tokens expire

**Logout cleanup:** Logout doesn't delete credentials file - should be fixed

---

## Next Steps for Improvement

1. **Add credential encryption** - `~/.altegio-mcp/credentials.json` is plaintext
2. **Implement token refresh** - handle expiration gracefully
3. **Fix logout cleanup** - remove credentials file on logout
4. **Add integration tests** - beyond Docker, add Jest integration suite
5. **Verify pagination** - ensure all list endpoints consistently implement it

---

## Documentation

- `README.md` - main user documentation
- `CONTRIBUTING.md` - contribution guidelines
- `CI-CD.md` - deployment pipeline details
- `CLAUDE_DESKTOP_SETUP.md` - local Claude Desktop setup
- `TESTING.md` - testing guide
- `OPENAI_PLATFORM.md` - OpenAI/ChatGPT integration
