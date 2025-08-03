import { InMemoryRepository } from '@/shared/repositories/in-memory-repository';
import {
  Transaction,
  TransactionRepository as ITransactionRepository,
  TransactionSplit,
  BusinessError,
} from '@/shared/types/common';
import { v4 as uuidv4 } from 'uuid';

type CreateInput = {
  transactionId?: string;
  userId: string;
  accountId: string;
  date: Date;
  amountMinor: number;
  type: 'income' | 'expense' | 'transfer';
  status?: 'pending' | 'cleared' | 'reconciled';
  counterparty?: string;
  description?: string;
  splits: Omit<TransactionSplit, 'splitId'>[];
  attachmentIds?: string[];
  recurringTransactionId?: string;
};

export class TransactionRepository
  extends InMemoryRepository<Transaction, CreateInput>
  implements ITransactionRepository
{
  protected getEntityId(entity: Transaction): string {
    return entity.transactionId;
  }

  async create(input: CreateInput): Promise<Transaction> {
    this.validateCreateInput(input);

    const transactionId = input.transactionId || uuidv4();
    const splits = this.createSplits(input.splits);

    this.validateSplitAmounts(splits, input.amountMinor);

    const transaction: Omit<Transaction, 'createdAt' | 'updatedAt'> = {
      transactionId,
      userId: input.userId,
      accountId: input.accountId,
      date: new Date(input.date),
      amountMinor: input.amountMinor,
      type: input.type,
      status: input.status || 'pending',
      counterparty: input.counterparty,
      description: input.description,
      splits,
      attachmentIds: input.attachmentIds || [],
      recurringTransactionId: input.recurringTransactionId,
    };

    return super.create(transaction);
  }

  async update(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new BusinessError(`Transaction ${id} not found`, 'TRANSACTION_NOT_FOUND');
    }

    this.validateUpdate(existing, updates);

    if (updates.splits) {
      const amountMinor = updates.amountMinor || existing.amountMinor;
      this.validateSplitAmounts(updates.splits, amountMinor);
    }

    return super.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    const transaction = await this.findById(id);
    if (!transaction) {
      throw new BusinessError(`Transaction ${id} not found`, 'TRANSACTION_NOT_FOUND');
    }

    if (transaction.status === 'reconciled') {
      throw new BusinessError(
        'Cannot delete reconciled transaction',
        'CANNOT_DELETE_RECONCILED'
      );
    }

    return super.delete(id);
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    const all = await this.findAll();
    return all
      .filter((t) => t.userId === userId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async findByAccountId(accountId: string): Promise<Transaction[]> {
    const all = await this.findAll();
    return all.filter((t) => t.accountId === accountId);
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    if (startDate > endDate) {
      throw new BusinessError(
        'Start date must be before end date',
        'INVALID_DATE_RANGE'
      );
    }

    const all = await this.findByUserId(userId);
    return all.filter((t) => {
      const txDate = t.date.getTime();
      const start = startDate.getTime();
      const end = endDate.getTime();
      return txDate >= start && txDate <= end;
    });
  }

  private validateCreateInput(input: CreateInput): void {
    if (input.amountMinor <= 0) {
      throw new BusinessError(
        'Transaction amount must be positive',
        'INVALID_AMOUNT'
      );
    }

    if (!input.splits || input.splits.length === 0) {
      throw new BusinessError(
        'Transaction must have at least one split',
        'NO_SPLITS'
      );
    }

    if (!['income', 'expense', 'transfer'].includes(input.type)) {
      throw new BusinessError(
        'Invalid transaction type',
        'INVALID_TYPE'
      );
    }
  }

  private validateUpdate(
    existing: Transaction,
    updates: Partial<Transaction>
  ): void {
    if (existing.status === 'reconciled') {
      const allowedFields = ['description', 'attachmentIds'];
      const updateFields = Object.keys(updates);
      const hasDisallowedFields = updateFields.some(
        (field) => !allowedFields.includes(field)
      );

      if (hasDisallowedFields) {
        throw new BusinessError(
          'Cannot modify reconciled transaction',
          'CANNOT_UPDATE_RECONCILED'
        );
      }
    }

    if (updates.amountMinor !== undefined && updates.amountMinor <= 0) {
      throw new BusinessError(
        'Transaction amount must be positive',
        'INVALID_AMOUNT'
      );
    }
  }

  private createSplits(
    splits: Omit<TransactionSplit, 'splitId'>[]
  ): TransactionSplit[] {
    return splits.map((split) => ({
      ...split,
      splitId: uuidv4(),
    }));
  }

  private validateSplitAmounts(
    splits: TransactionSplit[],
    totalAmount: number
  ): void {
    const splitTotal = splits.reduce((sum, split) => sum + split.amountMinor, 0);

    if (splitTotal !== totalAmount) {
      throw new BusinessError(
        `Split amounts (${splitTotal}) must equal transaction amount (${totalAmount})`,
        'SPLIT_AMOUNT_MISMATCH'
      );
    }

    for (const split of splits) {
      if (split.amountMinor <= 0) {
        throw new BusinessError(
          'Split amounts must be positive',
          'INVALID_SPLIT_AMOUNT'
        );
      }
    }
  }
}
