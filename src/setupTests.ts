import '@testing-library/jest-dom';

// MSW (node) auto-start
import { server } from '@/mocks/server';

// Establish API mocking before all tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// Reset handlers after each test (so each test is isolated)
afterEach(() => server.resetHandlers());
// Clean up after the tests are finished.
afterAll(() => server.close());
