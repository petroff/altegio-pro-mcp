import { describe, it, expect } from '@jest/globals';
import { createServer } from '../server.js';
import { registerTools } from '../tools/registry.js';
import { AltegioClient } from '../providers/altegio-client.js';
import { ToolHandlers } from '../tools/handlers.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('Tool Registration', () => {
  it('should register all tools and return tool names', () => {
    const server = new Server(
      {
        name: 'test-server',
        version: '1.0.0',
      },
      {
        capabilities: { tools: {} },
      }
    );

    const client = new AltegioClient({
      partnerToken: 'test-token',
    });

    const toolNames = registerTools(server, client);

    expect(toolNames).toContain('altegio_login');
    expect(toolNames).toContain('altegio_logout');
    expect(toolNames).toContain('list_companies');
    expect(toolNames).toContain('get_bookings');
    expect(toolNames).toContain('get_staff');
    expect(toolNames).toContain('get_services');
    expect(toolNames).toContain('get_service_categories');
    expect(toolNames).toContain('get_schedule');
    expect(toolNames).toContain('create_staff');
    expect(toolNames).toContain('update_staff');
    expect(toolNames).toContain('delete_staff');
    expect(toolNames).toContain('create_service');
    expect(toolNames).toContain('update_service');
    expect(toolNames).toContain('create_booking');
    expect(toolNames).toContain('update_booking');
    expect(toolNames).toContain('delete_booking');
    expect(toolNames.length).toBe(16);
  });

  it('should create server with tools', () => {
    const server = createServer();

    expect(server).toBeDefined();
    expect(server.name).toBe('@altegio/mcp-server-pro');
    expect(server.version).toBe('1.0.0');
  });
});

describe('get_schedule', () => {
  it('should format schedule entries', async () => {
    const mockClient = {
      getSchedule: jest.fn().mockResolvedValue([
        {
          date: '2025-10-27',
          time: '09:00',
          seance_length: 30,
          datetime: '2025-10-27T09:00:00',
        },
        {
          date: '2025-10-27',
          time: '10:00',
          seance_length: 60,
          datetime: '2025-10-27T10:00:00',
        },
      ]),
    } as any;

    const handlers = new ToolHandlers(mockClient);
    const result = await handlers.getSchedule({
      company_id: 123,
      staff_id: 456,
      start_date: '2025-10-27',
      end_date: '2025-10-28',
    });

    expect(result.content[0]?.text).toContain('Found 2 schedule entries');
    expect(result.content[0]?.text).toContain('2025-10-27 at 09:00 (30 min)');
  });
});
