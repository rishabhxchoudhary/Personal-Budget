import { DebtShare, DebtStatus } from '@/shared/types/common';

// Valid debt statuses
const VALID_STATUSES: DebtStatus[] = ['pending', 'partial', 'paid'];

// Maximum amount in minor units (to prevent overflow)
const MAX_AMOUNT_MINOR = Number.MAX_SAFE_INTEGER;

export function validateDebtStatus(status: string): status is DebtStatus {
  return VALID_STATUSES.includes(status as DebtStatus);
}

export function validateAmountMinor(amount: number): void {
  if (!Number.isFinite(amount)) {
    throw new Error('Amount must be a valid number');
  }

  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (amount > MAX_AMOUNT_MINOR) {
    throw new Error('Amount exceeds maximum allowed value');
  }

  if (!Number.isInteger(amount)) {
    throw new Error('Amount must be an integer (minor units)');
  }
}

export function validateCreditorDebtor(creditorId: string, debtorId: string): void {
  if (!creditorId || !creditorId.trim()) {
    throw new Error('CreditorId is required');
  }

  if (!debtorId || !debtorId.trim()) {
    throw new Error('DebtorId is required');
  }

  if (creditorId === debtorId) {
    throw new Error('Creditor and debtor cannot be the same');
  }
}

export function validateTransactionId(transactionId: string): void {
  if (!transactionId || !transactionId.trim()) {
    throw new Error('TransactionId is required');
  }
}

export function createDebtShareId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `debt_${timestamp}_${random}`;
}

export function validateDebtShare(debtShare: Partial<DebtShare>): void {
  if (!debtShare.creditorId || !debtShare.debtorId) {
    throw new Error('CreditorId and debtorId are required');
  }

  if (!debtShare.transactionId) {
    throw new Error('TransactionId is required');
  }

  if (debtShare.amountMinor === undefined || debtShare.amountMinor === null) {
    throw new Error('AmountMinor is required');
  }

  validateCreditorDebtor(debtShare.creditorId, debtShare.debtorId);
  validateTransactionId(debtShare.transactionId);
  validateAmountMinor(debtShare.amountMinor);

  if (debtShare.status && !validateDebtStatus(debtShare.status)) {
    throw new Error(`Invalid status: ${debtShare.status}`);
  }
}

export function canTransitionStatus(
  currentStatus: DebtStatus,
  newStatus: DebtStatus
): boolean {
  // Cannot change from paid to anything else
  if (currentStatus === 'paid') {
    return newStatus === 'paid';
  }

  // Pending can go to partial or paid
  if (currentStatus === 'pending') {
    return true;
  }

  // Partial can only go to paid or stay partial
  if (currentStatus === 'partial') {
    return newStatus === 'partial' || newStatus === 'paid';
  }

  return false;
}

export function createDefaultDebtShare(
  input: Omit<DebtShare, 'debtShareId' | 'status' | 'createdAt' | 'updatedAt'>
): Omit<DebtShare, 'createdAt' | 'updatedAt'> {
  validateDebtShare(input);

  return {
    debtShareId: createDebtShareId(),
    creditorId: input.creditorId,
    debtorId: input.debtorId,
    transactionId: input.transactionId,
    amountMinor: input.amountMinor,
    status: 'pending',
  };
}

export function calculateRemainingDebt(
  debtShare: DebtShare,
  totalPaid: number
): number {
  if (totalPaid < 0) {
    throw new Error('Total paid cannot be negative');
  }

  const remaining = debtShare.amountMinor - totalPaid;
  return Math.max(0, remaining);
}

export function determineDebtStatus(
  originalAmount: number,
  totalPaid: number
): DebtStatus {
  if (totalPaid <= 0) {
    return 'pending';
  }

  if (totalPaid >= originalAmount) {
    return 'paid';
  }

  return 'partial';
}
