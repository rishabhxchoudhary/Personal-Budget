import {
  DebtService,
  DebtSummary,
  DebtShare,
  DebtPayment,
  DebtShareRepository,
  ExternalPersonRepository,
  BusinessError,
} from '@/shared/types/common';
import { DebtPaymentRepository } from '../model/debt-payment-repository';

export interface DebtsIOweQuery {
  personId?: string;
  currency?: string;
  minOutstandingMinor?: number;
  includeZero?: boolean;
  sortBy?: 'outstanding' | 'person' | 'recent';
  sortDir?: 'asc' | 'desc';
}

export interface DebtsIOweItem {
  personId: string;
  personName: string;
  currency: string;
  outstandingMinor: number;
  totalOwedMinor: number;
  totalPaidMinor: number;
  lastActivityAt: Date;
  debtShareIds: string[];
}

export interface DebtsIOweService {
  list(userId: string, q?: DebtsIOweQuery): Promise<DebtsIOweItem[]>;
  getByPerson(userId: string, personId: string): Promise<DebtsIOweItem | null>;
  settleUp(
    userId: string,
    personId: string,
    amountMinor: number,
    note?: string,
  ): Promise<DebtPayment[]>;
}

export class DebtsIOweServiceImpl implements DebtsIOweService {
  constructor(
    private debtService: DebtService,
    private debtShareRepo: DebtShareRepository,
    private debtPaymentRepo: DebtPaymentRepository,
    private externalPersonRepo: ExternalPersonRepository,
  ) {}

  async list(userId: string, query?: DebtsIOweQuery): Promise<DebtsIOweItem[]> {
    const summaries = await this.debtService.getDebtsIOwe(userId);
    const items = await this.enrichSummaries(userId, summaries);
    const filtered = this.applyFilters(items, query);
    return this.applySorting(filtered, query);
  }

  async getByPerson(userId: string, personId: string): Promise<DebtsIOweItem | null> {
    const items = await this.list(userId, { personId });
    return items.length > 0 ? items[0] : null;
  }

  async settleUp(
    userId: string,
    personId: string,
    amountMinor: number,
    note?: string,
  ): Promise<DebtPayment[]> {
    this.validateSettleAmount(amountMinor);

    const debtItem = await this.getByPerson(userId, personId);
    if (!debtItem || debtItem.outstandingMinor === 0) {
      throw new BusinessError('No outstanding debts to this person', 'NO_OUTSTANDING_DEBTS');
    }

    if (amountMinor > debtItem.outstandingMinor) {
      throw new BusinessError(
        `Amount exceeds outstanding debt of ${debtItem.outstandingMinor}`,
        'AMOUNT_EXCEEDS_OUTSTANDING',
      );
    }

    return this.applyPaymentsFIFO(userId, personId, debtItem.debtShareIds, amountMinor, note);
  }

  private async enrichSummaries(
    userId: string,
    summaries: DebtSummary[],
  ): Promise<DebtsIOweItem[]> {
    const items: DebtsIOweItem[] = [];

    for (const summary of summaries) {
      const item = await this.createDebtsIOweItem(userId, summary);
      items.push(item);
    }

    return items;
  }

  private async createDebtsIOweItem(userId: string, summary: DebtSummary): Promise<DebtsIOweItem> {
    // Fetch debt shares since they're not in the summary
    const debtShares = await this.debtShareRepo.findByDebtorId(userId);
    const relevantShares = debtShares.filter((share) => share.creditorId === summary.personId);
    const debtShareIds = relevantShares.map((share) => share.debtShareId);

    const payments = await this.getPaymentsForShares(debtShareIds);
    const totalPaidMinor = this.calculateTotalPaid(payments);
    const lastActivityAt = await this.calculateLastActivity(summary, payments);

    // Note: summary.totalOwedMinor from the existing debt service is the REMAINING amount
    const outstandingMinor = summary.totalOwedMinor;
    const totalOwedMinor = outstandingMinor + totalPaidMinor;

    return {
      personId: summary.personId,
      personName: summary.personName,
      currency: summary.currency,
      totalOwedMinor,
      totalPaidMinor,
      outstandingMinor,
      lastActivityAt,
      debtShareIds,
    };
  }

  private async getPaymentsForShares(debtShareIds: string[]): Promise<DebtPayment[]> {
    const allPayments: DebtPayment[] = [];

    for (const shareId of debtShareIds) {
      const payments = await this.debtPaymentRepo.findByDebtShareId(shareId);
      allPayments.push(...payments);
    }

    return allPayments;
  }

  private calculateTotalPaid(payments: DebtPayment[]): number {
    return payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
  }

  private async calculateLastActivity(
    summary: DebtSummary,
    payments: DebtPayment[],
  ): Promise<Date> {
    if (payments.length === 0) {
      return summary.oldestDebtDate;
    }

    const latestPayment = payments.reduce((latest, payment) =>
      payment.paymentDate > latest.paymentDate ? payment : latest,
    );

    return latestPayment.paymentDate;
  }

  private applyFilters(items: DebtsIOweItem[], query?: DebtsIOweQuery): DebtsIOweItem[] {
    if (!query) return items;

    let filtered = [...items];

    if (query.personId) {
      filtered = filtered.filter((item) => item.personId === query.personId);
    }

    if (query.currency) {
      filtered = filtered.filter((item) => item.currency === query.currency);
    }

    if (query.minOutstandingMinor !== undefined) {
      filtered = filtered.filter((item) => item.outstandingMinor >= query.minOutstandingMinor!);
    }

    if (!query.includeZero) {
      filtered = filtered.filter((item) => item.outstandingMinor > 0);
    }

    return filtered;
  }

  private applySorting(items: DebtsIOweItem[], query?: DebtsIOweQuery): DebtsIOweItem[] {
    if (!query?.sortBy) return items;

    const sorted = [...items];

    switch (query.sortBy) {
      case 'outstanding':
        // Default desc for outstanding
        if (query.sortDir === 'asc') {
          sorted.sort((a, b) => a.outstandingMinor - b.outstandingMinor);
        } else {
          sorted.sort((a, b) => b.outstandingMinor - a.outstandingMinor);
        }
        break;
      case 'person':
        // Default asc for person name
        if (query.sortDir === 'desc') {
          sorted.sort((a, b) => b.personName.localeCompare(a.personName));
        } else {
          sorted.sort((a, b) => a.personName.localeCompare(b.personName));
        }
        break;
      case 'recent':
        // Default desc for recent activity
        if (query.sortDir === 'asc') {
          sorted.sort((a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime());
        } else {
          sorted.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
        }
        break;
    }

    return sorted;
  }

  private validateSettleAmount(amountMinor: number): void {
    if (amountMinor <= 0) {
      throw new BusinessError('Amount must be positive', 'INVALID_AMOUNT');
    }
  }

  private async applyPaymentsFIFO(
    userId: string,
    personId: string,
    debtShareIds: string[],
    totalAmount: number,
    note?: string,
  ): Promise<DebtPayment[]> {
    const sortedShares = await this.getSortedUnpaidShares(debtShareIds);
    const payments: DebtPayment[] = [];
    let remainingAmount = totalAmount;

    for (const share of sortedShares) {
      if (remainingAmount <= 0) break;

      const payment = await this.applyPaymentToShare(
        userId,
        personId,
        share,
        remainingAmount,
        note,
      );

      payments.push(payment);
      remainingAmount -= payment.amountMinor;
    }

    return payments;
  }

  private async getSortedUnpaidShares(debtShareIds: string[]): Promise<DebtShare[]> {
    const shares: DebtShare[] = [];

    for (const shareId of debtShareIds) {
      const share = await this.debtShareRepo.findById(shareId);
      if (share && share.status !== 'paid') {
        shares.push(share);
      }
    }

    return shares.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  private async applyPaymentToShare(
    userId: string,
    personId: string,
    share: DebtShare,
    availableAmount: number,
    note?: string,
  ): Promise<DebtPayment> {
    const existingPayments = await this.debtPaymentRepo.findByDebtShareId(share.debtShareId);
    const totalPaid = this.calculateTotalPaid(existingPayments);
    const remaining = share.amountMinor - totalPaid;
    const paymentAmount = Math.min(availableAmount, remaining);

    const payment = await this.debtPaymentRepo.create({
      debtShareId: share.debtShareId,
      payerId: userId,
      payeeId: personId,
      amountMinor: paymentAmount,
      paymentDate: new Date(),
      note,
    });

    await this.updateShareStatus(share, totalPaid + paymentAmount);

    return payment;
  }

  private async updateShareStatus(share: DebtShare, totalPaid: number): Promise<void> {
    if (totalPaid >= share.amountMinor) {
      await this.debtShareRepo.updateStatus(share.debtShareId, 'paid');
    } else if (totalPaid > 0) {
      await this.debtShareRepo.updateStatus(share.debtShareId, 'partial');
    }
  }
}
