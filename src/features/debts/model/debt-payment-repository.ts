import { DebtPayment } from '@/shared/types/common';
import {
  validateDebtPayment,
  createPaymentId,
  comparePaymentDates,
  sumPayments,
} from './debt-payment';

export interface DebtPaymentRepository {
  create(
    item: Omit<DebtPayment, 'paymentId' | 'createdAt' | 'updatedAt'> & {
      payerId?: string;
      payeeId?: string;
    },
  ): Promise<DebtPayment>;
  findById(id: string): Promise<DebtPayment | null>;
  findByDebtShareId(debtShareId: string): Promise<DebtPayment[]>;
  findByTransactionId(transactionId: string): Promise<DebtPayment | null>;
  findByDateRange(startDate: Date, endDate: Date): Promise<DebtPayment[]>;
  getTotalPaidForDebtShare(debtShareId: string): Promise<number>;
}

export class DebtPaymentRepositoryImpl implements DebtPaymentRepository {
  private store: Map<string, DebtPayment> = new Map();
  private insertionOrder: string[] = [];

  async create(
    item: Omit<DebtPayment, 'paymentId' | 'createdAt' | 'updatedAt'> & {
      paymentId?: string;
      payerId?: string;
      payeeId?: string;
    },
  ): Promise<DebtPayment> {
    validateDebtPayment(item);

    const paymentId = item.paymentId || createPaymentId();
    const payment: DebtPayment = {
      ...item,
      paymentId,
      payerId: item.payerId || 'unknown',
      payeeId: item.payeeId || 'unknown',
      paymentDate: new Date(item.paymentDate), // Ensure it's a Date object
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.store.has(paymentId)) {
      throw new Error(`Entity with id ${paymentId} already exists`);
    }

    this.store.set(paymentId, payment);
    this.insertionOrder.push(paymentId);

    return this.deepCopy(payment);
  }

  async findById(id: string): Promise<DebtPayment | null> {
    const payment = this.store.get(id);
    return payment ? this.deepCopy(payment) : null;
  }

  async findAll(): Promise<DebtPayment[]> {
    const result: DebtPayment[] = [];
    for (const id of this.insertionOrder) {
      const payment = this.store.get(id);
      if (payment) {
        result.push(this.deepCopy(payment));
      }
    }
    return result;
  }

  async findByDebtShareId(debtShareId: string): Promise<DebtPayment[]> {
    const all = await this.findAll();
    const filtered = all.filter((payment) => payment.debtShareId === debtShareId);
    // Sort by payment date (chronological order)
    return filtered.sort(comparePaymentDates);
  }

  async findByTransactionId(transactionId: string): Promise<DebtPayment | null> {
    if (!transactionId) return null;
    const all = await this.findAll();
    return all.find((payment) => payment.transactionId === transactionId) || null;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<DebtPayment[]> {
    if (startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    const all = await this.findAll();
    const filtered = all.filter(
      (payment) => payment.paymentDate >= startDate && payment.paymentDate <= endDate,
    );

    // Sort by payment date
    return filtered.sort(comparePaymentDates);
  }

  async getTotalPaidForDebtShare(debtShareId: string): Promise<number> {
    const payments = await this.findByDebtShareId(debtShareId);
    return sumPayments(payments);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async update(_id: string, _updates: Partial<DebtPayment>): Promise<DebtPayment> {
    throw new Error('Debt payments are immutable and cannot be updated');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_id: string): Promise<void> {
    throw new Error('Debt payments are immutable and cannot be deleted');
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.insertionOrder = [];
  }

  async findByDebtShareIds(debtShareIds: string[]): Promise<DebtPayment[]> {
    if (!debtShareIds.length) return [];
    const all = await this.findAll();
    return all.filter((payment) => debtShareIds.includes(payment.debtShareId));
  }

  async getTotalPaidByDebtor(debtShareIds: string[]): Promise<number> {
    const payments = await this.findByDebtShareIds(debtShareIds);
    return sumPayments(payments);
  }

  private deepCopy<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepCopy(item)) as unknown as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepCopy(obj[key]);
      }
    }

    return cloned;
  }
}
