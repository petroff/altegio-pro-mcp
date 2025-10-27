import { AltegioClient } from '../providers/altegio-client.js';
import { z } from 'zod';

// Input schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const CompaniesParamsSchema = z
  .object({
    my: z.number().int().min(0).max(1).optional(),
    page: z.number().int().positive().optional(),
    count: z.number().int().positive().optional(),
  })
  .optional();

const BookingsParamsSchema = z.object({
  company_id: z.number().int().positive(),
  page: z.number().int().positive().optional(),
  count: z.number().int().positive().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

const PublicListParamsSchema = z.object({
  company_id: z.number().int().positive(),
  page: z.number().int().positive().optional(),
  count: z.number().int().positive().optional(),
});

export class ToolHandlers {
  constructor(private client: AltegioClient) {}

  async login(args: unknown) {
    const params = LoginSchema.parse(args);
    const result = await this.client.login(params.email, params.password);

    return {
      content: [
        {
          type: 'text' as const,
          text: result.success
            ? 'Successfully logged in to Altegio'
            : `Login failed: ${result.error}`,
        },
      ],
    };
  }

  async logout() {
    await this.client.logout();

    return {
      content: [
        {
          type: 'text' as const,
          text: 'Successfully logged out from Altegio',
        },
      ],
    };
  }

  async listCompanies(args?: unknown) {
    const params = args ? CompaniesParamsSchema.parse(args) : undefined;
    const companies = await this.client.getCompanies(params);

    const summary = `Found ${companies.length} ${companies.length === 1 ? 'company' : 'companies'}${params?.my === 1 ? ' (user companies)' : ''}:\n\n`;
    const companiesList = companies
      .map(
        (c, idx) =>
          `${idx + 1}. ID: ${c.id} - "${c.title || c.public_title}"\n   Address: ${c.address || 'N/A'}\n   Phone: ${c.phone || 'N/A'}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text' as const,
          text: summary + companiesList,
        },
      ],
    };
  }

  async getBookings(args: unknown) {
    const params = BookingsParamsSchema.parse(args);
    const { company_id, ...listParams } = params;
    const bookings = await this.client.getBookings(
      company_id,
      Object.keys(listParams).length > 0 ? listParams : undefined
    );

    const summary = `Found ${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'} for company ${company_id}:\n\n`;
    const bookingsList = bookings
      .map(
        (b, idx) =>
          `${idx + 1}. Booking ID: ${b.id}\n` +
          `   Date: ${b.datetime || b.date}\n` +
          `   Client: ${b.client?.name || 'N/A'} (${b.client?.phone || 'no phone'})\n` +
          `   Staff: ${b.staff?.name || 'N/A'}\n` +
          `   Services: ${b.services?.map((s) => s.title).join(', ') || 'N/A'}\n` +
          `   Status: ${b.status}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text' as const,
          text: summary + bookingsList,
        },
      ],
    };
  }

  async getStaff(args: unknown) {
    const params = PublicListParamsSchema.parse(args);
    const { company_id, ...listParams } = params;
    const staff = await this.client.getStaff(
      company_id,
      Object.keys(listParams).length > 0 ? listParams : undefined
    );

    const summary = `Found ${staff.length} staff ${staff.length === 1 ? 'member' : 'members'} for company ${company_id}:\n\n`;
    const staffList = staff
      .map(
        (s, idx) =>
          `${idx + 1}. ID: ${s.id} - ${s.name}\n` +
          `   Specialization: ${s.specialization || 'N/A'}\n` +
          `   Rating: ${s.rating !== undefined ? s.rating : 'N/A'}${s.position?.title ? `\n   Position: ${s.position.title}` : ''}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text' as const,
          text: summary + staffList,
        },
      ],
    };
  }

  async getServices(args: unknown) {
    const params = PublicListParamsSchema.parse(args);
    const { company_id, ...listParams } = params;
    const services = await this.client.getServices(
      company_id,
      Object.keys(listParams).length > 0 ? listParams : undefined
    );

    const summary = `Found ${services.length} ${services.length === 1 ? 'service' : 'services'} for company ${company_id}:\n\n`;
    const servicesList = services
      .map(
        (s, idx) =>
          `${idx + 1}. ID: ${s.id} - "${s.title}"\n` +
          `   Price: ${s.cost}${s.duration ? `\n   Duration: ${s.duration} min` : ''}${s.category_id ? `\n   Category ID: ${s.category_id}` : ''}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text' as const,
          text: summary + servicesList,
        },
      ],
    };
  }

  async getServiceCategories(args: unknown) {
    const params = PublicListParamsSchema.parse(args);
    const { company_id, ...listParams } = params;
    const categories = await this.client.getServiceCategories(
      company_id,
      Object.keys(listParams).length > 0 ? listParams : undefined
    );

    const summary = `Found ${categories.length} service ${categories.length === 1 ? 'category' : 'categories'} for company ${company_id}:\n\n`;
    const categoriesList = categories
      .map(
        (c, idx) =>
          `${idx + 1}. ID: ${c.id} - "${c.title}"${c.services ? `\n   Services count: ${c.services.length}` : ''}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text' as const,
          text: summary + categoriesList,
        },
      ],
    };
  }

  async getSchedule(args: unknown) {
    const params = z
      .object({
        company_id: z.number().int().positive(),
        staff_id: z.number().int().positive(),
        start_date: z.string(),
        end_date: z.string(),
      })
      .parse(args);

    const schedule = await this.client.getSchedule(
      params.company_id,
      params.staff_id,
      params.start_date,
      params.end_date
    );

    const summary = `Found ${schedule.length} schedule ${schedule.length === 1 ? 'entry' : 'entries'} for staff ${params.staff_id}:\n\n`;
    const scheduleList = schedule
      .map(
        (s, idx) =>
          `${idx + 1}. ${s.date} at ${s.time} (${s.seance_length} min)`
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text' as const,
          text: summary + scheduleList,
        },
      ],
    };
  }
}
