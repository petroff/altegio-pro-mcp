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
});
