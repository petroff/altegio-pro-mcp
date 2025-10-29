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

// ========== Staff CRUD Schemas ==========
const CreateStaffSchema = z.object({
  company_id: z.number().int().positive(),
  name: z.string().min(1),
  specialization: z.string().min(1),
  position_id: z.number().int().positive().nullable(),
  phone_number: z.string().nullable(),
  user_email: z.string().email(),
  user_phone: z.string().min(1),
  is_user_invite: z.number().int().min(0).max(1),
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

// ========== Services CRUD Schemas ==========
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

// ========== Bookings CRUD Schemas ==========
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
}
