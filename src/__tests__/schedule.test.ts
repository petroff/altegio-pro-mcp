import { AltegioClient } from '../providers/altegio-client';
import { tmpdir } from 'os';
import { join } from 'path';

describe('AltegioClient.getSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require user token', async () => {
    const testDir = join(tmpdir(), `altegio-test-${Date.now()}`);
    const client = new AltegioClient(
      {
        apiBase: 'https://api.altegio.com',
        partnerToken: 'partner123',
        userToken: undefined,
      },
      testDir
    );

    await expect(
      client.getSchedule(123, 456, '2025-10-27', '2025-10-28')
    ).rejects.toThrow('Not authenticated');
  });

  it('should call schedule endpoint with correct parameters', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const testDir = join(tmpdir(), `altegio-test-${Date.now()}`);
    const client = new AltegioClient(
      {
        apiBase: 'https://api.alteg.io/api/v1',
        partnerToken: 'partner123',
        userToken: 'user456',
      },
      testDir
    );

    await client.getSchedule(123, 456, '2025-10-27', '2025-10-28');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.alteg.io/api/v1/schedule/123/456/2025-10-27/2025-10-28',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer partner123, User user456',
        }),
      })
    );
  });
});
