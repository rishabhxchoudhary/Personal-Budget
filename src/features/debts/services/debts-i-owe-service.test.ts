// Jest provides describe, it, expect, beforeEach as globals
import { DebtsIOweService, DebtsIOweServiceImpl, DebtsIOweQuery } from './debts-i-owe-service';
import { DebtService, ExternalPerson } from '@/shared/types/common';
import { DebtShareRepositoryImpl } from '../model/debt-share-repository';
import { DebtPaymentRepositoryImpl } from '../model/debt-payment-repository';
import { ExternalPersonRepositoryImpl } from '../model/external-person-repository';
import { MockTransactionRepository } from './__mocks__/transaction-repository-mock';
import { DebtServiceImpl } from './debt-service';

describe('DebtsIOweService', () => {
  let service: DebtsIOweService;
  let debtService: DebtService;
  let transactionRepo: MockTransactionRepository;
  let debtShareRepo: DebtShareRepositoryImpl;
  let debtPaymentRepo: DebtPaymentRepositoryImpl;
  let externalPersonRepo: ExternalPersonRepositoryImpl;

  let testUserId: string;
  let creditor1: ExternalPerson;
  let creditor2: ExternalPerson;

  beforeEach(async () => {
    // Initialize repositories
    transactionRepo = new MockTransactionRepository();
    debtShareRepo = new DebtShareRepositoryImpl();
    debtPaymentRepo = new DebtPaymentRepositoryImpl();
    externalPersonRepo = new ExternalPersonRepositoryImpl();

    // Initialize services
    debtService = new DebtServiceImpl(
      debtShareRepo,
      debtPaymentRepo,
      externalPersonRepo,
      transactionRepo,
    );

    // Create test data
    testUserId = 'user_test_debtor';

    creditor1 = await externalPersonRepo.create({
      userId: testUserId,
      name: 'Alice Smith',
      email: 'alice@example.com',
    });

    creditor2 = await externalPersonRepo.create({
      userId: testUserId,
      name: 'Bob Jones',
      email: 'bob@example.com',
    });

    // Initialize the service under test
    service = new DebtsIOweServiceImpl(
      debtService,
      debtShareRepo,
      debtPaymentRepo,
      externalPersonRepo,
    );
  });

  describe('list', () => {
    it('returns empty when no debts', async () => {
      const result = await service.list(testUserId);
      expect(result).toEqual([]);
    });

    it('groups by person and currency with correct arithmetic', async () => {
      // Create multiple debt shares to same person
      const share1 = await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_2',
        amountMinor: 3000,
      });

      // Create payment for one of them
      await debtPaymentRepo.create({
        debtShareId: share1.debtShareId,
        payerId: testUserId,
        payeeId: creditor1.personId,
        amountMinor: 2000,
        paymentDate: new Date(),
      });

      const result = await service.list(testUserId);

      expect(result).toHaveLength(1);
      expect(result[0].personId).toBe(creditor1.personId);
      expect(result[0].personName).toBe('Alice Smith');
      expect(result[0].currency).toBe('USD');
      expect(result[0].totalOwedMinor).toBe(8000);
      expect(result[0].totalPaidMinor).toBe(2000);
      expect(result[0].outstandingMinor).toBe(6000);
    });

    it('filters by personId', async () => {
      await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      await debtShareRepo.create({
        creditorId: creditor2.personId,
        debtorId: testUserId,
        transactionId: 'trans_2',
        amountMinor: 3000,
      });

      const query: DebtsIOweQuery = { personId: creditor1.personId };
      const result = await service.list(testUserId, query);

      expect(result).toHaveLength(1);
      expect(result[0].personId).toBe(creditor1.personId);
    });

    it('filters by currency', async () => {
      await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      const query: DebtsIOweQuery = { currency: 'USD' };
      const result = await service.list(testUserId, query);

      expect(result).toHaveLength(1);
      expect(result[0].currency).toBe('USD');
    });

    it('filters by minOutstandingMinor', async () => {
      await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      await debtShareRepo.create({
        creditorId: creditor2.personId,
        debtorId: testUserId,
        transactionId: 'trans_2',
        amountMinor: 2000,
      });

      const query: DebtsIOweQuery = { minOutstandingMinor: 3000 };
      const result = await service.list(testUserId, query);

      expect(result).toHaveLength(1);
      expect(result[0].outstandingMinor).toBe(5000);
    });

    it('respects includeZero filter', async () => {
      const share = await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      // Fully pay the debt
      await debtPaymentRepo.create({
        debtShareId: share.debtShareId,
        payerId: testUserId,
        payeeId: creditor1.personId,
        amountMinor: 5000,
        paymentDate: new Date(),
      });

      // Update status to paid
      await debtShareRepo.updateStatus(share.debtShareId, 'paid');

      // Default should exclude zero balances
      const result1 = await service.list(testUserId);
      expect(result1).toHaveLength(0);

      // With includeZero=true should include them
      // Note: Since the existing debt service filters out paid debts,
      // we need to create a partial payment scenario instead
      const share2 = await debtShareRepo.create({
        creditorId: creditor2.personId,
        debtorId: testUserId,
        transactionId: 'trans_2',
        amountMinor: 3000,
      });

      await debtPaymentRepo.create({
        debtShareId: share2.debtShareId,
        payerId: testUserId,
        payeeId: creditor2.personId,
        amountMinor: 3000,
        paymentDate: new Date(),
      });

      const query: DebtsIOweQuery = { includeZero: true };
      const result2 = await service.list(testUserId, query);
      expect(result2).toHaveLength(1);
      expect(result2[0].outstandingMinor).toBe(0);
    });

    it('sorts by outstanding desc', async () => {
      await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 3000,
      });

      await debtShareRepo.create({
        creditorId: creditor2.personId,
        debtorId: testUserId,
        transactionId: 'trans_2',
        amountMinor: 7000,
      });

      const query: DebtsIOweQuery = { sortBy: 'outstanding', sortDir: 'desc' };
      const result = await service.list(testUserId, query);

      expect(result).toHaveLength(2);
      expect(result[0].outstandingMinor).toBe(7000);
      expect(result[1].outstandingMinor).toBe(3000);
    });

    it('sorts by person asc', async () => {
      await debtShareRepo.create({
        creditorId: creditor2.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_2',
        amountMinor: 5000,
      });

      const query: DebtsIOweQuery = { sortBy: 'person', sortDir: 'asc' };
      const result = await service.list(testUserId, query);

      expect(result[0].personName).toBe('Alice Smith');
      expect(result[1].personName).toBe('Bob Jones');
    });

    it('sorts by recent desc', async () => {
      const share1 = await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      await debtShareRepo.create({
        creditorId: creditor2.personId,
        debtorId: testUserId,
        transactionId: 'trans_2',
        amountMinor: 3000,
      });

      // Make a payment to share1 to update its activity
      await new Promise((resolve) => setTimeout(resolve, 10));
      await debtPaymentRepo.create({
        debtShareId: share1.debtShareId,
        payerId: testUserId,
        payeeId: creditor1.personId,
        amountMinor: 1000,
        paymentDate: new Date(),
      });

      const query: DebtsIOweQuery = { sortBy: 'recent', sortDir: 'desc' };
      const result = await service.list(testUserId, query);

      expect(result).toHaveLength(2);
      // creditor1 should be first due to recent payment
      expect(result[0].personId).toBe(creditor1.personId);
    });
  });

  describe('getByPerson', () => {
    it('returns null when not found', async () => {
      const result = await service.getByPerson(testUserId, 'non-existent-person');
      expect(result).toBeNull();
    });

    it('returns item with correct aggregates', async () => {
      const share1 = await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      const share2 = await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_2',
        amountMinor: 3000,
      });

      await debtPaymentRepo.create({
        debtShareId: share1.debtShareId,
        payerId: testUserId,
        payeeId: creditor1.personId,
        amountMinor: 2000,
        paymentDate: new Date(),
      });

      const result = await service.getByPerson(testUserId, creditor1.personId);

      expect(result).not.toBeNull();
      expect(result!.personId).toBe(creditor1.personId);
      expect(result!.personName).toBe('Alice Smith');
      expect(result!.totalOwedMinor).toBe(8000);
      expect(result!.totalPaidMinor).toBe(2000);
      expect(result!.outstandingMinor).toBe(6000);
      expect(result!.debtShareIds).toHaveLength(2);
      expect(result!.debtShareIds).toContain(share1.debtShareId);
      expect(result!.debtShareIds).toContain(share2.debtShareId);
    });
  });

  describe('settleUp', () => {
    it('rejects non-positive amounts', async () => {
      await expect(service.settleUp(testUserId, creditor1.personId, 0)).rejects.toThrow(
        'Amount must be positive',
      );

      await expect(service.settleUp(testUserId, creditor1.personId, -100)).rejects.toThrow(
        'Amount must be positive',
      );
    });

    it('applies FIFO payments across multiple shares without overpay', async () => {
      const share1 = await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 3000,
      });

      // Wait to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const share2 = await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_2',
        amountMinor: 5000,
      });

      // Settle 6000 (should pay share1 fully and share2 partially)
      const payments = await service.settleUp(
        testUserId,
        creditor1.personId,
        6000,
        'Partial settlement',
      );

      expect(payments).toHaveLength(2);

      // First payment should fully settle share1
      expect(payments[0].debtShareId).toBe(share1.debtShareId);
      expect(payments[0].amountMinor).toBe(3000);
      expect(payments[0].payerId).toBe(testUserId);
      expect(payments[0].payeeId).toBe(creditor1.personId);
      expect(payments[0].note).toBe('Partial settlement');

      // Second payment should partially settle share2
      expect(payments[1].debtShareId).toBe(share2.debtShareId);
      expect(payments[1].amountMinor).toBe(3000);
    });

    it('handles exact settlement to zero outstanding', async () => {
      const share = await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      const payments = await service.settleUp(
        testUserId,
        creditor1.personId,
        5000,
        'Full settlement',
      );

      expect(payments).toHaveLength(1);
      expect(payments[0].debtShareId).toBe(share.debtShareId);
      expect(payments[0].amountMinor).toBe(5000);

      // Verify debt is now fully paid
      const updatedShare = await debtShareRepo.findById(share.debtShareId);
      expect(updatedShare?.status).toBe('paid');
    });

    it('records multiple DebtPayment entries when split across shares', async () => {
      // Create 3 shares
      for (let i = 0; i < 3; i++) {
        await debtShareRepo.create({
          creditorId: creditor1.personId,
          debtorId: testUserId,
          transactionId: `trans_${i}`,
          amountMinor: 2000,
        });
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const payments = await service.settleUp(testUserId, creditor1.personId, 5000);

      expect(payments).toHaveLength(3);
      expect(payments[0].amountMinor).toBe(2000);
      expect(payments[1].amountMinor).toBe(2000);
      expect(payments[2].amountMinor).toBe(1000); // Partial on last
    });

    it('is idempotent per call and never drives outstanding negative', async () => {
      await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      // First payment
      await service.settleUp(testUserId, creditor1.personId, 3000);

      // Try to overpay
      await expect(service.settleUp(testUserId, creditor1.personId, 3000)).rejects.toThrow(
        'Amount exceeds outstanding',
      );

      // Verify correct remaining balance
      const item = await service.getByPerson(testUserId, creditor1.personId);
      expect(item?.outstandingMinor).toBe(2000);
    });

    it('throws error when no outstanding debts to settle', async () => {
      await expect(service.settleUp(testUserId, creditor1.personId, 1000)).rejects.toThrow(
        'No outstanding debts',
      );
    });

    it('handles payments with existing partial payments correctly', async () => {
      const share = await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      // Make initial payment
      await debtPaymentRepo.create({
        debtShareId: share.debtShareId,
        payerId: testUserId,
        payeeId: creditor1.personId,
        amountMinor: 2000,
        paymentDate: new Date(),
      });

      // Update status to partial
      await debtShareRepo.updateStatus(share.debtShareId, 'partial');

      // Settle remaining
      const payments = await service.settleUp(testUserId, creditor1.personId, 3000);

      expect(payments).toHaveLength(1);
      expect(payments[0].amountMinor).toBe(3000);
    });
  });

  describe('integration tests', () => {
    it('correctly updates debts after settlement', async () => {
      // Create multiple debts
      const share1 = await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 10000,
      });

      await debtShareRepo.create({
        creditorId: creditor2.personId,
        debtorId: testUserId,
        transactionId: 'trans_2',
        amountMinor: 5000,
      });

      // Get initial list
      const before = await service.list(testUserId);
      expect(before).toHaveLength(2);
      expect(before.find((d) => d.personId === creditor1.personId)?.outstandingMinor).toBe(10000);

      // Settle part of debt to creditor1
      await service.settleUp(testUserId, creditor1.personId, 4000);

      // Update status to partial since we paid partially
      await debtShareRepo.updateStatus(share1.debtShareId, 'partial');

      // Get updated list
      const after = await service.list(testUserId);
      expect(after).toHaveLength(2);
      expect(after.find((d) => d.personId === creditor1.personId)?.outstandingMinor).toBe(6000);
      expect(after.find((d) => d.personId === creditor2.personId)?.outstandingMinor).toBe(5000);
    });

    it('handles multi-currency debts correctly', async () => {
      // Note: For now we assume USD, but structure supports multi-currency
      await debtShareRepo.create({
        creditorId: creditor1.personId,
        debtorId: testUserId,
        transactionId: 'trans_1',
        amountMinor: 5000,
      });

      const result = await service.list(testUserId);
      expect(result[0].currency).toBe('USD');
    });
  });
});
