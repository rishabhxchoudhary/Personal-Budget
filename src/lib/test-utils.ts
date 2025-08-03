import {
  User,
  Account,
  Category,
  Budget,
  Transaction,
  CategoryAllocation,
  DebtShare,
  ExternalPerson,
} from '@/shared/types/common';

// Mock date utilities
export const mockDate = (date: Date | string) => {
  const RealDate = Date;
  const mockedDate = new Date(date);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.Date = jest.fn((...args: any[]) => {
    if (args.length === 0) {
      return mockedDate;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (RealDate as any)(...args);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  global.Date.now = jest.fn(() => mockedDate.getTime());
  global.Date.parse = RealDate.parse;
  global.Date.UTC = RealDate.UTC;

  return () => {
    global.Date = RealDate;
  };
};

// Factory functions for creating test entities
export const createTestUser = (overrides?: Partial<User>): User => ({
  userId: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  defaultCurrency: 'USD',
  monthStartDay: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createTestAccount = (overrides?: Partial<Account>): Account => ({
  accountId: 'account-123',
  userId: 'user-123',
  name: 'Test Checking',
  type: 'checking',
  balanceMinor: 100000, // $1000.00
  currency: 'USD',
  isActive: true,
  institution: 'Test Bank',
  lastFour: '1234',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createTestCategory = (overrides?: Partial<Category>): Category => ({
  categoryId: 'category-123',
  userId: 'user-123',
  name: 'Groceries',
  type: 'expense',
  budgetingMethod: 'fixed',
  isActive: true,
  sortOrder: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createTestBudget = (overrides?: Partial<Budget>): Budget => ({
  budgetId: 'budget-123',
  userId: 'user-123',
  month: '2024-01',
  plannedIncomeMinor: 500000, // $5000.00
  actualIncomeMinor: 0,
  totalAllocatedMinor: 0,
  status: 'draft',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createTestTransaction = (overrides?: Partial<Transaction>): Transaction => ({
  transactionId: 'transaction-123',
  userId: 'user-123',
  accountId: 'account-123',
  date: new Date('2024-01-15'),
  amountMinor: 5000, // $50.00
  type: 'expense',
  status: 'cleared',
  counterparty: 'Test Store',
  description: 'Test purchase',
  splits: [
    {
      splitId: 'split-123',
      categoryId: 'category-123',
      amountMinor: 5000,
    },
  ],
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  ...overrides,
});

export const createTestCategoryAllocation = (
  overrides?: Partial<CategoryAllocation>,
): CategoryAllocation => ({
  allocationId: 'allocation-123',
  budgetId: 'budget-123',
  categoryId: 'category-123',
  allocationType: 'fixed',
  allocationValue: 50000, // $500.00
  allocatedMinor: 50000,
  spentMinor: 0,
  remainingMinor: 50000,
  rollover: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createTestExternalPerson = (overrides?: Partial<ExternalPerson>): ExternalPerson => ({
  personId: 'person-123',
  userId: 'user-123',
  name: 'Test Person',
  email: 'person@example.com',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createTestDebtShare = (overrides?: Partial<DebtShare>): DebtShare => ({
  debtShareId: 'debt-123',
  creditorId: 'user-123',
  debtorId: 'person-123',
  transactionId: 'transaction-123',
  amountMinor: 2500, // $25.00
  status: 'pending',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

// Async test utilities
export const waitFor = async (
  condition: () => boolean,
  timeout = 1000,
  interval = 10,
): Promise<void> => {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

// ID generator for tests
export const generateTestId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

// Money amount helpers
export const dollars = (amount: number): number => {
  return Math.round(amount * 100);
};

export const cents = (amount: number): number => {
  return amount;
};

// Date helpers for tests
export const startOfMonth = (month: string): Date => {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
};

export const endOfMonth = (month: string): Date => {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, monthNum, 0, 23, 59, 59, 999);
};

// Assert helpers
export const expectDateToBeClose = (actual: Date, expected: Date, maxDiffMs = 1000) => {
  const diff = Math.abs(actual.getTime() - expected.getTime());
  if (diff > maxDiffMs) {
    throw new Error(`Expected dates to be within ${maxDiffMs}ms, but difference was ${diff}ms`);
  }
};

// Mock repository helper
export class MockRepository<T> {
  private items: T[] = [];

  async create(item: T): Promise<T> {
    this.items.push(item);
    return { ...item };
  }

  async findById(id: string): Promise<T | null> {
    return (
      this.items.find((item) => {
        const anyItem = item as Record<string, unknown>;
        return (
          anyItem.id === id ||
          anyItem.userId === id ||
          anyItem[Object.keys(anyItem).find((k) => k.endsWith('Id')) || ''] === id
        );
      }) || null
    );
  }

  async findAll(): Promise<T[]> {
    return [...this.items];
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const index = this.items.findIndex((item) => {
      const anyItem = item as Record<string, unknown>;
      return (
        anyItem.id === id ||
        anyItem[Object.keys(anyItem).find((k) => k.endsWith('Id')) || ''] === id
      );
    });

    if (index === -1) {
      throw new Error(`Item with id ${id} not found`);
    }

    this.items[index] = { ...this.items[index], ...updates };
    return { ...this.items[index] };
  }

  async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => {
      const anyItem = item as Record<string, unknown>;
      return (
        anyItem.id === id ||
        anyItem[Object.keys(anyItem).find((k) => k.endsWith('Id')) || ''] === id
      );
    });

    if (index === -1) {
      throw new Error(`Item with id ${id} not found`);
    }

    this.items.splice(index, 1);
  }

  clear(): void {
    this.items = [];
  }

  getItems(): T[] {
    return [...this.items];
  }
}

// Error expectation helpers
export const expectAsyncError = async (
  asyncFn: () => Promise<unknown>,
  errorMessage?: string | RegExp,
): Promise<void> => {
  let error: Error | null = null;

  try {
    await asyncFn();
  } catch (e) {
    error = e as Error;
  }

  expect(error).not.toBeNull();

  if (errorMessage) {
    if (typeof errorMessage === 'string') {
      expect(error?.message).toBe(errorMessage);
    } else {
      expect(error?.message).toMatch(errorMessage);
    }
  }
};

// Custom matchers
export const toBeValidUUID = (received: string): { pass: boolean; message: () => string } => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const pass = uuidRegex.test(received);

  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} not to be a valid UUID`
        : `expected ${received} to be a valid UUID`,
  };
};

// Setup and teardown helpers
export const setupTestDatabase = () => {
  const repositories = {
    users: new MockRepository<User>(),
    accounts: new MockRepository<Account>(),
    categories: new MockRepository<Category>(),
    budgets: new MockRepository<Budget>(),
    transactions: new MockRepository<Transaction>(),
    allocations: new MockRepository<CategoryAllocation>(),
    debtShares: new MockRepository<DebtShare>(),
    externalPersons: new MockRepository<ExternalPerson>(),
  };

  const clearAll = () => {
    Object.values(repositories).forEach((repo) => repo.clear());
  };

  return { repositories, clearAll };
};

// Snapshot serializers for dates
export const dateSerializer = {
  test: (val: unknown) => val instanceof Date,
  print: (val: Date) => `Date(${val.toISOString()})`,
};
