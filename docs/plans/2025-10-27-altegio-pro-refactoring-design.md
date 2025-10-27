# Altegio.Pro MCP Server Refactoring Design

**Date:** 2025-10-27
**Purpose:** Convert Altegio MCP server from B2C/public focus to B2B/authenticated (Altegio.Pro)
**Approach:** Conservative cleanup - remove public methods, replace with authenticated B2B versions

---

## Executive Summary

Refactor MCP server to serve business owners/admins only by:
- Removing 6 public/B2C tools (online booking focus)
- Replacing with 3 authenticated B2B tools (business management focus)
- Keeping service_categories public (no B2B alternative exists)
- All operations require `user_token` authentication

---

## Current State Analysis

### Existing Tools (10 total)

**Authenticated (4):**
- `altegio_login` - auth flow
- `altegio_logout` - clear auth
- `list_companies` - with `my` parameter (both modes)
- `get_bookings` - `/records/{company_id}` - confirmed B2B

**Public/B2C (6):**
- `get_company` - `/company/{company_id}` - company details
- `get_staff` - `/staff/{company_id}` - staff for online booking
- `get_services` - `/book_services/{company_id}` - services for booking
- `get_service_categories` - `/service_categories/{company_id}` - public categories
- `get_booking_dates` - `/book_dates/{company_id}` - available dates
- `get_booking_staff` - `/book_staff/{company_id}` - staff availability

---

## Target State Design

### Tools After Refactoring (7 total)

**Keep (4):**
- `altegio_login`
- `altegio_logout`
- `list_companies` (preserve `my` parameter)
- `get_bookings`

**Remove (5):**
- ❌ `get_company` - B2C only, no B2B alternative
- ❌ `get_staff` (public version)
- ❌ `get_services` (public version)
- ❌ `get_booking_dates` - B2C only
- ❌ `get_booking_staff` - duplicate of staff

**Add/Replace (3):**
- ✅ `get_staff` - `/staff/{company_id}` (B2B version, requires user_token)
- ✅ `get_services` - `/company/{company_id}/services/{service_id}` (service_id optional)
- ✅ `get_schedule` - `/schedule/{company_id}/{staff_id}/{start_date}/{end_date}`

**Keep Public (1):**
- ⚠️ `get_service_categories` - only public version exists in API

---

## Detailed Changes

### 1. Staff Management

**OLD (Public):**
```typescript
get_staff: GET /staff/{company_id}
// No auth required, limited data for online booking
```

**NEW (B2B):**
```typescript
get_staff: GET /staff/{company_id}
// Auth: Bearer partner_token, User user_token
// Returns: Full staff details with admin data
// Same endpoint path, different auth = different data
```

**Impact:**
- Client method: modify auth requirement in `altegio-client.ts:179`
- Handler: no signature change in `handlers.ts:114`
- Registry: update description to clarify B2B auth in `registry.ts:91`

---

### 2. Services Management

**OLD (Public):**
```typescript
get_services: GET /book_services/{company_id}
// No auth required, booking-focused data
```

**NEW (B2B):**
```typescript
get_services: GET /company/{company_id}/services/{service_id}
// Auth: Bearer partner_token, User user_token
// service_id optional (per API docs) - omit for list
// Returns: Admin service details with pricing, settings
```

**Impact:**
- Client method: new endpoint path, add auth
- Handler: update to handle optional service_id
- Registry: new endpoint, B2B description

---

### 3. Schedule Management (NEW)

**ADD:**
```typescript
get_schedule: GET /schedule/{company_id}/{staff_id}/{start_date}/{end_date}
// Auth: Bearer partner_token, User user_token
// Purpose: View employee schedule as admin
// Replaces: get_booking_dates, get_booking_staff (B2C scheduling)
```

**Impact:**
- Client method: new method in `altegio-client.ts`
- Handler: new handler in `handlers.ts`
- Registry: new tool definition in `registry.ts`

---

### 4. Service Categories (KEEP PUBLIC)

**KEEP AS-IS:**
```typescript
get_service_categories: GET /service_categories/{company_id}
// Auth: Bearer partner_token (public)
// Reason: No authenticated B2B version exists in API
// Note: May return less data than desired, but functional
```

---

## Implementation Plan

### Files to Modify

1. **`src/tools/registry.ts`**
   - Remove: 5 tool definitions (lines ~82-151)
   - Add: 1 new tool (get_schedule)
   - Update: 2 tool descriptions (get_staff, get_services)

2. **`src/tools/handlers.ts`**
   - Remove: 4 handler methods (lines ~102-200)
   - Add: 1 new handler (getSchedule)
   - Update: 2 handlers (getStaff, getServices)

3. **`src/providers/altegio-client.ts`**
   - Remove: 5 client methods (lines ~157-274)
   - Add: 1 new method (getSchedule)
   - Update: 2 methods (getStaff, getServices - add auth requirement)

4. **`src/types/altegio.types.ts`**
   - Add: Schedule response types
   - Update: Staff/Service types if needed

5. **Tests**
   - Remove: Tests for removed methods
   - Add: Tests for new methods
   - Update: Tests for modified methods

---

## API Endpoint Reference

Based on `/tmp/alteg_api.html` analysis:

| Purpose | Endpoint | Auth | Status |
|---------|----------|------|--------|
| Staff admin list | `GET /staff/{company_id}` | user_token | ✅ B2B |
| Services admin list | `GET /company/{company_id}/services/{service_id}` | user_token | ✅ B2B |
| Service categories | `GET /service_categories/{company_id}` | partner_token | ⚠️ Public only |
| Employee schedule | `GET /schedule/{company_id}/{staff_id}/{start_date}/{end_date}` | user_token | ✅ B2B |
| Bookings | `GET /records/{company_id}` | user_token | ✅ B2B (existing) |

---

## Migration Strategy

1. **Phase 1: Remove public tools** (breaking change)
   - Delete tool definitions
   - Delete handlers
   - Delete client methods
   - Remove tests

2. **Phase 2: Add B2B replacements**
   - Implement new client methods with auth
   - Implement new handlers
   - Add new tool definitions
   - Add tests

3. **Phase 3: Update existing tools**
   - Modify get_staff auth requirements
   - Modify get_services endpoint
   - Update tests

4. **Phase 4: Verification**
   - Run test suite
   - Manual testing with real API
   - Update README/documentation

---

## Breaking Changes

⚠️ **This is a breaking change** - all public tools removed:
- Users relying on B2C methods will lose functionality
- All operations now require authentication
- Endpoint paths changed for services

**Migration path for users:**
1. Obtain user credentials via `altegio_login`
2. Update tool calls to use new names (if changed)
3. Ensure `my=1` parameter for `list_companies`

---

## Questions & Decisions

1. **Service categories:** Keep public version (no alternative exists)
2. **Breaking change:** Acceptable - rebranding to Altegio.Pro
3. **Service ID parameter:** API docs say optional, path shows required - test both
4. **Get company:** Remove entirely (no B2B version, admin-specific data unavailable)

---

## Success Criteria

- ✅ All tools require authentication
- ✅ No public B2C booking tools remain
- ✅ Staff, services, schedule accessible with admin permissions
- ✅ All tests passing
- ✅ Manual verification with real Altegio API

---

## Next Steps

1. Use `superpowers:using-git-worktrees` to create isolated workspace
2. Use `superpowers:writing-plans` to create detailed implementation plan
3. Execute implementation with TDD approach
4. Review and test before merge
