import {
  RecurringTransaction,
  RecurringTransactionService as IRecurringTransactionService,
  CreateRecurringTransactionInput,
  RecurringTransactionDue,
  Transaction,
  BusinessError,
} from '@/shared/types/common';
import { RecurringTransactionRepository } from '../model/recurring-transaction-repository';
import { TransactionRepository } from '@/features/transactions/model/transaction-repository';
import { AccountRepository } from '@/features/accounts/model/account-repository';
import { CategoryRepository } from '@/features/categories/model/category-repository';
import {
  createTransactionFromTemplate,
  updateLastRunAt,
  isDue,
  calculateNextRunDate,
  deactivateRecurringTransaction,
} from '../model/recurring-transaction';

export class RecurringTransactionService implements IRecurringTransactionService {
  constructor(
    private recurringTransactionRepository: RecurringTransactionRepository,
    private transactionRepository: TransactionRepository,
    private accountRepository: AccountRepository,
    private categoryRepository: CategoryRepository,
  ) {}

  async createRecurringTransaction(
    input: CreateRecurringTransactionInput & { userId: string },
  ): Promise<RecurringTransaction> {
    // Validate account exists and user owns it
    const account = await this.accountRepository.findById(input.template.accountId);
    if (!account) {
      throw new BusinessError('Account not found', 'ACCOUNT_NOT_FOUND');
    }
    if (account.userId !== input.userId) {
      throw new BusinessError('Access denied to account', 'ACCESS_DENIED');
    }

    // Validate categories exist and user owns them
    for (const split of input.template.splits) {
      if (split.categoryId) {
        const category = await this.categoryRepository.findById(split.categoryId);
        if (!category) {
          throw new BusinessError(`Category ${split.categoryId} not found`, 'CATEGORY_NOT_FOUND');
        }
        if (category.userId !== input.userId) {
          throw new BusinessError('Access denied to category', 'ACCESS_DENIED');
        }
      }
    }

    // Create the recurring transaction
    return this.recurringTransactionRepository.create(input);
  }

  async getDueTransactions(userId: string): Promise<RecurringTransactionDue[]> {
    const now = new Date();
    const userRecurringTransactions =
      await this.recurringTransactionRepository.findByUserId(userId);

    const dueTransactions: RecurringTransactionDue[] = [];

    for (const recurringTransaction of userRecurringTransactions) {
      if (isDue(recurringTransaction, now)) {
        const suggestedTransaction = createTransactionFromTemplate(recurringTransaction, userId);

        dueTransactions.push({
          recurringTransaction,
          dueDate: recurringTransaction.nextRunAt,
          suggestedTransaction,
        });
      }
    }

    // Sort by due date (earliest first)
    dueTransactions.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return dueTransactions;
  }

  async postRecurringTransaction(
    recurringId: string,
    confirmationData?: {
      date?: string;
      description?: string;
      counterparty?: string;
      amountMinor?: number;
    },
  ): Promise<Transaction> {
    const recurringTransaction = await this.recurringTransactionRepository.findById(recurringId);
    if (!recurringTransaction) {
      throw new BusinessError('Recurring transaction not found', 'RECURRING_TRANSACTION_NOT_FOUND');
    }

    if (!recurringTransaction.isActive) {
      throw new BusinessError(
        'Recurring transaction is not active',
        'RECURRING_TRANSACTION_INACTIVE',
      );
    }

    // Create the transaction from template
    const transactionData = createTransactionFromTemplate(
      recurringTransaction,
      recurringTransaction.userId,
    );

    // Apply any confirmation overrides
    const finalTransactionData = {
      ...transactionData,
      // Ensure these fields are not overridden
      userId: recurringTransaction.userId,
      recurringTransactionId: recurringTransaction.recurringId,
      // Apply overrides if provided
      date: confirmationData?.date ? new Date(confirmationData.date) : transactionData.date,
      description: confirmationData?.description || transactionData.description,
      counterparty: confirmationData?.counterparty || transactionData.counterparty,
      amountMinor: confirmationData?.amountMinor || transactionData.amountMinor,
    };

    // Create the transaction
    const transaction = await this.transactionRepository.create(finalTransactionData);

    // Update the recurring transaction's last run and next run dates
    const now = new Date();
    const updatedRecurringTransaction = updateLastRunAt(recurringTransaction, now);
    await this.recurringTransactionRepository.update(recurringId, {
      lastRunAt: updatedRecurringTransaction.lastRunAt,
      nextRunAt: updatedRecurringTransaction.nextRunAt,
      updatedAt: updatedRecurringTransaction.updatedAt,
    });

    return transaction;
  }

  async skipRecurringTransaction(recurringId: string): Promise<RecurringTransaction> {
    const recurringTransaction = await this.recurringTransactionRepository.findById(recurringId);
    if (!recurringTransaction) {
      throw new BusinessError('Recurring transaction not found', 'RECURRING_TRANSACTION_NOT_FOUND');
    }

    if (!recurringTransaction.isActive) {
      throw new BusinessError(
        'Recurring transaction is not active',
        'RECURRING_TRANSACTION_INACTIVE',
      );
    }

    // Calculate next run date from current next run date
    const nextRunAt = calculateNextRunDate(
      recurringTransaction.schedule,
      recurringTransaction.nextRunAt,
    );

    // Update the recurring transaction
    return this.recurringTransactionRepository.update(recurringId, {
      nextRunAt,
      updatedAt: new Date(),
    });
  }

  calculateNextRunDate(schedule: string, lastRun?: Date): Date {
    return calculateNextRunDate(schedule, lastRun);
  }

  async getUpcomingTransactions(
    userId: string,
    daysAhead: number = 30,
  ): Promise<RecurringTransactionDue[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const userRecurringTransactions =
      await this.recurringTransactionRepository.findByUserId(userId);

    const upcomingTransactions: RecurringTransactionDue[] = [];

    for (const recurringTransaction of userRecurringTransactions) {
      if (recurringTransaction.isActive && recurringTransaction.nextRunAt <= cutoffDate) {
        const suggestedTransaction = createTransactionFromTemplate(recurringTransaction, userId);

        upcomingTransactions.push({
          recurringTransaction,
          dueDate: recurringTransaction.nextRunAt,
          suggestedTransaction,
        });
      }
    }

    // Sort by due date
    upcomingTransactions.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return upcomingTransactions;
  }

  async pauseRecurringTransaction(recurringId: string): Promise<RecurringTransaction> {
    return this.recurringTransactionRepository.update(recurringId, {
      isActive: false,
      updatedAt: new Date(),
    });
  }

  async resumeRecurringTransaction(recurringId: string): Promise<RecurringTransaction> {
    const recurringTransaction = await this.recurringTransactionRepository.findById(recurringId);
    if (!recurringTransaction) {
      throw new BusinessError('Recurring transaction not found', 'RECURRING_TRANSACTION_NOT_FOUND');
    }

    // Recalculate next run date from now
    const nextRunAt = calculateNextRunDate(recurringTransaction.schedule, new Date());

    return this.recurringTransactionRepository.update(recurringId, {
      isActive: true,
      nextRunAt,
      updatedAt: new Date(),
    });
  }

  async deleteRecurringTransaction(recurringId: string): Promise<void> {
    const recurringTransaction = await this.recurringTransactionRepository.findById(recurringId);
    if (!recurringTransaction) {
      throw new BusinessError('Recurring transaction not found', 'RECURRING_TRANSACTION_NOT_FOUND');
    }

    // Check if there are any transactions created from this recurring transaction
    const relatedTransactions = await this.transactionRepository.findAll();
    const hasRelatedTransactions = relatedTransactions.some(
      (t) => t.recurringTransactionId === recurringId,
    );

    if (hasRelatedTransactions) {
      // If there are related transactions, just deactivate instead of delete
      const deactivated = deactivateRecurringTransaction(recurringTransaction);
      await this.recurringTransactionRepository.update(recurringId, {
        isActive: deactivated.isActive,
        updatedAt: deactivated.updatedAt,
      });
    } else {
      // Safe to delete if no related transactions
      await this.recurringTransactionRepository.delete(recurringId);
    }
  }

  async updateRecurringTransaction(
    recurringId: string,
    updates: Partial<CreateRecurringTransactionInput>,
  ): Promise<RecurringTransaction> {
    const existing = await this.recurringTransactionRepository.findById(recurringId);
    if (!existing) {
      throw new BusinessError('Recurring transaction not found', 'RECURRING_TRANSACTION_NOT_FOUND');
    }

    // If account is being updated, validate it
    if (updates.template?.accountId) {
      const account = await this.accountRepository.findById(updates.template.accountId);
      if (!account) {
        throw new BusinessError('Account not found', 'ACCOUNT_NOT_FOUND');
      }
      if (account.userId !== existing.userId) {
        throw new BusinessError('Access denied to account', 'ACCESS_DENIED');
      }
    }

    // If categories are being updated, validate them
    if (updates.template?.splits) {
      for (const split of updates.template.splits) {
        if (split.categoryId) {
          const category = await this.categoryRepository.findById(split.categoryId);
          if (!category) {
            throw new BusinessError(`Category ${split.categoryId} not found`, 'CATEGORY_NOT_FOUND');
          }
          if (category.userId !== existing.userId) {
            throw new BusinessError('Access denied to category', 'ACCESS_DENIED');
          }
        }
      }
    }

    // Prepare update data
    const updateData: Partial<RecurringTransaction> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.template !== undefined) {
      updateData.template = {
        ...existing.template,
        ...updates.template,
      };
    }

    if (updates.schedule !== undefined) {
      updateData.schedule = updates.schedule;
      // Recalculate next run date with new schedule
      updateData.nextRunAt = calculateNextRunDate(
        updates.schedule,
        existing.lastRunAt || new Date(),
      );
    }

    if (updates.autoPost !== undefined) {
      updateData.autoPost = updates.autoPost;
    }

    return this.recurringTransactionRepository.update(recurringId, updateData);
  }

  async getRecurringTransactionsByAccountId(accountId: string): Promise<RecurringTransaction[]> {
    return this.recurringTransactionRepository.findByAccountId(accountId);
  }

  async processAutoPostTransactions(userId?: string): Promise<Transaction[]> {
    // Get all due transactions
    const dueTransactions = userId
      ? await this.recurringTransactionRepository.findDueByUserId(userId)
      : await this.recurringTransactionRepository.findDueTransactions(new Date());

    const autoPostedTransactions: Transaction[] = [];

    for (const recurringTransaction of dueTransactions) {
      if (recurringTransaction.autoPost) {
        try {
          const transaction = await this.postRecurringTransaction(recurringTransaction.recurringId);
          autoPostedTransactions.push(transaction);
        } catch (error) {
          // Log error but continue processing other transactions
          console.error(
            `Failed to auto-post recurring transaction ${recurringTransaction.recurringId}:`,
            error,
          );
        }
      }
    }

    return autoPostedTransactions;
  }
}
