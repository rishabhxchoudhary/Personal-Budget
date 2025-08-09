import { InMemoryRepository } from '@/shared/repositories/in-memory-repository';
import {
  RecurringTransaction,
  RecurringTransactionRepository as IRecurringTransactionRepository,
  CreateRecurringTransactionInput,
  BusinessError,
} from '@/shared/types/common';
import {
  createRecurringTransaction,
  validateRecurringTransaction,
  calculateNextRunDate,
} from './recurring-transaction';

type CreateInput = CreateRecurringTransactionInput & {
  userId: string;
  recurringId?: string;
};

export class RecurringTransactionRepository
  extends InMemoryRepository<RecurringTransaction, CreateInput>
  implements IRecurringTransactionRepository
{
  private userIdIndex: Map<string, Set<string>> = new Map();

  protected getEntityId(entity: RecurringTransaction): string {
    return entity.recurringId;
  }

  async create(item: CreateInput): Promise<RecurringTransaction> {
    // Create recurring transaction using the factory function
    const recurringTransaction = createRecurringTransaction(item);

    // Validate the recurring transaction
    validateRecurringTransaction(recurringTransaction);

    // Create the recurring transaction
    const created = await super.create(recurringTransaction);

    // Update user index
    if (!this.userIdIndex.has(created.userId)) {
      this.userIdIndex.set(created.userId, new Set());
    }
    this.userIdIndex.get(created.userId)!.add(created.recurringId);

    return created;
  }

  async update(id: string, updates: Partial<RecurringTransaction>): Promise<RecurringTransaction> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new BusinessError(`Recurring transaction ${id} not found`, 'RECURRING_TRANSACTION_NOT_FOUND');
    }

    // Prevent changing immutable fields
    const { recurringId, userId, ...allowedUpdates } = updates;
    // Explicitly ignore these immutable fields
    void recurringId;
    void userId;

    // If template is being updated, validate it
    if (updates.template) {
      const updatedRecurring = { ...existing, ...allowedUpdates };
      validateRecurringTransaction(updatedRecurring);
    }

    // If schedule is being updated, recalculate next run date
    let finalUpdates = allowedUpdates;
    if (updates.schedule) {
      const nextRunAt = calculateNextRunDate(updates.schedule, existing.lastRunAt || new Date());
      finalUpdates = {
        ...allowedUpdates,
        nextRunAt,
      };
    }

    return super.update(id, finalUpdates);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (existing) {
      // Remove from user index
      const userRecurringTransactions = this.userIdIndex.get(existing.userId);
      if (userRecurringTransactions) {
        userRecurringTransactions.delete(id);
        if (userRecurringTransactions.size === 0) {
          this.userIdIndex.delete(existing.userId);
        }
      }
    }

    await super.delete(id);
  }

  async findByUserId(userId: string): Promise<RecurringTransaction[]> {
    const recurringTransactionIds = this.userIdIndex.get(userId);
    if (!recurringTransactionIds || recurringTransactionIds.size === 0) {
      return [];
    }

    const recurringTransactions: RecurringTransaction[] = [];
    for (const id of recurringTransactionIds) {
      const recurringTransaction = await this.findById(id);
      if (recurringTransaction) {
        recurringTransactions.push(recurringTransaction);
      }
    }

    return recurringTransactions;
  }

  async findDueTransactions(beforeDate: Date): Promise<RecurringTransaction[]> {
    const all = await this.findAll();
    return all.filter(
      (rt) => rt.isActive && rt.nextRunAt <= beforeDate
    );
  }

  async findByAccountId(accountId: string): Promise<RecurringTransaction[]> {
    const all = await this.findAll();
    return all.filter(
      (rt) => rt.template.accountId === accountId
    );
  }

  async updateNextRunAt(recurringId: string, nextRunAt: Date): Promise<RecurringTransaction> {
    return this.update(recurringId, {
      nextRunAt,
      updatedAt: new Date()
    });
  }

  async clear(): Promise<void> {
    await super.clear();
    this.userIdIndex.clear();
  }

  // Additional helper methods for testing and management
  async findActiveByUserId(userId: string): Promise<RecurringTransaction[]> {
    const userRecurringTransactions = await this.findByUserId(userId);
    return userRecurringTransactions.filter(rt => rt.isActive);
  }

  async findInactiveByUserId(userId: string): Promise<RecurringTransaction[]> {
    const userRecurringTransactions = await this.findByUserId(userId);
    return userRecurringTransactions.filter(rt => !rt.isActive);
  }

  async findDueByUserId(userId: string, beforeDate: Date = new Date()): Promise<RecurringTransaction[]> {
    const userRecurringTransactions = await this.findByUserId(userId);
    return userRecurringTransactions.filter(
      (rt) => rt.isActive && rt.nextRunAt <= beforeDate
    );
  }

  async findByFrequency(frequency: string): Promise<RecurringTransaction[]> {
    const all = await this.findAll();
    return all.filter(rt => rt.schedule.includes(`FREQ=${frequency.toUpperCase()}`));
  }

  async countByUserId(userId: string): Promise<number> {
    const userRecurringTransactions = this.userIdIndex.get(userId);
    return userRecurringTransactions ? userRecurringTransactions.size : 0;
  }

  async countActiveByUserId(userId: string): Promise<number> {
    const activeRecurringTransactions = await this.findActiveByUserId(userId);
    return activeRecurringTransactions.length;
  }
}
