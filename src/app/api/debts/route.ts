import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
  requireOwnership,
  validateRequest,
  paginatedResponse,
  createdResponse,
  getPaginationParams,
  getQueryParam,
  ApiError,
} from '@/shared/api/utils';
import { createDebtShareSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';
import { DebtShare, DebtPayment } from '@/shared/types/common';

// GET /api/debts - List user's debt shares with optional filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { page, limit } = getPaginationParams(request);

  // Parse query parameters
  const status = getQueryParam(request, 'status');
  const type = getQueryParam(request, 'type'); // 'owed-to-me' or 'i-owe'

  let debtShares = [];

  // Get debt shares based on type
  if (type === 'owed-to-me') {
    debtShares = await repositories.debtShares.findByCreditorId(user.id);
  } else if (type === 'i-owe') {
    debtShares = await repositories.debtShares.findByDebtorId(user.id);
  } else {
    // Get both - debts owed to me and debts I owe
    const owedToMe = await repositories.debtShares.findByCreditorId(user.id);
    const iOwe = await repositories.debtShares.findByDebtorId(user.id);
    debtShares = [...owedToMe, ...iOwe];
  }

  // Apply status filter
  if (status) {
    debtShares = debtShares.filter((debt: DebtShare) => debt.status === status);
  }

  // Get additional details for each debt share
  const debtSharesWithDetails = await Promise.all(
    debtShares.map(async (debtShare: DebtShare) => {
      // Get transaction details
      const transaction = await repositories.transactions.findById(debtShare.transactionId);

      // Get creditor details
      let creditor = null;
      if (debtShare.creditorId === user.id) {
        creditor = { id: user.id, name: 'You', isCurrentUser: true };
      } else {
        const creditorPerson = await repositories.externalPeople.findById(debtShare.creditorId);
        creditor = creditorPerson
          ? {
              id: creditorPerson.personId,
              name: creditorPerson.name,
              email: creditorPerson.email,
              isCurrentUser: false,
            }
          : null;
      }

      // Get debtor details
      let debtor = null;
      if (debtShare.debtorId === user.id) {
        debtor = { id: user.id, name: 'You', isCurrentUser: true };
      } else {
        const debtorPerson = await repositories.externalPeople.findById(debtShare.debtorId);
        debtor = debtorPerson
          ? {
              id: debtorPerson.personId,
              name: debtorPerson.name,
              email: debtorPerson.email,
              isCurrentUser: false,
            }
          : null;
      }

      // Get payments for this debt share
      const allPayments = await repositories.debtPayments.findAll();
      const payments = allPayments.filter(
        (payment: DebtPayment) => payment.debtShareId === debtShare.debtShareId,
      );
      const totalPaid = payments.reduce(
        (sum: number, payment: DebtPayment) => sum + payment.amountMinor,
        0,
      );
      const remainingAmount = debtShare.amountMinor - totalPaid;

      return {
        ...debtShare,
        transaction: transaction
          ? {
              transactionId: transaction.transactionId,
              date: transaction.date,
              description: transaction.description,
              counterparty: transaction.counterparty,
            }
          : null,
        creditor,
        debtor,
        payments,
        totalPaidMinor: totalPaid,
        remainingAmountMinor: remainingAmount,
        isOwedToMe: debtShare.creditorId === user.id,
        isOwedByMe: debtShare.debtorId === user.id,
      };
    }),
  );

  // Sort by creation date descending (newest first)
  debtSharesWithDetails.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Apply pagination
  const total = debtSharesWithDetails.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedDebtShares = debtSharesWithDetails.slice(startIndex, endIndex);

  return paginatedResponse(paginatedDebtShares, page, limit, total);
});

// POST /api/debts - Create new debt share
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  // Validate request body
  const data = await validateRequest(request, createDebtShareSchema);

  // Verify the transaction exists and user owns it
  const transaction = await repositories.transactions.findById(data.transactionId);
  if (!transaction) {
    throw new ApiError('Transaction not found', 404);
  }
  requireOwnership(transaction.userId, user.id);

  // Verify the debtor person exists and user owns it (if not the user themselves)
  if (data.debtorId !== user.id) {
    const debtorPerson = await repositories.externalPeople.findById(data.debtorId);
    if (!debtorPerson) {
      throw new ApiError('Debtor person not found', 404);
    }
    requireOwnership(debtorPerson.userId, user.id);
  }

  // Check that debt amount doesn't exceed transaction amount
  if (data.amountMinor > transaction.amountMinor) {
    throw new ApiError('Debt amount cannot exceed transaction amount', 400);
  }

  // Check for existing debt shares on this transaction
  const existingDebtShares = await repositories.debtShares.findByTransactionId(data.transactionId);
  const totalExistingDebt = existingDebtShares.reduce(
    (sum: number, debt: DebtShare) => sum + debt.amountMinor,
    0,
  );

  if (totalExistingDebt + data.amountMinor > transaction.amountMinor) {
    throw new ApiError('Total debt shares cannot exceed transaction amount', 400);
  }

  // Create debt share with current user as creditor
  const debtShareInput = {
    creditorId: user.id,
    debtorId: data.debtorId,
    transactionId: data.transactionId,
    amountMinor: data.amountMinor,
    status: 'pending' as const,
  };

  const debtShare = await repositories.debtShares.create(debtShareInput);

  return createdResponse(debtShare);
});
