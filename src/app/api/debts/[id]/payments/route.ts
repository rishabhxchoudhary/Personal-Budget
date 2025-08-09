import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
  requireOwnership,
  validateRequest,
  paginatedResponse,
  createdResponse,
  getPaginationParams,
  validateId,
  ApiError,
} from '@/shared/api/utils';
import { createDebtPaymentSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';
import { DebtPayment, DebtStatus } from '@/shared/types/common';

interface RouteContext {
  params: { id: string };
}

// GET /api/debts/[id]/payments - List payments for a debt share
export const GET = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const debtShareId = validateId(params.id, 'Debt Share ID');
  const { page, limit } = getPaginationParams(request);

  // Find the debt share
  const debtShare = await repositories.debtShares.findById(debtShareId);
  if (!debtShare) {
    throw new ApiError('Debt share not found', 404);
  }

  // Ensure user is involved in this debt (either creditor or debtor)
  if (debtShare.creditorId !== user.id && debtShare.debtorId !== user.id) {
    throw new ApiError('Access denied', 403);
  }

  // Get all payments for this debt share
  const allPayments = await repositories.debtPayments.findAll();
  const payments = allPayments.filter(
    (payment: DebtPayment) => payment.debtShareId === debtShareId,
  );

  // Sort by payment date descending (newest first)
  payments.sort(
    (a: DebtPayment, b: DebtPayment) =>
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
  );

  // Get additional details for each payment
  const paymentsWithDetails = await Promise.all(
    payments.map(async (payment: DebtPayment) => {
      // Get payer details
      let payer = null;
      if (payment.payerId === user.id) {
        payer = { id: user.id, name: 'You', isCurrentUser: true };
      } else {
        const payerPerson = await repositories.externalPeople.findById(payment.payerId);
        payer = payerPerson
          ? {
              id: payerPerson.personId,
              name: payerPerson.name,
              email: payerPerson.email,
              isCurrentUser: false,
            }
          : null;
      }

      // Get payee details
      let payee = null;
      if (payment.payeeId === user.id) {
        payee = { id: user.id, name: 'You', isCurrentUser: true };
      } else {
        const payeePerson = await repositories.externalPeople.findById(payment.payeeId);
        payee = payeePerson
          ? {
              id: payeePerson.personId,
              name: payeePerson.name,
              email: payeePerson.email,
              isCurrentUser: false,
            }
          : null;
      }

      // Get transaction details if linked
      let transaction = null;
      if (payment.transactionId) {
        const paymentTransaction = await repositories.transactions.findById(payment.transactionId);
        transaction = paymentTransaction
          ? {
              transactionId: paymentTransaction.transactionId,
              date: paymentTransaction.date,
              description: paymentTransaction.description,
              counterparty: paymentTransaction.counterparty,
            }
          : null;
      }

      return {
        ...payment,
        payer,
        payee,
        transaction,
      };
    }),
  );

  // Apply pagination
  const total = paymentsWithDetails.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPayments = paymentsWithDetails.slice(startIndex, endIndex);

  return paginatedResponse(paginatedPayments, page, limit, total, 200);
});

// POST /api/debts/[id]/payments - Record a payment for a debt share
export const POST = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const debtShareId = validateId(params.id, 'Debt Share ID');

  // Validate request body
  const data = await validateRequest(request, createDebtPaymentSchema);

  // Ensure the debtShareId in the URL matches the one in the body
  if (data.debtShareId !== debtShareId) {
    throw new ApiError('Debt share ID mismatch between URL and request body', 400);
  }

  // Find the debt share
  const debtShare = await repositories.debtShares.findById(debtShareId);
  if (!debtShare) {
    throw new ApiError('Debt share not found', 404);
  }

  // Ensure user is involved in this debt (either creditor or debtor)
  if (debtShare.creditorId !== user.id && debtShare.debtorId !== user.id) {
    throw new ApiError('Access denied', 403);
  }

  // Check if debt is already paid
  if (debtShare.status === 'paid') {
    throw new ApiError('Cannot add payment to already paid debt', 400);
  }

  // Calculate existing payments
  const allPayments = await repositories.debtPayments.findAll();
  const existingPayments = allPayments.filter(
    (payment: DebtPayment) => payment.debtShareId === debtShareId,
  );
  const totalExistingPayments = existingPayments.reduce(
    (sum: number, payment: DebtPayment) => sum + payment.amountMinor,
    0,
  );

  // Check if payment amount exceeds remaining debt
  const remainingDebt = debtShare.amountMinor - totalExistingPayments;
  if (data.amountMinor > remainingDebt) {
    throw new ApiError('Payment amount exceeds remaining debt amount', 400);
  }

  // Validate payment date
  const paymentDate = new Date(data.paymentDate);
  const now = new Date();
  if (paymentDate > now) {
    throw new ApiError('Payment date cannot be in the future', 400);
  }

  // Verify transaction if provided
  if (data.transactionId) {
    const transaction = await repositories.transactions.findById(data.transactionId);
    if (!transaction) {
      throw new ApiError('Transaction not found', 404);
    }
    requireOwnership(transaction.userId, user.id);
  }

  // Create payment
  const paymentInput = {
    debtShareId: data.debtShareId,
    payerId: debtShare.debtorId, // The debtor pays
    payeeId: debtShare.creditorId, // The creditor receives
    amountMinor: data.amountMinor,
    paymentDate: paymentDate,
    note: data.note,
    transactionId: data.transactionId,
  };

  const payment = await repositories.debtPayments.create(paymentInput);

  // Update debt share status
  const newTotalPayments = totalExistingPayments + data.amountMinor;
  let newStatus: DebtStatus = debtShare.status;

  if (newTotalPayments >= debtShare.amountMinor) {
    newStatus = 'paid';
  } else if (newTotalPayments > 0) {
    newStatus = 'partial';
  }

  if (newStatus !== debtShare.status) {
    await repositories.debtShares.updateStatus(debtShareId, newStatus);
  }

  return createdResponse(payment);
});
