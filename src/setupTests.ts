import '@testing-library/jest-dom';
import React from 'react';

// MSW (node) auto-start
import { server } from '@/mocks/server';

// Establish API mocking before all tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// Reset handlers after each test (so each test is isolated)
afterEach(() => server.resetHandlers());
// Clean up after the tests are finished.
afterAll(() => server.close());

// Mock next-auth/react
jest.mock('next-auth/react', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  return {
    __esModule: true,
    useSession: jest.fn(() => ({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })),
    signIn: jest.fn(() => Promise.resolve({ error: null, status: 200, ok: true, url: '' })),
    signOut: jest.fn(() => Promise.resolve()),
    getCsrfToken: jest.fn(() => Promise.resolve('mock-csrf-token')),
    getProviders: jest.fn(() =>
      Promise.resolve({
        google: {
          id: 'google',
          name: 'Google',
          type: 'oauth',
          signinUrl: '/api/auth/signin/google',
          callbackUrl: '/api/auth/callback/google',
        },
      }),
    ),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((props) => {
    return React.createElement('img', {
      src: props.src,
      alt: props.alt,
      width: props.width,
      height: props.height,
      style: props.style,
      'data-testid': 'user-avatar',
      ...props,
    });
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '',
  redirect: jest.fn(),
}));

// Mock environment variables
process.env.AUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.AUTH_DYNAMODB_ID = 'test-id';
process.env.AUTH_DYNAMODB_SECRET = 'test-secret';
process.env.AUTH_DYNAMODB_REGION = 'us-east-1';
process.env.AUTH_DYNAMODB_TABLE_NAME = 'test-auth-table';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
