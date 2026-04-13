/**
 * Google API Client Base
 *
 * Provides base functionality for all Google API integrations
 * Uses access tokens from NextAuth session
 */

import { getSession } from 'next-auth/react';

export class GoogleApiClient {
  private baseUrl = 'https://www.googleapis.com';

  /**
   * Get Google access token from session
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const session = await getSession();
      return session?.googleAccessToken || null;
    } catch (error) {
      console.error('[GOOGLE-API] Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Make authenticated request to Google API
   */
  protected async request<T>(
    endpoint: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    } = {}
  ): Promise<T> {
    const accessToken = await this.getAccessToken();

    if (!accessToken) {
      throw new Error('No Google access token available');
    }

    const response = await globalThis.fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[GOOGLE-API] Request failed:', {
        endpoint,
        status: response.status,
        error,
      });
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * GET request to Google API
   */
  protected async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request to Google API
   */
  protected async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PATCH request to Google API
   */
  protected async patch<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request to Google API
   */
  protected async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
