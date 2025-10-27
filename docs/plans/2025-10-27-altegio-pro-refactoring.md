# Altegio.Pro Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert Altegio MCP server from B2C/public to B2B/authenticated (Altegio.Pro) by removing public tools and adding authenticated admin versions.

**Architecture:** Remove 5 public booking tools, keep 4 authenticated tools, replace 2 with B2B versions (staff, services), add 1 new (schedule). Follow TDD: write failing test → implement minimal code → verify → commit.

**Tech Stack:** TypeScript, MCP SDK, Jest, Zod

---

## Task 1: Remove Public Company Tool

**Files:**
- Modify: `src/tools/registry.ts:79-112`
- Modify: `src/tools/handlers.ts:102-112`
- Modify: `src/providers/altegio-client.ts:157-174`
- Modify: `src/__tests__/tools.test.ts`
- Modify: `src/__tests__/altegio-client.test.ts`

**Step 1: Remove company tool tests**

Run: `npm test -- --testNamePattern="get_company"`
Expected: Tests pass (showing baseline)

**Step 2: Remove get_company from registry**

Delete lines 79-89 in `src/tools/registry.ts`:
```typescript
  {
    name: 'get_company',
    description: 'Get details of a specific company...',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'ID of the company to get details for' }
      },
      required: ['company_id']
    }
  },
```

**Step 3: Remove get_company from handlers switch**

Remove case in `src/tools/registry.ts:181`:
```typescript
        case 'get_company':
          return await handlers.getCompany(args);
```

**Step 4: Remove getCompany handler method**

Delete method in `src/tools/handlers.ts:102-112`

**Step 5: Remove getCompany client method**

Delete method in `src/providers/altegio-client.ts:157-174`

**Step 6: Remove tests for get_company**

Delete tests in `src/__tests__/tools.test.ts` and `src/__tests__/altegio-client.test.ts` for get_company

**Step 7: Run tests to verify**

Run: `npm test`
Expected: All tests pass, no get_company references

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove get_company (B2C only, no B2B alternative)"
```

---

## Task 2: Remove Public Booking Date/Staff Tools

**Files:**
- Modify: `src/tools/registry.ts:128-151`
- Modify: `src/tools/handlers.ts:171-200`
- Modify: `src/providers/altegio-client.ts:236-274`
- Modify: `src/__tests__/tools.test.ts`
- Modify: `src/__tests__/altegio-client.test.ts`

**Step 1: Remove get_booking_dates from registry**

Delete tool definition in `src/tools/registry.ts` (~lines 128-139)

**Step 2: Remove get_booking_staff from registry**

Delete tool definition in `src/tools/registry.ts` (~lines 140-151)

**Step 3: Remove handlers switch cases**

Remove from `src/tools/registry.ts`:
```typescript
        case 'get_booking_dates':
          return await handlers.getBookingDates(args);
        case 'get_booking_staff':
          return await handlers.getBookingStaff(args);
```

**Step 4: Remove handler methods**

Delete in `src/tools/handlers.ts:171-200`:
- `getBookingDates`
- `getBookingStaff`

**Step 5: Remove client methods**

Delete in `src/providers/altegio-client.ts:236-274`:
- `getBookingDates`
- `getBookingStaff`

**Step 6: Remove tests**

Delete tests for these methods in test files

**Step 7: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove get_booking_dates and get_booking_staff (B2C only)"
```

---

## Task 3: Update Staff Tool to B2B Version

**Files:**
- Modify: `src/tools/registry.ts:91-102`
- Modify: `src/providers/altegio-client.ts:176-194`
- Modify: `src/__tests__/altegio-client.test.ts:456-503`

**Step 1: Write failing test for B2B staff**

Add to `src/__tests__/altegio-client.test.ts`:
```typescript
describe('getStaff B2B', () => {
  it('should require user token', async () => {
    const client = new AltegioClient({
      apiBase: 'https://api.altegio.com',
      partnerToken: 'partner123',
      userToken: undefined
    });

    await expect(client.getStaff(4564)).rejects.toThrow('Not authenticated');
  });

  it('should include user token in auth header', async () => {
    // Test that user_token is sent
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testNamePattern="getStaff B2B"`
Expected: FAIL - getStaff doesn't check user_token

**Step 3: Update getStaff to require auth**

In `src/providers/altegio-client.ts:179`, add auth check:
```typescript
  async getStaff(companyId: number, params?: AltegioBookingParams): Promise<AltegioStaff[]> {
    if (!this.userToken) {
      throw new Error('Not authenticated');
    }

    const queryParams = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    const response = await this.apiRequest(`/staff/${companyId}${queryParams}`);
    // ... rest unchanged
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testNamePattern="getStaff B2B"`
Expected: PASS

**Step 5: Update registry description**

In `src/tools/registry.ts:91`, update description:
```typescript
    name: 'get_staff',
    description: 'Get list of staff members for a company. AUTHENTICATION REQUIRED - administrative access to view all staff with full details (not just public booking info). User must be logged in and have access to the company.',
```

**Step 6: Update existing tests**

Ensure existing getStaff tests in `src/__tests__/altegio-client.test.ts:456-503` include user_token

**Step 7: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: update get_staff to require B2B authentication"
```

---

## Task 4: Replace Services Tool with B2B Version

**Files:**
- Modify: `src/tools/registry.ts:103-115`
- Modify: `src/tools/handlers.ts:134-151`
- Modify: `src/providers/altegio-client.ts:196-214`
- Modify: `src/__tests__/altegio-client.test.ts:504-546`

**Step 1: Write failing test for B2B services**

Add to `src/__tests__/altegio-client.test.ts`:
```typescript
describe('getServices B2B', () => {
  it('should require user token', async () => {
    const client = new AltegioClient({
      apiBase: 'https://api.altegio.com',
      partnerToken: 'partner123',
      userToken: undefined
    });

    await expect(client.getServices(4564)).rejects.toThrow('Not authenticated');
  });

  it('should use company admin endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    const client = new AltegioClient({
      apiBase: 'https://api.alteg.io/api/v1',
      partnerToken: 'partner123',
      userToken: 'user456'
    });

    await client.getServices(4564);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.alteg.io/api/v1/company/4564/services',
      expect.any(Object)
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testNamePattern="getServices B2B"`
Expected: FAIL

**Step 3: Update getServices to use B2B endpoint**

In `src/providers/altegio-client.ts:199`, update:
```typescript
  async getServices(companyId: number, params?: AltegioBookingParams): Promise<AltegioService[]> {
    if (!this.userToken) {
      throw new Error('Not authenticated');
    }

    const queryParams = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    const response = await this.apiRequest(`/company/${companyId}/services${queryParams}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.statusText}`);
    }

    const result = await response.json() as AltegioApiResponse<AltegioService[]>;

    if (result.success && result.data) {
      return result.data;
    }

    throw new Error(result.meta?.message || 'Failed to fetch services');
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testNamePattern="getServices B2B"`
Expected: PASS

**Step 5: Update registry description**

In `src/tools/registry.ts:103`, update:
```typescript
    name: 'get_services',
    description: 'Get list of services available at a company. AUTHENTICATION REQUIRED - administrative access to view all services with full pricing, settings, and configuration (not just public booking info). User must be logged in and have access to the company.',
```

**Step 6: Update existing tests**

Update tests in `src/__tests__/altegio-client.test.ts:504-546` to use new endpoint

**Step 7: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: update get_services to use B2B endpoint"
```

---

## Task 5: Add Schedule Tool (New)

**Files:**
- Create: `src/__tests__/schedule.test.ts`
- Modify: `src/types/altegio.types.ts`
- Modify: `src/providers/altegio-client.ts`
- Modify: `src/tools/handlers.ts`
- Modify: `src/tools/registry.ts`

**Step 1: Write types for schedule**

Add to `src/types/altegio.types.ts`:
```typescript
export interface AltegioScheduleEntry {
  date: string;
  time: string;
  seance_length: number;
  datetime: string;
}

export interface AltegioScheduleParams {
  staff_id: number;
  start_date: string;
  end_date: string;
}
```

**Step 2: Write failing test for getSchedule**

Create `src/__tests__/schedule.test.ts`:
```typescript
import { AltegioClient } from '../providers/altegio-client';

describe('AltegioClient.getSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require user token', async () => {
    const client = new AltegioClient({
      apiBase: 'https://api.altegio.com',
      partnerToken: 'partner123',
      userToken: undefined
    });

    await expect(
      client.getSchedule(123, 456, '2025-10-27', '2025-10-28')
    ).rejects.toThrow('Not authenticated');
  });

  it('should call schedule endpoint with correct parameters', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] })
    });

    const client = new AltegioClient({
      apiBase: 'https://api.alteg.io/api/v1',
      partnerToken: 'partner123',
      userToken: 'user456'
    });

    await client.getSchedule(123, 456, '2025-10-27', '2025-10-28');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.alteg.io/api/v1/schedule/123/456/2025-10-27/2025-10-28',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer partner123, User user456'
        })
      })
    );
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm test -- schedule.test.ts`
Expected: FAIL - getSchedule not defined

**Step 4: Implement getSchedule in client**

Add to `src/providers/altegio-client.ts`:
```typescript
  async getSchedule(
    companyId: number,
    staffId: number,
    startDate: string,
    endDate: string
  ): Promise<AltegioScheduleEntry[]> {
    if (!this.userToken) {
      throw new Error('Not authenticated');
    }

    const response = await this.apiRequest(
      `/schedule/${companyId}/${staffId}/${startDate}/${endDate}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.statusText}`);
    }

    const result = await response.json() as AltegioApiResponse<AltegioScheduleEntry[]>;

    if (result.success && result.data) {
      return result.data;
    }

    throw new Error(result.meta?.message || 'Failed to fetch schedule');
  }
```

**Step 5: Run test to verify it passes**

Run: `npm test -- schedule.test.ts`
Expected: PASS

**Step 6: Add getSchedule handler**

Add to `src/tools/handlers.ts`:
```typescript
  async getSchedule(args: unknown) {
    const params = z.object({
      company_id: z.number().int().positive(),
      staff_id: z.number().int().positive(),
      start_date: z.string(),
      end_date: z.string()
    }).parse(args);

    const schedule = await this.client.getSchedule(
      params.company_id,
      params.staff_id,
      params.start_date,
      params.end_date
    );

    const summary = `Found ${schedule.length} schedule ${schedule.length === 1 ? 'entry' : 'entries'} for staff ${params.staff_id}:\n\n`;
    const scheduleList = schedule.map((s, idx) =>
      `${idx + 1}. ${s.date} at ${s.time} (${s.seance_length} min)`
    ).join('\n');

    return {
      content: [{
        type: 'text' as const,
        text: summary + scheduleList
      }]
    };
  }
```

**Step 7: Add get_schedule to registry**

Add to `src/tools/registry.ts` tools array:
```typescript
  {
    name: 'get_schedule',
    description: 'Get employee schedule for a date range. AUTHENTICATION REQUIRED - administrative access to view staff working schedule. User must be logged in and have access to the company. Returns schedule entries with dates, times, and session lengths.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'ID of the company' },
        staff_id: { type: 'number', description: 'ID of the staff member' },
        start_date: { type: 'string', description: 'Start date (YYYY-MM-DD format)' },
        end_date: { type: 'string', description: 'End date (YYYY-MM-DD format)' }
      },
      required: ['company_id', 'staff_id', 'start_date', 'end_date']
    }
  },
```

**Step 8: Add get_schedule to handlers switch**

Add to `src/tools/registry.ts` switch:
```typescript
        case 'get_schedule':
          return await handlers.getSchedule(args);
```

**Step 9: Write handler test**

Add to `src/__tests__/tools.test.ts`:
```typescript
describe('get_schedule', () => {
  it('should format schedule entries', async () => {
    const mockClient = {
      getSchedule: jest.fn().mockResolvedValue([
        { date: '2025-10-27', time: '09:00', seance_length: 30, datetime: '2025-10-27T09:00:00' },
        { date: '2025-10-27', time: '10:00', seance_length: 60, datetime: '2025-10-27T10:00:00' }
      ])
    } as any;

    const handlers = new ToolHandlers(mockClient);
    const result = await handlers.getSchedule({
      company_id: 123,
      staff_id: 456,
      start_date: '2025-10-27',
      end_date: '2025-10-28'
    });

    expect(result.content[0].text).toContain('Found 2 schedule entries');
    expect(result.content[0].text).toContain('2025-10-27 at 09:00 (30 min)');
  });
});
```

**Step 10: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 11: Commit**

```bash
git add -A
git commit -m "feat: add get_schedule tool for B2B schedule management"
```

---

## Task 6: Update README and Documentation

**Files:**
- Modify: `README.md`
- Modify: `package.json:2`

**Step 1: Update package.json name**

Change in `package.json:2`:
```json
  "name": "@altegio/mcp-server-pro",
```

**Step 2: Update README title and description**

Update `README.md` header:
```markdown
# Altegio.Pro MCP Server

MCP server for Altegio.Pro - B2B business management API integration.

**Focus:** Business owners and administrators managing their salons/companies.
**Authentication:** All operations require user login (user_token).

## Available Tools

**Authentication:**
- `altegio_login` - Login with email/password
- `altegio_logout` - Logout and clear credentials

**Business Management:**
- `list_companies` - Get companies user manages (use my=1)
- `get_bookings` - View all company appointments
- `get_staff` - View all company staff with admin details
- `get_services` - View all company services with full configuration
- `get_service_categories` - View service categories
- `get_schedule` - View employee schedules

All tools except login/logout require authentication.
```

**Step 3: Update setup instructions**

Update authentication requirements in README

**Step 4: Commit**

```bash
git add README.md package.json
git commit -m "docs: update for Altegio.Pro B2B focus"
```

---

## Task 7: Final Verification

**Files:**
- All modified files

**Step 1: Run full test suite**

Run: `npm test`
Expected: All 64+ tests pass

**Step 2: Run type check**

Run: `npm run typecheck`
Expected: No TypeScript errors

**Step 3: Run build**

Run: `npm run build`
Expected: Clean build

**Step 4: Verify tool count**

Check `src/tools/registry.ts` - should have 7 tools total:
- altegio_login
- altegio_logout
- list_companies
- get_bookings
- get_staff (B2B)
- get_services (B2B)
- get_service_categories
- get_schedule (NEW)

**Step 5: Final commit if needed**

```bash
git add -A
git commit -m "chore: final verification and cleanup"
```

---

## Completion Checklist

- [ ] Removed get_company (no B2B alternative)
- [ ] Removed get_booking_dates (B2C only)
- [ ] Removed get_booking_staff (B2C only)
- [ ] Updated get_staff to require B2B auth
- [ ] Updated get_services to use B2B endpoint
- [ ] Added get_schedule (new B2B tool)
- [ ] Kept get_service_categories (public only)
- [ ] Updated README for Altegio.Pro branding
- [ ] All tests passing (64+ tests)
- [ ] TypeScript compiles cleanly
- [ ] Build succeeds

## Ready for Code Review

After all tasks complete, use `superpowers:requesting-code-review` to verify implementation matches design document at `docs/plans/2025-10-27-altegio-pro-refactoring-design.md`.
