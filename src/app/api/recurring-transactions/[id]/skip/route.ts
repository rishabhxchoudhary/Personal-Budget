import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
  requireOwnership,
  successResponse,
  validateId,
  ApiError,
} from '@/shared/api/utils';
import { repositories } from '@/shared/repositories/container';

interface RouteContext {
  params: { id: string };
}

// POST /api/recurring-transactions/[id]/skip - Skip the next occurrence of a recurring transaction
export const POST = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
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

  // Check if recurring transaction is active
  if (!recurringTransaction.isActive) {
    throw new ApiError('Recurring transaction is not active', 400);
  }

  // Calculate next run date from current next run date
  const nextRunAt = new Date(recurringTransaction.nextRunAt);

  // Calculate next occurrence based on schedule
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

  // Update the recurring transaction with new next run date
  const updatedRecurringTransaction = await repositories.recurringTransactions.update(recurringId, {
    nextRunAt,
    updatedAt: new Date(),
  });

  return successResponse({
    recurringTransaction: updatedRecurringTransaction,
    message: 'Recurring transaction skipped successfully',
    skippedDate: recurringTransaction.nextRunAt,
    nextDueDate: nextRunAt,
  });
});
