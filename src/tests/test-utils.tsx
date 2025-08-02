import { ReactElement } from 'react';
import { render, RenderOptions, waitFor } from '@testing-library/react';
import { act } from 'react';

/**
 * Custom render function that handles common test setup
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    ...options,
  });
}

/**
 * Wrapper for async operations that might cause React state updates
 * This helps prevent "not wrapped in act(...)" warnings
 */
export async function waitForStateUpdate<T>(callback: () => T | Promise<T>): Promise<T> {
  let result: T;

  await act(async () => {
    result = await callback();
  });

  return result!;
}

/**
 * Wait for a condition to be true, with proper act() wrapping
 */
export async function waitForCondition(
  condition: () => boolean,
  options?: { timeout?: number; interval?: number },
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options || {};
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, interval));
    });
  }
}

/**
 * Utility to wait for async effects to complete
 * Useful when components have useEffect hooks that fetch data
 */
export async function waitForEffects(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Utility to wait for multiple renders to complete
 * Useful for components that update state multiple times
 */
export async function waitForRenders(count: number = 1): Promise<void> {
  for (let i = 0; i < count; i++) {
    await waitForEffects();
  }
}

/**
 * Enhanced waitFor that ensures act() wrapping
 */
export async function waitForWithAct<T>(
  callback: () => T | Promise<T>,
  options?: Parameters<typeof waitFor>[1],
): Promise<T> {
  let result: T;

  await waitFor(async () => {
    await act(async () => {
      result = await callback();
    });
  }, options);

  return result!;
}

/**
 * Utility to suppress React act() warnings for a specific test
 * Use sparingly - it's better to fix the warnings than suppress them
 */
export function suppressActWarnings(): {
  restore: () => void;
} {
  const originalError = console.error;

  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
    if (
      !message.includes('was not wrapped in act') &&
      !message.includes('inside a test was not wrapped in act')
    ) {
      originalError(...args);
    }
  };

  return {
    restore: () => {
      console.error = originalError;
    },
  };
}

/**
 * Test helper for components that make API calls on mount
 */
export async function renderAndWaitForLoad(
  ui: ReactElement,
  options?: {
    renderOptions?: Omit<RenderOptions, 'wrapper'>;
    waitOptions?: Parameters<typeof waitFor>[1];
  },
) {
  const result = renderWithProviders(ui, options?.renderOptions);

  // Wait for initial effects to run
  await waitForEffects();

  // Give time for any API calls to complete
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  return result;
}

/**
 * Utility to test components with loading states
 */
export async function waitForLoadingToFinish(
  getLoadingElement: () => HTMLElement | null,
  options?: { timeout?: number },
): Promise<void> {
  await waitFor(
    () => {
      expect(getLoadingElement()).not.toBeInTheDocument();
    },
    { timeout: options?.timeout || 5000 },
  );
}

// Re-export everything from @testing-library/react for convenience
export * from '@testing-library/react';
