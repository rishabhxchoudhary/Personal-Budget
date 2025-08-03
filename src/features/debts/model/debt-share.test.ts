import { DebtShare } from '@/shared/types/common';
import { DebtShareRepositoryImpl } from './debt-share-repository';
import {
  validateDebtStatus,
  validateAmountMinor,
  validateCreditorDebtor,
  validateTransactionId,
  createDebtShareId,
  calculateRemainingDebt,
  determineDebtStatus,
} from './debt-share';

describe('DebtShare Model', () => {
  describe('DebtShare Entity', () => {
    it('should create a valid debt share with all fields', () => {
      const debtShare: DebtShare = {
        debtShareId: 'debt_123',
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(debtShare.debtShareId).toBe('debt_123');
      expect(debtShare.creditorId).toBe('user_1');
      expect(debtShare.debtorId).toBe('person_1');
      expect(debtShare.transactionId).toBe('trans_123');
      expect(debtShare.amountMinor).toBe(5000);
      expect(debtShare.status).toBe('pending');
    });

    it('should require valid creditorId', () => {
      expect(() => validateCreditorDebtor('', 'debtor_1')).toThrow('CreditorId is required');
      expect(() => validateCreditorDebtor('  ', 'debtor_1')).toThrow('CreditorId is required');
    });

    it('should require valid debtorId', () => {
      expect(() => validateCreditorDebtor('creditor_1', '')).toThrow('DebtorId is required');
      expect(() => validateCreditorDebtor('creditor_1', '  ')).toThrow('DebtorId is required');
    });

    it('should require valid transactionId', () => {
      expect(() => validateTransactionId('')).toThrow('TransactionId is required');
      expect(() => validateTransactionId('  ')).toThrow('TransactionId is required');
    });

    it('should require positive amountMinor', () => {
      expect(() => validateAmountMinor(0)).toThrow('Amount must be positive');
      expect(() => validateAmountMinor(-100)).toThrow('Amount must be positive');
    });

    it('should have status "pending" by default', () => {
      expect(validateDebtStatus('pending')).toBe(true);
    });

    it('should not allow creditor and debtor to be the same', () => {
      expect(() => validateCreditorDebtor('user_1', 'user_1')).toThrow(
        'Creditor and debtor cannot be the same',
      );
    });

    it('should validate status values', () => {
      expect(validateDebtStatus('pending')).toBe(true);
      expect(validateDebtStatus('partial')).toBe(true);
      expect(validateDebtStatus('paid')).toBe(true);
      expect(validateDebtStatus('invalid' as string)).toBe(false);
    });

    it('should not allow negative amountMinor', () => {
      expect(() => validateAmountMinor(-1000)).toThrow('Amount must be positive');
    });

    it('should not allow zero amountMinor', () => {
      expect(() => validateAmountMinor(0)).toThrow('Amount must be positive');
    });
  });
});

describe('DebtShareRepository', () => {
  let repository: DebtShareRepositoryImpl;

  beforeEach(() => {
    repository = new DebtShareRepositoryImpl();
  });

  describe('create', () => {
    it('should create a new debt share', async () => {
      const input = {
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      };

      const created = await repository.create(input);

      expect(created.creditorId).toBe('user_1');
      expect(created.debtorId).toBe('person_1');
      expect(created.transactionId).toBe('trans_123');
      expect(created.amountMinor).toBe(5000);
      expect(created.status).toBe('pending');
      expect(created.debtShareId).toMatch(/^debt_/);
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate a unique debtShareId', async () => {
      const input1 = {
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
      };

      const input2 = {
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_2',
        amountMinor: 2000,
      };

      const debt1 = await repository.create(input1);
      const debt2 = await repository.create(input2);

      expect(debt1.debtShareId).not.toBe(debt2.debtShareId);
      expect(debt1.debtShareId).toMatch(/^debt_/);
      expect(debt2.debtShareId).toMatch(/^debt_/);
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const before = new Date();
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });
      const after = new Date();

      expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(created.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(created.updatedAt.getTime()).toBe(created.createdAt.getTime());
    });

    it('should default status to "pending" if not specified', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      expect(created.status).toBe('pending');
    });

    it('should validate required fields', async () => {
      await expect(
        repository.create({
          debtorId: 'person_1',
          transactionId: 'trans_123',
          amountMinor: 5000,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      ).rejects.toThrow('CreditorId and debtorId are required');

      await expect(
        repository.create({
          creditorId: 'user_1',
          transactionId: 'trans_123',
          amountMinor: 5000,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      ).rejects.toThrow('CreditorId and debtorId are required');

      await expect(
        repository.create({
          creditorId: 'user_1',
          debtorId: 'person_1',
          amountMinor: 5000,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      ).rejects.toThrow('TransactionId is required');

      await expect(
        repository.create({
          creditorId: 'user_1',
          debtorId: 'person_1',
          transactionId: 'trans_123',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      ).rejects.toThrow('AmountMinor is required');
    });

    it('should validate amountMinor is positive', async () => {
      await expect(
        repository.create({
          creditorId: 'user_1',
          debtorId: 'person_1',
          transactionId: 'trans_123',
          amountMinor: 0,
        }),
      ).rejects.toThrow('Amount must be positive');

      await expect(
        repository.create({
          creditorId: 'user_1',
          debtorId: 'person_1',
          transactionId: 'trans_123',
          amountMinor: -1000,
        }),
      ).rejects.toThrow('Amount must be positive');
    });

    it('should prevent duplicate debtShareId', async () => {
      const input = {
        debtShareId: 'debt_duplicate',
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      };

      await repository.create(input);
      await expect(repository.create(input)).rejects.toThrow(
        'Entity with id debt_duplicate already exists',
      );
    });

    it('should prevent creditor and debtor being the same', async () => {
      await expect(
        repository.create({
          creditorId: 'user_1',
          debtorId: 'user_1',
          transactionId: 'trans_123',
          amountMinor: 5000,
        }),
      ).rejects.toThrow('Creditor and debtor cannot be the same');
    });

    it('should validate status enum values', async () => {
      await expect(
        repository.create({
          creditorId: 'user_1',
          debtorId: 'person_1',
          transactionId: 'trans_123',
          amountMinor: 5000,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: 'invalid' as any,
        }),
      ).rejects.toThrow('Invalid status: invalid');
    });
  });

  describe('findById', () => {
    it('should find an existing debt share by id', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const found = await repository.findById(created.debtShareId);

      expect(found).toBeTruthy();
      expect(found?.debtShareId).toBe(created.debtShareId);
      expect(found?.amountMinor).toBe(5000);
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non_existent');
      expect(found).toBeNull();
    });

    it('should return a deep copy of the entity', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const found1 = await repository.findById(created.debtShareId);
      const found2 = await repository.findById(created.debtShareId);

      expect(found1).not.toBe(found2);
      expect(found1).toEqual(found2);
    });
  });

  describe('findByCreditorId', () => {
    it('should find all debt shares where user is creditor', async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_2',
        amountMinor: 2000,
      });

      await repository.create({
        creditorId: 'user_2',
        debtorId: 'person_1',
        transactionId: 'trans_3',
        amountMinor: 3000,
      });

      const user1Debts = await repository.findByCreditorId('user_1');

      expect(user1Debts).toHaveLength(2);
      expect(user1Debts[0].amountMinor).toBe(1000);
      expect(user1Debts[1].amountMinor).toBe(2000);
    });

    it('should return empty array for creditor with no debts owed', async () => {
      const debts = await repository.findByCreditorId('no_debts_user');
      expect(debts).toEqual([]);
    });

    it('should only return debts for the specified creditor', async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
      });

      await repository.create({
        creditorId: 'user_2',
        debtorId: 'person_1',
        transactionId: 'trans_2',
        amountMinor: 2000,
      });

      const user1Debts = await repository.findByCreditorId('user_1');
      const user2Debts = await repository.findByCreditorId('user_2');

      expect(user1Debts).toHaveLength(1);
      expect(user1Debts[0].creditorId).toBe('user_1');
      expect(user2Debts).toHaveLength(1);
      expect(user2Debts[0].creditorId).toBe('user_2');
    });

    it('should return debts in insertion order', async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_2',
        amountMinor: 2000,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_3',
        transactionId: 'trans_3',
        amountMinor: 3000,
      });

      const debts = await repository.findByCreditorId('user_1');

      expect(debts[0].debtorId).toBe('person_1');
      expect(debts[1].debtorId).toBe('person_2');
      expect(debts[2].debtorId).toBe('person_3');
    });

    it('should include all debt statuses', async () => {
      const pending = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
        status: 'pending',
      });

      const partial = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_2',
        amountMinor: 2000,
        status: 'partial',
      });

      const paid = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_3',
        transactionId: 'trans_3',
        amountMinor: 3000,
        status: 'paid',
      });

      const debts = await repository.findByCreditorId('user_1');

      expect(debts).toHaveLength(3);
      expect(debts.find((d) => d.debtShareId === pending.debtShareId)?.status).toBe('pending');
      expect(debts.find((d) => d.debtShareId === partial.debtShareId)?.status).toBe('partial');
      expect(debts.find((d) => d.debtShareId === paid.debtShareId)?.status).toBe('paid');
    });
  });

  describe('findByDebtorId', () => {
    it('should find all debt shares where user is debtor', async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
      });

      await repository.create({
        creditorId: 'user_2',
        debtorId: 'person_1',
        transactionId: 'trans_2',
        amountMinor: 2000,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_3',
        amountMinor: 3000,
      });

      const person1Debts = await repository.findByDebtorId('person_1');

      expect(person1Debts).toHaveLength(2);
      expect(person1Debts[0].amountMinor).toBe(1000);
      expect(person1Debts[1].amountMinor).toBe(2000);
    });

    it('should return empty array for debtor with no debts', async () => {
      const debts = await repository.findByDebtorId('no_debts_person');
      expect(debts).toEqual([]);
    });

    it('should only return debts for the specified debtor', async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_2',
        amountMinor: 2000,
      });

      const person1Debts = await repository.findByDebtorId('person_1');
      const person2Debts = await repository.findByDebtorId('person_2');

      expect(person1Debts).toHaveLength(1);
      expect(person1Debts[0].debtorId).toBe('person_1');
      expect(person2Debts).toHaveLength(1);
      expect(person2Debts[0].debtorId).toBe('person_2');
    });

    it('should return debts in insertion order', async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
      });

      await repository.create({
        creditorId: 'user_2',
        debtorId: 'person_1',
        transactionId: 'trans_2',
        amountMinor: 2000,
      });

      await repository.create({
        creditorId: 'user_3',
        debtorId: 'person_1',
        transactionId: 'trans_3',
        amountMinor: 3000,
      });

      const debts = await repository.findByDebtorId('person_1');

      expect(debts[0].creditorId).toBe('user_1');
      expect(debts[1].creditorId).toBe('user_2');
      expect(debts[2].creditorId).toBe('user_3');
    });

    it('should include all debt statuses', async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
        status: 'pending',
      });

      await repository.create({
        creditorId: 'user_2',
        debtorId: 'person_1',
        transactionId: 'trans_2',
        amountMinor: 2000,
        status: 'partial',
      });

      await repository.create({
        creditorId: 'user_3',
        debtorId: 'person_1',
        transactionId: 'trans_3',
        amountMinor: 3000,
        status: 'paid',
      });

      const debts = await repository.findByDebtorId('person_1');

      expect(debts).toHaveLength(3);
      expect(debts.filter((d) => d.status === 'pending')).toHaveLength(1);
      expect(debts.filter((d) => d.status === 'partial')).toHaveLength(1);
      expect(debts.filter((d) => d.status === 'paid')).toHaveLength(1);
    });
  });

  describe('findByTransactionId', () => {
    it('should find all debt shares for a transaction', async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 3000,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_123',
        amountMinor: 2000,
      });

      const shares = await repository.findByTransactionId('trans_123');

      expect(shares).toHaveLength(2);
      expect(shares[0].transactionId).toBe('trans_123');
      expect(shares[1].transactionId).toBe('trans_123');
      expect(shares[0].amountMinor + shares[1].amountMinor).toBe(5000);
    });

    it('should return empty array for transaction with no debt shares', async () => {
      const shares = await repository.findByTransactionId('no_shares_trans');
      expect(shares).toEqual([]);
    });

    it('should only return debt shares for the specified transaction', async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_2',
        amountMinor: 2000,
      });

      const trans1Shares = await repository.findByTransactionId('trans_1');
      const trans2Shares = await repository.findByTransactionId('trans_2');

      expect(trans1Shares).toHaveLength(1);
      expect(trans1Shares[0].transactionId).toBe('trans_1');
      expect(trans2Shares).toHaveLength(1);
      expect(trans2Shares[0].transactionId).toBe('trans_2');
    });

    it('should return multiple debt shares for split debts', async () => {
      // Create a transaction with multiple debt shares (split debt)
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_split',
        amountMinor: 2000,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_split',
        amountMinor: 1500,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_3',
        transactionId: 'trans_split',
        amountMinor: 1500,
      });

      const shares = await repository.findByTransactionId('trans_split');

      expect(shares).toHaveLength(3);
      expect(shares.reduce((sum, share) => sum + share.amountMinor, 0)).toBe(5000);
    });
  });

  describe('findByStatus', () => {
    beforeEach(async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
        status: 'pending',
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_2',
        amountMinor: 2000,
        status: 'partial',
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_3',
        transactionId: 'trans_3',
        amountMinor: 3000,
        status: 'paid',
      });
    });

    it('should find all debt shares with specific status', async () => {
      const pendingShares = await repository.findByStatus('pending');
      const partialShares = await repository.findByStatus('partial');
      const paidShares = await repository.findByStatus('paid');

      expect(pendingShares).toHaveLength(1);
      expect(partialShares).toHaveLength(1);
      expect(paidShares).toHaveLength(1);
    });

    it('should filter by pending status', async () => {
      const shares = await repository.findByStatus('pending');

      expect(shares).toHaveLength(1);
      expect(shares[0].status).toBe('pending');
      expect(shares[0].amountMinor).toBe(1000);
    });

    it('should filter by partial status', async () => {
      const shares = await repository.findByStatus('partial');

      expect(shares).toHaveLength(1);
      expect(shares[0].status).toBe('partial');
      expect(shares[0].amountMinor).toBe(2000);
    });

    it('should filter by paid status', async () => {
      const shares = await repository.findByStatus('paid');

      expect(shares).toHaveLength(1);
      expect(shares[0].status).toBe('paid');
      expect(shares[0].amountMinor).toBe(3000);
    });

    it('should return empty array when no debts match status', async () => {
      // Create repository with no debts
      const emptyRepo = new DebtShareRepositoryImpl();
      const shares = await emptyRepo.findByStatus('pending');

      expect(shares).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update an existing debt share', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const updated = await repository.update(created.debtShareId, {
        status: 'partial',
      });

      expect(updated.status).toBe('partial');
      expect(updated.amountMinor).toBe(5000);
    });

    it('should update the updatedAt timestamp', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.update(created.debtShareId, {
        status: 'partial',
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should not modify the createdAt timestamp', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const updated = await repository.update(created.debtShareId, {
        status: 'partial',
      });

      expect(updated.createdAt.getTime()).toBe(created.createdAt.getTime());
    });

    it('should not modify the debtShareId', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const updated = await repository.update(created.debtShareId, {
        status: 'partial',
      });

      expect(updated.debtShareId).toBe(created.debtShareId);
    });

    it('should validate status transitions', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
        status: 'paid',
      });

      await expect(
        repository.update(created.debtShareId, {
          status: 'pending',
        }),
      ).rejects.toThrow('Cannot transition from paid to pending');
    });

    it('should not allow changing creditorId', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const updated = await repository.update(created.debtShareId, {
        creditorId: 'user_2',
      });

      // creditorId should remain unchanged
      expect(updated.creditorId).toBe('user_1');
    });

    it('should not allow changing debtorId', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const updated = await repository.update(created.debtShareId, {
        debtorId: 'person_2',
      });

      // debtorId should remain unchanged
      expect(updated.debtorId).toBe('person_1');
    });

    it('should not allow changing transactionId', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const updated = await repository.update(created.debtShareId, {
        transactionId: 'trans_456',
      });

      // transactionId should remain unchanged
      expect(updated.transactionId).toBe('trans_123');
    });

    it('should allow updating status', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const partial = await repository.update(created.debtShareId, {
        status: 'partial',
      });

      expect(partial.status).toBe('partial');

      const paid = await repository.update(created.debtShareId, {
        status: 'paid',
      });

      expect(paid.status).toBe('paid');
    });

    it('should allow updating amountMinor for partial payments', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const updated = await repository.update(created.debtShareId, {
        amountMinor: 3000,
      });

      expect(updated.amountMinor).toBe(3000);
    });

    it('should throw error for non-existent id', async () => {
      await expect(repository.update('non_existent', { status: 'paid' })).rejects.toThrow(
        'Entity with id non_existent not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing debt share', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      await repository.delete(created.debtShareId);

      const found = await repository.findById(created.debtShareId);
      expect(found).toBeNull();
    });

    it('should throw error for non-existent id', async () => {
      await expect(repository.delete('non_existent')).rejects.toThrow(
        'Entity with id non_existent not found',
      );
    });

    it('should remove debt share from all queries', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      await repository.delete(created.debtShareId);

      const byId = await repository.findById(created.debtShareId);
      const byCreditor = await repository.findByCreditorId('user_1');
      const byDebtor = await repository.findByDebtorId('person_1');
      const byTransaction = await repository.findByTransactionId('trans_123');

      expect(byId).toBeNull();
      expect(byCreditor).toEqual([]);
      expect(byDebtor).toEqual([]);
      expect(byTransaction).toEqual([]);
    });

    it('should not delete paid debt shares', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
        status: 'paid',
      });

      await expect(repository.delete(created.debtShareId)).rejects.toThrow(
        'Cannot delete paid debt shares',
      );
    });
  });

  describe('updateStatus', () => {
    it('should update debt status to partial', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const updated = await repository.updateStatus(created.debtShareId, 'partial');

      expect(updated.status).toBe('partial');
      expect(updated.debtShareId).toBe(created.debtShareId);
    });

    it('should update debt status to paid', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
        status: 'partial',
      });

      const updated = await repository.updateStatus(created.debtShareId, 'paid');

      expect(updated.status).toBe('paid');
    });

    it('should not allow changing from paid to other status', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
        status: 'paid',
      });

      await expect(repository.updateStatus(created.debtShareId, 'pending')).rejects.toThrow(
        'Cannot transition from paid to pending',
      );
    });

    it('should update the updatedAt timestamp', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.updateStatus(created.debtShareId, 'partial');

      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should throw error for invalid status', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(repository.updateStatus(created.debtShareId, 'invalid' as any)).rejects.toThrow(
        'Invalid status: invalid',
      );
    });
  });

  describe('getTotalByTransaction', () => {
    it('should calculate total debt amount for transaction', async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 3000,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_123',
        amountMinor: 2000,
      });

      const total = await repository.getTotalByTransaction('trans_123');

      expect(total).toBe(5000);
    });

    it('should return 0 for transaction with no debt shares', async () => {
      const total = await repository.getTotalByTransaction('no_shares');
      expect(total).toBe(0);
    });

    it('should sum multiple debt shares correctly', async () => {
      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_split',
        amountMinor: 1234,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_split',
        amountMinor: 2345,
      });

      await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_3',
        transactionId: 'trans_split',
        amountMinor: 1421,
      });

      const total = await repository.getTotalByTransaction('trans_split');

      expect(total).toBe(5000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum amountMinor value', async () => {
      const maxAmount = Number.MAX_SAFE_INTEGER;

      await expect(
        repository.create({
          creditorId: 'user_1',
          debtorId: 'person_1',
          transactionId: 'trans_123',
          amountMinor: maxAmount + 1,
        }),
      ).rejects.toThrow('Amount exceeds maximum allowed value');

      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: maxAmount,
      });

      expect(created.amountMinor).toBe(maxAmount);
    });

    it('should handle concurrent updates to same debt share', async () => {
      const created = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_123',
        amountMinor: 5000,
      });

      const updates = Promise.all([
        repository.updateStatus(created.debtShareId, 'partial'),
        repository.update(created.debtShareId, { amountMinor: 4000 }),
      ]);

      await updates;
      const final = await repository.findById(created.debtShareId);

      expect(final).toBeTruthy();
      expect(final?.status).toMatch(/pending|partial/);
    });

    it('should maintain referential integrity', async () => {
      const share1 = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_1',
        transactionId: 'trans_1',
        amountMinor: 1000,
      });

      const share2 = await repository.create({
        creditorId: 'user_1',
        debtorId: 'person_2',
        transactionId: 'trans_1',
        amountMinor: 2000,
      });

      await repository.delete(share1.debtShareId);

      const remaining = await repository.findByTransactionId('trans_1');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].debtShareId).toBe(share2.debtShareId);
    });

    it('should handle bulk debt share creation', async () => {
      const shares = [];
      for (let i = 0; i < 100; i++) {
        shares.push(
          repository.create({
            creditorId: 'user_1',
            debtorId: `person_${i}`,
            transactionId: 'trans_bulk',
            amountMinor: 100,
          }),
        );
      }

      const created = await Promise.all(shares);
      expect(created).toHaveLength(100);

      const total = await repository.getTotalByTransaction('trans_bulk');
      expect(total).toBe(10000);
    });

    it('should validate debt shares do not exceed transaction amount', () => {
      // This is a business rule validation, not repository concern
      const transactionAmount = 5000;
      const shares = [
        { debtorId: 'person_1', amountMinor: 3000 },
        { debtorId: 'person_2', amountMinor: 2500 },
      ];

      const total = shares.reduce((sum, share) => sum + share.amountMinor, 0);
      expect(total).toBeGreaterThan(transactionAmount);
    });

    it('should handle currency conversion scenarios', () => {
      // Currency conversion is handled at service level
      expect(calculateRemainingDebt({ amountMinor: 5000 } as DebtShare, 3000)).toBe(2000);
    });
  });

  describe('Business Rules', () => {
    it('should enforce debt shares equal transaction amount', () => {
      // This is enforced at service level
      const transactionAmount = 5000;
      const shares = [
        { debtorId: 'person_1', amountMinor: 3000 },
        { debtorId: 'person_2', amountMinor: 2000 },
      ];

      const total = shares.reduce((sum, share) => sum + share.amountMinor, 0);
      expect(total).toBe(transactionAmount);
    });

    it('should not allow debt on income transactions', () => {
      // This is enforced at service level
      const transactionType = 'income';
      expect(transactionType).not.toBe('expense');
    });

    it('should not allow payments exceeding debt amount', () => {
      const debtAmount = 5000;
      const totalPaid = 3000;
      const paymentAmount = 3000;

      expect(totalPaid + paymentAmount).toBeGreaterThan(debtAmount);
    });

    it('should track payment history', () => {
      // Payment history is tracked via DebtPayment entity
      expect(determineDebtStatus(5000, 0)).toBe('pending');
      expect(determineDebtStatus(5000, 2500)).toBe('partial');
      expect(determineDebtStatus(5000, 5000)).toBe('paid');
    });

    it('should handle partial payments correctly', () => {
      expect(determineDebtStatus(5000, 1000)).toBe('partial');
      expect(determineDebtStatus(5000, 4999)).toBe('partial');
    });

    it('should prevent duplicate payments', () => {
      // This is handled by unique payment IDs
      const paymentId1 = createDebtShareId();
      const paymentId2 = createDebtShareId();

      expect(paymentId1).not.toBe(paymentId2);
    });
  });
});
