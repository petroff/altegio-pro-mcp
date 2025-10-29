import type {
  AltegioConfig,
  AltegioCredentials,
  AltegioLoginResponse,
  AltegioApiResponse,
  AltegioCompany,
  AltegioBooking,
  AltegioStaff,
  AltegioService,
  AltegioServiceCategory,
  AltegioScheduleEntry,
  AltegioBookingParams,
  AltegioCompaniesParams,
  AltegioListParams,
} from '../types/altegio.types.js';
import { CredentialManager } from './credential-manager.js';

export class AltegioClient {
  private apiUrl: string;
  private partnerToken: string;
  private userToken?: string;
  private credentials: CredentialManager;

  constructor(config: AltegioConfig, credentialsDir?: string) {
    this.apiUrl = config.apiBase || 'https://api.alteg.io/api/v1';
    this.partnerToken = config.partnerToken;
    this.userToken = config.userToken;
    this.credentials = new CredentialManager(credentialsDir);

    this.loadSavedCredentials();
  }

  private loadSavedCredentials(): void {
    const savedCredentials = this.credentials.load();
    if (savedCredentials && savedCredentials.user_token) {
      this.userToken = savedCredentials.user_token;
    }
  }

  /**
   * Internal fetch wrapper with common headers
   */
  private async apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const authParts = [`Bearer ${this.partnerToken}`];
    if (this.userToken) {
      authParts.push(`User ${this.userToken}`);
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.api.v2+json',
      Authorization: authParts.join(', '),
      ...((options.headers as Record<string, string>) || {}),
    };

    return fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers,
    });
  }

  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; user_token?: string; error?: string }> {
    try {
      const response = await this.apiRequest('/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login: email, password }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const result = (await response.json()) as AltegioLoginResponse;

      if (result.success && result.data?.user_token) {
        this.userToken = result.data.user_token;

        const credentials: AltegioCredentials = {
          user_token: result.data.user_token,
          user_id: result.data.id,
          updated_at: new Date().toISOString(),
        };

        await this.credentials.save(credentials);

        return { success: true, user_token: result.data.user_token };
      }

      return {
        success: false,
        error: result.meta?.message || 'Login failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async logout(): Promise<{ success: boolean }> {
    this.userToken = undefined;
    await this.credentials.clear();
    return { success: true };
  }

  async getCompanies(
    params?: AltegioCompaniesParams
  ): Promise<AltegioCompany[]> {
    if (!this.userToken) {
      throw new Error('Not authenticated');
    }

    const queryParams = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : '';
    const response = await this.apiRequest(`/companies${queryParams}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch companies: ${response.statusText}`);
    }

    const result = (await response.json()) as AltegioApiResponse<
      AltegioCompany[]
    >;

    if (result.success && result.data) {
      return result.data;
    }

    throw new Error(result.meta?.message || 'Failed to fetch companies');
  }

  async getBookings(
    companyId: number,
    params?: AltegioListParams
  ): Promise<AltegioBooking[]> {
    if (!this.userToken) {
      throw new Error('Not authenticated');
    }

    const queryParams = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : '';
    const response = await this.apiRequest(
      `/records/${companyId}${queryParams}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch bookings: ${response.statusText}`);
    }

    const result = (await response.json()) as AltegioApiResponse<
      AltegioBooking[]
    >;

    if (result.success && result.data) {
      return result.data;
    }

    throw new Error(result.meta?.message || 'Failed to fetch bookings');
  }

  /**
   * Get staff for a company (B2B API, requires user auth)
   */
  async getStaff(
    companyId: number,
    params?: AltegioBookingParams
  ): Promise<AltegioStaff[]> {
    if (!this.userToken) {
      throw new Error('Not authenticated');
    }

    const queryParams = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : '';
    const response = await this.apiRequest(`/staff/${companyId}${queryParams}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch staff: ${response.statusText}`);
    }

    const result = (await response.json()) as AltegioApiResponse<
      AltegioStaff[]
    >;

    if (result.success && result.data) {
      return result.data;
    }

    throw new Error(result.meta?.message || 'Failed to fetch staff');
  }

  /**
   * Get services for booking (B2B API, requires user auth)
   */
  async getServices(
    companyId: number,
    params?: AltegioBookingParams
  ): Promise<AltegioService[]> {
    if (!this.userToken) {
      throw new Error('Not authenticated');
    }

    const queryParams = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : '';
    const response = await this.apiRequest(
      `/company/${companyId}/services${queryParams}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.statusText}`);
    }

    const result = (await response.json()) as AltegioApiResponse<
      AltegioService[]
    >;

    if (result.success && result.data) {
      return result.data;
    }

    throw new Error(result.meta?.message || 'Failed to fetch services');
  }

  /**
   * Get service categories (public API, no user auth required)
   */
  async getServiceCategories(
    companyId: number,
    params?: AltegioBookingParams
  ): Promise<AltegioServiceCategory[]> {
    const queryParams = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : '';
    const response = await this.apiRequest(
      `/service_categories/${companyId}${queryParams}`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch service categories: ${response.statusText}`
      );
    }

    const result = (await response.json()) as AltegioApiResponse<
      AltegioServiceCategory[]
    >;

    if (result.success && result.data) {
      return result.data;
    }

    throw new Error(
      result.meta?.message || 'Failed to fetch service categories'
    );
  }

  /**
   * Get employee schedule for a date range (B2B API, requires user auth)
   */
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

    const result = (await response.json()) as AltegioApiResponse<
      AltegioScheduleEntry[]
    >;

    if (result.success && result.data) {
      return result.data;
    }

    throw new Error(result.meta?.message || 'Failed to fetch schedule');
  }

  // ========== Staff CRUD Operations ==========

  async createStaff(
    companyId: number,
    data: import('../types/altegio.types.js').CreateStaffRequest
  ): Promise<AltegioStaff> {
    if (!this.userToken) {
      throw new Error('Not authenticated. Use login() first.');
    }

    const response = await this.apiRequest(
      `/company/${companyId}/staff/quick`,
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
}
