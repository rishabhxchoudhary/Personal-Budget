import { MockRepositories } from './api-test-helpers';

// Global repositories instance for tests
let mockRepositories: MockRepositories;

// Mock the auth function before any imports
jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
  }),
}));

// Mock the repositories container
jest.mock('@/shared/repositories/container', () => {
  if (!mockRepositories) {
    mockRepositories = new MockRepositories();
  }

  return {
    repositories: mockRepositories,
  };
});

// Export the mock repositories for use in tests
export function getMockRepositories(): MockRepositories {
  if (!mockRepositories) {
    mockRepositories = new MockRepositories();
  }
  return mockRepositories;
}

// Reset function for tests
export async function resetMockRepositories() {
  if (mockRepositories) {
    await mockRepositories.reset();
  }
}
