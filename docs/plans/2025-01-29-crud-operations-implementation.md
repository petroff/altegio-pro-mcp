# CRUD Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Create/Update/Delete operations for Staff, Services, and Bookings entities

**Architecture:** Hybrid CRUD approach - keep existing get_* tools, add 6 new write tools (create_*, update_*, delete_*). Minimal validation (required fields only), delegate complex validation to Altegio API.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, Zod for validation, Jest for testing

---

## Task 1: Add Type Definitions for Write Operations

**Files:**
- Modify: `src/types/altegio.types.ts` (append at end, before export statements if any)

**Step 1: Write test for new types**

Create: `src/types/__tests__/write-types.test.ts`

```typescript
import type {
  CreateStaffRequest,
  UpdateStaffRequest,
  CreateServiceRequest,
  UpdateServiceRequest,
  CreateBookingRequest,
  UpdateBookingRequest,
} from '../altegio.types.js';

describe('Write Operation Types', () => {
  it('CreateStaffRequest should have correct structure', () => {
    const request: CreateStaffRequest = {
      name: 'John Doe',
      specialization: 'Stylist',
      position_id: 1,
      phone_number: '1234567890',
    };
    expect(request.name).toBe('John Doe');
  });

  it('CreateServiceRequest should have correct structure', () => {
    const request: CreateServiceRequest = {
      title: 'Haircut',
      category_id: 10,
    };
    expect(request.title).toBe('Haircut');
  });

  it('CreateBookingRequest should have correct structure', () => {
    const request: CreateBookingRequest = {
      staff_id: 123,
      services: [{ id: 456 }],
      datetime: '2025-11-01T10:00:00',
      client: { name: 'Jane', phone: '9876543210' },
    };
    expect(request.staff_id).toBe(123);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/types/__tests__/write-types.test.ts
```

Expected: FAIL with "Module not found" or type errors

**Step 3: Add type definitions**

Modify: `src/types/altegio.types.ts` (add at end of file, before any closing braces)

```typescript
// ========== Write Operation Request Types ==========

// Staff
export interface CreateStaffRequest {
  name: string;
  specialization: string;
  position_id: number | null;
  phone_number: string | null;
}

export interface UpdateStaffRequest {
  name?: string;
  specialization?: string;
  position_id?: number | null;
  phone_number?: string | null;
  hidden?: number;
  fired?: number;
}

// Services
export interface CreateServiceRequest {
  title: string;
  category_id: number;
  price_min?: number;
  price_max?: number;
  discount?: number;
  comment?: string;
  duration?: number;
  prepaid?: string;
}

export interface UpdateServiceRequest {
  title?: string;
  category_id?: number;
  price_min?: number;
  price_max?: number;
  discount?: number;
  comment?: string;
  duration?: number;
  active?: number;
}

// Bookings
export interface CreateBookingRequest {
  staff_id: number;
  services: Array<{ id: number; amount?: number }>;
  datetime: string;
  seance_length?: number;
  client: {
    name: string;
    phone: string;
    email?: string;
  };
  comment?: string;
  send_sms?: number;
  attendance?: number;
}

export interface UpdateBookingRequest {
  staff_id?: number;
  services?: Array<{ id: number; amount?: number }>;
  datetime?: string;
  seance_length?: number;
  client?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  comment?: string;
  attendance?: number;
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/types/__tests__/write-types.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/types/altegio.types.ts src/types/__tests__/write-types.test.ts
git commit -m "feat(types): add request types for CRUD operations"
```

---

## Task 2: Add Staff CRUD Methods to AltegioClient

**Files:**
- Modify: `src/providers/altegio-client.ts` (add after existing methods)
- Test: `src/providers/__tests__/altegio-client-staff.test.ts`

**Step 1: Write failing test**

Create: `src/providers/__tests__/altegio-client-staff.test.ts`

```typescript
import { AltegioClient } from '../altegio-client.js';
import type { AltegioConfig } from '../../types/altegio.types.js';

describe('AltegioClient - Staff CRUD', () => {
  let client: AltegioClient;
  const mockConfig: AltegioConfig = {
    partnerToken: 'test-token',
    userToken: 'test-user-token',
  };

  beforeEach(() => {
    client = new AltegioClient(mockConfig, '/tmp/test-credentials');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createStaff', () => {
    it('should create staff successfully', async () => {
      const mockResponse = {
        success: true,
        data: { id: 123, name: 'John Doe' },
        meta: {},
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const result = await client.createStaff(456, {
        name: 'John Doe',
        specialization: 'Stylist',
        position_id: 1,
        phone_number: '1234567890',
      });

      expect(result.id).toBe(123);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/location/staff/create_quick'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should throw error when not authenticated', async () => {
      const unauthClient = new AltegioClient(
        { partnerToken: 'test' },
        '/tmp/test'
      );

      await expect(
        unauthClient.createStaff(456, {
          name: 'John',
          specialization: 'Stylist',
          position_id: 1,
          phone_number: '123',
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateStaff', () => {
    it('should update staff successfully', async () => {
      const mockResponse = {
        success: true,
        data: { id: 123, name: 'John Smith' },
        meta: {},
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.updateStaff(456, 123, { name: 'John Smith' });

      expect(result.name).toBe('John Smith');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/staff/456/123'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('deleteStaff', () => {
    it('should delete staff successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.deleteStaff(456, 123);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/staff/456/123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/providers/__tests__/altegio-client-staff.test.ts
```

Expected: FAIL - methods don't exist

**Step 3: Implement Staff CRUD methods**

Modify: `src/providers/altegio-client.ts` (add after existing methods, before closing brace)

```typescript
  // ========== Staff CRUD Operations ==========

  async createStaff(
    companyId: number,
    data: import('../types/altegio.types.js').CreateStaffRequest
  ): Promise<AltegioStaff> {
    if (!this.userToken) {
      throw new Error('Not authenticated. Use login() first.');
    }

    const response = await this.apiRequest(
      `/api/location/staff/create_quick?company_id=${companyId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create staff: HTTP ${response.status} - ${errorText}`
      );
    }

    const result = (await response.json()) as AltegioApiResponse<AltegioStaff>;
    if (!result.success || !result.data) {
      throw new Error('Failed to create staff: Invalid response');
    }

    return result.data;
  }

  async updateStaff(
    companyId: number,
    staffId: number,
    data: import('../types/altegio.types.js').UpdateStaffRequest
  ): Promise<AltegioStaff> {
    if (!this.userToken) {
      throw new Error('Not authenticated. Use login() first.');
    }

    const response = await this.apiRequest(`/staff/${companyId}/${staffId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update staff: HTTP ${response.status} - ${errorText}`
      );
    }

    const result = (await response.json()) as AltegioApiResponse<AltegioStaff>;
    if (!result.success || !result.data) {
      throw new Error('Failed to update staff: Invalid response');
    }

    return result.data;
  }

  async deleteStaff(companyId: number, staffId: number): Promise<void> {
    if (!this.userToken) {
      throw new Error('Not authenticated. Use login() first.');
    }

    const response = await this.apiRequest(`/staff/${companyId}/${staffId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete staff: HTTP ${response.status} - ${errorText}`
      );
    }
  }
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- src/providers/__tests__/altegio-client-staff.test.ts
```

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/providers/altegio-client.ts src/providers/__tests__/altegio-client-staff.test.ts
git commit -m "feat(client): add Staff CRUD methods to AltegioClient"
```

---

## Task 3: Add Service CRUD Methods to AltegioClient

**Files:**
- Modify: `src/providers/altegio-client.ts`
- Test: `src/providers/__tests__/altegio-client-services.test.ts`

**Step 1: Write failing test**

Create: `src/providers/__tests__/altegio-client-services.test.ts`

```typescript
import { AltegioClient } from '../altegio-client.js';
import type { AltegioConfig } from '../../types/altegio.types.js';

describe('AltegioClient - Services CRUD', () => {
  let client: AltegioClient;
  const mockConfig: AltegioConfig = {
    partnerToken: 'test-token',
    userToken: 'test-user-token',
  };

  beforeEach(() => {
    client = new AltegioClient(mockConfig, '/tmp/test-credentials');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createService', () => {
    it('should create service successfully', async () => {
      const mockResponse = {
        success: true,
        data: { id: 789, title: 'Haircut' },
        meta: {},
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const result = await client.createService(456, {
        title: 'Haircut',
        category_id: 10,
      });

      expect(result.id).toBe(789);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/services/456'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should throw error when not authenticated', async () => {
      const unauthClient = new AltegioClient(
        { partnerToken: 'test' },
        '/tmp/test'
      );

      await expect(
        unauthClient.createService(456, { title: 'Test', category_id: 1 })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateService', () => {
    it('should update service successfully', async () => {
      const mockResponse = {
        success: true,
        data: { id: 789, title: 'New Haircut' },
        meta: {},
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.updateService(456, 789, {
        title: 'New Haircut',
      });

      expect(result.title).toBe('New Haircut');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/services/456/services/789'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/providers/__tests__/altegio-client-services.test.ts
```

Expected: FAIL - methods don't exist

**Step 3: Implement Service CRUD methods**

Modify: `src/providers/altegio-client.ts` (add after Staff methods)

```typescript
  // ========== Services CRUD Operations ==========

  async createService(
    companyId: number,
    data: import('../types/altegio.types.js').CreateServiceRequest
  ): Promise<AltegioService> {
    if (!this.userToken) {
      throw new Error('Not authenticated. Use login() first.');
    }

    const response = await this.apiRequest(`/services/${companyId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create service: HTTP ${response.status} - ${errorText}`
      );
    }

    const result = (await response.json()) as AltegioApiResponse<AltegioService>;
    if (!result.success || !result.data) {
      throw new Error('Failed to create service: Invalid response');
    }

    return result.data;
  }

  async updateService(
    companyId: number,
    serviceId: number,
    data: import('../types/altegio.types.js').UpdateServiceRequest
  ): Promise<AltegioService> {
    if (!this.userToken) {
      throw new Error('Not authenticated. Use login() first.');
    }

    const response = await this.apiRequest(
      `/services/${companyId}/services/${serviceId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update service: HTTP ${response.status} - ${errorText}`
      );
    }

    const result = (await response.json()) as AltegioApiResponse<AltegioService>;
    if (!result.success || !result.data) {
      throw new Error('Failed to update service: Invalid response');
    }

    return result.data;
  }
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- src/providers/__tests__/altegio-client-services.test.ts
```

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/providers/altegio-client.ts src/providers/__tests__/altegio-client-services.test.ts
git commit -m "feat(client): add Service CRUD methods to AltegioClient"
```

---

## Task 4: Add Booking CRUD Methods to AltegioClient

**Files:**
- Modify: `src/providers/altegio-client.ts`
- Test: `src/providers/__tests__/altegio-client-bookings.test.ts`

**Step 1: Write failing test**

Create: `src/providers/__tests__/altegio-client-bookings.test.ts`

```typescript
import { AltegioClient } from '../altegio-client.js';
import type { AltegioConfig } from '../../types/altegio.types.js';

describe('AltegioClient - Bookings CRUD', () => {
  let client: AltegioClient;
  const mockConfig: AltegioConfig = {
    partnerToken: 'test-token',
    userToken: 'test-user-token',
  };

  beforeEach(() => {
    client = new AltegioClient(mockConfig, '/tmp/test-credentials');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createBooking', () => {
    it('should create booking successfully', async () => {
      const mockResponse = {
        success: true,
        data: { id: 999, staff_id: 123 },
        meta: {},
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const result = await client.createBooking(456, {
        staff_id: 123,
        services: [{ id: 789 }],
        datetime: '2025-11-01T10:00:00',
        client: { name: 'Jane', phone: '9876543210' },
      });

      expect(result.id).toBe(999);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/records/456'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should throw error when not authenticated', async () => {
      const unauthClient = new AltegioClient(
        { partnerToken: 'test' },
        '/tmp/test'
      );

      await expect(
        unauthClient.createBooking(456, {
          staff_id: 123,
          services: [{ id: 789 }],
          datetime: '2025-11-01T10:00:00',
          client: { name: 'Jane', phone: '123' },
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateBooking', () => {
    it('should update booking successfully', async () => {
      const mockResponse = {
        success: true,
        data: { id: 999, datetime: '2025-11-02T10:00:00' },
        meta: {},
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await client.updateBooking(456, 999, {
        datetime: '2025-11-02T10:00:00',
      });

      expect(result.datetime).toContain('2025-11-02');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/record/456/999'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('deleteBooking', () => {
    it('should delete booking successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.deleteBooking(456, 999);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/record/456/999'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/providers/__tests__/altegio-client-bookings.test.ts
```

Expected: FAIL - methods don't exist

**Step 3: Implement Booking CRUD methods**

Modify: `src/providers/altegio-client.ts` (add after Service methods)

```typescript
  // ========== Bookings CRUD Operations ==========

  async createBooking(
    companyId: number,
    data: import('../types/altegio.types.js').CreateBookingRequest
  ): Promise<AltegioBooking> {
    if (!this.userToken) {
      throw new Error('Not authenticated. Use login() first.');
    }

    const response = await this.apiRequest(`/records/${companyId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create booking: HTTP ${response.status} - ${errorText}`
      );
    }

    const result = (await response.json()) as AltegioApiResponse<AltegioBooking>;
    if (!result.success || !result.data) {
      throw new Error('Failed to create booking: Invalid response');
    }

    return result.data;
  }

  async updateBooking(
    companyId: number,
    recordId: number,
    data: import('../types/altegio.types.js').UpdateBookingRequest
  ): Promise<AltegioBooking> {
    if (!this.userToken) {
      throw new Error('Not authenticated. Use login() first.');
    }

    const response = await this.apiRequest(`/record/${companyId}/${recordId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update booking: HTTP ${response.status} - ${errorText}`
      );
    }

    const result = (await response.json()) as AltegioApiResponse<AltegioBooking>;
    if (!result.success || !result.data) {
      throw new Error('Failed to update booking: Invalid response');
    }

    return result.data;
  }

  async deleteBooking(companyId: number, recordId: number): Promise<void> {
    if (!this.userToken) {
      throw new Error('Not authenticated. Use login() first.');
    }

    const response = await this.apiRequest(`/record/${companyId}/${recordId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete booking: HTTP ${response.status} - ${errorText}`
      );
    }
  }
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- src/providers/__tests__/altegio-client-bookings.test.ts
```

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/providers/altegio-client.ts src/providers/__tests__/altegio-client-bookings.test.ts
git commit -m "feat(client): add Booking CRUD methods to AltegioClient"
```

---

## Task 5: Add Staff CRUD Handlers

**Files:**
- Modify: `src/tools/handlers.ts`
- Test: `src/tools/__tests__/handlers-staff.test.ts`

**Step 1: Write failing test**

Create: `src/tools/__tests__/handlers-staff.test.ts`

```typescript
import { ToolHandlers } from '../handlers.js';
import { AltegioClient } from '../../providers/altegio-client.js';

jest.mock('../../providers/altegio-client.js');

describe('ToolHandlers - Staff CRUD', () => {
  let handlers: ToolHandlers;
  let mockClient: jest.Mocked<AltegioClient>;

  beforeEach(() => {
    mockClient = {
      createStaff: jest.fn(),
      updateStaff: jest.fn(),
      deleteStaff: jest.fn(),
    } as any;
    handlers = new ToolHandlers(mockClient);
  });

  describe('createStaff', () => {
    it('should create staff successfully', async () => {
      const mockStaff = { id: 123, name: 'John Doe' };
      mockClient.createStaff.mockResolvedValue(mockStaff as any);

      const result = await handlers.createStaff({
        company_id: 456,
        name: 'John Doe',
        specialization: 'Stylist',
        position_id: 1,
        phone_number: '1234567890',
      });

      expect(result.content[0].text).toContain('Successfully created staff');
      expect(result.content[0].text).toContain('John Doe');
      expect(mockClient.createStaff).toHaveBeenCalledWith(456, {
        name: 'John Doe',
        specialization: 'Stylist',
        position_id: 1,
        phone_number: '1234567890',
      });
    });

    it('should handle errors', async () => {
      mockClient.createStaff.mockRejectedValue(
        new Error('Not authenticated')
      );

      const result = await handlers.createStaff({
        company_id: 456,
        name: 'John',
        specialization: 'Stylist',
        position_id: 1,
        phone_number: '123',
      });

      expect(result.content[0].text).toContain('Failed to create staff');
      expect(result.content[0].text).toContain('Not authenticated');
    });
  });

  describe('updateStaff', () => {
    it('should update staff successfully', async () => {
      const mockStaff = { id: 123, name: 'John Smith' };
      mockClient.updateStaff.mockResolvedValue(mockStaff as any);

      const result = await handlers.updateStaff({
        company_id: 456,
        staff_id: 123,
        name: 'John Smith',
      });

      expect(result.content[0].text).toContain('Successfully updated staff');
      expect(mockClient.updateStaff).toHaveBeenCalledWith(456, 123, {
        name: 'John Smith',
      });
    });
  });

  describe('deleteStaff', () => {
    it('should delete staff successfully', async () => {
      mockClient.deleteStaff.mockResolvedValue(undefined);

      const result = await handlers.deleteStaff({
        company_id: 456,
        staff_id: 123,
      });

      expect(result.content[0].text).toContain('Successfully deleted staff');
      expect(mockClient.deleteStaff).toHaveBeenCalledWith(456, 123);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/tools/__tests__/handlers-staff.test.ts
```

Expected: FAIL - methods don't exist

**Step 3: Add Zod schemas at top of handlers.ts**

Modify: `src/tools/handlers.ts` (add after existing schemas, before ToolHandlers class)

```typescript
const CreateStaffSchema = z.object({
  company_id: z.number().int().positive(),
  name: z.string().min(1),
  specialization: z.string().min(1),
  position_id: z.number().int().positive().nullable(),
  phone_number: z.string().nullable(),
});

const UpdateStaffSchema = z.object({
  company_id: z.number().int().positive(),
  staff_id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  specialization: z.string().optional(),
  position_id: z.number().int().positive().nullable().optional(),
  phone_number: z.string().nullable().optional(),
  hidden: z.number().int().min(0).max(1).optional(),
  fired: z.number().int().min(0).max(1).optional(),
});

const DeleteStaffSchema = z.object({
  company_id: z.number().int().positive(),
  staff_id: z.number().int().positive(),
});
```

**Step 4: Implement Staff handlers**

Modify: `src/tools/handlers.ts` (add methods inside ToolHandlers class, after existing methods)

```typescript
  // ========== Staff CRUD Operations ==========

  async createStaff(args: unknown) {
    try {
      const params = CreateStaffSchema.parse(args);
      const { company_id, ...staffData } = params;

      const staff = await this.client.createStaff(company_id, staffData);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully created staff member:\nID: ${staff.id}\nName: ${staff.name}\nSpecialization: ${staff.specialization}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to create staff: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  async updateStaff(args: unknown) {
    try {
      const params = UpdateStaffSchema.parse(args);
      const { company_id, staff_id, ...updateData } = params;

      const staff = await this.client.updateStaff(
        company_id,
        staff_id,
        updateData
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully updated staff member ${staff_id}:\nName: ${staff.name}\nSpecialization: ${staff.specialization}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to update staff: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  async deleteStaff(args: unknown) {
    try {
      const params = DeleteStaffSchema.parse(args);

      await this.client.deleteStaff(params.company_id, params.staff_id);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully deleted staff member ${params.staff_id} from company ${params.company_id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to delete staff: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
```

**Step 5: Run tests to verify they pass**

```bash
npm test -- src/tools/__tests__/handlers-staff.test.ts
```

Expected: PASS (all tests)

**Step 6: Commit**

```bash
git add src/tools/handlers.ts src/tools/__tests__/handlers-staff.test.ts
git commit -m "feat(handlers): add Staff CRUD handlers"
```

---

## Task 6: Add Service CRUD Handlers

**Files:**
- Modify: `src/tools/handlers.ts`
- Test: `src/tools/__tests__/handlers-services.test.ts`

**Step 1: Write failing test**

Create: `src/tools/__tests__/handlers-services.test.ts`

```typescript
import { ToolHandlers } from '../handlers.js';
import { AltegioClient } from '../../providers/altegio-client.js';

jest.mock('../../providers/altegio-client.js');

describe('ToolHandlers - Services CRUD', () => {
  let handlers: ToolHandlers;
  let mockClient: jest.Mocked<AltegioClient>;

  beforeEach(() => {
    mockClient = {
      createService: jest.fn(),
      updateService: jest.fn(),
    } as any;
    handlers = new ToolHandlers(mockClient);
  });

  describe('createService', () => {
    it('should create service successfully', async () => {
      const mockService = { id: 789, title: 'Haircut', category_id: 10 };
      mockClient.createService.mockResolvedValue(mockService as any);

      const result = await handlers.createService({
        company_id: 456,
        title: 'Haircut',
        category_id: 10,
      });

      expect(result.content[0].text).toContain('Successfully created service');
      expect(result.content[0].text).toContain('Haircut');
      expect(mockClient.createService).toHaveBeenCalledWith(456, {
        title: 'Haircut',
        category_id: 10,
      });
    });

    it('should handle errors', async () => {
      mockClient.createService.mockRejectedValue(
        new Error('Not authenticated')
      );

      const result = await handlers.createService({
        company_id: 456,
        title: 'Test',
        category_id: 1,
      });

      expect(result.content[0].text).toContain('Failed to create service');
    });
  });

  describe('updateService', () => {
    it('should update service successfully', async () => {
      const mockService = { id: 789, title: 'New Haircut' };
      mockClient.updateService.mockResolvedValue(mockService as any);

      const result = await handlers.updateService({
        company_id: 456,
        service_id: 789,
        title: 'New Haircut',
      });

      expect(result.content[0].text).toContain('Successfully updated service');
      expect(mockClient.updateService).toHaveBeenCalledWith(456, 789, {
        title: 'New Haircut',
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/tools/__tests__/handlers-services.test.ts
```

Expected: FAIL

**Step 3: Add Zod schemas**

Modify: `src/tools/handlers.ts` (add after Staff schemas)

```typescript
const CreateServiceSchema = z.object({
  company_id: z.number().int().positive(),
  title: z.string().min(1),
  category_id: z.number().int().positive(),
  price_min: z.number().nonnegative().optional(),
  price_max: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  comment: z.string().optional(),
  duration: z.number().positive().optional(),
  prepaid: z.string().optional(),
});

const UpdateServiceSchema = z.object({
  company_id: z.number().int().positive(),
  service_id: z.number().int().positive(),
  title: z.string().min(1).optional(),
  category_id: z.number().int().positive().optional(),
  price_min: z.number().nonnegative().optional(),
  price_max: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  comment: z.string().optional(),
  duration: z.number().positive().optional(),
  active: z.number().int().min(0).max(1).optional(),
});
```

**Step 4: Implement Service handlers**

Modify: `src/tools/handlers.ts` (add after Staff handlers)

```typescript
  // ========== Services CRUD Operations ==========

  async createService(args: unknown) {
    try {
      const params = CreateServiceSchema.parse(args);
      const { company_id, ...serviceData } = params;

      const service = await this.client.createService(company_id, serviceData);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully created service:\nID: ${service.id}\nTitle: ${service.title}\nCategory: ${service.category_id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to create service: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  async updateService(args: unknown) {
    try {
      const params = UpdateServiceSchema.parse(args);
      const { company_id, service_id, ...updateData } = params;

      const service = await this.client.updateService(
        company_id,
        service_id,
        updateData
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully updated service ${service_id}:\nTitle: ${service.title}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to update service: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
```

**Step 5: Run tests to verify they pass**

```bash
npm test -- src/tools/__tests__/handlers-services.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/tools/handlers.ts src/tools/__tests__/handlers-services.test.ts
git commit -m "feat(handlers): add Service CRUD handlers"
```

---

## Task 7: Add Booking CRUD Handlers

**Files:**
- Modify: `src/tools/handlers.ts`
- Test: `src/tools/__tests__/handlers-bookings.test.ts`

**Step 1: Write failing test**

Create: `src/tools/__tests__/handlers-bookings.test.ts`

```typescript
import { ToolHandlers } from '../handlers.js';
import { AltegioClient } from '../../providers/altegio-client.js';

jest.mock('../../providers/altegio-client.js');

describe('ToolHandlers - Bookings CRUD', () => {
  let handlers: ToolHandlers;
  let mockClient: jest.Mocked<AltegioClient>;

  beforeEach(() => {
    mockClient = {
      createBooking: jest.fn(),
      updateBooking: jest.fn(),
      deleteBooking: jest.fn(),
    } as any;
    handlers = new ToolHandlers(mockClient);
  });

  describe('createBooking', () => {
    it('should create booking successfully', async () => {
      const mockBooking = {
        id: 999,
        staff_id: 123,
        datetime: '2025-11-01T10:00:00',
      };
      mockClient.createBooking.mockResolvedValue(mockBooking as any);

      const result = await handlers.createBooking({
        company_id: 456,
        staff_id: 123,
        services: [{ id: 789 }],
        datetime: '2025-11-01T10:00:00',
        client: { name: 'Jane', phone: '9876543210' },
      });

      expect(result.content[0].text).toContain('Successfully created booking');
      expect(result.content[0].text).toContain('999');
      expect(mockClient.createBooking).toHaveBeenCalledWith(456, {
        staff_id: 123,
        services: [{ id: 789 }],
        datetime: '2025-11-01T10:00:00',
        client: { name: 'Jane', phone: '9876543210' },
      });
    });

    it('should handle errors', async () => {
      mockClient.createBooking.mockRejectedValue(
        new Error('Not authenticated')
      );

      const result = await handlers.createBooking({
        company_id: 456,
        staff_id: 123,
        services: [{ id: 789 }],
        datetime: '2025-11-01T10:00:00',
        client: { name: 'Jane', phone: '123' },
      });

      expect(result.content[0].text).toContain('Failed to create booking');
    });
  });

  describe('updateBooking', () => {
    it('should update booking successfully', async () => {
      const mockBooking = { id: 999, datetime: '2025-11-02T10:00:00' };
      mockClient.updateBooking.mockResolvedValue(mockBooking as any);

      const result = await handlers.updateBooking({
        company_id: 456,
        record_id: 999,
        datetime: '2025-11-02T10:00:00',
      });

      expect(result.content[0].text).toContain('Successfully updated booking');
      expect(mockClient.updateBooking).toHaveBeenCalledWith(456, 999, {
        datetime: '2025-11-02T10:00:00',
      });
    });
  });

  describe('deleteBooking', () => {
    it('should delete booking successfully', async () => {
      mockClient.deleteBooking.mockResolvedValue(undefined);

      const result = await handlers.deleteBooking({
        company_id: 456,
        record_id: 999,
      });

      expect(result.content[0].text).toContain('Successfully deleted booking');
      expect(mockClient.deleteBooking).toHaveBeenCalledWith(456, 999);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/tools/__tests__/handlers-bookings.test.ts
```

Expected: FAIL

**Step 3: Add Zod schemas**

Modify: `src/tools/handlers.ts` (add after Service schemas)

```typescript
const CreateBookingSchema = z.object({
  company_id: z.number().int().positive(),
  staff_id: z.number().int().positive(),
  services: z.array(
    z.object({
      id: z.number().int().positive(),
      amount: z.number().positive().optional(),
    })
  ),
  datetime: z.string(),
  seance_length: z.number().positive().optional(),
  client: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
  }),
  comment: z.string().optional(),
  send_sms: z.number().int().min(0).max(1).optional(),
  attendance: z.number().int().optional(),
});

const UpdateBookingSchema = z.object({
  company_id: z.number().int().positive(),
  record_id: z.number().int().positive(),
  staff_id: z.number().int().positive().optional(),
  services: z
    .array(
      z.object({
        id: z.number().int().positive(),
        amount: z.number().positive().optional(),
      })
    )
    .optional(),
  datetime: z.string().optional(),
  seance_length: z.number().positive().optional(),
  client: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  comment: z.string().optional(),
  attendance: z.number().int().optional(),
});

const DeleteBookingSchema = z.object({
  company_id: z.number().int().positive(),
  record_id: z.number().int().positive(),
});
```

**Step 4: Implement Booking handlers**

Modify: `src/tools/handlers.ts` (add after Service handlers)

```typescript
  // ========== Bookings CRUD Operations ==========

  async createBooking(args: unknown) {
    try {
      const params = CreateBookingSchema.parse(args);
      const { company_id, ...bookingData } = params;

      const booking = await this.client.createBooking(company_id, bookingData);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully created booking:\nID: ${booking.id}\nStaff ID: ${booking.staff_id}\nDate: ${booking.datetime || booking.date}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  async updateBooking(args: unknown) {
    try {
      const params = UpdateBookingSchema.parse(args);
      const { company_id, record_id, ...updateData } = params;

      const booking = await this.client.updateBooking(
        company_id,
        record_id,
        updateData
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully updated booking ${record_id}:\nDate: ${booking.datetime || booking.date}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to update booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  async deleteBooking(args: unknown) {
    try {
      const params = DeleteBookingSchema.parse(args);

      await this.client.deleteBooking(params.company_id, params.record_id);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully deleted booking ${params.record_id} from company ${params.company_id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to delete booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
```

**Step 5: Run tests to verify they pass**

```bash
npm test -- src/tools/__tests__/handlers-bookings.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/tools/handlers.ts src/tools/__tests__/handlers-bookings.test.ts
git commit -m "feat(handlers): add Booking CRUD handlers"
```

---

## Task 8: Register CRUD Tools in Registry

**Files:**
- Modify: `src/tools/registry.ts`

**Step 1: Add tool definitions**

Modify: `src/tools/registry.ts` (add after existing tools array entries, before closing bracket)

```typescript
  {
    name: 'create_staff',
    description:
      'Create a new employee/staff member. AUTHENTICATION REQUIRED. Required fields: name, specialization, position_id, phone_number.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' },
        name: { type: 'string', description: 'Employee name' },
        specialization: { type: 'string', description: 'Employee specialization' },
        position_id: {
          type: 'number',
          description: 'Position ID',
          nullable: true,
        },
        phone_number: {
          type: 'string',
          description: 'Phone number (without +, 9-15 digits)',
          nullable: true,
        },
      },
      required: ['company_id', 'name', 'specialization', 'position_id', 'phone_number'],
    },
  },
  {
    name: 'update_staff',
    description:
      'Update existing employee/staff member. AUTHENTICATION REQUIRED. Provide only fields to update.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' },
        staff_id: { type: 'number', description: 'Staff member ID' },
        name: { type: 'string', description: 'Employee name' },
        specialization: { type: 'string', description: 'Employee specialization' },
        position_id: { type: 'number', description: 'Position ID', nullable: true },
        phone_number: { type: 'string', description: 'Phone number', nullable: true },
        hidden: { type: 'number', description: '0 or 1' },
        fired: { type: 'number', description: '0 or 1' },
      },
      required: ['company_id', 'staff_id'],
    },
  },
  {
    name: 'delete_staff',
    description:
      'Delete/remove employee/staff member. AUTHENTICATION REQUIRED.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' },
        staff_id: { type: 'number', description: 'Staff member ID to delete' },
      },
      required: ['company_id', 'staff_id'],
    },
  },
  {
    name: 'create_service',
    description:
      'Create a new service. AUTHENTICATION REQUIRED. Required fields: title, category_id.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' },
        title: { type: 'string', description: 'Service title' },
        category_id: { type: 'number', description: 'Service category ID' },
        price_min: { type: 'number', description: 'Minimum price' },
        price_max: { type: 'number', description: 'Maximum price' },
        discount: { type: 'number', description: 'Discount percentage' },
        comment: { type: 'string', description: 'Service description' },
        duration: { type: 'number', description: 'Duration in seconds' },
        prepaid: { type: 'string', description: 'Prepaid option' },
      },
      required: ['company_id', 'title', 'category_id'],
    },
  },
  {
    name: 'update_service',
    description:
      'Update existing service. AUTHENTICATION REQUIRED. Provide only fields to update.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' },
        service_id: { type: 'number', description: 'Service ID' },
        title: { type: 'string', description: 'Service title' },
        category_id: { type: 'number', description: 'Service category ID' },
        price_min: { type: 'number', description: 'Minimum price' },
        price_max: { type: 'number', description: 'Maximum price' },
        discount: { type: 'number', description: 'Discount percentage' },
        comment: { type: 'string', description: 'Service description' },
        duration: { type: 'number', description: 'Duration in seconds' },
        active: { type: 'number', description: '0 or 1' },
      },
      required: ['company_id', 'service_id'],
    },
  },
  {
    name: 'create_booking',
    description:
      'Create a new client booking/appointment. AUTHENTICATION REQUIRED. Required fields: staff_id, services, datetime, client info.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' },
        staff_id: { type: 'number', description: 'Staff member ID' },
        services: {
          type: 'array',
          description: 'Array of service objects',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'Service ID' },
              amount: { type: 'number', description: 'Amount/quantity' },
            },
            required: ['id'],
          },
        },
        datetime: {
          type: 'string',
          description: 'Booking datetime (ISO format: YYYY-MM-DDTHH:MM:SS)',
        },
        seance_length: { type: 'number', description: 'Session length in seconds' },
        client: {
          type: 'object',
          description: 'Client information',
          properties: {
            name: { type: 'string', description: 'Client name' },
            phone: { type: 'string', description: 'Client phone' },
            email: { type: 'string', description: 'Client email' },
          },
          required: ['name', 'phone'],
        },
        comment: { type: 'string', description: 'Booking comment' },
        send_sms: { type: 'number', description: 'Send SMS reminder (0 or 1)' },
        attendance: { type: 'number', description: 'Attendance status' },
      },
      required: ['company_id', 'staff_id', 'services', 'datetime', 'client'],
    },
  },
  {
    name: 'update_booking',
    description:
      'Update existing booking/appointment. AUTHENTICATION REQUIRED. Provide only fields to update.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' },
        record_id: { type: 'number', description: 'Booking/record ID' },
        staff_id: { type: 'number', description: 'Staff member ID' },
        services: {
          type: 'array',
          description: 'Array of service objects',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'Service ID' },
              amount: { type: 'number', description: 'Amount/quantity' },
            },
          },
        },
        datetime: { type: 'string', description: 'New booking datetime' },
        seance_length: { type: 'number', description: 'Session length in seconds' },
        client: {
          type: 'object',
          description: 'Client information',
          properties: {
            name: { type: 'string', description: 'Client name' },
            phone: { type: 'string', description: 'Client phone' },
            email: { type: 'string', description: 'Client email' },
          },
        },
        comment: { type: 'string', description: 'Booking comment' },
        attendance: { type: 'number', description: 'Attendance status' },
      },
      required: ['company_id', 'record_id'],
    },
  },
  {
    name: 'delete_booking',
    description:
      'Delete/cancel booking/appointment. AUTHENTICATION REQUIRED.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'number', description: 'Company ID' },
        record_id: { type: 'number', description: 'Booking/record ID to delete' },
      },
      required: ['company_id', 'record_id'],
    },
  },
```

**Step 2: Add handler calls in switch statement**

Modify: `src/tools/registry.ts` (in CallToolRequestSchema handler, add cases before default)

```typescript
        case 'create_staff':
          return await handlers.createStaff(args);
        case 'update_staff':
          return await handlers.updateStaff(args);
        case 'delete_staff':
          return await handlers.deleteStaff(args);
        case 'create_service':
          return await handlers.createService(args);
        case 'update_service':
          return await handlers.updateService(args);
        case 'create_booking':
          return await handlers.createBooking(args);
        case 'update_booking':
          return await handlers.updateBooking(args);
        case 'delete_booking':
          return await handlers.deleteBooking(args);
```

**Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 4: Build and verify**

```bash
npm run build
npm run typecheck
npm run lint
```

Expected: No errors

**Step 5: Commit**

```bash
git add src/tools/registry.ts
git commit -m "feat(registry): register 6 new CRUD tools"
```

---

## Task 9: Update Documentation

**Files:**
- Modify: `README.md`

**Step 1: Update Available Tools table**

Modify: `README.md` (find table, add rows after existing tools)

```markdown
| `create_staff` | Create new employee | Yes |
| `update_staff` | Update employee details | Yes |
| `delete_staff` | Remove employee | Yes |
| `create_service` | Create new service | Yes |
| `update_service` | Update service details | Yes |
| `create_booking` | Create client appointment | Yes |
| `update_booking` | Modify existing appointment | Yes |
| `delete_booking` | Cancel appointment | Yes |
```

**Step 2: Add note about limitations**

Modify: `README.md` (add after Available Tools section)

```markdown
**Note:** Services DELETE operation is not available in Altegio API. All other write operations require user authentication via `altegio_login`.
```

**Step 3: Verify documentation**

```bash
cat README.md | grep -A 20 "Available Tools"
```

Expected: See all 14 tools listed

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README with CRUD operations"
```

---

## Task 10: Final Integration Test

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass (60+ tests)

**Step 2: Run lint and typecheck**

```bash
npm run lint
npm run typecheck
```

Expected: No errors

**Step 3: Build project**

```bash
npm run build
```

Expected: Build succeeds, dist/ created

**Step 4: Manual smoke test (optional)**

```bash
# Start server in dev mode
npm run dev

# In another terminal, test create_staff tool via HTTP
curl -X POST http://localhost:8080/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected: See all 14 tools in response

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete CRUD operations implementation

Added 6 new write tools:
- Staff: create_staff, update_staff, delete_staff
- Services: create_service, update_service
- Bookings: create_booking, update_booking, delete_booking

All tests passing (60+ tests)
Documentation updated
Type-safe implementation with Zod validation"
```

---

## Completion Checklist

- [ ] Task 1: Type definitions added
- [ ] Task 2: Staff CRUD client methods
- [ ] Task 3: Service CRUD client methods
- [ ] Task 4: Booking CRUD client methods
- [ ] Task 5: Staff CRUD handlers
- [ ] Task 6: Service CRUD handlers
- [ ] Task 7: Booking CRUD handlers
- [ ] Task 8: Tools registered in registry
- [ ] Task 9: Documentation updated
- [ ] Task 10: Integration tests pass
- [ ] All unit tests passing (60+)
- [ ] TypeScript compilation clean
- [ ] Lint passing
- [ ] Build succeeds

---

## Notes for Implementation

- **TDD approach**: Write test first, see it fail, implement, see it pass, commit
- **Minimal validation**: Only required fields checked, API handles complex validation
- **Error handling**: All errors caught and returned as formatted text
- **Authentication**: All write ops check user_token before API calls
- **Testing**: Mock fetch in tests, test happy path + error cases
- **Commits**: Frequent, small commits after each task
