import React from 'react';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

// Mock user data for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg' as string | null,
};

// Mock session for authenticated state
export const mockSession: Session = {
  user: mockUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
};

// Mock provider for testing authenticated components
export function MockAuthProvider({
  children,
  session = mockSession,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

// Wrapper for testing unauthenticated components
export function MockUnauthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider session={null}>{children}</SessionProvider>;
}

// Mock useSession hook response for different states
export const mockUseSession = {
  authenticated: {
    data: mockSession,
    status: 'authenticated' as const,
    update: jest.fn(),
  },
  unauthenticated: {
    data: null,
    status: 'unauthenticated' as const,
    update: jest.fn(),
  },
  loading: {
    data: null,
    status: 'loading' as const,
    update: jest.fn(),
  },
};

// Helper to create custom mock sessions
export function createMockSession(overrides?: Partial<Session['user']>): Session {
  return {
    user: {
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      image: mockUser.image,
      ...overrides,
    } as Session['user'],
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Mock next-auth/react module
export const mockNextAuth = {
  useSession: jest.fn(() => mockUseSession.authenticated),
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
};

// Helper to setup auth mocks for tests
export function setupAuthMocks(
  state: 'authenticated' | 'unauthenticated' | 'loading' = 'authenticated',
) {
  const useSessionMock = jest.fn();

  switch (state) {
    case 'authenticated':
      useSessionMock.mockReturnValue(mockUseSession.authenticated);
      break;
    case 'unauthenticated':
      useSessionMock.mockReturnValue(mockUseSession.unauthenticated);
      break;
    case 'loading':
      useSessionMock.mockReturnValue(mockUseSession.loading);
      break;
  }

  return {
    useSession: useSessionMock,
    signIn: mockNextAuth.signIn,
    signOut: mockNextAuth.signOut,
  };
}
