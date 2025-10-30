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

      expect(result.content).toBeDefined();
      expect(result.content[0]).toBeDefined();
      const textContent = result.content[0]?.text;
      expect(textContent).toContain('Onboarding session started');
      expect(textContent).toContain('company 123');
    });

    it('should reject if not authenticated', async () => {
      mockClient.isAuthenticated.mockReturnValue(false);

      await expect(handlers.start({ company_id: 123 }))
        .rejects.toThrow('Authentication required');
    });
  });

  describe('resume', () => {
    it('should show progress summary', async () => {
      await handlers.start({ company_id: 123 });
      await stateManager.checkpoint(123, 'staff', [1, 2, 3]);

      const result = await handlers.resume({ company_id: 123 });

      const textContent = result.content[0]?.text;
      expect(textContent).toContain('staff: 3 entities created');
    });

    it('should handle no existing session', async () => {
      await expect(handlers.resume({ company_id: 999 }))
        .rejects.toThrow('No onboarding session found');
    });
  });

  describe('status', () => {
    it('should show current status', async () => {
      await handlers.start({ company_id: 123 });
      const result = await handlers.status({ company_id: 123 });

      const textContent = result.content[0]?.text;
      expect(textContent).toContain('Phase: init');
    });
  });

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

      expect(result.content[0]?.text).toContain('2 staff members created');
      expect(mockClient.createStaff).toHaveBeenCalledTimes(2);
    });

    it('should create staff from CSV string', async () => {
      await handlers.start({ company_id: 123 });

      mockClient.createStaff = jest.fn()
        .mockResolvedValue({ id: 1, name: 'Alice' });

      const csv = 'name,specialization\nAlice,Hairdresser';

      const result = await handlers.addStaffBatch({
        company_id: 123,
        staff_data: csv
      });

      expect(result.content[0]?.text).toContain('1 staff member');
      expect(mockClient.createStaff).toHaveBeenCalledWith(
        123,
        expect.objectContaining({ name: 'Alice', specialization: 'Hairdresser' })
      );
    });
  });

  describe('addCategories', () => {
    it('should create service categories', async () => {
      await handlers.start({ company_id: 123 });

      mockClient.createServiceCategory = jest.fn()
        .mockResolvedValueOnce({ id: 10, title: 'Hair Services' })
        .mockResolvedValueOnce({ id: 11, title: 'Nail Services' });

      const result = await handlers.addCategories({
        company_id: 123,
        categories: [
          { title: 'Hair Services', weight: 1 },
          { title: 'Nail Services', weight: 2 }
        ]
      });

      expect(result.content[0]?.text).toContain('2 categories created');
      expect(mockClient.createServiceCategory).toHaveBeenCalledTimes(2);
    });
  });

  describe('addServicesBatch', () => {
    it('should create services from JSON array', async () => {
      await handlers.start({ company_id: 123 });
      await stateManager.checkpoint(123, 'categories', [10]);

      mockClient.createService = jest.fn()
        .mockResolvedValueOnce({ id: 20, title: 'Haircut' })
        .mockResolvedValueOnce({ id: 21, title: 'Manicure' });

      const result = await handlers.addServicesBatch({
        company_id: 123,
        services_data: [
          { title: 'Haircut', price_min: 50, duration: 1800, category_id: 10 },
          { title: 'Manicure', price_min: 30, duration: 1200, category_id: 10 }
        ]
      });

      expect(result.content[0]?.text).toContain('2 services created');
      expect(mockClient.createService).toHaveBeenCalledTimes(2);
    });
  });

  describe('importClients', () => {
    it('should import clients from CSV', async () => {
      await handlers.start({ company_id: 123 });

      mockClient.createClient = jest.fn()
        .mockResolvedValueOnce({ id: 30, name: 'John' })
        .mockResolvedValueOnce({ id: 31, name: 'Jane' });

      const csv = 'name,phone,email\nJohn,+1234567890,john@test.com\nJane,+0987654321,jane@test.com';

      const result = await handlers.importClients({
        company_id: 123,
        clients_csv: csv
      });

      expect(result.content[0]?.text).toContain('2 clients imported');
      expect(mockClient.createClient).toHaveBeenCalledTimes(2);
    });
  });

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

      expect(result.content[0]?.text).toContain('Test bookings created: 3');
      expect(mockClient.createBooking).toHaveBeenCalledTimes(3);
    });

    it('should reject if no staff exist', async () => {
      await handlers.start({ company_id: 123 });

      await expect(handlers.createTestBookings({ company_id: 123, count: 2 }))
        .rejects.toThrow('No staff or services found');
    });
  });
});
