import { AltegioClient } from '../providers/altegio-client.js';
import { OnboardingStateManager } from '../providers/onboarding-state-manager.js';
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
      .filter(([, checkpoint]) => checkpoint.completed)
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

  async status(args: unknown) {
    if (!this.client.isAuthenticated()) {
      throw new Error('Authentication required. Please use altegio_login first.');
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
}
