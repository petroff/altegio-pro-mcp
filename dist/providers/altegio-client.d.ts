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
    createStaff(companyId: number, data: import('../types/altegio.types.js').CreateStaffRequest): Promise<AltegioStaff>;
    updateStaff(companyId: number, staffId: number, data: import('../types/altegio.types.js').UpdateStaffRequest): Promise<AltegioStaff>;
    deleteStaff(companyId: number, staffId: number): Promise<void>;
    createService(companyId: number, data: import('../types/altegio.types.js').CreateServiceRequest): Promise<AltegioService>;
    updateService(companyId: number, serviceId: number, data: import('../types/altegio.types.js').UpdateServiceRequest): Promise<AltegioService>;
    createBooking(companyId: number, data: import('../types/altegio.types.js').CreateBookingRequest): Promise<AltegioBooking>;
    updateBooking(companyId: number, recordId: number, data: import('../types/altegio.types.js').UpdateBookingRequest): Promise<AltegioBooking>;
    deleteBooking(companyId: number, recordId: number): Promise<void>;
}
//# sourceMappingURL=altegio-client.d.ts.map