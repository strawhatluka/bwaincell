import { api } from '@/lib/api';
import { getSession } from 'next-auth/react';

const mockGetSession = getSession as jest.Mock;

describe('ApiClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // Silence noisy logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const mockJsonResponse = (body: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  });

  describe('get()', () => {
    it('calls fetch with GET method and returns parsed JSON', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'token-abc' });
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ success: true, data: { hello: 'world' } })
      );

      const result = await api.get('/tasks');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/tasks');
      expect(init.method).toBe('GET');
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(init.headers['Authorization']).toBe('Bearer token-abc');
      expect(result).toEqual({ success: true, data: { hello: 'world' } });
    });

    it('omits Authorization header when no session token available', async () => {
      mockGetSession.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({ success: true }));

      await api.get('/tasks');

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers['Authorization']).toBeUndefined();
    });

    it('omits Authorization header when getSession throws', async () => {
      mockGetSession.mockRejectedValue(new Error('session failure'));
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({ success: true }));

      await api.get('/tasks');

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers['Authorization']).toBeUndefined();
    });

    it('throws with error message from response body on HTTP error', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'token' });
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ message: 'Not Found' }, false, 404)
      );

      await expect(api.get('/missing')).rejects.toThrow('Not Found');
    });

    it('throws with generic HTTP status when error body has no message', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'token' });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error('invalid json')),
      });

      await expect(api.get('/fail')).rejects.toThrow('HTTP 500');
    });

    it('propagates network errors from fetch', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'token' });
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));

      await expect(api.get('/tasks')).rejects.toThrow('network down');
    });
  });

  describe('post()', () => {
    it('sends JSON-serialized body with POST method and auth header', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'tok' });
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ success: true, data: { id: 1 } })
      );

      const body = { title: 'New task' };
      const result = await api.post('/tasks', body);

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(init.headers['Authorization']).toBe('Bearer tok');
      expect(init.body).toBe(JSON.stringify(body));
      expect(result).toEqual({ success: true, data: { id: 1 } });
    });

    it('throws on HTTP error', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'tok' });
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ message: 'Bad Request' }, false, 400)
      );

      await expect(api.post('/tasks', {})).rejects.toThrow('Bad Request');
    });
  });

  describe('patch()', () => {
    it('sends JSON body with PATCH method', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'tok' });
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({ success: true }));

      const body = { title: 'Updated' };
      await api.patch('/tasks/1', body);

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.method).toBe('PATCH');
      expect(init.body).toBe(JSON.stringify(body));
    });

    it('throws on HTTP error', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'tok' });
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ message: 'Conflict' }, false, 409)
      );

      await expect(api.patch('/tasks/1', {})).rejects.toThrow('Conflict');
    });
  });

  describe('delete()', () => {
    it('uses DELETE method and includes auth header', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'tok' });
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({ success: true }));

      const result = await api.delete('/tasks/1');

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.method).toBe('DELETE');
      expect(init.headers['Authorization']).toBe('Bearer tok');
      expect(result).toEqual({ success: true });
    });

    it('throws on HTTP error', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'tok' });
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ message: 'Forbidden' }, false, 403)
      );

      await expect(api.delete('/tasks/1')).rejects.toThrow('Forbidden');
    });

    it('throws HTTP status when body cannot be parsed', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'tok' });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error('bad json')),
      });

      await expect(api.delete('/tasks/1')).rejects.toThrow('HTTP 500');
    });
  });
});
