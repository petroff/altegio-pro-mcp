# CRUD Operations for Altegio MCP Server

**Date:** 2025-01-29
**Status:** Approved Design
**Scope:** Add Create/Update/Delete operations for Staff, Services, Bookings

## Overview

Extend read-only MCP server to support full CRUD operations for core business entities.

**Current state:** 8 read-only tools
**Target state:** 14 tools (8 read + 6 write)

## Requirements

**Entities:**
- Staff (employees) - Full CRUD
- Services - CRU only (DELETE not available in API)
- Bookings (appointments) - Full CRUD

**Validation:** Minimal - check only required fields, delegate to API
**Success criteria:**
- Unit tests (100% coverage)
- Integration tests
- Documentation updates
- CI/CD passing

## Architecture

**Approach:** Hybrid CRUD

Keep existing `get_*` tools for reads, add explicit `create_*`, `update_*`, `delete_*` tools for writes.

**New Tools (6):**

1. `create_staff` → POST `/api/location/staff/create_quick`
2. `update_staff` → PUT `/staff/{company_id}/{staff_id}`
3. `delete_staff` → DELETE `/staff/{company_id}/{staff_id}`
4. `create_service` → POST `/services/{company_id}`
5. `update_service` → PATCH `/services/{company_id}/services/{service_id}`
6. `create_booking` → POST `/records/{company_id}`
7. `update_booking` → PUT `/record/{company_id}/{record_id}`
8. `delete_booking` → DELETE `/record/{company_id}/{record_id}`

## Implementation

**File changes:**

```
src/
  tools/
    registry.ts          # +6 tool definitions
    handlers.ts          # +6 handler methods
  providers/
    altegio-client.ts    # +6 API methods
  types/
    altegio.types.ts     # +request body types
tests/
  tools/
    handlers.test.ts     # +6 test groups
```

**Authentication:** All write operations require user_token from `altegio_login`

**Error handling:**
- 401: "Not authenticated"
- 403: "No access to company"
- 404: "Entity not found"
- 422: Pass API validation errors

**Data flow:**
```
AI → MCP Tool → Handler (auth check) → Client (HTTP) → Altegio API
```

## Testing

**Unit tests (Jest):**
- Handler tests: auth checks, success, API errors
- Client tests: HTTP requests, headers, retry logic
- Coverage: 100% for new code

**Integration tests:**
- E2E flow: login → create → update → delete
- Manual execution (requires real credentials)

**CI/CD:**
- Unit tests in GitHub Actions
- Lint + typecheck + build + test passing

## Documentation

**README.md updates:**
- Available Tools table: +6 rows for new tools
- Note: Services DELETE not available in API
- Note: All write operations require auth

**registry.ts:**
- Tool descriptions with auth requirement
- Required parameters list

## API Mapping

| Tool | Method | Endpoint | Required Fields |
|------|--------|----------|-----------------|
| create_staff | POST | /api/location/staff/create_quick | name, specialization, position_id, phone_number |
| update_staff | PUT | /staff/{company_id}/{staff_id} | (any fields to update) |
| delete_staff | DELETE | /staff/{company_id}/{staff_id} | - |
| create_service | POST | /services/{company_id} | title, category_id |
| update_service | PATCH | /services/{company_id}/services/{service_id} | (any fields to update) |
| create_booking | POST | /records/{company_id} | staff_id, services[], datetime, client |
| update_booking | PUT | /record/{company_id}/{record_id} | (any fields to update) |
| delete_booking | DELETE | /record/{company_id}/{record_id} | - |

## Constraints

- Services: DELETE operation not available in Altegio API
- Rate limits: 200 req/min apply to all operations
- Idempotency: DELETE/UPDATE safe, CREATE not idempotent

## References

- OpenAPI spec: `api.docs/docs/altegio/en/openapi.yml`
- Product logic: `docs/Altegio API and Product Logic Documentation.md`
- Current implementation: `src/tools/handlers.ts`
