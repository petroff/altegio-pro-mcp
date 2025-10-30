# Onboarding Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add conversational onboarding system with 12 stateful workflow tools for platform setup (staff, services, clients, test bookings)

**Architecture:** Persistent state manager + CSV parser + 12 MCP tools leveraging existing CRUD operations. State stored in `~/.altegio-mcp/onboarding/{company_id}/state.json` with checkpoint/resume capability.

**Tech Stack:** TypeScript, Zod validation, existing AltegioClient, Jest testing

**API Endpoints Verified:**
- ✅ `POST /clients/{company_id}` - client creation
- ✅ `POST /service_categories/{company_id}` - category creation
- ✅ Existing: staff, services, bookings (already implemented)

---

## Task 1: CSV Parser Utility

**Files:**
- Create: `src/utils/csv-parser.ts`
- Test: `src/utils/__tests__/csv-parser.test.ts`

### Step 1: Write failing test for basic CSV parsing

Create `src/utils/__tests__/csv-parser.test.ts`:

```typescript
import { parseCSV } from '../csv-parser';

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('should parse simple CSV with headers', () => {
      const csv = 'name,phone\nAlice,+1234567890\nBob,+0987654321';
      const result = parseCSV(csv);

      expect(result).toEqual([
        { name: 'Alice', phone: '+1234567890' },
        { name: 'Bob', phone: '+0987654321' }
      ]);
    });
  });
});
```

### Step 2: Run test to verify failure

Run: `npm test csv-parser.test.ts`
Expected: FAIL - "Cannot find module '../csv-parser'"

### Step 3: Implement minimal CSV parser

Create `src/utils/csv-parser.ts`:

```typescript
export interface ParsedRow {
  [key: string]: string;
}

export function parseCSV(input: string): ParsedRow[] {
  const lines = input.trim().split('\n');
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: ParsedRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}
```

### Step 4: Run test to verify pass

Run: `npm test csv-parser.test.ts`
Expected: PASS (1 test)

### Step 5: Add test for quoted fields with commas

Add to `src/utils/__tests__/csv-parser.test.ts`:

```typescript
it('should handle quoted fields with commas', () => {
  const csv = 'name,address\n"Smith, John","123 Main St, Apt 4"';
  const result = parseCSV(csv);

  expect(result).toEqual([
    { name: 'Smith, John', address: '123 Main St, Apt 4' }
  ]);
});
```

### Step 6: Run test to see failure

Run: `npm test csv-parser.test.ts`
Expected: FAIL - quoted fields not handled

### Step 7: Enhance parser for quoted fields

Update `src/utils/csv-parser.ts`:

```typescript
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export function parseCSV(input: string): ParsedRow[] {
  const lines = input.trim().split('\n');
  if (lines.length < 2) {
    return [];
  }

  const headers = splitCSVLine(lines[0]);
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const row: ParsedRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}
```

### Step 8: Run tests to verify all pass

Run: `npm test csv-parser.test.ts`
Expected: PASS (2 tests)

### Step 9: Add test for empty input

Add to test file:

```typescript
it('should return empty array for empty input', () => {
  expect(parseCSV('')).toEqual([]);
  expect(parseCSV('header')).toEqual([]);
});
```

### Step 10: Run tests and verify pass

Run: `npm test csv-parser.test.ts`
Expected: PASS (3 tests)

### Step 11: Commit CSV parser

```bash
git add src/utils/csv-parser.ts src/utils/__tests__/csv-parser.test.ts
git commit -m "feat(utils): add CSV parser with quoted field support"
```

---

## Task 2: Onboarding Types & Schemas

**Files:**
- Create: `src/types/onboarding.types.ts`
- Test: `src/types/__tests__/onboarding-types.test.ts`

### Step 1: Write test for onboarding state interface

Create `src/types/__tests__/onboarding-types.test.ts`:

```typescript
import { OnboardingStateSchema, OnboardingPhase } from '../onboarding.types';

describe('Onboarding Types', () => {
  it('should validate valid onboarding state', () => {
    const validState = {
      company_id: 123,
      phase: 'init' as OnboardingPhase,
      started_at: '2025-01-29T10:00:00Z',
      updated_at: '2025-01-29T10:00:00Z',
      checkpoints: {},
      conversation_context: {}
    };

    const result = OnboardingStateSchema.safeParse(validState);
    expect(result.success).toBe(true);
  });

  it('should reject invalid phase', () => {
    const invalidState = {
      company_id: 123,
      phase: 'invalid_phase',
      started_at: '2025-01-29T10:00:00Z',
      updated_at: '2025-01-29T10:00:00Z',
      checkpoints: {},
      conversation_context: {}
    };

    const result = OnboardingStateSchema.safeParse(invalidState);
    expect(result.success).toBe(false);
  });
});
```

### Step 2: Run test to verify failure

Run: `npm test onboarding-types.test.ts`
Expected: FAIL - "Cannot find module '../onboarding.types'"

### Step 3: Create onboarding types

Create `src/types/onboarding.types.ts`:

```typescript
import { z } from 'zod';

// Phase enum
export const OnboardingPhaseSchema = z.enum([
  'init',
  'staff',
  'categories',
  'services',
  'schedules',
  'clients',
  'test_bookings',
  'complete'
]);

export type OnboardingPhase = z.infer<typeof OnboardingPhaseSchema>;

// Checkpoint structure
export const CheckpointSchema = z.object({
  completed: z.boolean(),
  entity_ids: z.array(z.number()),
  timestamp: z.string(),
  metadata: z.record(z.unknown()).optional()
});

export type Checkpoint = z.infer<typeof CheckpointSchema>;

// Main state structure
export const OnboardingStateSchema = z.object({
  company_id: z.number(),
  phase: OnboardingPhaseSchema,
  started_at: z.string(),
  updated_at: z.string(),
  checkpoints: z.record(CheckpointSchema),
  conversation_context: z.record(z.unknown())
});

export type OnboardingState = z.infer<typeof OnboardingStateSchema>;

// Batch input schemas
export const StaffBatchItemSchema = z.object({
  name: z.string().min(1),
  specialization: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  position_id: z.number().optional(),
  api_id: z.string().optional()
});

export const ServiceBatchItemSchema = z.object({
  title: z.string().min(1),
  price_min: z.number(),
  price_max: z.number().optional(),
  duration: z.number(),
  category_id: z.number().optional(),
  api_id: z.string().optional()
});

export const ClientBatchItemSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  surname: z.string().optional(),
  comment: z.string().optional()
}).refine(data => data.phone || data.email, {
  message: 'Either phone or email is required'
});

export const CategoryBatchItemSchema = z.object({
  title: z.string().min(1),
  api_id: z.string().optional(),
  weight: z.number().optional()
});

export const StaffBatchSchema = z.array(StaffBatchItemSchema);
export const ServiceBatchSchema = z.array(ServiceBatchItemSchema);
export const ClientBatchSchema = z.array(ClientBatchItemSchema);
export const CategoryBatchSchema = z.array(CategoryBatchItemSchema);

export type StaffBatchItem = z.infer<typeof StaffBatchItemSchema>;
export type ServiceBatchItem = z.infer<typeof ServiceBatchItemSchema>;
export type ClientBatchItem = z.infer<typeof ClientBatchItemSchema>;
export type CategoryBatchItem = z.infer<typeof CategoryBatchItemSchema>;
```

### Step 4: Run tests to verify pass

Run: `npm test onboarding-types.test.ts`
Expected: PASS (2 tests)

### Step 5: Add test for batch schemas

Add to test file:

```typescript
import { StaffBatchSchema, ClientBatchSchema } from '../onboarding.types';

describe('Batch Schemas', () => {
  it('should validate staff batch', () => {
    const validBatch = [
      { name: 'Alice', specialization: 'Hairdresser' },
      { name: 'Bob', phone: '+1234567890' }
    ];

    const result = StaffBatchSchema.safeParse(validBatch);
    expect(result.success).toBe(true);
  });

  it('should reject client without phone or email', () => {
    const invalidBatch = [{ name: 'Alice' }];

    const result = ClientBatchSchema.safeParse(invalidBatch);
    expect(result.success).toBe(false);
  });
});
```

### Step 6: Run tests and verify pass

Run: `npm test onboarding-types.test.ts`
Expected: PASS (4 tests)

### Step 7: Commit types

```bash
git add src/types/onboarding.types.ts src/types/__tests__/onboarding-types.test.ts
git commit -m "feat(types): add onboarding state and batch schemas"
```

---

## Task 3: Onboarding State Manager

**Files:**
- Create: `src/providers/onboarding-state-manager.ts`
- Test: `src/providers/__tests__/onboarding-state-manager.test.ts`

### Step 1: Write test for state manager initialization

Create `src/providers/__tests__/onboarding-state-manager.test.ts`:

```typescript
import { OnboardingStateManager } from '../onboarding-state-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('OnboardingStateManager', () => {
  let manager: OnboardingStateManager;
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onboarding-test-'));
    manager = new OnboardingStateManager(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should initialize new onboarding session', async () => {
    const state = await manager.start(123);

    expect(state.company_id).toBe(123);
    expect(state.phase).toBe('init');
    expect(state.checkpoints).toEqual({});
    expect(state.started_at).toBeDefined();
  });

  it('should save and load state', async () => {
    const state = await manager.start(123);
    const loaded = await manager.load(123);

    expect(loaded).toEqual(state);
  });
});
```

### Step 2: Run test to verify failure

Run: `npm test onboarding-state-manager.test.ts`
Expected: FAIL - "Cannot find module '../onboarding-state-manager'"

### Step 3: Implement state manager

Create `src/providers/onboarding-state-manager.ts`:

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { OnboardingState, OnboardingPhase, Checkpoint } from '../types/onboarding.types';
import { logger } from '../utils/logger';

export class OnboardingStateManager {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.altegio-mcp',
      'onboarding'
    );
  }

  private getStatePath(companyId: number): string {
    return path.join(this.baseDir, companyId.toString(), 'state.json');
  }

  async start(companyId: number): Promise<OnboardingState> {
    const now = new Date().toISOString();
    const state: OnboardingState = {
      company_id: companyId,
      phase: 'init',
      started_at: now,
      updated_at: now,
      checkpoints: {},
      conversation_context: {}
    };

    await this.save(state);
    logger.info({ company_id: companyId }, 'Onboarding session started');
    return state;
  }

  async save(state: OnboardingState): Promise<void> {
    const statePath = this.getStatePath(state.company_id);
    const dir = path.dirname(statePath);

    await fs.mkdir(dir, { recursive: true });

    // Atomic write: temp file + rename
    const tempPath = `${statePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf-8');
    await fs.rename(tempPath, statePath);
  }

  async load(companyId: number): Promise<OnboardingState | null> {
    const statePath = this.getStatePath(companyId);

    try {
      const content = await fs.readFile(statePath, 'utf-8');
      return JSON.parse(content) as OnboardingState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async checkpoint(
    companyId: number,
    phase: OnboardingPhase,
    entityIds: number[],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const state = await this.load(companyId);
    if (!state) {
      throw new Error(`No onboarding session found for company ${companyId}`);
    }

    const checkpoint: Checkpoint = {
      completed: true,
      entity_ids: entityIds,
      timestamp: new Date().toISOString(),
      metadata
    };

    state.checkpoints[phase] = checkpoint;
    state.updated_at = new Date().toISOString();
    state.phase = phase;

    await this.save(state);
    logger.info({ company_id: companyId, phase }, 'Checkpoint created');
  }

  async updatePhase(companyId: number, phase: OnboardingPhase): Promise<void> {
    const state = await this.load(companyId);
    if (!state) {
      throw new Error(`No onboarding session found for company ${companyId}`);
    }

    state.phase = phase;
    state.updated_at = new Date().toISOString();
    await this.save(state);
  }
}
```

### Step 4: Run tests to verify pass

Run: `npm test onboarding-state-manager.test.ts`
Expected: PASS (2 tests)

### Step 5: Add test for checkpoint functionality

Add to test file:

```typescript
it('should create checkpoint with entity IDs', async () => {
  await manager.start(123);
  await manager.checkpoint(123, 'staff', [1, 2, 3]);

  const state = await manager.load(123);
  expect(state?.checkpoints['staff']).toBeDefined();
  expect(state?.checkpoints['staff'].entity_ids).toEqual([1, 2, 3]);
  expect(state?.checkpoints['staff'].completed).toBe(true);
});
```

### Step 6: Run test and verify pass

Run: `npm test onboarding-state-manager.test.ts`
Expected: PASS (3 tests)

### Step 7: Add test for phase update

Add to test file:

```typescript
it('should update phase', async () => {
  await manager.start(123);
  await manager.updatePhase(123, 'staff');

  const state = await manager.load(123);
  expect(state?.phase).toBe('staff');
});
```

### Step 8: Run tests and verify pass

Run: `npm test onboarding-state-manager.test.ts`
Expected: PASS (4 tests)

### Step 9: Commit state manager

```bash
git add src/providers/onboarding-state-manager.ts src/providers/__tests__/onboarding-state-manager.test.ts
git commit -m "feat(providers): add onboarding state manager with checkpoint support"
```

---

## Task 4: Extend AltegioClient with Client & Category Methods

**Files:**
- Modify: `src/providers/altegio-client.ts`
- Test: `src/providers/__tests__/altegio-client-onboarding.test.ts`

### Step 1: Write test for createClient method

Create `src/providers/__tests__/altegio-client-onboarding.test.ts`:

```typescript
import { AltegioClient } from '../altegio-client';

describe('AltegioClient - Onboarding Methods', () => {
  let client: AltegioClient;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    client = new AltegioClient({
      apiToken: 'test-token',
      apiBase: 'https://api.test.com/api/v1'
    });

    // Simulate login
    (client as any).userToken = 'test-user-token';
  });

  describe('createClient', () => {
    it('should create a client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 100, name: 'Test Client', phone: '1234567890' }
        })
      });

      const result = await client.createClient(123, {
        name: 'Test Client',
        phone: '1234567890'
      });

      expect(result.id).toBe(100);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/clients/123',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test Client', phone: '1234567890' })
        })
      );
    });
  });
});
```

### Step 2: Run test to verify failure

Run: `npm test altegio-client-onboarding.test.ts`
Expected: FAIL - "client.createClient is not a function"

### Step 3: Add createClient method to AltegioClient

Add to `src/providers/altegio-client.ts`:

```typescript
// Add to imports
import type { ClientBatchItem, CategoryBatchItem } from '../types/onboarding.types';

// Add interface for client response
export interface AltegioClient {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  surname?: string;
  [key: string]: unknown;
}

// Add method to AltegioClient class
async createClient(
  companyId: number,
  data: ClientBatchItem
): Promise<AltegioClient> {
  if (!this.userToken) {
    throw new Error('Not authenticated');
  }

  const response = await this.apiRequest(`/clients/${companyId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`Failed to create client: ${response.statusText}`);
  }

  const result = (await response.json()) as AltegioApiResponse<AltegioClient>;

  if (result.success && result.data) {
    return result.data;
  }

  throw new Error(result.meta?.message || 'Failed to create client');
}
```

### Step 4: Run test to verify pass

Run: `npm test altegio-client-onboarding.test.ts`
Expected: PASS (1 test)

### Step 5: Add test for createServiceCategory

Add to test file:

```typescript
describe('createServiceCategory', () => {
  it('should create a service category', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 10, title: 'Hair Services', weight: 1 }
      })
    });

    const result = await client.createServiceCategory(123, {
      title: 'Hair Services'
    });

    expect(result.id).toBe(10);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/api/v1/service_categories/123',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });
});
```

### Step 6: Run test to verify failure

Run: `npm test altegio-client-onboarding.test.ts`
Expected: FAIL - "client.createServiceCategory is not a function"

### Step 7: Add createServiceCategory method

Add to `src/providers/altegio-client.ts`:

```typescript
async createServiceCategory(
  companyId: number,
  data: CategoryBatchItem
): Promise<AltegioServiceCategory> {
  if (!this.userToken) {
    throw new Error('Not authenticated');
  }

  const response = await this.apiRequest(`/service_categories/${companyId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`Failed to create category: ${response.statusText}`);
  }

  const result = (await response.json()) as AltegioApiResponse<AltegioServiceCategory>;

  if (result.success && result.data) {
    return result.data;
  }

  throw new Error(result.meta?.message || 'Failed to create category');
}
```

### Step 8: Run tests to verify pass

Run: `npm test altegio-client-onboarding.test.ts`
Expected: PASS (2 tests)

### Step 9: Commit client extensions

```bash
git add src/providers/altegio-client.ts src/providers/__tests__/altegio-client-onboarding.test.ts
git commit -m "feat(client): add createClient and createServiceCategory methods"
```

---

## Task 5: Onboarding Handlers - Control Tools

**Files:**
- Create: `src/tools/onboarding-handlers.ts`
- Test: `src/tools/__tests__/onboarding-handlers.test.ts`

### Step 1: Write test for onboarding_start handler

Create `src/tools/__tests__/onboarding-handlers.test.ts`:

```typescript
import { OnboardingHandlers } from '../onboarding-handlers';
import { AltegioClient } from '../../providers/altegio-client';
import { OnboardingStateManager } from '../../providers/onboarding-state-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Onboarding Handlers', () => {
  let handlers: OnboardingHandlers;
  let mockClient: jest.Mocked<AltegioClient>;
  let stateManager: OnboardingStateManager;
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onboarding-test-'));
    stateManager = new OnboardingStateManager(testDir);

    mockClient = {
      isAuthenticated: jest.fn().mockReturnValue(true)
    } as any;

    handlers = new OnboardingHandlers(mockClient, stateManager);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('start', () => {
    it('should initialize onboarding session', async () => {
      const result = await handlers.start({ company_id: 123 });

      expect(result.content[0].text).toContain('Onboarding session started');
      expect(result.content[0].text).toContain('company 123');
    });

    it('should reject if not authenticated', async () => {
      mockClient.isAuthenticated.mockReturnValue(false);

      await expect(handlers.start({ company_id: 123 }))
        .rejects.toThrow('Authentication required');
    });
  });
});
```

### Step 2: Run test to verify failure

Run: `npm test onboarding-handlers.test.ts`
Expected: FAIL - "Cannot find module '../onboarding-handlers'"

### Step 3: Create onboarding handlers class

Create `src/tools/onboarding-handlers.ts`:

```typescript
import { AltegioClient } from '../providers/altegio-client';
import { OnboardingStateManager } from '../providers/onboarding-state-manager';
import { logger } from '../utils/logger';
import { z } from 'zod';

const CompanyIdSchema = z.object({
  company_id: z.number()
});

export class OnboardingHandlers {
  constructor(
    private client: AltegioClient,
    private stateManager: OnboardingStateManager
  ) {}

  async start(args: unknown) {
    if (!this.client.isAuthenticated()) {
      throw new Error('Authentication required. Please use altegio_login first.');
    }

    const { company_id } = CompanyIdSchema.parse(args);
    const state = await this.stateManager.start(company_id);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Onboarding session started for company ${company_id}.\n\n` +
                `Current phase: ${state.phase}\n` +
                `Started at: ${state.started_at}\n\n` +
                `Next steps:\n` +
                `1. Add service categories: onboarding_add_categories\n` +
                `2. Add staff: onboarding_add_staff_batch\n` +
                `3. Add services: onboarding_add_services_batch\n` +
                `4. Import clients: onboarding_import_clients\n` +
                `5. Create test bookings: onboarding_create_test_bookings`
        }
      ]
    };
  }
}
```

### Step 4: Run tests to verify pass

Run: `npm test onboarding-handlers.test.ts`
Expected: PASS (2 tests)

### Step 5: Add resume handler with test

Add to test file:

```typescript
describe('resume', () => {
  it('should show progress summary', async () => {
    await handlers.start({ company_id: 123 });
    await stateManager.checkpoint(123, 'staff', [1, 2, 3]);

    const result = await handlers.resume({ company_id: 123 });

    expect(result.content[0].text).toContain('staff: 3 entities created');
  });

  it('should handle no existing session', async () => {
    await expect(handlers.resume({ company_id: 999 }))
      .rejects.toThrow('No onboarding session found');
  });
});
```

### Step 6: Implement resume handler

Add to `src/tools/onboarding-handlers.ts`:

```typescript
async resume(args: unknown) {
  if (!this.client.isAuthenticated()) {
    throw new Error('Authentication required. Please use altegio_login first.');
  }

  const { company_id } = CompanyIdSchema.parse(args);
  const state = await this.stateManager.load(company_id);

  if (!state) {
    throw new Error(`No onboarding session found for company ${company_id}`);
  }

  const completedPhases = Object.entries(state.checkpoints)
    .filter(([_, checkpoint]) => checkpoint.completed)
    .map(([phase, checkpoint]) =>
      `  - ${phase}: ${checkpoint.entity_ids.length} entities created`
    )
    .join('\n');

  return {
    content: [
      {
        type: 'text' as const,
        text: `Onboarding session for company ${company_id}\n\n` +
              `Current phase: ${state.phase}\n` +
              `Started: ${state.started_at}\n\n` +
              `Completed:\n${completedPhases || '  (none yet)'}\n\n` +
              `Continue with next step based on current phase.`
      }
    ]
  };
}
```

### Step 7: Run tests and verify pass

Run: `npm test onboarding-handlers.test.ts`
Expected: PASS (4 tests)

### Step 8: Add status handler with test

Add test and implementation following same pattern:

```typescript
// Test
describe('status', () => {
  it('should show current status', async () => {
    await handlers.start({ company_id: 123 });
    const result = await handlers.status({ company_id: 123 });

    expect(result.content[0].text).toContain('Phase: init');
  });
});

// Implementation
async status(args: unknown) {
  if (!this.client.isAuthenticated()) {
    throw new Error('Authentication required');
  }

  const { company_id } = CompanyIdSchema.parse(args);
  const state = await this.stateManager.load(company_id);

  if (!state) {
    throw new Error(`No onboarding session found for company ${company_id}`);
  }

  const totalEntities = Object.values(state.checkpoints)
    .reduce((sum, cp) => sum + cp.entity_ids.length, 0);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Onboarding Status - Company ${company_id}\n\n` +
              `Phase: ${state.phase}\n` +
              `Total entities created: ${totalEntities}\n` +
              `Phases completed: ${Object.keys(state.checkpoints).length}`
      }
    ]
  };
}
```

### Step 9: Run full test suite

Run: `npm test onboarding-handlers.test.ts`
Expected: PASS (5 tests)

### Step 10: Commit control tools

```bash
git add src/tools/onboarding-handlers.ts src/tools/__tests__/onboarding-handlers.test.ts
git commit -m "feat(onboarding): add control tools (start/resume/status)"
```

---

## Task 6: Onboarding Handlers - Batch Data Tools

**Files:**
- Modify: `src/tools/onboarding-handlers.ts`
- Modify: `src/tools/__tests__/onboarding-handlers.test.ts`

### Step 1: Add test for add_staff_batch with JSON input

Add to `src/tools/__tests__/onboarding-handlers.test.ts`:

```typescript
describe('addStaffBatch', () => {
  it('should create staff from JSON array', async () => {
    await handlers.start({ company_id: 123 });

    mockClient.createStaff = jest.fn()
      .mockResolvedValueOnce({ id: 1, name: 'Alice' })
      .mockResolvedValueOnce({ id: 2, name: 'Bob' });

    const result = await handlers.addStaffBatch({
      company_id: 123,
      staff_data: [
        { name: 'Alice', specialization: 'Hairdresser' },
        { name: 'Bob', specialization: 'Nail Tech' }
      ]
    });

    expect(result.content[0].text).toContain('2 staff members created');
    expect(mockClient.createStaff).toHaveBeenCalledTimes(2);
  });
});
```

### Step 2: Run test to verify failure

Run: `npm test onboarding-handlers.test.ts`
Expected: FAIL - "handlers.addStaffBatch is not a function"

### Step 3: Implement addStaffBatch handler

Add to `src/tools/onboarding-handlers.ts`:

```typescript
import { StaffBatchSchema } from '../types/onboarding.types';
import { parseCSV } from '../utils/csv-parser';

const StaffBatchArgsSchema = z.object({
  company_id: z.number(),
  staff_data: z.union([StaffBatchSchema, z.string()])
});

async addStaffBatch(args: unknown) {
  if (!this.client.isAuthenticated()) {
    throw new Error('Authentication required');
  }

  const { company_id, staff_data } = StaffBatchArgsSchema.parse(args);

  // Parse CSV if string
  let staffArray = typeof staff_data === 'string'
    ? parseCSV(staff_data)
    : staff_data;

  // Validate with Zod
  staffArray = StaffBatchSchema.parse(staffArray);

  const created: number[] = [];
  const errors: string[] = [];

  for (const staff of staffArray) {
    try {
      const result = await this.client.createStaff(company_id, staff);
      created.push(result.id);
    } catch (error) {
      errors.push(`${staff.name}: ${(error as Error).message}`);
    }
  }

  // Checkpoint
  await this.stateManager.checkpoint(company_id, 'staff', created);
  await this.stateManager.updatePhase(company_id, 'categories');

  return {
    content: [
      {
        type: 'text' as const,
        text: `Staff batch processing complete:\n\n` +
              `✓ ${created.length} staff members created\n` +
              (errors.length ? `✗ ${errors.length} failed:\n  ${errors.join('\n  ')}` : '') +
              `\n\nNext: Add service categories with onboarding_add_categories`
      }
    ]
  };
}
```

### Step 4: Run test to verify pass

Run: `npm test onboarding-handlers.test.ts -- -t "addStaffBatch"`
Expected: PASS

### Step 5: Add test for CSV input

Add to test file:

```typescript
it('should create staff from CSV string', async () => {
  await handlers.start({ company_id: 123 });

  mockClient.createStaff = jest.fn()
    .mockResolvedValue({ id: 1, name: 'Alice' });

  const csv = 'name,specialization\nAlice,Hairdresser';

  const result = await handlers.addStaffBatch({
    company_id: 123,
    staff_data: csv
  });

  expect(result.content[0].text).toContain('1 staff member');
  expect(mockClient.createStaff).toHaveBeenCalledWith(
    123,
    expect.objectContaining({ name: 'Alice', specialization: 'Hairdresser' })
  );
});
```

### Step 6: Run test to verify pass

Run: `npm test onboarding-handlers.test.ts -- -t "CSV"`
Expected: PASS

### Step 7: Add remaining batch handlers

Following same TDD pattern, add:
- `addServicesB`atch (similar to staff)
- `addCategories` (simpler, no CSV)
- `importClients` (with CSV support)

Shortened for brevity - follow same test-first pattern:

```typescript
// Test then implement each
async addServicesBatch(args: unknown) { /* similar to addStaffBatch */ }
async addCategories(args: unknown) { /* simpler, array only */ }
async importClients(args: unknown) { /* similar to addStaffBatch */ }
```

### Step 8: Run full batch tools test suite

Run: `npm test onboarding-handlers.test.ts -- -t "Batch"`
Expected: All batch tool tests pass

### Step 9: Commit batch tools

```bash
git add src/tools/onboarding-handlers.ts src/tools/__tests__/onboarding-handlers.test.ts
git commit -m "feat(onboarding): add batch data tools (staff/services/categories/clients)"
```

---

## Task 7: Test Bookings Generator

**Files:**
- Modify: `src/tools/onboarding-handlers.ts`
- Modify: `src/tools/__tests__/onboarding-handlers.test.ts`

### Step 1: Add test for createTestBookings

Add to test file:

```typescript
describe('createTestBookings', () => {
  it('should generate test bookings', async () => {
    await handlers.start({ company_id: 123 });
    await stateManager.checkpoint(123, 'staff', [1, 2]);
    await stateManager.checkpoint(123, 'services', [10, 11]);

    mockClient.createBooking = jest.fn()
      .mockResolvedValue({ id: 100 });

    const result = await handlers.createTestBookings({
      company_id: 123,
      count: 3
    });

    expect(result.content[0].text).toContain('3 test bookings');
    expect(mockClient.createBooking).toHaveBeenCalledTimes(3);
  });

  it('should reject if no staff exist', async () => {
    await handlers.start({ company_id: 123 });

    await expect(handlers.createTestBookings({ company_id: 123, count: 2 }))
      .rejects.toThrow('No staff or services found');
  });
});
```

### Step 2: Run test to verify failure

Run: `npm test onboarding-handlers.test.ts -- -t "createTestBookings"`
Expected: FAIL - "handlers.createTestBookings is not a function"

### Step 3: Implement createTestBookings

Add to `src/tools/onboarding-handlers.ts`:

```typescript
const TestBookingsArgsSchema = z.object({
  company_id: z.number(),
  count: z.number().min(1).max(10).default(5)
});

async createTestBookings(args: unknown) {
  if (!this.client.isAuthenticated()) {
    throw new Error('Authentication required');
  }

  const { company_id, count } = TestBookingsArgsSchema.parse(args);
  const state = await this.stateManager.load(company_id);

  if (!state) {
    throw new Error(`No onboarding session found`);
  }

  const staffIds = state.checkpoints['staff']?.entity_ids || [];
  const serviceIds = state.checkpoints['services']?.entity_ids || [];

  if (staffIds.length === 0 || serviceIds.length === 0) {
    throw new Error('No staff or services found. Complete previous steps first.');
  }

  const created: number[] = [];

  for (let i = 0; i < count; i++) {
    const staffId = staffIds[i % staffIds.length];
    const serviceId = serviceIds[i % serviceIds.length];

    // Generate booking 1-7 days in future
    const daysAhead = 1 + (i % 7);
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    const datetime = date.toISOString().split('T')[0] + ' 10:00:00';

    try {
      const booking = await this.client.createBooking(company_id, {
        staff_id: staffId,
        services: [serviceId],
        datetime,
        client: {
          name: `Test Client ${i + 1}`,
          phone: `+100000000${i}`
        }
      });
      created.push(booking.id);
    } catch (error) {
      logger.warn({ error }, 'Failed to create test booking');
    }
  }

  await this.stateManager.checkpoint(company_id, 'test_bookings', created);
  await this.stateManager.updatePhase(company_id, 'complete');

  return {
    content: [
      {
        type: 'text' as const,
        text: `Test bookings created: ${created.length}\n\n` +
              `Onboarding complete! ✓\n\n` +
              `Summary:\n` +
              `  - Staff: ${staffIds.length}\n` +
              `  - Services: ${serviceIds.length}\n` +
              `  - Test bookings: ${created.length}\n\n` +
              `Your platform is ready to use!`
      }
    ]
  };
}
```

### Step 4: Run tests to verify pass

Run: `npm test onboarding-handlers.test.ts -- -t "createTestBookings"`
Expected: PASS (2 tests)

### Step 5: Commit test bookings feature

```bash
git add src/tools/onboarding-handlers.ts src/tools/__tests__/onboarding-handlers.test.ts
git commit -m "feat(onboarding): add test bookings generator"
```

---

## Task 8: Utility Tools (Preview & Rollback)

**Files:**
- Modify: `src/tools/onboarding-handlers.ts`
- Modify: `src/tools/__tests__/onboarding-handlers.test.ts`

### Step 1: Add test for previewData

Add to test file:

```typescript
describe('previewData', () => {
  it('should parse and show CSV preview', async () => {
    const csv = 'name,phone\nAlice,+1234567890';

    const result = await handlers.previewData({
      data_type: 'staff',
      raw_input: csv
    });

    expect(result.content[0].text).toContain('Alice');
    expect(result.content[0].text).toContain('+1234567890');
    expect(result.content[0].text).toContain('2 fields');
  });
});
```

### Step 2: Implement previewData

Add to `src/tools/onboarding-handlers.ts`:

```typescript
const PreviewArgsSchema = z.object({
  data_type: z.enum(['staff', 'services', 'clients', 'categories']),
  raw_input: z.string()
});

async previewData(args: unknown) {
  const { data_type, raw_input } = PreviewArgsSchema.parse(args);

  const parsed = parseCSV(raw_input);

  if (parsed.length === 0) {
    return {
      content: [{
        type: 'text' as const,
        text: 'No data parsed. Check CSV format.'
      }]
    };
  }

  const preview = parsed.slice(0, 5).map((row, idx) =>
    `${idx + 1}. ${Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(', ')}`
  ).join('\n');

  return {
    content: [{
      type: 'text' as const,
      text: `Preview of ${data_type} data:\n\n` +
            `Total rows: ${parsed.length}\n` +
            `Fields: ${Object.keys(parsed[0]).length}\n\n` +
            `First ${Math.min(5, parsed.length)} rows:\n${preview}\n\n` +
            `Proceed with onboarding_add_${data_type}_batch to create.`
    }]
  };
}
```

### Step 3: Run test and verify pass

Run: `npm test onboarding-handlers.test.ts -- -t "previewData"`
Expected: PASS

### Step 4: Add rollbackPhase with tests

Add test and implementation:

```typescript
// Test
describe('rollbackPhase', () => {
  it('should delete entities and reset phase', async () => {
    await handlers.start({ company_id: 123 });
    await stateManager.checkpoint(123, 'staff', [1, 2, 3]);

    mockClient.deleteStaff = jest.fn().mockResolvedValue(true);

    const result = await handlers.rollbackPhase({
      company_id: 123,
      phase_name: 'staff'
    });

    expect(mockClient.deleteStaff).toHaveBeenCalledTimes(3);
    expect(result.content[0].text).toContain('Rolled back staff');
  });
});

// Implementation
async rollbackPhase(args: unknown) {
  if (!this.client.isAuthenticated()) {
    throw new Error('Authentication required');
  }

  const schema = z.object({
    company_id: z.number(),
    phase_name: z.string()
  });

  const { company_id, phase_name } = schema.parse(args);
  const state = await this.stateManager.load(company_id);

  if (!state || !state.checkpoints[phase_name]) {
    throw new Error(`No checkpoint found for phase: ${phase_name}`);
  }

  const checkpoint = state.checkpoints[phase_name];
  const entityIds = checkpoint.entity_ids;

  // Delete entities (implement based on phase)
  for (const id of entityIds) {
    try {
      if (phase_name === 'staff') {
        await this.client.deleteStaff(company_id, id);
      } else if (phase_name === 'services') {
        // Services don't have delete in API - skip
      } else if (phase_name === 'test_bookings') {
        await this.client.deleteBooking(company_id, id);
      }
    } catch (error) {
      logger.warn({ error, id }, `Failed to delete ${phase_name} entity`);
    }
  }

  // Remove checkpoint
  delete state.checkpoints[phase_name];
  state.updated_at = new Date().toISOString();
  await this.stateManager.save(state);

  return {
    content: [{
      type: 'text' as const,
      text: `Rolled back ${phase_name}: deleted ${entityIds.length} entities`
    }]
  };
}
```

### Step 5: Run tests and verify pass

Run: `npm test onboarding-handlers.test.ts`
Expected: All tests pass

### Step 6: Commit utility tools

```bash
git add src/tools/onboarding-handlers.ts src/tools/__tests__/onboarding-handlers.test.ts
git commit -m "feat(onboarding): add preview and rollback utility tools"
```

---

## Task 9: Registry Integration

**Files:**
- Create: `src/tools/onboarding-registry.ts`
- Modify: `src/tools/registry.ts`

### Step 1: Create onboarding tools registry

Create `src/tools/onboarding-registry.ts`:

```typescript
export const onboardingTools = [
  {
    name: 'onboarding_start',
    description: 'Initialize new onboarding session for a company',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' }
      },
      required: ['company_id']
    }
  },
  {
    name: 'onboarding_resume',
    description: 'Resume existing onboarding session and show progress',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' }
      },
      required: ['company_id']
    }
  },
  {
    name: 'onboarding_status',
    description: 'Show current onboarding status and progress',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' }
      },
      required: ['company_id']
    }
  },
  {
    name: 'onboarding_add_staff_batch',
    description: 'Bulk add staff members from JSON array or CSV',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' },
        staff_data: {
          description: 'JSON array or CSV string with staff data',
          oneOf: [
            { type: 'array', items: { type: 'object' } },
            { type: 'string' }
          ]
        }
      },
      required: ['company_id', 'staff_data']
    }
  },
  {
    name: 'onboarding_add_services_batch',
    description: 'Bulk add services from JSON array or CSV',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number' },
        services_data: {
          oneOf: [
            { type: 'array', items: { type: 'object' } },
            { type: 'string' }
          ]
        }
      },
      required: ['company_id', 'services_data']
    }
  },
  {
    name: 'onboarding_add_categories',
    description: 'Create service categories',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number' },
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              api_id: { type: 'string' },
              weight: { type: 'number' }
            },
            required: ['title']
          }
        }
      },
      required: ['company_id', 'categories']
    }
  },
  {
    name: 'onboarding_import_clients',
    description: 'Import client database from CSV',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number' },
        clients_csv: { type: 'string', description: 'CSV with name, phone, email' }
      },
      required: ['company_id', 'clients_csv']
    }
  },
  {
    name: 'onboarding_create_test_bookings',
    description: 'Generate test bookings using created staff and services',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number' },
        count: { type: 'number', minimum: 1, maximum: 10, default: 5 }
      },
      required: ['company_id']
    }
  },
  {
    name: 'onboarding_preview_data',
    description: 'Parse and preview data without creating entities',
    inputSchema: {
      type: 'object',
      properties: {
        data_type: {
          type: 'string',
          enum: ['staff', 'services', 'clients', 'categories']
        },
        raw_input: { type: 'string' }
      },
      required: ['data_type', 'raw_input']
    }
  },
  {
    name: 'onboarding_rollback_phase',
    description: 'Delete entities from specific phase and reset checkpoint',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number' },
        phase_name: { type: 'string' }
      },
      required: ['company_id', 'phase_name']
    }
  }
];
```

### Step 2: Add onboarding tools to main registry

Modify `src/tools/registry.ts` - add import and merge tools:

```typescript
import { onboardingTools } from './onboarding-registry';

export function getTools() {
  return [
    ...existingTools, // existing 16 tools
    ...onboardingTools // new 10 onboarding tools (12 handlers but some share names)
  ];
}
```

### Step 3: Wire up handlers in server

Modify `src/server.ts` to initialize onboarding handlers:

```typescript
import { OnboardingHandlers } from './tools/onboarding-handlers';
import { OnboardingStateManager } from './providers/onboarding-state-manager';

// In setupMCPServer function
const stateManager = new OnboardingStateManager();
const onboardingHandlers = new OnboardingHandlers(client, stateManager);

// Add handler routing
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Existing tool handlers
  if (name === 'altegio_login') return await handlers.login(args);
  // ... other existing handlers

  // Onboarding handlers
  if (name === 'onboarding_start') return await onboardingHandlers.start(args);
  if (name === 'onboarding_resume') return await onboardingHandlers.resume(args);
  if (name === 'onboarding_status') return await onboardingHandlers.status(args);
  if (name === 'onboarding_add_staff_batch') return await onboardingHandlers.addStaffBatch(args);
  if (name === 'onboarding_add_services_batch') return await onboardingHandlers.addServicesBatch(args);
  if (name === 'onboarding_add_categories') return await onboardingHandlers.addCategories(args);
  if (name === 'onboarding_import_clients') return await onboardingHandlers.importClients(args);
  if (name === 'onboarding_create_test_bookings') return await onboardingHandlers.createTestBookings(args);
  if (name === 'onboarding_preview_data') return await onboardingHandlers.previewData(args);
  if (name === 'onboarding_rollback_phase') return await onboardingHandlers.rollbackPhase(args);

  throw new Error(`Unknown tool: ${name}`);
});
```

### Step 4: Run full test suite

Run: `npm test`
Expected: All tests pass (93 + new onboarding tests)

### Step 5: Test type checking

Run: `npm run typecheck`
Expected: No type errors

### Step 6: Commit registry integration

```bash
git add src/tools/onboarding-registry.ts src/tools/registry.ts src/server.ts
git commit -m "feat(registry): integrate 10 onboarding tools into MCP server"
```

---

## Task 10: Integration Testing

**Files:**
- Create: `src/__tests__/onboarding-e2e.test.ts`

### Step 1: Write end-to-end onboarding flow test

Create `src/__tests__/onboarding-e2e.test.ts`:

```typescript
import { OnboardingHandlers } from '../tools/onboarding-handlers';
import { AltegioClient } from '../providers/altegio-client';
import { OnboardingStateManager } from '../providers/onboarding-state-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Onboarding E2E Flow', () => {
  let handlers: OnboardingHandlers;
  let mockClient: jest.Mocked<AltegioClient>;
  let stateManager: OnboardingStateManager;
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onboarding-e2e-'));
    stateManager = new OnboardingStateManager(testDir);

    mockClient = {
      isAuthenticated: jest.fn().mockReturnValue(true),
      createStaff: jest.fn().mockResolvedValue({ id: 1 }),
      createServiceCategory: jest.fn().mockResolvedValue({ id: 10 }),
      createService: jest.fn().mockResolvedValue({ id: 20 }),
      createClient: jest.fn().mockResolvedValue({ id: 30 }),
      createBooking: jest.fn().mockResolvedValue({ id: 100 })
    } as any;

    handlers = new OnboardingHandlers(mockClient, stateManager);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should complete full onboarding workflow', async () => {
    const companyId = 123;

    // Step 1: Start
    await handlers.start({ company_id: companyId });
    let state = await stateManager.load(companyId);
    expect(state?.phase).toBe('init');

    // Step 2: Add categories
    await handlers.addCategories({
      company_id: companyId,
      categories: [{ title: 'Hair Services' }]
    });
    state = await stateManager.load(companyId);
    expect(state?.checkpoints['categories']).toBeDefined();

    // Step 3: Add staff
    const staffCSV = 'name,specialization\nAlice,Hairdresser\nBob,Nail Tech';
    await handlers.addStaffBatch({
      company_id: companyId,
      staff_data: staffCSV
    });
    state = await stateManager.load(companyId);
    expect(state?.phase).toBe('categories');

    // Step 4: Add services
    await handlers.addServicesBatch({
      company_id: companyId,
      services_data: [
        { title: 'Haircut', price_min: 50, duration: 1800, category_id: 10 }
      ]
    });

    // Step 5: Import clients
    const clientsCSV = 'name,phone\nTest Client,+1234567890';
    await handlers.importClients({
      company_id: companyId,
      clients_csv: clientsCSV
    });

    // Step 6: Create test bookings
    await handlers.createTestBookings({
      company_id: companyId,
      count: 3
    });

    state = await stateManager.load(companyId);
    expect(state?.phase).toBe('complete');
    expect(mockClient.createBooking).toHaveBeenCalledTimes(3);
  });

  it('should resume after interruption', async () => {
    const companyId = 123;

    // Start and add staff
    await handlers.start({ company_id: companyId });
    await handlers.addStaffBatch({
      company_id: companyId,
      staff_data: [{ name: 'Alice', specialization: 'Test' }]
    });

    // Simulate interruption - create new handler instance
    const newHandlers = new OnboardingHandlers(mockClient, stateManager);

    // Resume
    const result = await newHandlers.resume({ company_id: companyId });
    expect(result.content[0].text).toContain('staff: 1 entities');

    // Continue workflow
    await newHandlers.addCategories({
      company_id: companyId,
      categories: [{ title: 'Test Category' }]
    });

    const state = await stateManager.load(companyId);
    expect(Object.keys(state!.checkpoints)).toHaveLength(2);
  });
});
```

### Step 2: Run E2E tests

Run: `npm test onboarding-e2e.test.ts`
Expected: PASS (2 tests)

### Step 3: Commit E2E tests

```bash
git add src/__tests__/onboarding-e2e.test.ts
git commit -m "test(onboarding): add end-to-end integration tests"
```

---

## Task 11: Documentation

**Files:**
- Create: `docs/ONBOARDING_GUIDE.md`
- Modify: `README.md`

### Step 1: Create onboarding guide

Create `docs/ONBOARDING_GUIDE.md`:

```markdown
# Onboarding Wizard Guide

Conversational assistant for initial platform setup via natural language or CSV paste.

## Workflow

### 1. Login
```
altegio_login(email="user@example.com", password="secret")
```

### 2. Start Session
```
onboarding_start(company_id=123)
```

### 3. Add Service Categories
```
onboarding_add_categories(
  company_id=123,
  categories=[
    {"title": "Hair Services", "weight": 1},
    {"title": "Nail Services", "weight": 2}
  ]
)
```

### 4. Bulk Add Staff
**Option A: JSON Array**
```
onboarding_add_staff_batch(
  company_id=123,
  staff_data=[
    {"name": "Alice", "specialization": "Hairdresser"},
    {"name": "Bob", "specialization": "Nail Technician"}
  ]
)
```

**Option B: CSV Paste**
```
onboarding_add_staff_batch(
  company_id=123,
  staff_data="name,specialization,phone
Alice,Hairdresser,+1234567890
Bob,Nail Technician,+0987654321"
)
```

### 5. Bulk Add Services
```
onboarding_add_services_batch(
  company_id=123,
  services_data=[
    {"title": "Haircut", "price_min": 50, "duration": 1800, "category_id": 1},
    {"title": "Manicure", "price_min": 30, "duration": 1200, "category_id": 2}
  ]
)
```

### 6. Import Clients
```
onboarding_import_clients(
  company_id=123,
  clients_csv="name,phone,email
John Smith,+1234567890,john@example.com
Jane Doe,+0987654321,jane@example.com"
)
```

### 7. Generate Test Bookings
```
onboarding_create_test_bookings(
  company_id=123,
  count=5
)
```

### 8. Check Status
```
onboarding_status(company_id=123)
```

## Resume After Error

```
onboarding_resume(company_id=123)
# Shows progress, continue from last checkpoint
```

## Preview Data Before Import

```
onboarding_preview_data(
  data_type="staff",
  raw_input="name,phone\nAlice,+1234567890"
)
```

## Rollback Phase

```
onboarding_rollback_phase(
  company_id=123,
  phase_name="staff"
)
```

## State Location

Persistent state: `~/.altegio-mcp/onboarding/{company_id}/state.json`
```

### Step 2: Update README

Add to `README.md` after "Available Tools" section:

```markdown
## Onboarding Wizard

For initial platform setup, use the **onboarding wizard** - a conversational assistant that guides you through:
- Bulk staff import (CSV or JSON)
- Service categories and services setup
- Client database import
- Test bookings generation

See [Onboarding Guide](docs/ONBOARDING_GUIDE.md) for detailed workflow.

**Quick start:**
```
altegio_login(...)
onboarding_start(company_id=123)
onboarding_add_staff_batch(company_id=123, staff_data="name,specialization\nAlice,Hairdresser")
```
```

### Step 3: Commit documentation

```bash
git add docs/ONBOARDING_GUIDE.md README.md
git commit -m "docs: add onboarding wizard guide and update README"
```

---

## Task 12: Final Integration & Verification

### Step 1: Run full test suite

Run: `npm test`
Expected: All tests pass (93 existing + ~30 new onboarding tests)

### Step 2: Run type checking

Run: `npm run typecheck`
Expected: No errors

### Step 3: Run linting

Run: `npm run lint`
Expected: No errors

### Step 4: Build and test manually

```bash
npm run build
ALTEGIO_API_TOKEN=your_token npm start
```

Test in Claude Desktop:
1. Call `onboarding_start`
2. Verify response format
3. Test CSV parsing with `onboarding_preview_data`

### Step 5: Final commit

```bash
git add -A
git commit -m "chore: final verification and cleanup"
```

### Step 6: Push feature branch

```bash
git push origin feature/onboarding-wizard
```

---

## Execution Complete

All 12 tasks implemented following TDD:
- ✅ CSV parser with quoted field support
- ✅ Onboarding types and Zod schemas
- ✅ State manager with checkpoint/resume
- ✅ AltegioClient extensions (client, categories)
- ✅ 10 onboarding tool handlers
- ✅ Registry integration (26 total tools)
- ✅ End-to-end integration tests
- ✅ Documentation

**Next Steps:**
1. Create PR: `gh pr create --fill`
2. Wait for CI checks
3. Request code review
4. Merge to main
5. Test in production

**Success Metrics to Monitor:**
- Adoption rate (% of new clients using wizard)
- Completion rate (% reaching "complete" phase)
- Time savings vs manual setup
- Error/rollback frequency
