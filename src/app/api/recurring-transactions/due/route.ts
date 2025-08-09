import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
  successResponse,
  getPaginationParams,
  getQueryParam,
} from '@/shared/api/utils';
import { repositories } from '@/shared/repositories/container';

// GET /api/recurring-transactions/due - Get user's due recurring transactions
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { page, limit } = getPaginationParams(request);

  // Parse query parameters
  const daysAheadParam = getQueryParam(request, 'daysAhead');
  const daysAhead = daysAheadParam ? Math.max(1, Math.min(365, parseInt(daysAheadParam, 10))) : 7;

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

  // Get user's recurring transactions
  const userRecurringTransactions = await repositories.recurringTransactions.findByUserId(user.id);

  // Filter for due/upcoming transactions
  const dueTransactions = userRecurringTransactions.filter(
    (rt) => rt.isActive && rt.nextRunAt <= cutoffDate
  );

  // Get additional details for each due transaction
  const dueTransactionsWithDetails = await Promise.all(
    dueTransactions.map(async (recurringTransaction) => {
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
        })
      );

      // Calculate days until due
      const now = new Date();
      const daysUntilDue = Math.ceil(
        (recurringTransaction.nextRunAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create suggested transaction
      const suggestedTransaction = {
        userId: user.id,
        accountId: recurringTransaction.template.accountId,
        date: recurringTransaction.nextRunAt,
        amountMinor: recurringTransaction.template.amountMinor,
        type: recurringTransaction.template.type,
        status: 'pending' as const,
        counterparty: recurringTransaction.template.counterparty,
        description: recurringTransaction.template.description,
        splits: recurringTransaction.template.splits.map((split) => ({
          categoryId: split.categoryId || '',
          amountMinor: split.amountMinor,
          note: split.note,
        })),
        recurringTransactionId: recurringTransaction.recurringId,
      };

      return {
        recurringTransaction: {
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
        },
        dueDate: recurringTransaction.nextRunAt,
        daysUntilDue,
        isDue: daysUntilDue <= 0,
        isOverdue: daysUntilDue < 0,
        suggestedTransaction,
      };
    })
  );

  // Sort by due date (earliest first)
  dueTransactionsWithDetails.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  // Apply pagination
  const total = dueTransactionsWithDetails.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedDueTransactions = dueTransactionsWithDetails.slice(startIndex, endIndex);

  // Add summary statistics
  const summary = {
    totalDue: total,
    overdue: dueTransactionsWithDetails.filter(dt => dt.isOverdue).length,
    dueToday: dueTransactionsWithDetails.filter(dt => dt.daysUntilDue === 0).length,
    dueTomorrow: dueTransactionsWithDetails.filter(dt => dt.daysUntilDue === 1).length,
    autoPost: dueTransactionsWithDetails.filter(dt => dt.recurringTransaction.autoPost).length,
  };

  return successResponse({
    data: paginatedDueTransactions,
    summary,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
