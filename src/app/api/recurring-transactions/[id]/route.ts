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
import { updateRecurringTransactionSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';

interface RouteContext {
  params: { id: string };
}

// GET /api/recurring-transactions/[id] - Get specific recurring transaction
export const GET = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const recurringId = validateId(params.id, 'Recurring Transaction ID');

  // Find the recurring transaction
  const recurringTransaction = await repositories.recurringTransactions.findById(recurringId);
  if (!recurringTransaction) {
    throw new ApiError('Recurring transaction not found', 404);
  }

  // Ensure user owns this recurring transaction
  requireOwnership(recurringTransaction.userId, user.id);

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

  return successResponse({
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
  });
});

// PUT /api/recurring-transactions/[id] - Update recurring transaction
export const PUT = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const recurringId = validateId(params.id, 'Recurring Transaction ID');

  // Validate request body
  const data = await validateRequest(request, updateRecurringTransactionSchema);

  // Find the recurring transaction
  const existingRecurringTransaction = await repositories.recurringTransactions.findById(recurringId);
  if (!existingRecurringTransaction) {
    throw new ApiError('Recurring transaction not found', 404);
  }

  // Ensure user owns this recurring transaction
  requireOwnership(existingRecurringTransaction.userId, user.id);

  // If account is being updated, verify it exists and user owns it
  if (data.template?.accountId) {
    const account = await repositories.accounts.findById(data.template.accountId);
    if (!account) {
      throw new ApiError('Account not found', 404);
    }
    requireOwnership(account.userId, user.id);
  }

  // If categories are being updated, verify they exist and user owns them
  if (data.template?.splits) {
    for (const split of data.template.splits) {
      if (split.categoryId) {
        const category = await repositories.categories.findById(split.categoryId);
        if (!category) {
          throw new ApiError(`Category ${split.categoryId} not found`, 404);
        }
        requireOwnership(category.userId, user.id);
      }
    }

    // Verify splits add up to transaction amount if both are provided
    const amountMinor = data.template.amountMinor || existingRecurringTransaction.template.amountMinor;
    const totalSplitAmount = data.template.splits.reduce((sum, split) => sum + split.amountMinor, 0);
    if (totalSplitAmount !== amountMinor) {
      throw new ApiError('Split amounts must equal transaction amount', 400);
    }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.template !== undefined) {
    updateData.template = {
      ...existingRecurringTransaction.template,
      ...data.template,
    };
  }

  if (data.schedule !== undefined) {
    updateData.schedule = data.schedule;
    // Note: nextRunAt will be recalculated by the repository
  }

  if (data.autoPost !== undefined) {
    updateData.autoPost = data.autoPost;
  }

  // Update the recurring transaction
  const updatedRecurringTransaction = await repositories.recurringTransactions.update(
    recurringId,
    updateData,
  );

  return successResponse(updatedRecurringTransaction);
});

// DELETE /api/recurring-transactions/[id] - Delete/deactivate recurring transaction
export const DELETE = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const recurringId = validateId(params.id, 'Recurring Transaction ID');

  // Find the recurring transaction
  const existingRecurringTransaction = await repositories.recurringTransactions.findById(recurringId);
  if (!existingRecurringTransaction) {
    throw new ApiError('Recurring transaction not found', 404);
  }

  // Ensure user owns this recurring transaction
  requireOwnership(existingRecurringTransaction.userId, user.id);

  // Check if there are any transactions created from this recurring transaction
  const allTransactions = await repositories.transactions.findAll();
  const hasRelatedTransactions = allTransactions.some(
    (t) => t.recurringTransactionId === recurringId,
  );

  if (hasRelatedTransactions) {
    // If there are related transactions, deactivate instead of delete
    await repositories.recurringTransactions.update(recurringId, {
      isActive: false,
      updatedAt: new Date(),
    });
  } else {
    // Safe to delete if no related transactions
    await repositories.recurringTransactions.delete(recurringId);
  }

  return noContentResponse();
});
