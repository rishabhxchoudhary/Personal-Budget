import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
  requireOwnership,
  validateRequest,
  successResponse,
  noContentResponse,
  validateId,
  ApiError,
} from '@/shared/api/utils';
import { updateExternalPersonSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';
import { DebtShare, DebtPayment } from '@/shared/types/common';

interface RouteContext {
  params: { id: string };
}

// GET /api/external-people/[id] - Get specific external person
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const personId = validateId(params.id, 'Person ID');

  // Find the external person
  const externalPerson = await repositories.externalPeople.findById(personId);
  if (!externalPerson) {
    throw new ApiError('External person not found', 404);
  }

  // Ensure user owns this external person
  requireOwnership(externalPerson.userId, user.id);

  // Get detailed debt information
  const debtsOwedToMe = await repositories.debtShares.findByCreditorId(user.id);
  const personDebtsOwedToMe = debtsOwedToMe.filter((debt: DebtShare) => debt.debtorId === personId);

  const debtsIOwe = await repositories.debtShares.findByDebtorId(user.id);
  const personDebtsIOwe = debtsIOwe.filter((debt: DebtShare) => debt.creditorId === personId);

  // Get all payments
  const allPayments = await repositories.debtPayments.findAll();

  // Calculate payment totals
  const paymentsOwedToMe = allPayments.filter((payment: DebtPayment) =>
    personDebtsOwedToMe.some((debt: DebtShare) => debt.debtShareId === payment.debtShareId),
  );
  const totalPaidToMeMinor = paymentsOwedToMe.reduce(
    (sum: number, payment: DebtPayment) => sum + payment.amountMinor,
    0,
  );

  const paymentsIOwe = allPayments.filter((payment: DebtPayment) =>
    personDebtsIOwe.some((debt: DebtShare) => debt.debtShareId === payment.debtShareId),
  );
  const totalIPaidMinor = paymentsIOwe.reduce(
    (sum: number, payment: DebtPayment) => sum + payment.amountMinor,
    0,
  );

  // Calculate debt totals
  const totalOwedToMeMinor = personDebtsOwedToMe.reduce(
    (sum: number, debt: DebtShare) => sum + debt.amountMinor,
    0,
  );
  const totalIOwedMinor = personDebtsIOwe.reduce(
    (sum: number, debt: DebtShare) => sum + debt.amountMinor,
    0,
  );

  const outstandingOwedToMeMinor = totalOwedToMeMinor - totalPaidToMeMinor;
  const outstandingIOwedMinor = totalIOwedMinor - totalIPaidMinor;

  // Get transaction details for debt shares
  const debtsWithTransactions = await Promise.all([
    ...personDebtsOwedToMe.map(async (debt: DebtShare) => {
      const transaction = await repositories.transactions.findById(debt.transactionId);
      const payments = allPayments.filter((p: DebtPayment) => p.debtShareId === debt.debtShareId);
      const totalPaid = payments.reduce((sum: number, p: DebtPayment) => sum + p.amountMinor, 0);

      return {
        ...debt,
        type: 'owed-to-me',
        transaction: transaction
          ? {
              transactionId: transaction.transactionId,
              date: transaction.date,
              description: transaction.description,
              counterparty: transaction.counterparty,
            }
          : null,
        payments,
        totalPaidMinor: totalPaid,
        remainingMinor: debt.amountMinor - totalPaid,
      };
    }),
    ...personDebtsIOwe.map(async (debt: DebtShare) => {
      const transaction = await repositories.transactions.findById(debt.transactionId);
      const payments = allPayments.filter((p: DebtPayment) => p.debtShareId === debt.debtShareId);
      const totalPaid = payments.reduce((sum: number, p: DebtPayment) => sum + p.amountMinor, 0);

      return {
        ...debt,
        type: 'i-owe',
        transaction: transaction
          ? {
              transactionId: transaction.transactionId,
              date: transaction.date,
              description: transaction.description,
              counterparty: transaction.counterparty,
            }
          : null,
        payments,
        totalPaidMinor: totalPaid,
        remainingMinor: debt.amountMinor - totalPaid,
      };
    }),
  ]);

  return successResponse({
    ...externalPerson,
    debtSummary: {
      totalOwedToMeMinor,
      totalIOwedMinor,
      outstandingOwedToMeMinor,
      outstandingIOwedMinor,
      totalPaidToMeMinor,
      totalIPaidMinor,
      debtCount: personDebtsOwedToMe.length + personDebtsIOwe.length,
      hasOutstandingDebts: outstandingOwedToMeMinor > 0 || outstandingIOwedMinor > 0,
    },
    debts: debtsWithTransactions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  });
});

// PUT /api/external-people/[id] - Update external person
export const PUT = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const personId = validateId(params.id, 'Person ID');

  // Validate request body
  const data = await validateRequest(request, updateExternalPersonSchema);

  // Find the external person
  const existingPerson = await repositories.externalPeople.findById(personId);
  if (!existingPerson) {
    throw new ApiError('External person not found', 404);
  }

  // Ensure user owns this external person
  requireOwnership(existingPerson.userId, user.id);

  // Check for duplicate email if email is being changed
  if (data.email && data.email !== existingPerson.email) {
    const existingWithEmail = await repositories.externalPeople.findByEmail(data.email);
    if (existingWithEmail && existingWithEmail.userId === user.id) {
      throw new ApiError('External person with this email already exists', 409);
    }
  }

  // Update the external person
  const updatedPerson = await repositories.externalPeople.update(personId, {
    ...data,
    updatedAt: new Date(),
  });

  return successResponse(updatedPerson);
});

// DELETE /api/external-people/[id] - Delete external person (soft delete by setting isActive = false)
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const personId = validateId(params.id, 'Person ID');

  // Find the external person
  const existingPerson = await repositories.externalPeople.findById(personId);
  if (!existingPerson) {
    throw new ApiError('External person not found', 404);
  }

  // Ensure user owns this external person
  requireOwnership(existingPerson.userId, user.id);

  // Check if person has outstanding debts
  const debtsOwedToMe = await repositories.debtShares.findByCreditorId(user.id);
  const personDebtsOwedToMe = debtsOwedToMe.filter(
    (debt: DebtShare) => debt.debtorId === personId && debt.status !== 'paid',
  );

  const debtsIOwe = await repositories.debtShares.findByDebtorId(user.id);
  const personDebtsIOwe = debtsIOwe.filter(
    (debt: DebtShare) => debt.creditorId === personId && debt.status !== 'paid',
  );

  if (personDebtsOwedToMe.length > 0 || personDebtsIOwe.length > 0) {
    throw new ApiError('Cannot delete person with outstanding debts. Settle all debts first.', 400);
  }

  // Perform soft delete by setting isActive = false
  await repositories.externalPeople.update(personId, {
    isActive: false,
    updatedAt: new Date(),
  });

  return noContentResponse();
});
