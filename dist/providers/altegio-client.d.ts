import type { AltegioConfig, AltegioCompany, AltegioBooking, AltegioStaff, AltegioService, AltegioServiceCategory, AltegioScheduleEntry, AltegioBookingParams, AltegioCompaniesParams, AltegioListParams } from '../types/altegio.types.js';
export declare class AltegioClient {
    private apiUrl;
    private partnerToken;
    private userToken?;
    private credentials;
    constructor(config: AltegioConfig, credentialsDir?: string);
    private loadSavedCredentials;
    /**
     * Internal fetch wrapper with common headers
     */
    private apiRequest;
    login(email: string, password: string): Promise<{
        success: boolean;
        user_token?: string;
        error?: string;
    }>;
    logout(): Promise<{
        success: boolean;
    }>;
    getCompanies(params?: AltegioCompaniesParams): Promise<AltegioCompany[]>;
    getBookings(companyId: number, params?: AltegioListParams): Promise<AltegioBooking[]>;
    /**
     * Get staff for a company (B2B API, requires user auth)
     */
    getStaff(companyId: number, params?: AltegioBookingParams): Promise<AltegioStaff[]>;
    /**
     * Get services for booking (B2B API, requires user auth)
     */
    getServices(companyId: number, params?: AltegioBookingParams): Promise<AltegioService[]>;
    /**
     * Get service categories (public API, no user auth required)
     */
    getServiceCategories(companyId: number, params?: AltegioBookingParams): Promise<AltegioServiceCategory[]>;
    /**
     * Get employee schedule for a date range (B2B API, requires user auth)
     */
    getSchedule(companyId: number, staffId: number, startDate: string, endDate: string): Promise<AltegioScheduleEntry[]>;
}
//# sourceMappingURL=altegio-client.d.ts.map