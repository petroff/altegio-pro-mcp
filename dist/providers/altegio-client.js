import { CredentialManager } from './credential-manager.js';
export class AltegioClient {
    apiUrl;
    partnerToken;
    userToken;
    credentials;
    constructor(config, credentialsDir) {
        this.apiUrl = config.apiBase || 'https://api.alteg.io/api/v1';
        this.partnerToken = config.partnerToken;
        this.userToken = config.userToken;
        this.credentials = new CredentialManager(credentialsDir);
        this.loadSavedCredentials();
    }
    loadSavedCredentials() {
        const savedCredentials = this.credentials.load();
        if (savedCredentials && savedCredentials.user_token) {
            this.userToken = savedCredentials.user_token;
        }
    }
    /**
     * Internal fetch wrapper with common headers
     */
    async apiRequest(endpoint, options = {}) {
        const authParts = [`Bearer ${this.partnerToken}`];
        if (this.userToken) {
            authParts.push(`User ${this.userToken}`);
        }
        const headers = {
            'Accept': 'application/vnd.api.v2+json',
            'Authorization': authParts.join(', '),
            ...(options.headers || {}),
        };
        return fetch(`${this.apiUrl}${endpoint}`, {
            ...options,
            headers,
        });
    }
    async login(email, password) {
        try {
            const response = await this.apiRequest('/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ login: email, password })
            });
            if (!response.ok) {
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`
                };
            }
            const result = await response.json();
            if (result.success && result.data?.user_token) {
                this.userToken = result.data.user_token;
                const credentials = {
                    user_token: result.data.user_token,
                    user_id: result.data.id,
                    updated_at: new Date().toISOString()
                };
                await this.credentials.save(credentials);
                return { success: true, user_token: result.data.user_token };
            }
            return {
                success: false,
                error: result.meta?.message || 'Login failed'
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async logout() {
        this.userToken = undefined;
        await this.credentials.clear();
        return { success: true };
    }
    async getCompanies(params) {
        if (!this.userToken) {
            throw new Error('Not authenticated');
        }
        const queryParams = params ? `?${new URLSearchParams(params).toString()}` : '';
        const response = await this.apiRequest(`/companies${queryParams}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch companies: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        }
        throw new Error(result.meta?.message || 'Failed to fetch companies');
    }
    async getBookings(companyId, params) {
        if (!this.userToken) {
            throw new Error('Not authenticated');
        }
        const queryParams = params ? `?${new URLSearchParams(params).toString()}` : '';
        const response = await this.apiRequest(`/records/${companyId}${queryParams}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch bookings: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        }
        throw new Error(result.meta?.message || 'Failed to fetch bookings');
    }
    /**
     * Get staff for a company (B2B API, requires user auth)
     */
    async getStaff(companyId, params) {
        if (!this.userToken) {
            throw new Error('Not authenticated');
        }
        const queryParams = params ? `?${new URLSearchParams(params).toString()}` : '';
        const response = await this.apiRequest(`/staff/${companyId}${queryParams}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch staff: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        }
        throw new Error(result.meta?.message || 'Failed to fetch staff');
    }
    /**
     * Get services for booking (B2B API, requires user auth)
     */
    async getServices(companyId, params) {
        if (!this.userToken) {
            throw new Error('Not authenticated');
        }
        const queryParams = params ? `?${new URLSearchParams(params).toString()}` : '';
        const response = await this.apiRequest(`/company/${companyId}/services${queryParams}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch services: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        }
        throw new Error(result.meta?.message || 'Failed to fetch services');
    }
    /**
     * Get service categories (public API, no user auth required)
     */
    async getServiceCategories(companyId, params) {
        const queryParams = params ? `?${new URLSearchParams(params).toString()}` : '';
        const response = await this.apiRequest(`/service_categories/${companyId}${queryParams}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch service categories: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        }
        throw new Error(result.meta?.message || 'Failed to fetch service categories');
    }
    /**
     * Get employee schedule for a date range (B2B API, requires user auth)
     */
    async getSchedule(companyId, staffId, startDate, endDate) {
        if (!this.userToken) {
            throw new Error('Not authenticated');
        }
        const response = await this.apiRequest(`/schedule/${companyId}/${staffId}/${startDate}/${endDate}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch schedule: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        }
        throw new Error(result.meta?.message || 'Failed to fetch schedule');
    }
}
//# sourceMappingURL=altegio-client.js.map