# Onboarding Wizard Design

**Date:** 2025-01-29
**Status:** Design Approved
**Type:** Feature Addition

## Overview

Conversational onboarding assistant integrated into the existing Altegio MCP server. Guides new clients through initial platform setup via natural language, with support for bulk data import.

**Use Case:** After first login, client describes their business setup (staff, services, schedules), optionally pastes CSV data, and receives fully configured platform with test bookings and imported client database.

## Requirements

### Functional
- Accept data via conversation or CSV paste (hybrid approach)
- Bulk operations: staff, services, categories, clients, schedules
- Generate 3-5 test bookings to demonstrate system
- Resume from checkpoint on error (network, API failure, bad data)
- Show progress and allow rollback of specific phases

### Non-Functional
- Integrate with existing 16-tool MCP server (no separate service)
- Zero breaking changes to current tools
- State persistence across sessions
- 85%+ test coverage for new modules

### Constraints
- Must use existing `AltegioClient` and CRUD operations
- Respect API rate limits (200 req/min)
- State stored locally in `~/.altegio-mcp/onboarding/{company_id}/`

## Architecture

### Design Choice: Stateful Workflow Tools

**Selected Approach:** 12 granular tools with persistent state management

**Why:**
- Native checkpoint/resume support via state file
- Each tool simple and testable
- Clear progress tracking
- Easy error recovery

**Rejected Alternatives:**
- High-level orchestrator: Too complex, hard to test, poor error visibility
- Prompt-guided with existing tools: No native checkpoint, LLM context limits

### State Management

**State File Location:** `~/.altegio-mcp/onboarding/{company_id}/state.json`

**State Structure:**
```typescript
interface OnboardingState {
  company_id: number;
  phase: 'init' | 'staff' | 'categories' | 'services' | 'schedules' |
         'clients' | 'test_bookings' | 'complete';
  started_at: string; // ISO timestamp
  updated_at: string;
  checkpoints: {
    [phase: string]: {
      completed: boolean;
      entity_ids: number[];
      timestamp: string;
      metadata?: Record<string, unknown>;
    };
  };
  conversation_context: {
    parsed_staff?: StaffInput[];
    parsed_services?: ServiceInput[];
    parsed_clients?: ClientInput[];
    // LLM-extracted structured data preserved for review
  };
}
```

**Checkpoint Mechanism:**
- Auto-checkpoint after each successful batch operation
- Manual checkpoint via `onboarding_checkpoint()` tool
- Atomic writes with temp file + rename pattern
- State loaded on every tool call for consistency

### Integration Points

**Leverage Existing:**
- `AltegioClient` for all API calls
- `CredentialManager` for authentication
- Existing CRUD tools: `createStaff`, `createService`, `createBooking`, etc.
- Type definitions from `altegio.types.ts`

**New Modules:**
- `OnboardingStateManager` - state persistence, checkpoint/rollback logic
- `CSVParser` - detect headers, map to API fields
- `OnboardingHandlers` - 12 tool implementations
- Zod schemas for batch validation

## Tool Inventory

### Control Tools (3)

**`onboarding_start(company_id)`**
- Initialize new onboarding session
- Create state file with `phase: "init"`
- Return session_id and next steps
- Validation: user authenticated, company exists

**`onboarding_resume(company_id)`**
- Load existing state from file
- Display progress summary (completed/pending phases)
- Suggest next action based on current phase
- Handle missing state gracefully

**`onboarding_status(company_id)`**
- Show current phase, completed steps, entity counts
- Display checkpoint timestamps
- Estimate remaining steps
- Read-only, no state changes

### Data Input Tools (6)

**`onboarding_add_staff_batch(company_id, staff_data)`**
- Accept: JSON array or CSV string
- Parse and validate via `StaffBatchSchema`
- Call `client.createStaff()` for each entry
- Checkpoint on success with created IDs
- Return: count created, failed entries with reasons

**`onboarding_add_services_batch(company_id, services_data)`**
- Similar to staff batch
- Validate category_id exists if provided
- Support price ranges (price_min, price_max)

**`onboarding_add_categories(company_id, categories)`**
- Create service category hierarchy
- Accept: `[{title, api_id?, weight?}, ...]`
- Store category IDs for service linking

**`onboarding_import_clients(company_id, clients_csv)`**
- Require: name + (phone OR email)
- Deduplicate by phone/email before creation
- API endpoint: `POST /client/{company_id}` (verify in OpenAPI)

**`onboarding_create_test_bookings(company_id, count=5)`**
- Generate sample appointments using created staff/services
- Distribute across next 7 days
- Random staff/service/time combinations
- Validation: at least 1 staff + 1 service exist

**`onboarding_set_schedules(company_id, schedule_data)`**
- Bulk schedule setup for staff
- Accept: `[{staff_id, day_of_week, start_time, end_time}, ...]`
- API endpoint: verify schedule creation endpoint exists

### Utility Tools (3)

**`onboarding_preview_data(data_type, raw_input)`**
- Parse without creating entities
- Show structured preview with field mapping
- Highlight validation errors
- Types: 'staff', 'services', 'clients'

**`onboarding_checkpoint(company_id)`**
- Manual save point (auto-checkpoints also happen)
- Return: checkpoint ID and timestamp

**`onboarding_rollback_phase(company_id, phase_name)`**
- Delete entities from specified phase
- Reset state to previous checkpoint
- Reverse order: bookings → clients → services → categories → staff
- Confirmation required for destructive action

## Workflow Phases

**Standard flow:**
```
1. altegio_login(email, password)
2. onboarding_start(company_id)
3. onboarding_add_categories(company_id, [...])
4. onboarding_add_staff_batch(company_id, [...])
5. onboarding_add_services_batch(company_id, [...])
6. onboarding_set_schedules(company_id, [...])
7. onboarding_import_clients(company_id, csv)
8. onboarding_create_test_bookings(company_id)
9. onboarding_status(company_id) → "complete"
```

**Resume flow (after error):**
```
1. altegio_login(...)
2. onboarding_resume(company_id) → "Phase: services, Staff: 5 created"
3. onboarding_add_services_batch(...) → continue from checkpoint
```

## Data Flow & Validation

### Input Parsing

**CSV Detection:**
- Header row detection: first row with string fields
- Column mapping: fuzzy match to API fields
  - "Name" / "Staff Name" / "Employee" → `name`
  - "Phone" / "Tel" / "Contact" → `phone`
- Support quoted fields with commas
- UTF-8 encoding

**JSON Arrays:**
```json
[
  {"name": "Alice", "specialization": "Hairdresser", "phone": "+1234567890"},
  {"name": "Bob", "specialization": "Nail Technician"}
]
```

**Zod Schemas:**
```typescript
const StaffBatchItemSchema = z.object({
  name: z.string().min(1),
  specialization: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  position_id: z.number().optional(),
  api_id: z.string().optional()
});

const StaffBatchSchema = z.array(StaffBatchItemSchema);
```

### Error Handling

**API Failures:**
- Partial success: save created IDs, return errors for failed entries
- Network timeout: auto-checkpoint before error, suggest resume
- Rate limit hit: pause, show wait time, auto-resume after delay

**Validation Errors:**
- Pre-flight validation before API calls
- Return structured errors: `{row: 3, field: "phone", error: "invalid format"}`
- Suggest `onboarding_preview_data()` for large datasets

**State Corruption:**
- Validate state schema on load
- Backup previous state before mutations
- Recovery: delete corrupted state, suggest `onboarding_start()` fresh

### Rollback Strategy

**Phase-level rollback:**
1. Load state and target phase checkpoint
2. Collect entity IDs from phase
3. Delete in reverse dependency order:
   - Bookings depend on clients/staff/services
   - Services depend on categories
   - No dependencies: staff, clients, categories
4. Update state: remove phase checkpoint, set phase to previous
5. Confirm deletion count to user

**Safety:**
- Require explicit phase name (no "rollback everything" shortcut)
- Dry-run option: show what would be deleted
- Confirmation prompt for >10 entities

## Implementation Plan

### File Structure

```
src/
  providers/
    onboarding-state-manager.ts   # 300 lines: load/save/checkpoint/rollback
  tools/
    onboarding-handlers.ts         # 600 lines: 12 tool implementations
    onboarding-registry.ts         # 150 lines: MCP tool definitions
  types/
    onboarding.types.ts            # 200 lines: interfaces, Zod schemas
  utils/
    csv-parser.ts                  # 150 lines: CSV parsing logic
  __tests__/
    onboarding-state-manager.test.ts
    onboarding-handlers.test.ts
    csv-parser.test.ts
```

### API Endpoints Required

**Verify in `api.docs/docs/altegio/en/openapi.yml`:**
- ✅ `POST /staff/{company_id}` - staff creation
- ✅ `POST /company/{company_id}/services` - service creation
- ✅ `POST /record/{company_id}` - booking creation
- ⚠️ `POST /client/{company_id}` - **verify exists**
- ⚠️ `POST /service_categories/{company_id}` - **verify exists**
- ⚠️ `POST /schedule/{company_id}` - **verify exists or use alternative**

**Action:** Check OpenAPI spec before implementation. If endpoints missing, adjust design.

### Testing Strategy

**Unit Tests:**
- State manager: save/load/checkpoint/rollback isolation
- CSV parser: various formats, edge cases (quoted commas, UTF-8)
- Validation schemas: valid/invalid inputs
- Error handling: API failures, validation errors

**Integration Tests:**
- Full onboarding flow with mocked API responses
- Resume after simulated error mid-batch
- Rollback with dependency checking
- State persistence across tool calls

**Manual Testing:**
- Real API integration (staging environment)
- Large CSV imports (100+ rows)
- Network interruption scenarios
- LLM conversation flow (Claude Desktop)

**Coverage Target:** 85%+ for new modules

### Deployment

**No Breaking Changes:**
- Existing 16 tools unchanged
- Add 12 new tools to registry
- Backward compatible state directory

**Documentation:**
- Update README with onboarding use case
- Create `docs/ONBOARDING_GUIDE.md` with examples
- Add CSV template examples

**Rollout:**
1. Merge feature branch to main
2. Deploy to staging for validation
3. Test with 2-3 pilot users
4. Production deployment
5. Monitor error rates and usage metrics

## Open Questions

1. **Client creation API:** Verify `POST /client/{company_id}` exists in OpenAPI spec
2. **Category creation:** Confirm endpoint or use existing `get_service_categories` read-only approach
3. **Schedule API:** Check if dedicated endpoint or embedded in staff entity
4. **Rate limit strategy:** Should batch operations have built-in delays to avoid hitting 200 req/min?
5. **Position mapping:** How to map text ("Manager") to position_id? Static mapping or dynamic lookup?

## Success Metrics

- **Adoption:** 50%+ of new clients use onboarding vs manual setup
- **Completion rate:** 80%+ of started sessions reach "complete" phase
- **Time savings:** 10min onboarding vs 30min manual (measured via timestamps)
- **Error recovery:** <5% of sessions require rollback
- **Data quality:** <2% of imported entities have validation errors

## Next Steps

1. Verify API endpoints in OpenAPI spec (client, categories, schedule)
2. Create feature branch via `using-git-worktrees` skill
3. Write implementation plan via `writing-plans` skill
4. TDD implementation: write tests first, then code
5. Integration testing with staging API
6. Documentation and examples
7. Pilot testing with select users
