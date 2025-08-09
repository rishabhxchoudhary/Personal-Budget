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
import { createTransactionSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';

// GET /api/transactions - List user's transactions with optional filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { page, limit } = getPaginationParams(request);

  // Parse query parameters
  const type = getQueryParam(request, 'type');
  const accountId = getQueryParam(request, 'accountId');
  const categoryId = getQueryParam(request, 'categoryId');
  const status = getQueryParam(request, 'status');
  const startDate = getQueryParam(request, 'startDate');
  const endDate = getQueryParam(request, 'endDate');

  // Get user's transactions
  let transactions = await repositories.transactions.findByUserId(user.id);

  // Apply filters
  if (type) {
    transactions = transactions.filter((transaction) => transaction.type === type);
  }

  if (accountId) {
    transactions = transactions.filter((transaction) => transaction.accountId === accountId);
  }

  if (status) {
    transactions = transactions.filter((transaction) => transaction.status === status);
  }

  if (categoryId) {
    // Filter by category in splits
    transactions = transactions.filter((transaction) =>
      transaction.splits.some((split) => split.categoryId === categoryId),
    );
  }

  if (startDate) {
    const start = new Date(startDate);
    transactions = transactions.filter((transaction) => new Date(transaction.date) >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    transactions = transactions.filter((transaction) => new Date(transaction.date) <= end);
  }

  // Sort by date descending (newest first)
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Get account and category details for each transaction
  const transactionsWithDetails = await Promise.all(
    transactions.map(async (transaction) => {
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

      return {
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
      };
    }),
  );

  // Apply pagination
  const total = transactionsWithDetails.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTransactions = transactionsWithDetails.slice(startIndex, endIndex);

  return paginatedResponse(paginatedTransactions, page, limit, total);
});

// POST /api/transactions - Create new transaction
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  // Validate request body
  const data = await validateRequest(request, createTransactionSchema);

  // Verify the account exists and user owns it
  const account = await repositories.accounts.findById(data.accountId);
  if (!account) {
    throw new ApiError('Account not found', 404);
  }
  requireOwnership(account.userId, user.id);

  // Verify all categories exist and user owns them if splits provided
  if (data.splits && data.splits.length > 0) {
    for (const split of data.splits) {
      const category = await repositories.categories.findById(split.categoryId);
      if (!category) {
        throw new ApiError(`Category ${split.categoryId} not found`, 404);
      }
      requireOwnership(category.userId, user.id);
    }

    // Verify splits add up to transaction amount
    const totalSplitAmount = data.splits.reduce((sum, split) => sum + split.amountMinor, 0);
    if (totalSplitAmount !== data.amountMinor) {
      throw new ApiError('Split amounts must equal transaction amount', 400);
    }
  }

  // Create transaction with user ID and proper splits
  const transactionInput = {
    userId: user.id,
    accountId: data.accountId,
    date: new Date(data.date),
    amountMinor: data.amountMinor,
    type: data.type,
    status: data.status || 'pending',
    counterparty: data.counterparty,
    description: data.description,
    splits: data.splits || [],
    recurringTransactionId: data.recurringTransactionId,
  };

  const transaction = await repositories.transactions.create(transactionInput);

  return createdResponse(transaction);
});
