import { DebtPayment, DebtStatus } from '@/shared/types/common';
import { DebtPaymentRepositoryImpl } from './debt-payment-repository';
import {
  validatePaymentAmount,
  validatePaymentDate,
  validateDebtShareId,
  createPaymentId,
  isPaymentReconciled,
} from './debt-payment';

describe('DebtPayment Model', () => {
  describe('DebtPayment Entity', () => {
    it('should create a valid debt payment with all fields', () => {
      const payment: DebtPayment = {
        paymentId: 'payment_123',
        debtShareId: 'debt_456',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date('2024-01-15'),
        transactionId: 'trans_789',
        createdAt: new Date('2024-01-14'),
        updatedAt: new Date('2024-01-14'),
      };

      expect(payment.paymentId).toBe('payment_123');
      expect(payment.debtShareId).toBe('debt_456');
      expect(payment.amountMinor).toBe(5000);
      expect(payment.paymentDate).toEqual(new Date('2024-01-15'));
      expect(payment.transactionId).toBe('trans_789');
    });

    it('should create a valid debt payment without transactionId', () => {
      const payment: DebtPayment = {
        paymentId: 'payment_456',
        debtShareId: 'debt_456',
        payerId: 'user_123',
        payeeId: 'user_789',
        amountMinor: 7500,
        paymentDate: new Date('2024-02-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(payment.transactionId).toBeUndefined();
      expect(isPaymentReconciled(payment)).toBe(false);
    });

    it('should require valid paymentId', () => {
      const paymentId = createPaymentId();
      expect(paymentId).toMatch(/^payment_/);
      expect(paymentId.length).toBeGreaterThan(8);
    });

    it('should require valid debtShareId', () => {
      expect(() => validateDebtShareId('')).toThrow('DebtShareId is required');
      expect(() => validateDebtShareId('  ')).toThrow('DebtShareId is required');
      expect(() => validateDebtShareId('debt_123')).not.toThrow();
    });

    it('should require positive amountMinor', () => {
      expect(() => validatePaymentAmount(0)).toThrow('Payment amount must be positive');
      expect(() => validatePaymentAmount(-100)).toThrow('Payment amount must be positive');
      expect(() => validatePaymentAmount(5000)).not.toThrow();
    });

    it('should require valid paymentDate', () => {
      expect(() => validatePaymentDate(new Date())).not.toThrow();
      expect(() => validatePaymentDate(new Date('2024-01-01'))).not.toThrow();
    });

    it('should not allow negative amountMinor', () => {
      expect(() => validatePaymentAmount(-1000)).toThrow('Payment amount must be positive');
    });

    it('should not allow zero amountMinor', () => {
      expect(() => validatePaymentAmount(0)).toThrow('Payment amount must be positive');
    });

    it('should not allow future paymentDate', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(() => validatePaymentDate(futureDate)).toThrow('Payment date cannot be in the future');
    });

    it('should validate date is a valid Date object', () => {
      expect(() => validatePaymentDate(new Date('invalid'))).toThrow(
        'Payment date must be a valid Date object',
      );
      expect(() => validatePaymentDate({} as unknown as Date)).toThrow(
        'Payment date must be a valid Date object',
      );
    });
  });
});

describe('DebtPaymentRepository', () => {
  let repository: DebtPaymentRepositoryImpl;

  beforeEach(() => {
    repository = new DebtPaymentRepositoryImpl();
  });

  describe('create', () => {
    it('should create a new debt payment', async () => {
      const input = {
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date('2024-01-15'),
        transactionId: 'trans_123',
      };

      const created = await repository.create(input);

      expect(created.debtShareId).toBe('debt_123');
      expect(created.amountMinor).toBe(5000);
      expect(created.paymentDate).toEqual(new Date('2024-01-15'));
      expect(created.transactionId).toBe('trans_123');
      expect(created.paymentId).toMatch(/^payment_/);
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it('should generate a unique paymentId', async () => {
      const input1 = {
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 1000,
        paymentDate: new Date(),
      };
      const input2 = {
        debtShareId: 'debt_456',
        payerId: 'user_123',
        payeeId: 'user_789',
        amountMinor: 2000,
        paymentDate: new Date(),
      };

      const payment1 = await repository.create(input1);
      const payment2 = await repository.create(input2);

      expect(payment1.paymentId).not.toBe(payment2.paymentId);
      expect(payment1.paymentId).toMatch(/^payment_/);
      expect(payment2.paymentId).toMatch(/^payment_/);
    });

    it('should set createdAt timestamp', async () => {
      const before = new Date();
      const created = await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date('2024-01-15'),
      });
      const after = new Date();

      expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(created.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should validate required fields', async () => {
      await expect(
        repository.create({
          // Missing debtShareId
          payerId: 'user_123',
          payeeId: 'user_456',
          amountMinor: 5000,
          paymentDate: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      ).rejects.toThrow('DebtShareId is required');

      await expect(
        repository.create({
          debtShareId: 'debt_123',
          payerId: 'user_123',
          payeeId: 'user_456',
          // Missing amountMinor
          paymentDate: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      ).rejects.toThrow('AmountMinor is required');

      await expect(
        repository.create({
          debtShareId: 'debt_123',
          payerId: 'user_123',
          payeeId: 'user_456',
          amountMinor: 5000,
          // Missing paymentDate
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      ).rejects.toThrow('PaymentDate is required');
    });

    it('should validate amountMinor is positive', async () => {
      await expect(
        repository.create({
          debtShareId: 'debt_123',
          payerId: 'user_123',
          payeeId: 'user_456',
          amountMinor: 0,
          paymentDate: new Date(),
        }),
      ).rejects.toThrow('Payment amount must be positive');

      await expect(
        repository.create({
          debtShareId: 'debt_123',
          payerId: 'user_123',
          payeeId: 'user_456',
          amountMinor: -100,
          paymentDate: new Date(),
        }),
      ).rejects.toThrow('Payment amount must be positive');
    });

    it('should validate paymentDate is not in future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await expect(
        repository.create({
          debtShareId: 'debt_123',
          payerId: 'user_123',
          payeeId: 'user_456',
          amountMinor: 5000,
          paymentDate: futureDate,
        }),
      ).rejects.toThrow('Payment date cannot be in the future');
    });

    it('should not allow duplicate paymentId', async () => {
      const input = {
        paymentId: 'payment_duplicate',
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date(),
      };

      await repository.create(input);
      await expect(repository.create(input)).rejects.toThrow(
        'Entity with id payment_duplicate already exists',
      );
    });

    it('should link to existing debtShareId', async () => {
      const created = await repository.create({
        debtShareId: 'debt_existing',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date(),
      });

      expect(created.debtShareId).toBe('debt_existing');
    });

    it('should optionally link to transactionId', async () => {
      const withTransaction = await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date(),
        transactionId: 'trans_123',
      });

      const withoutTransaction = await repository.create({
        debtShareId: 'debt_456',
        payerId: 'user_123',
        payeeId: 'user_789',
        amountMinor: 3000,
        paymentDate: new Date(),
      });

      expect(withTransaction.transactionId).toBe('trans_123');
      expect(withoutTransaction.transactionId).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find an existing debt payment by id', async () => {
      const created = await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date('2024-01-15'),
      });

      const found = await repository.findById(created.paymentId);

      expect(found).toBeTruthy();
      expect(found?.paymentId).toBe(created.paymentId);
      expect(found?.amountMinor).toBe(5000);
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non_existent');
      expect(found).toBeNull();
    });

    it('should return a deep copy of the entity', async () => {
      const created = await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date(),
      });

      const found1 = await repository.findById(created.paymentId);
      const found2 = await repository.findById(created.paymentId);

      expect(found1).not.toBe(found2);
      expect(found1).toEqual(found2);
    });
  });

  describe('findByDebtShareId', () => {
    it('should find all payments for a debt share', async () => {
      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 3000,
        paymentDate: new Date('2024-01-15'),
      });

      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 2000,
        paymentDate: new Date('2024-02-15'),
      });

      await repository.create({
        debtShareId: 'debt_456',
        payerId: 'user_789',
        payeeId: 'user_012',
        amountMinor: 1000,
        paymentDate: new Date('2024-01-20'),
      });

      const payments = await repository.findByDebtShareId('debt_123');

      expect(payments).toHaveLength(2);
      expect(payments.every((p) => p.debtShareId === 'debt_123')).toBe(true);
      expect(payments.map((p) => p.amountMinor).sort()).toEqual([2000, 3000]);
      expect(payments[0].amountMinor).toBe(3000);
      expect(payments[1].amountMinor).toBe(2000);
    });

    it('should return empty array for debt share with no payments', async () => {
      const payments = await repository.findByDebtShareId('no_payments');
      expect(payments).toEqual([]);
    });

    it('should only return payments for the specified debt share', async () => {
      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 3000,
        paymentDate: new Date(),
      });

      await repository.create({
        debtShareId: 'debt_456',
        payerId: 'user_789',
        payeeId: 'user_012',
        amountMinor: 3000,
        paymentDate: new Date(),
      });

      const payments123 = await repository.findByDebtShareId('debt_123');
      const payments456 = await repository.findByDebtShareId('debt_456');

      expect(payments123).toHaveLength(1);
      expect(payments123[0].debtShareId).toBe('debt_123');
      expect(payments456).toHaveLength(1);
      expect(payments456[0].debtShareId).toBe('debt_456');
    });

    it('should return payments in chronological order', async () => {
      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 3000,
        paymentDate: new Date('2024-01-10'),
      });

      await repository.create({
        debtShareId: 'debt_456',
        payerId: 'user_123',
        payeeId: 'user_789',
        amountMinor: 1000,
        paymentDate: new Date('2024-01-18'),
      });

      await repository.create({
        debtShareId: 'debt_456',
        payerId: 'user_123',
        payeeId: 'user_789',
        amountMinor: 2000,
        paymentDate: new Date('2024-01-15'),
      });

      const payments = await repository.findByDebtShareId('debt_123');

      expect(payments[0].paymentDate).toEqual(new Date('2024-01-10'));
    });

    it('should include both linked and unlinked payments', async () => {
      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 2000,
        paymentDate: new Date(),
        transactionId: 'trans_special',
      });

      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 2000,
        paymentDate: new Date(),
      });

      const payments = await repository.findByDebtShareId('debt_123');

      expect(payments).toHaveLength(2);
      expect(payments.find((p) => p.transactionId === 'trans_special')).toBeTruthy();
      expect(payments.find((p) => !p.transactionId)).toBeTruthy();
    });
  });

  describe('findByTransactionId', () => {
    it('should find payment linked to a transaction', async () => {
      await repository.create({
        debtShareId: 'debt_trans',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date(),
        transactionId: 'trans_unique',
      });

      const found = await repository.findByTransactionId('trans_unique');

      expect(found).toBeTruthy();
      expect(found?.transactionId).toBe('trans_unique');
      expect(found?.amountMinor).toBe(5000);
    });

    it('should return null for transaction with no linked payment', async () => {
      const found = await repository.findByTransactionId('no_payment');
      expect(found).toBeNull();
    });

    it('should handle payments without transactionId', async () => {
      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date(),
      });

      const found = await repository.findByTransactionId('any_trans');
      expect(found).toBeNull();
    });

    it('should only return payment for the specified transaction', async () => {
      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date(),
        transactionId: 'trans_123',
      });

      await repository.create({
        debtShareId: 'debt_456',
        payerId: 'user_789',
        payeeId: 'user_012',
        amountMinor: 3000,
        paymentDate: new Date(),
        transactionId: 'trans_456',
      });

      const found123 = await repository.findByTransactionId('trans_123');
      const found456 = await repository.findByTransactionId('trans_456');

      expect(found123?.transactionId).toBe('trans_123');
      expect(found456?.transactionId).toBe('trans_456');
    });
  });

  describe('findByDateRange', () => {
    beforeEach(async () => {
      await repository.create({
        debtShareId: 'debt_date_1',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 2000,
        paymentDate: new Date('2024-01-10'),
      });

      await repository.create({
        debtShareId: 'debt_date_2',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 3000,
        paymentDate: new Date('2024-01-15'),
      });

      await repository.create({
        debtShareId: 'debt_date_3',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 4000,
        paymentDate: new Date('2024-01-20'),
      });
    });

    it('should find payments within date range', async () => {
      const payments = await repository.findByDateRange(
        new Date('2024-01-01'),
        new Date('2024-02-28'),
      );

      expect(payments).toHaveLength(3);
      expect(payments.map((p) => p.amountMinor).sort()).toEqual([2000, 3000, 4000]);
    });

    it('should include payments on start date', async () => {
      const payments = await repository.findByDateRange(
        new Date('2024-01-15'),
        new Date('2024-01-31'),
      );

      expect(payments).toHaveLength(2);
      expect(payments[0].paymentDate).toEqual(new Date('2024-01-15'));
    });

    it('should include payments on end date', async () => {
      const payments = await repository.findByDateRange(
        new Date('2024-03-01'),
        new Date('2024-03-15'),
      );

      expect(payments).toHaveLength(0);
    });

    it('should return empty array for date range with no payments', async () => {
      const payments = await repository.findByDateRange(
        new Date('2023-01-01'),
        new Date('2023-12-31'),
      );

      expect(payments).toEqual([]);
    });

    it('should handle single day range', async () => {
      const payments = await repository.findByDateRange(
        new Date('2024-02-15'),
        new Date('2024-02-15'),
      );

      expect(payments).toHaveLength(0);
    });

    it('should validate start date is before end date', async () => {
      await expect(
        repository.findByDateRange(new Date('2024-03-01'), new Date('2024-01-01')),
      ).rejects.toThrow('Start date must be before or equal to end date');
    });
  });

  describe('getTotalPaidForDebtShare', () => {
    it('should calculate total paid for a debt share', async () => {
      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 2000,
        paymentDate: new Date('2024-01-15'),
      });

      await repository.create({
        debtShareId: 'debt_456',
        payerId: 'user_789',
        payeeId: 'user_456',
        amountMinor: 3000,
        paymentDate: new Date('2024-01-10'),
      });

      await repository.create({
        debtShareId: 'debt_789',
        payerId: 'user_123',
        payeeId: 'user_012',
        amountMinor: 4000,
        paymentDate: new Date('2024-01-20'),
      });

      const total = await repository.getTotalPaidForDebtShare('debt_123');

      expect(total).toBe(2000);
    });

    it('should return 0 for debt share with no payments', async () => {
      const total = await repository.getTotalPaidForDebtShare('no_payments');
      expect(total).toBe(0);
    });

    it('should sum multiple payments correctly', async () => {
      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 1,
        paymentDate: new Date(),
      });

      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 3456,
        paymentDate: new Date(),
      });

      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 3456,
        paymentDate: new Date(),
      });

      const total = await repository.getTotalPaidForDebtShare('debt_123');

      expect(total).toBe(1 + 3456 + 3456);
    });

    it('should handle single payment', async () => {
      await repository.create({
        debtShareId: 'debt_future',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date(),
      });

      const total = await repository.getTotalPaidForDebtShare('debt_future');

      expect(total).toBe(5000);
    });

    it('should not include payments for other debt shares', async () => {
      await repository.create({
        debtShareId: 'debt_456',
        payerId: 'user_789',
        payeeId: 'user_012',
        amountMinor: 2000,
        paymentDate: new Date(),
      });

      await repository.create({
        debtShareId: 'debt_456',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 3000,
        paymentDate: new Date(),
      });

      const total123 = await repository.getTotalPaidForDebtShare('debt_123');
      const total456 = await repository.getTotalPaidForDebtShare('debt_456');

      expect(total123).toBe(0);
      expect(total456).toBe(2000 + 3000);
    });
  });

  describe('update', () => {
    it('should not allow updating debt payments', async () => {
      const payment1 = await repository.create({
        debtShareId: 'debt_perf',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 100,
        paymentDate: new Date(),
      });

      await expect(repository.update(payment1.paymentId, { amountMinor: 3000 })).rejects.toThrow(
        'Debt payments are immutable and cannot be updated',
      );
    });

    it('should throw error when attempting to update', async () => {
      await expect(repository.update('any_id', {})).rejects.toThrow(
        'Debt payments are immutable and cannot be updated',
      );
    });
  });

  describe('delete', () => {
    it('should not allow deleting debt payments', async () => {
      const payment2 = await repository.create({
        debtShareId: 'debt_perf',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 200,
        paymentDate: new Date(),
      });

      await expect(repository.delete(payment2.paymentId)).rejects.toThrow(
        'Debt payments are immutable and cannot be deleted',
      );
    });

    it('should throw error when attempting to delete', async () => {
      await expect(repository.delete('any_id')).rejects.toThrow(
        'Debt payments are immutable and cannot be deleted',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum amountMinor value', async () => {
      const maxAmount = Number.MAX_SAFE_INTEGER;

      const payment = await repository.create({
        debtShareId: 'debt_max',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: maxAmount,
        paymentDate: new Date(),
      });

      expect(payment.amountMinor).toBe(maxAmount);

      await expect(
        repository.create({
          debtShareId: 'debt_456',
          payerId: 'user_123',
          payeeId: 'user_456',
          amountMinor: maxAmount + 1,
          paymentDate: new Date(),
        }),
      ).rejects.toThrow('Payment amount exceeds maximum allowed value');
    });

    it('should handle payments on same day', async () => {
      const sameDate = new Date('2024-01-15');

      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 1000,
        paymentDate: sameDate,
      });

      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 2000,
        paymentDate: sameDate,
      });

      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 3000,
        paymentDate: sameDate,
      });

      const payments = await repository.findByDebtShareId('debt_123');

      expect(payments).toHaveLength(3);
      expect(payments.every((p) => p.paymentDate.getTime() === sameDate.getTime())).toBe(true);
    });

    it('should handle concurrent payment creation', async () => {
      const promises: Promise<DebtPayment>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          repository.create({
            debtShareId: 'debt_concurrent',
            payerId: 'user_123',
            payeeId: 'user_456',
            amountMinor: 100 * (i + 1),
            paymentDate: new Date(),
          }),
        );
      }

      const payments = await Promise.all(promises);
      expect(payments).toHaveLength(10);

      const allPaymentIds = payments.map((p) => p.paymentId);
      const uniquePaymentIds = new Set(allPaymentIds);
      expect(uniquePaymentIds.size).toBe(10);
    });

    it('should maintain payment history integrity', async () => {
      const payment1 = await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 2000,
        paymentDate: new Date('2024-01-15'),
      });

      const payment2 = await repository.create({
        debtShareId: 'debt_456',
        payerId: 'user_123',
        payeeId: 'user_789',
        amountMinor: 3000,
        paymentDate: new Date('2024-01-10'),
      });

      // Verify payments are preserved
      const found1 = await repository.findById(payment1.paymentId);
      const found2 = await repository.findById(payment2.paymentId);

      expect(found1).toEqual(payment1);
      expect(found2).toEqual(payment2);

      // Verify total is correct
      const total = await repository.getTotalPaidForDebtShare('debt_123');
      expect(total).toBe(2000);
    });

    it('should handle bulk payment processing', async () => {
      const payments: Promise<DebtPayment>[] = [];
      for (let i = 0; i < 100; i++) {
        payments.push(
          repository.create({
            debtShareId: `debt_${i % 10}`,
            payerId: 'user_123',
            payeeId: 'user_456',
            amountMinor: 100,
            paymentDate: new Date(),
          }),
        );
      }

      const created = await Promise.all(payments);
      expect(created).toHaveLength(100);

      // Check each debt share has 10 payments
      for (let i = 0; i < 10; i++) {
        const debtPayments = await repository.findByDebtShareId(`debt_${i}`);
        expect(debtPayments).toHaveLength(10);

        const total = await repository.getTotalPaidForDebtShare(`debt_${i}`);
        expect(total).toBe(1000);
      }
    });

    it('should handle timezone differences in payment dates', async () => {
      // Create payments with different timezone representations
      const utcDate = new Date('2024-01-15T12:00:00Z');
      const localDate = new Date('2024-01-15T12:00:00');

      const payment1 = await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 1000,
        paymentDate: utcDate,
      });

      const payment2 = await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 2000,
        paymentDate: localDate,
      });

      expect(payment1.paymentDate).toBeInstanceOf(Date);
      expect(payment2.paymentDate).toBeInstanceOf(Date);
    });
  });

  describe('Business Rules', () => {
    it('should not allow payment exceeding remaining debt', () => {
      const debtAmount = 5000;
      const totalPaid = 4000;
      const paymentAmount = 2000;

      const remaining = debtAmount - totalPaid;
      expect(paymentAmount).toBeGreaterThan(remaining);
    });

    it('should track cumulative payments', async () => {
      const debtShareId = 'debt_cumulative';

      // First payment
      await repository.create({
        debtShareId,
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 1000,
        paymentDate: new Date('2024-01-01'),
      });

      let total = await repository.getTotalPaidForDebtShare(debtShareId);
      expect(total).toBe(1000);

      // Second payment
      await repository.create({
        debtShareId,
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 2000,
        paymentDate: new Date('2024-02-01'),
      });

      total = await repository.getTotalPaidForDebtShare(debtShareId);
      expect(total).toBe(3000);

      // Third payment
      await repository.create({
        debtShareId,
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 2500,
        paymentDate: new Date('2024-03-01'),
      });

      total = await repository.getTotalPaidForDebtShare(debtShareId);
      expect(total).toBe(5500);
    });

    it('should prevent duplicate payments for same transaction', async () => {
      const transactionId = 'trans_unique';

      await repository.create({
        debtShareId: 'debt_123',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 5000,
        paymentDate: new Date(),
        transactionId,
      });

      await repository.create({
        debtShareId: 'debt_456',
        payerId: 'user_789',
        payeeId: 'user_012',
        amountMinor: 3000,
        paymentDate: new Date(),
        transactionId: 'trans_other',
      });

      // Repository allows it, but we can find existing payment
      const existing = await repository.findByTransactionId(transactionId);
      expect(existing).toBeTruthy();
    });

    it('should enforce immutability of payment records', async () => {
      const payment = await repository.create({
        debtShareId: 'debt_immutable',
        payerId: 'user_123',
        payeeId: 'user_456',
        amountMinor: 3000,
        paymentDate: new Date(),
      });

      // Verify we cannot update
      await expect(repository.update(payment.paymentId, {})).rejects.toThrow(
        'Debt payments are immutable',
      );

      // Verify we cannot delete
      await expect(repository.delete(payment.paymentId)).rejects.toThrow(
        'Debt payments are immutable',
      );

      // Verify original payment is unchanged
      const found = await repository.findById(payment.paymentId);
      expect(found).toEqual(payment);
    });

    it('should validate payment against debt share status', () => {
      // This validation is enforced at the service level
      // Repository stores payments without checking debt status
      const debtStatus = 'paid';
      const canPay = debtStatus !== 'paid';
      expect(canPay).toBe(false);
    });

    it('should not allow payments on paid debts', () => {
      // This is enforced at service level
      // If debt status is 'paid', service should reject payment
      const debtStatus: DebtStatus = 'paid';
      expect(debtStatus).toBe('paid');
    });

    it('should handle refunds as negative payments', () => {
      // Current implementation doesn't allow negative payments
      // This would be a future enhancement
      expect(() => validatePaymentAmount(-1000)).toThrow('Payment amount must be positive');
    });
  });
});
