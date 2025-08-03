import { TransactionRepository } from '@/features/transactions/model/transaction-repository';
import { TransactionSplit, BusinessError } from '@/shared/types/common';
import { v4 as uuidv4 } from 'uuid';

describe('TransactionRepository', () => {
  let repository: TransactionRepository;

  beforeEach(() => {
    repository = new TransactionRepository();
  });

  const createValidInput = () => ({
    userId: 'user-123',
    accountId: 'account-456',
    date: new Date('2024-01-15'),
    amountMinor: 10000,
    type: 'expense' as const,
    splits: [
      {
        categoryId: 'cat-1',
        amountMinor: 10000,
        note: 'Test expense',
      },
    ],
  });

  describe('create', () => {
    it('should create a transaction with all required fields', async () => {
      const input = createValidInput();
      const transaction = await repository.create(input);

      expect(transaction.transactionId).toBeDefined();
      expect(transaction.userId).toBe(input.userId);
      expect(transaction.accountId).toBe(input.accountId);
      expect(transaction.date).toEqual(input.date);
      expect(transaction.amountMinor).toBe(input.amountMinor);
      expect(transaction.type).toBe(input.type);
      expect(transaction.status).toBe('pending');
      expect(transaction.splits).toHaveLength(1);
      expect(transaction.splits[0].splitId).toBeDefined();
      expect(transaction.createdAt).toBeDefined();
      expect(transaction.updatedAt).toBeDefined();
    });

    it('should create a transaction with optional fields', async () => {
      const input = {
        ...createValidInput(),
        transactionId: 'custom-id',
        status: 'cleared' as const,
        counterparty: 'Store Name',
        description: 'Purchase description',
        attachmentIds: ['attach-1', 'attach-2'],
        recurringTransactionId: 'recurring-123',
      };

      const transaction = await repository.create(input);

      expect(transaction.transactionId).toBe('custom-id');
      expect(transaction.status).toBe('cleared');
      expect(transaction.counterparty).toBe('Store Name');
      expect(transaction.description).toBe('Purchase description');
      expect(transaction.attachmentIds).toEqual(['attach-1', 'attach-2']);
      expect(transaction.recurringTransactionId).toBe('recurring-123');
    });

    it('should create a transaction with single split', async () => {
      const input = createValidInput();
      const transaction = await repository.create(input);

      expect(transaction.splits).toHaveLength(1);
      expect(transaction.splits[0].categoryId).toBe('cat-1');
      expect(transaction.splits[0].amountMinor).toBe(10000);
      expect(transaction.splits[0].note).toBe('Test expense');
    });

    it('should create a transaction with multiple splits', async () => {
      const input = {
        ...createValidInput(),
        splits: [
          { categoryId: 'cat-1', amountMinor: 6000 },
          { categoryId: 'cat-2', amountMinor: 4000, note: 'Split 2' },
        ],
      };

      const transaction = await repository.create(input);

      expect(transaction.splits).toHaveLength(2);
      expect(transaction.splits[0].amountMinor).toBe(6000);
      expect(transaction.splits[1].amountMinor).toBe(4000);
    });

    it('should assign unique split IDs', async () => {
      const input = {
        ...createValidInput(),
        splits: [
          { categoryId: 'cat-1', amountMinor: 5000 },
          { categoryId: 'cat-2', amountMinor: 5000 },
        ],
      };

      const transaction = await repository.create(input);
      const splitIds = transaction.splits.map((s) => s.splitId);

      expect(new Set(splitIds).size).toBe(2);
      splitIds.forEach((id) => expect(id).toMatch(/^[0-9a-f-]+$/));
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const before = new Date();
      const transaction = await repository.create(createValidInput());
      const after = new Date();

      expect(transaction.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(transaction.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(transaction.updatedAt).toEqual(transaction.createdAt);
    });

    it('should reject transaction with negative amount', async () => {
      const input = { ...createValidInput(), amountMinor: -1000 };

      await expect(repository.create(input)).rejects.toThrow(BusinessError);
      await expect(repository.create(input)).rejects.toThrow('amount must be positive');
    });

    it('should reject transaction with zero amount', async () => {
      const input = { ...createValidInput(), amountMinor: 0 };

      await expect(repository.create(input)).rejects.toThrow(BusinessError);
      await expect(repository.create(input)).rejects.toThrow('amount must be positive');
    });

    it('should reject transaction with empty splits array', async () => {
      const input = { ...createValidInput(), splits: [] };

      await expect(repository.create(input)).rejects.toThrow(BusinessError);
      await expect(repository.create(input)).rejects.toThrow('at least one split');
    });

    it('should reject transaction when split amounts do not equal total', async () => {
      const input = {
        ...createValidInput(),
        amountMinor: 10000,
        splits: [
          { categoryId: 'cat-1', amountMinor: 6000 },
          { categoryId: 'cat-2', amountMinor: 3000 },
        ],
      };

      await expect(repository.create(input)).rejects.toThrow(BusinessError);
      await expect(repository.create(input)).rejects.toThrow('must equal transaction amount');
    });

    it('should reject duplicate transaction ID', async () => {
      const input = { ...createValidInput(), transactionId: 'tx-123' };
      await repository.create(input);

      await expect(repository.create(input)).rejects.toThrow('already exists');
    });
  });

  describe('findById', () => {
    it('should find existing transaction by ID', async () => {
      const created = await repository.create(createValidInput());
      const found = await repository.findById(created.transactionId);

      expect(found).toEqual(created);
    });

    it('should return null for non-existent transaction', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });

    it('should return deep copy of transaction', async () => {
      const created = await repository.create(createValidInput());
      const found = await repository.findById(created.transactionId);

      expect(found).not.toBe(created);
      expect(found!.splits).not.toBe(created.splits);
      expect(found!.date).not.toBe(created.date);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no transactions exist', async () => {
      const all = await repository.findAll();

      expect(all).toEqual([]);
    });

    it('should return all transactions', async () => {
      const tx1 = await repository.create(createValidInput());
      const tx2 = await repository.create({
        ...createValidInput(),
        userId: 'user-456',
      });

      const all = await repository.findAll();

      expect(all).toHaveLength(2);
      expect(all[0].transactionId).toBe(tx1.transactionId);
      expect(all[1].transactionId).toBe(tx2.transactionId);
    });

    it('should maintain insertion order', async () => {
      await repository.create({ ...createValidInput(), description: 'First' });
      await repository.create({ ...createValidInput(), description: 'Second' });
      await repository.create({ ...createValidInput(), description: 'Third' });

      const all = await repository.findAll();

      expect(all[0].description).toBe('First');
      expect(all[1].description).toBe('Second');
      expect(all[2].description).toBe('Third');
    });

    it('should return deep copies of transactions', async () => {
      const created = await repository.create(createValidInput());
      const all = await repository.findAll();

      expect(all[0]).not.toBe(created);
      expect(all[0].splits).not.toBe(created.splits);
    });
  });

  describe('update', () => {
    it('should update transaction fields', async () => {
      const created = await repository.create(createValidInput());
      const updated = await repository.update(created.transactionId, {
        description: 'Updated description',
        counterparty: 'Updated counterparty',
        status: 'cleared',
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.counterparty).toBe('Updated counterparty');
      expect(updated.status).toBe('cleared');
      expect(updated.transactionId).toBe(created.transactionId);
    });

    it('should update splits', async () => {
      const created = await repository.create(createValidInput());
      const newSplits: TransactionSplit[] = [
        { splitId: uuidv4(), categoryId: 'new-cat', amountMinor: 10000 },
      ];

      const updated = await repository.update(created.transactionId, {
        splits: newSplits,
      });

      expect(updated.splits).toEqual(newSplits);
    });

    it('should preserve transaction ID', async () => {
      const created = await repository.create(createValidInput());
      const updated = await repository.update(created.transactionId, {
        description: 'Updated',
      });

      expect(updated.transactionId).toBe(created.transactionId);
    });

    it('should update updatedAt timestamp', async () => {
      const created = await repository.create(createValidInput());
      const originalUpdatedAt = created.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.update(created.transactionId, {
        description: 'Updated',
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should preserve createdAt timestamp', async () => {
      const created = await repository.create(createValidInput());
      const updated = await repository.update(created.transactionId, {
        description: 'Updated',
      });

      expect(updated.createdAt).toEqual(created.createdAt);
    });

    it('should reject update for non-existent transaction', async () => {
      await expect(repository.update('non-existent', { description: 'Test' })).rejects.toThrow(
        BusinessError,
      );
    });

    it('should reject update that changes reconciled transaction', async () => {
      const created = await repository.create({
        ...createValidInput(),
        status: 'reconciled',
      });

      await expect(repository.update(created.transactionId, { amountMinor: 5000 })).rejects.toThrow(
        'Cannot modify reconciled transaction',
      );
    });

    it('should reject update with invalid split amounts', async () => {
      const created = await repository.create(createValidInput());
      const invalidSplits: TransactionSplit[] = [
        { splitId: uuidv4(), categoryId: 'cat-1', amountMinor: 5000 },
      ];

      await expect(
        repository.update(created.transactionId, { splits: invalidSplits }),
      ).rejects.toThrow('must equal transaction amount');
    });
  });

  describe('delete', () => {
    it('should delete existing transaction', async () => {
      const created = await repository.create(createValidInput());
      await repository.delete(created.transactionId);

      const found = await repository.findById(created.transactionId);
      expect(found).toBeNull();
    });

    it('should reject delete for non-existent transaction', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow(BusinessError);
    });

    it('should reject delete for reconciled transaction', async () => {
      const created = await repository.create({
        ...createValidInput(),
        status: 'reconciled',
      });

      await expect(repository.delete(created.transactionId)).rejects.toThrow(
        'Cannot delete reconciled transaction',
      );
    });
  });

  describe('findByUserId', () => {
    it('should return empty array when no transactions for user', async () => {
      await repository.create(createValidInput());

      const result = await repository.findByUserId('other-user');

      expect(result).toEqual([]);
    });

    it('should return all transactions for user', async () => {
      const userId = 'user-123';
      const tx1 = await repository.create({ ...createValidInput(), userId });
      const tx2 = await repository.create({ ...createValidInput(), userId });
      await repository.create({ ...createValidInput(), userId: 'other-user' });

      const result = await repository.findByUserId(userId);

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.transactionId)).toContain(tx1.transactionId);
      expect(result.map((t) => t.transactionId)).toContain(tx2.transactionId);
    });

    it('should not return transactions for other users', async () => {
      await repository.create({ ...createValidInput(), userId: 'user-123' });
      await repository.create({ ...createValidInput(), userId: 'user-456' });

      const result = await repository.findByUserId('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
    });

    it('should return transactions in chronological order', async () => {
      const userId = 'user-123';
      const tx2 = await repository.create({
        ...createValidInput(),
        userId,
        date: new Date('2024-01-15'),
      });
      const tx1 = await repository.create({
        ...createValidInput(),
        userId,
        date: new Date('2024-01-10'),
      });
      const tx3 = await repository.create({
        ...createValidInput(),
        userId,
        date: new Date('2024-01-20'),
      });

      const result = await repository.findByUserId(userId);

      expect(result[0].transactionId).toBe(tx1.transactionId);
      expect(result[1].transactionId).toBe(tx2.transactionId);
      expect(result[2].transactionId).toBe(tx3.transactionId);
    });
  });

  describe('findByAccountId', () => {
    it('should return empty array when no transactions for account', async () => {
      await repository.create(createValidInput());

      const result = await repository.findByAccountId('other-account');

      expect(result).toEqual([]);
    });

    it('should return all transactions for account', async () => {
      const accountId = 'account-456';
      await repository.create({ ...createValidInput(), accountId });
      await repository.create({ ...createValidInput(), accountId });
      await repository.create({ ...createValidInput(), accountId: 'other-account' });

      const result = await repository.findByAccountId(accountId);

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.accountId === accountId)).toBe(true);
    });

    it('should not return transactions for other accounts', async () => {
      await repository.create({ ...createValidInput(), accountId: 'account-123' });
      await repository.create({ ...createValidInput(), accountId: 'account-456' });

      const result = await repository.findByAccountId('account-123');

      expect(result).toHaveLength(1);
      expect(result[0].accountId).toBe('account-123');
    });
  });

  describe('findByDateRange', () => {
    const createTxOnDate = async (date: string) => {
      return repository.create({
        ...createValidInput(),
        date: new Date(date),
        description: date,
      });
    };

    it('should return empty array when no transactions in range', async () => {
      await createTxOnDate('2024-01-15');

      const result = await repository.findByDateRange(
        'user-123',
        new Date('2024-02-01'),
        new Date('2024-02-28'),
      );

      expect(result).toEqual([]);
    });

    it('should return transactions within date range', async () => {
      await createTxOnDate('2024-01-05');
      const tx1 = await createTxOnDate('2024-01-15');
      const tx2 = await createTxOnDate('2024-01-20');
      await createTxOnDate('2024-02-05');

      const result = await repository.findByDateRange(
        'user-123',
        new Date('2024-01-10'),
        new Date('2024-01-25'),
      );

      expect(result).toHaveLength(2);
      expect(result[0].transactionId).toBe(tx1.transactionId);
      expect(result[1].transactionId).toBe(tx2.transactionId);
    });

    it('should include transactions on start date', async () => {
      const tx = await createTxOnDate('2024-01-15');

      const result = await repository.findByDateRange(
        'user-123',
        new Date('2024-01-15'),
        new Date('2024-01-20'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].transactionId).toBe(tx.transactionId);
    });

    it('should include transactions on end date', async () => {
      const tx = await createTxOnDate('2024-01-20');

      const result = await repository.findByDateRange(
        'user-123',
        new Date('2024-01-15'),
        new Date('2024-01-20'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].transactionId).toBe(tx.transactionId);
    });

    it('should exclude transactions before start date', async () => {
      await createTxOnDate('2024-01-14');

      const result = await repository.findByDateRange(
        'user-123',
        new Date('2024-01-15'),
        new Date('2024-01-20'),
      );

      expect(result).toEqual([]);
    });

    it('should exclude transactions after end date', async () => {
      await createTxOnDate('2024-01-21');

      const result = await repository.findByDateRange(
        'user-123',
        new Date('2024-01-15'),
        new Date('2024-01-20'),
      );

      expect(result).toEqual([]);
    });

    it('should filter by userId and date range', async () => {
      await repository.create({
        ...createValidInput(),
        userId: 'other-user',
        date: new Date('2024-01-15'),
      });
      const tx = await createTxOnDate('2024-01-15');

      const result = await repository.findByDateRange(
        'user-123',
        new Date('2024-01-10'),
        new Date('2024-01-20'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].transactionId).toBe(tx.transactionId);
    });

    it('should handle same start and end date', async () => {
      await createTxOnDate('2024-01-14');
      const tx = await createTxOnDate('2024-01-15');
      await createTxOnDate('2024-01-16');

      const result = await repository.findByDateRange(
        'user-123',
        new Date('2024-01-15'),
        new Date('2024-01-15'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].transactionId).toBe(tx.transactionId);
    });

    it('should reject invalid date range', async () => {
      await expect(
        repository.findByDateRange('user-123', new Date('2024-01-20'), new Date('2024-01-10')),
      ).rejects.toThrow('Start date must be before end date');
    });
  });

  describe('transaction validation', () => {
    it('should validate split amounts equal transaction amount', async () => {
      const input = {
        ...createValidInput(),
        amountMinor: 10000,
        splits: [
          { categoryId: 'cat-1', amountMinor: 4000 },
          { categoryId: 'cat-2', amountMinor: 6000 },
        ],
      };

      const tx = await repository.create(input);
      expect(tx.splits.reduce((sum, s) => sum + s.amountMinor, 0)).toBe(tx.amountMinor);
    });

    it('should validate transfer transactions have matching amount', async () => {
      const input = {
        ...createValidInput(),
        type: 'transfer' as const,
        amountMinor: 5000,
        splits: [{ categoryId: 'transfer-cat', amountMinor: 5000 }],
      };

      const tx = await repository.create(input);
      expect(tx.type).toBe('transfer');
      expect(tx.amountMinor).toBe(5000);
    });

    it('should validate income transactions have positive amount', async () => {
      const input = {
        ...createValidInput(),
        type: 'income' as const,
        amountMinor: 15000,
        splits: [{ categoryId: 'income-cat', amountMinor: 15000 }],
      };

      const tx = await repository.create(input);
      expect(tx.type).toBe('income');
      expect(tx.amountMinor).toBeGreaterThan(0);
    });

    it('should validate expense transactions have positive amount', async () => {
      const input = {
        ...createValidInput(),
        type: 'expense' as const,
        amountMinor: 8000,
        splits: [{ categoryId: 'expense-cat', amountMinor: 8000 }],
      };

      const tx = await repository.create(input);
      expect(tx.type).toBe('expense');
      expect(tx.amountMinor).toBeGreaterThan(0);
    });

    it('should validate all splits have valid category IDs', async () => {
      const input = createValidInput();
      const tx = await repository.create(input);

      tx.splits.forEach((split) => {
        expect(split.categoryId).toBeTruthy();
        expect(typeof split.categoryId).toBe('string');
      });
    });

    it('should validate status transitions', async () => {
      const tx = await repository.create(createValidInput());

      // pending -> cleared
      const cleared = await repository.update(tx.transactionId, { status: 'cleared' });
      expect(cleared.status).toBe('cleared');

      // cleared -> reconciled
      const reconciled = await repository.update(tx.transactionId, { status: 'reconciled' });
      expect(reconciled.status).toBe('reconciled');
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent creates', async () => {
      const promises = Array(5)
        .fill(null)
        .map((_, i) =>
          repository.create({
            ...createValidInput(),
            description: `Concurrent ${i}`,
          }),
        );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      const ids = results.map((r) => r.transactionId);
      expect(new Set(ids).size).toBe(5);
    });

    it('should handle concurrent updates', async () => {
      const tx = await repository.create(createValidInput());

      const promises = Array(3)
        .fill(null)
        .map((_, i) =>
          repository.update(tx.transactionId, {
            description: `Update ${i}`,
          }),
        );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((r) => expect(r.transactionId).toBe(tx.transactionId));
    });

    it('should maintain data consistency', async () => {
      const tx = await repository.create(createValidInput());

      await Promise.all([
        repository.update(tx.transactionId, { description: 'Update 1' }),
        repository.findById(tx.transactionId),
        repository.findAll(),
      ]);

      const final = await repository.findById(tx.transactionId);
      expect(final).toBeTruthy();
      expect(final!.transactionId).toBe(tx.transactionId);
    });
  });
});
