import { GoogleApiClient } from '@/lib/google/client';

const mockGetSession = jest.fn();
jest.mock('next-auth/react', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

// Testable subclass to access protected methods
class TestClient extends GoogleApiClient {
  callGet<T>(endpoint: string) {
    return this.get<T>(endpoint);
  }
  callPost<T>(endpoint: string, body: unknown) {
    return this.post<T>(endpoint, body);
  }
  callPatch<T>(endpoint: string, body: unknown) {
    return this.patch<T>(endpoint, body);
  }
  callDelete<T>(endpoint: string) {
    return this.delete<T>(endpoint);
  }
}

describe('GoogleApiClient', () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    mockGetSession.mockReset();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  describe('getAccessToken', () => {
    it('returns token from session', async () => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'abc123' });
      const client = new TestClient();
      expect(await client.getAccessToken()).toBe('abc123');
    });

    it('returns null when session has no token', async () => {
      mockGetSession.mockResolvedValue({});
      const client = new TestClient();
      expect(await client.getAccessToken()).toBeNull();
    });

    it('returns null and logs on error', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      mockGetSession.mockRejectedValue(new Error('session fail'));
      const client = new TestClient();
      expect(await client.getAccessToken()).toBeNull();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('request methods', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({ googleAccessToken: 'tok' });
    });

    it('throws when no access token', async () => {
      mockGetSession.mockResolvedValue({});
      const client = new TestClient();
      await expect(client.callGet('/x')).rejects.toThrow('No Google access token');
    });

    it('makes GET request with auth header', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ foo: 'bar' }),
      });
      const client = new TestClient();
      const res = await client.callGet<{ foo: string }>('/test');
      expect(res).toEqual({ foo: 'bar' });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.googleapis.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        })
      );
    });

    it('makes POST request with body', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
      const client = new TestClient();
      await client.callPost('/create', { name: 'x' });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.googleapis.com/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'x' }),
        })
      );
    });

    it('makes PATCH request', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
      const client = new TestClient();
      await client.callPatch('/upd', { a: 1 });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('makes DELETE request', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
      const client = new TestClient();
      await client.callDelete('/del');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('throws with api error message when response not ok', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });
      const client = new TestClient();
      await expect(client.callGet('/fail')).rejects.toThrow('Server error');
      spy.mockRestore();
    });

    it('throws with HTTP status when json parse fails', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => {
          throw new Error('no json');
        },
      });
      const client = new TestClient();
      await expect(client.callGet('/fail')).rejects.toThrow('HTTP 404');
      spy.mockRestore();
    });
  });
});
