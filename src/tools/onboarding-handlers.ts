import { AltegioClient } from '../providers/altegio-client.js';
import { OnboardingStateManager } from '../providers/onboarding-state-manager.js';
import { z } from 'zod';
import { parseCSV } from '../utils/csv-parser.js';
import {
  StaffBatchSchema,
  ServiceBatchSchema,
  ClientBatchSchema,
  CategoryBatchSchema
} from '../types/onboarding.types.js';
import type {
  CreateStaffRequest,
  CreateServiceRequest,
  CreateClientRequest,
  CreateCategoryRequest
} from '../types/altegio.types.js';

const CompanyIdSchema = z.object({
  company_id: z.number()
});

const StaffBatchArgsSchema = z.object({
  company_id: z.number(),
  staff_data: z.union([StaffBatchSchema, z.string()])
});

const ServiceBatchArgsSchema = z.object({
  company_id: z.number(),
  services_data: z.union([ServiceBatchSchema, z.string()])
});

const CategoryArgsSchema = z.object({
  company_id: z.number(),
  categories: CategoryBatchSchema
});

const ClientImportArgsSchema = z.object({
  company_id: z.number(),
  clients_csv: z.string()
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

  async addStaffBatch(args: unknown) {
    if (!this.client.isAuthenticated()) {
      throw new Error('Authentication required. Please use altegio_login first.');
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
        // Convert StaffBatchItem to CreateStaffRequest
        const staffRequest: CreateStaffRequest = {
          name: staff.name,
          specialization: staff.specialization || '',
          position_id: staff.position_id || null,
          phone_number: staff.phone || null,
          user_email: staff.email || '',
          user_phone: staff.phone || '',
          is_user_invite: false
        };
        const result = await this.client.createStaff(company_id, staffRequest);
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
                (errors.length ? `✗ ${errors.length} failed:\n  ${errors.join('\n  ')}\n` : '') +
                `\nNext: Add service categories with onboarding_add_categories`
        }
      ]
    };
  }

  async addCategories(args: unknown) {
    if (!this.client.isAuthenticated()) {
      throw new Error('Authentication required. Please use altegio_login first.');
    }

    const { company_id, categories } = CategoryArgsSchema.parse(args);

    const created: number[] = [];
    const errors: string[] = [];

    for (const category of categories) {
      try {
        const categoryRequest: CreateCategoryRequest = {
          title: category.title,
          api_id: category.api_id,
          weight: category.weight
        };
        const result = await this.client.createServiceCategory(company_id, categoryRequest);
        created.push(result.id);
      } catch (error) {
        errors.push(`${category.title}: ${(error as Error).message}`);
      }
    }

    // Checkpoint
    await this.stateManager.checkpoint(company_id, 'categories', created);
    await this.stateManager.updatePhase(company_id, 'services');

    return {
      content: [
        {
          type: 'text' as const,
          text: `Categories batch processing complete:\n\n` +
                `✓ ${created.length} categories created\n` +
                (errors.length ? `✗ ${errors.length} failed:\n  ${errors.join('\n  ')}\n` : '') +
                `\nNext: Add services with onboarding_add_services_batch`
        }
      ]
    };
  }

  async addServicesBatch(args: unknown) {
    if (!this.client.isAuthenticated()) {
      throw new Error('Authentication required. Please use altegio_login first.');
    }

    const { company_id, services_data } = ServiceBatchArgsSchema.parse(args);

    // Parse CSV if string
    let servicesArray = typeof services_data === 'string'
      ? parseCSV(services_data)
      : services_data;

    // Validate with Zod
    servicesArray = ServiceBatchSchema.parse(servicesArray);

    const created: number[] = [];
    const errors: string[] = [];

    for (const service of servicesArray) {
      try {
        const serviceRequest: CreateServiceRequest = {
          title: service.title,
          category_id: service.category_id || 0,
          price_min: service.price_min,
          price_max: service.price_max,
          duration: service.duration
        };
        const result = await this.client.createService(company_id, serviceRequest);
        created.push(result.id);
      } catch (error) {
        errors.push(`${service.title}: ${(error as Error).message}`);
      }
    }

    // Checkpoint
    await this.stateManager.checkpoint(company_id, 'services', created);
    await this.stateManager.updatePhase(company_id, 'clients');

    return {
      content: [
        {
          type: 'text' as const,
          text: `Services batch processing complete:\n\n` +
                `✓ ${created.length} services created\n` +
                (errors.length ? `✗ ${errors.length} failed:\n  ${errors.join('\n  ')}\n` : '') +
                `\nNext: Import clients with onboarding_import_clients`
        }
      ]
    };
  }

  async importClients(args: unknown) {
    if (!this.client.isAuthenticated()) {
      throw new Error('Authentication required. Please use altegio_login first.');
    }

    const { company_id, clients_csv } = ClientImportArgsSchema.parse(args);

    // Parse CSV
    const parsedClients = parseCSV(clients_csv);

    // Validate with Zod
    const clientsArray = ClientBatchSchema.parse(parsedClients);

    const created: number[] = [];
    const errors: string[] = [];

    for (const client of clientsArray) {
      try {
        const clientRequest: CreateClientRequest = {
          name: client.name,
          phone: client.phone,
          email: client.email,
          surname: client.surname,
          comment: client.comment
        };
        const result = await this.client.createClient(company_id, clientRequest);
        created.push(result.id);
      } catch (error) {
        errors.push(`${client.name}: ${(error as Error).message}`);
      }
    }

    // Checkpoint
    await this.stateManager.checkpoint(company_id, 'clients', created);
    await this.stateManager.updatePhase(company_id, 'test_bookings');

    return {
      content: [
        {
          type: 'text' as const,
          text: `Client import complete:\n\n` +
                `✓ ${created.length} clients imported\n` +
                (errors.length ? `✗ ${errors.length} failed:\n  ${errors.join('\n  ')}\n` : '') +
                `\nNext: Create test bookings with onboarding_create_test_bookings`
        }
      ]
    };
  }
}
