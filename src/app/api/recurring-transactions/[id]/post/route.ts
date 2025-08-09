import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
  requireOwnership,
  validateRequest,
  createdResponse,
  validateId,
  ApiError,
} from '@/shared/api/utils';
import { postRecurringTransactionSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';
import { v4 as uuidv4 } from 'uuid';

interface RouteContext {
  params: { id: string };
}

// POST /api/recurring-transactions/[id]/post - Post a recurring transaction as a real transaction
export const POST = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const recurringId = validateId(params.id, 'Recurring Transaction ID');

  // Validate request body (optional overrides)
  const data = await validateRequest(request, postRecurringTransactionSchema);

  // Find the recurring transaction
  const recurringTransaction = await repositories.recurringTransactions.findById(recurringId);
  if (!recurringTransaction) {
    throw new ApiError('Recurring transaction not found', 404);
  }

  // Ensure user owns this recurring transaction
  requireOwnership(recurringTransaction.userId, user.id);

  // Check if recurring transaction is active
  if (!recurringTransaction.isActive) {
    throw new ApiError('Recurring transaction is not active', 400);
  }

  // Create transaction from template with any overrides
  const template = recurringTransaction.template;
  const transactionData = {
    userId: user.id,
    accountId: template.accountId,
    date: data.date ? new Date(data.date) : new Date(),
    amountMinor: data.amountMinor || template.amountMinor,
    type: template.type,
    status: 'pending' as const,
    counterparty: data.counterparty || template.counterparty,
    description: data.description || template.description,
    splits: template.splits.map((split) => ({
      splitId: uuidv4(),
      categoryId: split.categoryId || '',
      amountMinor: split.amountMinor,
      note: split.note,
    })),
    recurringTransactionId: recurringTransaction.recurringId,
  };

  // If amount was overridden, adjust the splits proportionally
  if (data.amountMinor && data.amountMinor !== template.amountMinor) {
    const ratio = data.amountMinor / template.amountMinor;
    transactionData.splits = template.splits.map((split) => ({
      splitId: uuidv4(),
      categoryId: split.categoryId || '',
      amountMinor: Math.round(split.amountMinor * ratio),
      note: split.note,
    }));
  }

  // Validate that account exists and user owns it
  const account = await repositories.accounts.findById(transactionData.accountId);
  if (!account) {
    throw new ApiError('Account not found', 404);
  }
  requireOwnership(account.userId, user.id);

  // Validate that all categories exist and user owns them
  for (const split of transactionData.splits) {
    if (split.categoryId) {
      const category = await repositories.categories.findById(split.categoryId);
      if (!category) {
        throw new ApiError(`Category ${split.categoryId} not found`, 404);
      }
      requireOwnership(category.userId, user.id);
    }
  }

  // Create the transaction
  const transaction = await repositories.transactions.create(transactionData);

  // Update the recurring transaction's last run and next run dates
  const now = new Date();
  const nextRunAt = new Date(recurringTransaction.nextRunAt);

  // Calculate next run date based on schedule
  if (recurringTransaction.schedule.includes('FREQ=DAILY')) {
    nextRunAt.setDate(nextRunAt.getDate() + 1);
  } else if (recurringTransaction.schedule.includes('FREQ=WEEKLY')) {
    nextRunAt.setDate(nextRunAt.getDate() + 7);
  } else if (recurringTransaction.schedule.includes('FREQ=MONTHLY')) {
    if (recurringTransaction.schedule.includes('BYMONTHDAY=')) {
      // Extract the day of month
      const dayMatch = recurringTransaction.schedule.match(/BYMONTHDAY=(\d+)/);
      if (dayMatch) {
        const dayOfMonth = parseInt(dayMatch[1], 10);
        nextRunAt.setMonth(nextRunAt.getMonth() + 1);
        nextRunAt.setDate(dayOfMonth);
      } else {
        nextRunAt.setMonth(nextRunAt.getMonth() + 1);
      }
    } else {
      nextRunAt.setMonth(nextRunAt.getMonth() + 1);
    }
  } else if (recurringTransaction.schedule.includes('FREQ=YEARLY')) {
    nextRunAt.setFullYear(nextRunAt.getFullYear() + 1);
  } else {
    // Default to daily if we can't parse
    nextRunAt.setDate(nextRunAt.getDate() + 1);
  }

  // Update recurring transaction
  await repositories.recurringTransactions.update(recurringId, {
    lastRunAt: now,
    nextRunAt,
    updatedAt: now,
  });

  return createdResponse({
    transaction,
    recurringTransaction: {
      ...recurringTransaction,
      lastRunAt: now,
      nextRunAt,
      updatedAt: now,
    },
  });
});
