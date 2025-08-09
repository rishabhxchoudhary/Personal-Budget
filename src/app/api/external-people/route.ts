import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
  validateRequest,
  paginatedResponse,
  createdResponse,
  getPaginationParams,
  getQueryParam,
} from '@/shared/api/utils';
import { createExternalPersonSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';
import { ExternalPerson, DebtShare, DebtPayment } from '@/shared/types/common';

// GET /api/external-people - List user's external people with optional filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { page, limit } = getPaginationParams(request);

  // Parse query parameters
  const isActiveParam = getQueryParam(request, 'isActive');
  const isActive = isActiveParam ? isActiveParam === 'true' : undefined;
  const search = getQueryParam(request, 'search');

  // Get user's external people
  let externalPeople = await repositories.externalPeople.findByUserId(user.id);

  // Apply filters
  if (isActive !== undefined) {
    externalPeople = externalPeople.filter(
      (person: ExternalPerson) => person.isActive === isActive,
    );
  }

  // Apply search filter (name, email)
  if (search) {
    const searchTerm = search.toLowerCase();
    externalPeople = externalPeople.filter(
      (person: ExternalPerson) =>
        person.name.toLowerCase().includes(searchTerm) ||
        (person.email && person.email.toLowerCase().includes(searchTerm)),
    );
  }

  // Sort by name
  externalPeople.sort((a: ExternalPerson, b: ExternalPerson) => a.name.localeCompare(b.name));

  // Get debt summary for each person
  const externalPeopleWithDebts = await Promise.all(
    externalPeople.map(async (person: ExternalPerson) => {
      // Get debts where this person owes current user (creditorId = user.id, debtorId = person.id)
      const debtsOwedToMe = await repositories.debtShares.findByCreditorId(user.id);
      const personDebtsOwedToMe = debtsOwedToMe.filter(
        (debt: DebtShare) => debt.debtorId === person.personId,
      );

      // Get debts where current user owes this person (creditorId = person.id, debtorId = user.id)
      const debtsIOwe = await repositories.debtShares.findByDebtorId(user.id);
      const personDebtsIOwe = debtsIOwe.filter(
        (debt: DebtShare) => debt.creditorId === person.personId,
      );

      // Calculate totals
      const totalOwedToMeMinor = personDebtsOwedToMe.reduce(
        (sum: number, debt: DebtShare) => sum + debt.amountMinor,
        0,
      );
      const totalIOwedMinor = personDebtsIOwe.reduce(
        (sum: number, debt: DebtShare) => sum + debt.amountMinor,
        0,
      );

      // Get payments to calculate outstanding amounts
      const allPayments = await repositories.debtPayments.findAll();

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

      const outstandingOwedToMeMinor = totalOwedToMeMinor - totalPaidToMeMinor;
      const outstandingIOwedMinor = totalIOwedMinor - totalIPaidMinor;

      return {
        ...person,
        debtSummary: {
          totalOwedToMeMinor,
          totalIOwedMinor,
          outstandingOwedToMeMinor,
          outstandingIOwedMinor,
          debtCount: personDebtsOwedToMe.length + personDebtsIOwe.length,
          hasOutstandingDebts: outstandingOwedToMeMinor > 0 || outstandingIOwedMinor > 0,
        },
      };
    }),
  );

  // Apply pagination
  const total = externalPeopleWithDebts.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPeople = externalPeopleWithDebts.slice(startIndex, endIndex);

  return paginatedResponse(paginatedPeople, page, limit, total);
});

// POST /api/external-people - Create new external person
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  // Validate request body
  const data = await validateRequest(request, createExternalPersonSchema);

  // Create external person with user ID
  const externalPersonInput = {
    ...data,
    userId: user.id,
  };

  const externalPerson = await repositories.externalPeople.create(externalPersonInput);

  return createdResponse(externalPerson);
});
