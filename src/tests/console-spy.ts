/**
 * Console spy utilities for suppressing expected console messages during tests
 */

type ConsoleMethod = 'error' | 'warn' | 'log' | 'info';

export class ConsoleSpy {
  private originalMethods: Partial<Record<ConsoleMethod, typeof console.error>> = {};
  private capturedCalls: Array<{ method: ConsoleMethod; args: unknown[] }> = [];
  private suppressedPatterns: RegExp[] = [];

  /**
   * Start spying on console methods
   * @param methods - Array of console methods to spy on
   * @param suppressPatterns - Array of regex patterns to suppress matching messages
   */
  mockConsole(
    methods: ConsoleMethod[] = ['error'],
    suppressPatterns: (string | RegExp)[] = [],
  ): void {
    this.suppressedPatterns = suppressPatterns.map((pattern) =>
      pattern instanceof RegExp ? pattern : new RegExp(pattern),
    );

    methods.forEach((method) => {
      this.originalMethods[method] = console[method];
      console[method] = (...args: unknown[]) => {
        const message = args.map((arg) => String(arg)).join(' ');

        // Check if message should be suppressed
        const shouldSuppress = this.suppressedPatterns.some((pattern) => pattern.test(message));

        if (!shouldSuppress) {
          // Call original method if not suppressed
          this.originalMethods[method]?.(...args);
        }

        // Always capture the call for testing purposes
        this.capturedCalls.push({ method, args });
      };
    });
  }

  /**
   * Restore original console methods
   */
  restore(): void {
    Object.entries(this.originalMethods).forEach(([method, original]) => {
      if (original) {
        console[method as ConsoleMethod] = original;
      }
    });
    this.originalMethods = {};
    this.capturedCalls = [];
    this.suppressedPatterns = [];
  }

  /**
   * Get all captured calls
   */
  getCalls(): Array<{ method: ConsoleMethod; args: unknown[] }> {
    return this.capturedCalls;
  }

  /**
   * Get calls for a specific method
   */
  getCallsForMethod(method: ConsoleMethod): unknown[][] {
    return this.capturedCalls.filter((call) => call.method === method).map((call) => call.args);
  }

  /**
   * Check if a specific message was logged
   */
  hasMessage(pattern: string | RegExp, method?: ConsoleMethod): boolean {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);

    if (method) {
      const methodCalls = this.getCallsForMethod(method);
      return methodCalls.some((args) => {
        const message = args.map((arg) => String(arg)).join(' ');
        return regex.test(message);
      });
    }

    return this.capturedCalls.some((call) => {
      const message = call.args.map((arg) => String(arg)).join(' ');
      return regex.test(message);
    });
  }

  /**
   * Clear captured calls without restoring console
   */
  clearCalls(): void {
    this.capturedCalls = [];
  }
}

/**
 * Convenience function to suppress console errors matching patterns during a test
 */
export function suppressConsoleErrors(patterns: (string | RegExp)[]): ConsoleSpy {
  const spy = new ConsoleSpy();
  spy.mockConsole(['error'], patterns);
  return spy;
}

/**
 * Convenience function to suppress all console errors during a test
 */
export function suppressAllConsoleErrors(): ConsoleSpy {
  const spy = new ConsoleSpy();
  spy.mockConsole(['error'], [/.*/]);
  return spy;
}

/**
 * Jest/Vitest helper to automatically suppress console errors in a test suite
 */
export function setupConsoleErrorSuppression(
  patterns: (string | RegExp)[],
  methods: ConsoleMethod[] = ['error'],
): void {
  const spy = new ConsoleSpy();

  beforeEach(() => {
    spy.mockConsole(methods, patterns);
  });

  afterEach(() => {
    spy.restore();
  });
}
