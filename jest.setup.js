import 'whatwg-fetch';
import { TextDecoder, TextEncoder } from 'util';
import { ReadableStream, WritableStream, TransformStream } from 'stream/web';

// MSW requires these globals
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;

// Mock BroadcastChannel for MSW WebSocket support
global.BroadcastChannel = class BroadcastChannel {
  constructor(name) {
    this.name = name;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

// Suppress specific console errors that are expected in tests
const originalError = console.error;
const originalWarn = console.warn;

// Allow disabling console suppression via environment variable
const suppressConsole = process.env.SUPPRESS_TEST_CONSOLE !== 'false';

// Patterns for expected errors that should be suppressed
const suppressedErrorPatterns = [
  // React act() warnings for expected async state updates
  /was not wrapped in act/,
  /inside a test was not wrapped in act/,
  // Expected API errors from tests
  /Error fetching transactions/,
  /Sign in error/,
  /Server error/,
  /Failed to fetch/,
  /Auth error/,
  // Radix UI errors in jsdom environment
  /hasPointerCapture is not a function/,
  /scrollIntoView is not a function/,
];

console.error = (...args) => {
  if (!suppressConsole) {
    originalError(...args);
    return;
  }

  const message = args[0]?.toString() || '';
  const shouldSuppress = suppressedErrorPatterns.some((pattern) => pattern.test(message));

  if (!shouldSuppress) {
    originalError(...args);
  }
};

console.warn = (...args) => {
  if (!suppressConsole) {
    originalWarn(...args);
    return;
  }

  // Add any warning patterns to suppress here if needed
  originalWarn(...args);
};

// Note: Console methods are overridden for all tests
// Original methods are stored but not restored to maintain consistency
// To disable suppression and see all console output, run tests with:
// SUPPRESS_TEST_CONSOLE=false pnpm test

// Mock pointer capture methods for Radix UI components
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
}

// Mock next-auth to avoid ES module issues
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    auth: jest.fn(),
    handlers: { GET: jest.fn(), POST: jest.fn() },
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
}));

jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    id: 'google',
    name: 'Google',
  })),
}));

// Mock NextResponse for API tests
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(url, options = {}) {
      Object.assign(this, new Request(url, options));
      this.nextUrl = new URL(url);
      this.url = url;
    }
  },
  NextResponse: {
    json: jest.fn((data, init) => {
      const response = new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });
      return response;
    }),
    redirect: jest.fn(),
  },
}));

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function () {};
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = function () {};
}

// Mock scrollIntoView for Radix UI components
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
