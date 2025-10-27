import { AltegioClient } from '../providers/altegio-client.js';
export declare class ToolHandlers {
    private client;
    constructor(client: AltegioClient);
    login(args: unknown): Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
    logout(): Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
    listCompanies(args?: unknown): Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
    getBookings(args: unknown): Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
    getStaff(args: unknown): Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
    getServices(args: unknown): Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
    getServiceCategories(args: unknown): Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
    getSchedule(args: unknown): Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
}
//# sourceMappingURL=handlers.d.ts.map