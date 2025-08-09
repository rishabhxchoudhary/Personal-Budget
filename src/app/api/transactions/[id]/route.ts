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
import { updateTransactionSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';
import { Transaction, TransactionSplit } from '@/shared/types/common';
import { v4 as uuidv4 } from 'uuid';

interface RouteContext {
  params: { id: string };
}

// GET /api/transactions/[id] - Get specific transaction
export const GET = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const transactionId = validateId(params.id, 'Transaction ID');

  // Find the transaction
  const transaction = await repositories.transactions.findById(transactionId);
  if (!transaction) {
    throw new ApiError('Transaction not found', 404);
  }

  // Ensure user owns this transaction
  requireOwnership(transaction.userId, user.id);

  // Get account details
  const account = await repositories.accounts.findById(transaction.accountId);

  // Get category details for each split
  const splitsWithCategories = await Promise.all(
    transaction.splits.map(async (split) => {
      const category = await repositories.categories.findById(split.categoryId);
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

  return successResponse({
    ...transaction,
    account: account
      ? {
          accountId: account.accountId,
          name: account.name,
          type: account.type,
          currency: account.currency,
        }
      : null,
    splits: splitsWithCategories,
  });
});

// PUT /api/transactions/[id] - Update transaction
export const PUT = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const transactionId = validateId(params.id, 'Transaction ID');

  // Validate request body
  const data = await validateRequest(request, updateTransactionSchema);

  // Find the transaction
  const existingTransaction = await repositories.transactions.findById(transactionId);
  if (!existingTransaction) {
    throw new ApiError('Transaction not found', 404);
  }

  // Ensure user owns this transaction
  requireOwnership(existingTransaction.userId, user.id);

  // If account is being changed, verify the new account exists and user owns it
  if (data.accountId && data.accountId !== existingTransaction.accountId) {
    const account = await repositories.accounts.findById(data.accountId);
    if (!account) {
      throw new ApiError('Account not found', 404);
    }
    requireOwnership(account.userId, user.id);
  }

  // If splits are being updated, verify all categories exist and user owns them
  if (data.splits && Array.isArray(data.splits) && data.splits.length > 0) {
    for (const split of data.splits) {
      const category = await repositories.categories.findById(split.categoryId);
      if (!category) {
        throw new ApiError(`Category ${split.categoryId} not found`, 404);
      }
      requireOwnership(category.userId, user.id);
    }

    // Verify splits add up to transaction amount
    const amountToCheck = data.amountMinor || existingTransaction.amountMinor;
    const totalSplitAmount = data.splits.reduce((sum: number, split) => sum + split.amountMinor, 0);
    if (totalSplitAmount !== amountToCheck) {
      throw new ApiError('Split amounts must equal transaction amount', 400);
    }
  }

  // Update the transaction
  // Create updateData with proper type conversion
  const { date: dateString, splits: apiSplits, ...restData } = data;

  // Transform splits if provided (add splitIds)
  let transformedSplits: TransactionSplit[] | undefined;
  if (apiSplits) {
    transformedSplits = apiSplits.map((split) => ({
      ...split,
      splitId: uuidv4(),
    }));
  }

  const updateData: Partial<Transaction> & { updatedAt: Date } = {
    ...restData,
    updatedAt: new Date(),
    // Convert date string to Date object if provided
    ...(dateString && { date: new Date(dateString) }),
    // Add transformed splits if provided
    ...(transformedSplits && { splits: transformedSplits }),
  };

  const updatedTransaction = await repositories.transactions.update(transactionId, updateData);

  return successResponse(updatedTransaction);
});

// DELETE /api/transactions/[id] - Delete transaction
export const DELETE = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const transactionId = validateId(params.id, 'Transaction ID');

  // Find the transaction
  const existingTransaction = await repositories.transactions.findById(transactionId);
  if (!existingTransaction) {
    throw new ApiError('Transaction not found', 404);
  }

  // Ensure user owns this transaction
  requireOwnership(existingTransaction.userId, user.id);

  // Check if transaction is reconciled - prevent deletion of reconciled transactions
  if (existingTransaction.status === 'reconciled') {
    throw new ApiError('Cannot delete reconciled transaction', 400);
  }

  // Check if transaction has debt shares (would need to handle those first)
  // For now, we'll just delete the transaction
  await repositories.transactions.delete(transactionId);

  return noContentResponse();
});
