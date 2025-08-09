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
import { createRecurringTransactionSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';

// GET /api/recurring-transactions - List user's recurring transactions with optional filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { page, limit } = getPaginationParams(request);

  // Parse query parameters
  const isActiveParam = getQueryParam(request, 'isActive');
  const isActive = isActiveParam ? isActiveParam === 'true' : undefined;
  const accountId = getQueryParam(request, 'accountId');

  // Get user's recurring transactions
  let recurringTransactions = await repositories.recurringTransactions.findByUserId(user.id);

  // Apply filters
  if (isActive !== undefined) {
    recurringTransactions = recurringTransactions.filter((rt) => rt.isActive === isActive);
  }

  if (accountId) {
    recurringTransactions = recurringTransactions.filter(
      (rt) => rt.template.accountId === accountId,
    );
  }

  // Get additional details for each recurring transaction
  const recurringTransactionsWithDetails = await Promise.all(
    recurringTransactions.map(async (recurringTransaction) => {
      // Get account details
      const account = await repositories.accounts.findById(recurringTransaction.template.accountId);

      // Get category details for each split
      const splitsWithCategories = await Promise.all(
        recurringTransaction.template.splits.map(async (split) => {
          const category = split.categoryId
            ? await repositories.categories.findById(split.categoryId)
            : null;

          return {
            ...split,
            category: category
              ? {
                  categoryId: category.categoryId,
                  name: category.name,
                  type: category.type,
                  icon: category.icon,
                  color: category.color,
                }
              : null,
          };
        }),
      );

      // Calculate days until next run
      const now = new Date();
      const daysUntilDue = Math.ceil(
        (recurringTransaction.nextRunAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        ...recurringTransaction,
        account: account
          ? {
              accountId: account.accountId,
              name: account.name,
              type: account.type,
              currency: account.currency,
            }
          : null,
        template: {
          ...recurringTransaction.template,
          splits: splitsWithCategories,
        },
        daysUntilDue,
        isDue: daysUntilDue <= 0,
        isOverdue: daysUntilDue < 0,
      };
    }),
  );

  // Sort by next run date (earliest first)
  recurringTransactionsWithDetails.sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime());

  // Apply pagination
  const total = recurringTransactionsWithDetails.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRecurringTransactions = recurringTransactionsWithDetails.slice(
    startIndex,
    endIndex,
  );

  return paginatedResponse(paginatedRecurringTransactions, page, limit, total);
});

// POST /api/recurring-transactions - Create new recurring transaction
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  // Validate request body
  const data = await validateRequest(request, createRecurringTransactionSchema);

  // Verify the account exists and user owns it
  const account = await repositories.accounts.findById(data.template.accountId);
  if (!account) {
    throw new ApiError('Account not found', 404);
  }
  requireOwnership(account.userId, user.id);

  // Verify all categories exist and user owns them if provided
  for (const split of data.template.splits) {
    if (split.categoryId) {
      const category = await repositories.categories.findById(split.categoryId);
      if (!category) {
        throw new ApiError(`Category ${split.categoryId} not found`, 404);
      }
      requireOwnership(category.userId, user.id);
    }
  }

  // Verify splits add up to transaction amount
  const totalSplitAmount = data.template.splits.reduce((sum, split) => sum + split.amountMinor, 0);
  if (totalSplitAmount !== data.template.amountMinor) {
    throw new ApiError('Split amounts must equal transaction amount', 400);
  }

  // Create recurring transaction with user ID
  const recurringTransactionInput = {
    ...data,
    userId: user.id,
  };

  const recurringTransaction =
    await repositories.recurringTransactions.create(recurringTransactionInput);

  return createdResponse(recurringTransaction);
});
