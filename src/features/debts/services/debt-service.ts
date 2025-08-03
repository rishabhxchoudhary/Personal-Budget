import {
  DebtService,
  DebtShare,
  DebtShareInput,
  DebtPayment,
  DebtSummary,
  BusinessError,
  Transaction,
  TransactionRepository,
  DebtShareRepository,
  ExternalPersonRepository,
  ExternalPerson,
} from '@/shared/types/common';
import { DebtPaymentRepository } from '../model/debt-payment-repository';
import { calculateRemainingDebt, determineDebtStatus } from '../model/debt-share';
import { validatePaymentAmount } from '../model/debt-payment';

export class DebtServiceImpl implements DebtService {
  constructor(
    private debtShareRepo: DebtShareRepository,
    private debtPaymentRepo: DebtPaymentRepository,
    private externalPersonRepo: ExternalPersonRepository,
    private transactionRepo: TransactionRepository,
  ) {}

  async createDebtShare(transactionId: string, shares: DebtShareInput[]): Promise<DebtShare[]> {
    // Validate transaction
    const transaction = await this.validateTransaction(transactionId);

    // Validate all debtors exist
    await this.validateDebtors(shares);

    // Validate shares equal transaction amount
    this.validateSharesAmount(transaction.amountMinor, shares);

    // Check for existing debt shares
    await this.checkExistingDebtShares(transactionId);

    // Create debt shares
    return this.createDebtShares(transaction, shares);
  }

  async recordPayment(debtShareId: string, amountMinor: number): Promise<DebtPayment> {
    validatePaymentAmount(amountMinor);

    // Get debt share
    const debtShare = await this.getDebtShare(debtShareId);

    // Check if already paid
    if (debtShare.status === 'paid') {
      throw new BusinessError('Cannot record payment on already paid debt', 'DEBT_ALREADY_PAID');
    }

    // Calculate total paid and remaining
    const totalPaid = await this.debtPaymentRepo.getTotalPaidForDebtShare(debtShareId);
    const remaining = calculateRemainingDebt(debtShare, totalPaid);

    // Validate payment amount
    if (amountMinor > remaining) {
      throw new BusinessError(
        `Payment amount exceeds remaining debt. Remaining: ${remaining}`,
        'PAYMENT_EXCEEDS_DEBT',
      );
    }

    // Create payment
    const payment = await this.createPayment(debtShareId, amountMinor);

    // Update debt status
    await this.updateDebtStatus(debtShare, totalPaid + amountMinor);

    return payment;
  }

  async getDebtsOwedToMe(userId: string): Promise<DebtSummary[]> {
    const debtShares = await this.debtShareRepo.findUnpaidByCreditorId(userId);
    return this.createDebtSummaries(debtShares, 'debtor');
  }

  async getDebtsIOwe(userId: string): Promise<DebtSummary[]> {
    const debtShares = await this.debtShareRepo.findUnpaidByDebtorId(userId);
    return this.createDebtSummaries(debtShares, 'creditor');
  }

  private async validateTransaction(transactionId: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findById(transactionId);

    if (!transaction) {
      throw new BusinessError('Transaction not found', 'TRANSACTION_NOT_FOUND');
    }

    if (transaction.type !== 'expense') {
      throw new BusinessError(
        'Debt can only be created on expense transactions',
        'INVALID_TRANSACTION_TYPE',
      );
    }

    return transaction;
  }

  private async validateDebtors(shares: DebtShareInput[]): Promise<void> {
    for (const share of shares) {
      const person = await this.externalPersonRepo.findById(share.debtorId);
      if (!person) {
        throw new BusinessError(`External person not found: ${share.debtorId}`, 'DEBTOR_NOT_FOUND');
      }
    }
  }

  private validateSharesAmount(transactionAmount: number, shares: DebtShareInput[]): void {
    const totalShares = shares.reduce((sum, share) => sum + share.amountMinor, 0);

    if (totalShares !== transactionAmount) {
      throw new BusinessError(
        `Debt shares must equal transaction amount. Transaction: ${transactionAmount}, Shares: ${totalShares}`,
        'SHARES_AMOUNT_MISMATCH',
      );
    }
  }

  private async checkExistingDebtShares(transactionId: string): Promise<void> {
    const existing = await this.debtShareRepo.findByTransactionId(transactionId);

    if (existing.length > 0) {
      throw new BusinessError(
        'Debt shares already exist for this transaction',
        'DUPLICATE_DEBT_SHARES',
      );
    }
  }

  private async createDebtShares(
    transaction: Transaction,
    shares: DebtShareInput[],
  ): Promise<DebtShare[]> {
    const results: DebtShare[] = [];

    for (const share of shares) {
      const debtShare = await this.debtShareRepo.create({
        creditorId: transaction.userId,
        debtorId: share.debtorId,
        transactionId: transaction.transactionId,
        amountMinor: share.amountMinor,
      } as Omit<DebtShare, 'createdAt' | 'updatedAt'>);
      results.push(debtShare);
    }

    return results;
  }

  private async getDebtShare(debtShareId: string): Promise<DebtShare> {
    const debtShare = await this.debtShareRepo.findById(debtShareId);

    if (!debtShare) {
      throw new BusinessError('Debt share not found', 'DEBT_SHARE_NOT_FOUND');
    }

    return debtShare;
  }

  private async createPayment(debtShareId: string, amountMinor: number): Promise<DebtPayment> {
    const debtShare = await this.debtShareRepo.findById(debtShareId);
    if (!debtShare) {
      throw new Error('Debt share not found');
    }

    return this.debtPaymentRepo.create({
      debtShareId,
      payerId: debtShare.debtorId,
      payeeId: debtShare.creditorId,
      amountMinor,
      paymentDate: new Date(),
    });
  }

  private async updateDebtStatus(debtShare: DebtShare, totalPaid: number): Promise<void> {
    const newStatus = determineDebtStatus(debtShare.amountMinor, totalPaid);

    if (newStatus !== debtShare.status) {
      await this.debtShareRepo.updateStatus(debtShare.debtShareId, newStatus);
    }
  }

  private async createDebtSummaries(
    debtShares: DebtShare[],
    groupBy: 'debtor' | 'creditor',
  ): Promise<DebtSummary[]> {
    const grouped = await this.groupDebtsByPerson(debtShares, groupBy);
    const summaries: DebtSummary[] = [];

    for (const [personId, shares] of grouped) {
      const summary = await this.createPersonDebtSummary(personId, shares);
      summaries.push(summary);
    }

    // Sort by total amount owed descending
    return summaries.sort((a, b) => b.totalOwedMinor - a.totalOwedMinor);
  }

  private async groupDebtsByPerson(
    debtShares: DebtShare[],
    groupBy: 'debtor' | 'creditor',
  ): Promise<Map<string, DebtShare[]>> {
    const grouped = new Map<string, DebtShare[]>();

    for (const share of debtShares) {
      const personId = groupBy === 'debtor' ? share.debtorId : share.creditorId;
      const existing = grouped.get(personId) || [];
      existing.push(share);
      grouped.set(personId, existing);
    }

    return grouped;
  }

  private async createPersonDebtSummary(
    personId: string,
    shares: DebtShare[],
  ): Promise<DebtSummary> {
    const person = await this.getPersonOrDefault(personId);
    const totalOwed = await this.calculateTotalOwed(shares);
    const oldestDate = this.findOldestDebtDate(shares);

    const totalPaid = await this.calculateTotalPaid(shares);
    const debtShareIds = shares.map((share) => share.debtShareId);

    return {
      personId,
      personName: person.name,
      totalOwedMinor: totalOwed,
      totalPaidMinor: totalPaid,
      outstandingMinor: totalOwed - totalPaid,
      currency: 'USD', // TODO: Get from transaction/user
      debtCount: shares.length,
      debtShareIds,
      oldestDebtDate: oldestDate,
    };
  }

  private async getPersonOrDefault(personId: string): Promise<ExternalPerson> {
    const person = await this.externalPersonRepo.findById(personId);

    if (!person) {
      // Return a default person for missing records
      return {
        personId,
        userId: '',
        name: 'Unknown Person',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return person;
  }

  private async calculateTotalOwed(shares: DebtShare[]): Promise<number> {
    let total = 0;

    for (const share of shares) {
      const paid = await this.debtPaymentRepo.getTotalPaidForDebtShare(share.debtShareId);
      const remaining = calculateRemainingDebt(share, paid);
      total += remaining;
    }

    return total;
  }

  private async calculateTotalPaid(shares: DebtShare[]): Promise<number> {
    let total = 0;

    for (const share of shares) {
      const paid = await this.debtPaymentRepo.getTotalPaidForDebtShare(share.debtShareId);
      total += paid;
    }

    return total;
  }

  private findOldestDebtDate(shares: DebtShare[]): Date {
    if (shares.length === 0) {
      return new Date();
    }

    return shares.reduce((oldest, share) => {
      return share.createdAt < oldest ? share.createdAt : oldest;
    }, shares[0].createdAt);
  }
}
