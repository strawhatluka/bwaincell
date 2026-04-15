import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a fresh QueryClient for each test to prevent state leaking.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper with all providers needed for component tests.
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/**
 * Custom render that wraps components in all required providers.
 * Use this instead of @testing-library/react's render.
 */
function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
export { createTestQueryClient };

/**
 * Mock API response factory
 */
export function mockApiResponse<T>(data: T, success = true) {
  return {
    success,
    data,
    error: success ? undefined : 'Error occurred',
  };
}

/**
 * Mock session factory
 */
export function mockSession(overrides?: Record<string, unknown>) {
  return {
    user: {
      name: 'Test User',
      email: 'test@example.com',
      image: null,
    },
    expires: '2099-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Wait for async operations to settle
 */
export async function waitForLoadingToFinish() {
  // Give React Query time to settle
  await new Promise((resolve) => setTimeout(resolve, 0));
}
