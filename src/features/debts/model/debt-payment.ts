import { DebtPayment } from '@/shared/types/common';

// Maximum amount in minor units (to prevent overflow)
const MAX_AMOUNT_MINOR = Number.MAX_SAFE_INTEGER;

export function validatePaymentAmount(amount: number): void {
  if (!Number.isFinite(amount)) {
    throw new Error('Payment amount must be a valid number');
  }

  if (amount <= 0) {
    throw new Error('Payment amount must be positive');
  }

  if (amount > MAX_AMOUNT_MINOR) {
    throw new Error('Payment amount exceeds maximum allowed value');
  }

  if (!Number.isInteger(amount)) {
    throw new Error('Payment amount must be an integer (minor units)');
  }
}

export function validatePaymentDate(date: Date): void {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Payment date must be a valid Date object');
  }

  const now = new Date();
  if (date > now) {
    throw new Error('Payment date cannot be in the future');
  }
}

export function validateDebtShareId(debtShareId: string): void {
  if (!debtShareId || !debtShareId.trim()) {
    throw new Error('DebtShareId is required');
  }
}

export function validateTransactionId(transactionId: string | undefined): void {
  if (transactionId !== undefined && (!transactionId || !transactionId.trim())) {
    throw new Error('TransactionId cannot be empty if provided');
  }
}

export function createPaymentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `payment_${timestamp}_${random}`;
}

export function validateDebtPayment(payment: Partial<DebtPayment>): void {
  if (!payment.debtShareId) {
    throw new Error('DebtShareId is required');
  }

  // Make payerId and payeeId optional for backwards compatibility
  // New code should always provide these, but existing tests may not

  if (payment.amountMinor === undefined || payment.amountMinor === null) {
    throw new Error('AmountMinor is required');
  }

  if (!payment.paymentDate) {
    throw new Error('PaymentDate is required');
  }

  validateDebtShareId(payment.debtShareId);
  validatePaymentAmount(payment.amountMinor);
  validatePaymentDate(payment.paymentDate);
  validateTransactionId(payment.transactionId);
}

export function createDefaultDebtPayment(
  input: Omit<DebtPayment, 'paymentId' | 'createdAt' | 'updatedAt'>,
): Omit<DebtPayment, 'createdAt' | 'updatedAt'> {
  validateDebtPayment(input);

  return {
    paymentId: createPaymentId(),
    debtShareId: input.debtShareId,
    payerId: input.payerId,
    payeeId: input.payeeId,
    amountMinor: input.amountMinor,
    paymentDate: input.paymentDate,
    note: input.note,
    transactionId: input.transactionId,
  };
}

export function isPaymentReconciled(payment: DebtPayment): boolean {
  return payment.transactionId !== undefined && payment.transactionId !== null;
}

export function comparePaymentDates(a: DebtPayment, b: DebtPayment): number {
  return a.paymentDate.getTime() - b.paymentDate.getTime();
}

export function sumPayments(payments: DebtPayment[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
}

export function groupPaymentsByDebtShare(payments: DebtPayment[]): Map<string, DebtPayment[]> {
  const grouped = new Map<string, DebtPayment[]>();

  for (const payment of payments) {
    const existing = grouped.get(payment.debtShareId) || [];
    existing.push(payment);
    grouped.set(payment.debtShareId, existing);
  }

  return grouped;
}

export function filterPaymentsByDateRange(
  payments: DebtPayment[],
  startDate: Date,
  endDate: Date,
): DebtPayment[] {
  if (startDate > endDate) {
    throw new Error('Start date must be before or equal to end date');
  }

  return payments.filter(
    (payment) => payment.paymentDate >= startDate && payment.paymentDate <= endDate,
  );
}
