import { Transaction, TransactionRepository } from '@/shared/types/common';

export class MockTransactionRepository implements TransactionRepository {
  private transactions: Map<string, Transaction> = new Map();

  // Test helper methods
  addTransaction(transaction: Transaction): void {
    this.transactions.set(transaction.transactionId, transaction);
  }

  clear(): void {
    this.transactions.clear();
  }

  // Repository interface implementation
  async create(
    item: Omit<Transaction, 'createdAt' | 'updatedAt'>,
  ): Promise<Transaction> {
    const now = new Date();
    const transaction: Transaction = {
      ...item,
      createdAt: now,
      updatedAt: now,
    };
    this.transactions.set(transaction.transactionId, transaction);
    return { ...transaction };
  }

  async findById(id: string): Promise<Transaction | null> {
    const transaction = this.transactions.get(id);
    return transaction ? { ...transaction } : null;
  }

  async findAll(): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).map((t) => ({ ...t }));
  }

  async update(
    id: string,
    updates: Partial<Transaction>,
  ): Promise<Transaction> {
    const existing = this.transactions.get(id);
    if (!existing) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    const updated: Transaction = {
      ...existing,
      ...updates,
      transactionId: existing.transactionId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    this.transactions.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<void> {
    if (!this.transactions.has(id)) {
      throw new Error(`Transaction with id ${id} not found`);
    }
    this.transactions.delete(id);
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((t) => t.userId === userId)
      .map((t) => ({ ...t }));
  }

  async findByAccountId(accountId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((t) => t.accountId === accountId)
      .map((t) => ({ ...t }));
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(
        (t) =>
          t.userId === userId &&
          t.date >= startDate &&
          t.date <= endDate,
      )
      .map((t) => ({ ...t }));
  }
}

// Helper function to create test transactions
export function createTestTransaction(
  overrides: Partial<Transaction> = {},
): Transaction {
  const now = new Date();
  return {
    transactionId: `trans_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId: 'user_test',
    accountId: 'account_test',
    date: now,
    amountMinor: 5000,
    type: 'expense',
    status: 'cleared',
    splits: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
