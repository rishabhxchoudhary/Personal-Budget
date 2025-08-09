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
import { createBudgetSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';

// GET /api/budgets - List user's budgets with optional filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { page, limit } = getPaginationParams(request);

  // Parse query parameters
  const status = getQueryParam(request, 'status');
  const year = getQueryParam(request, 'year');

  // Get user's budgets
  let budgets = await repositories.budgets.findByUserId(user.id);

  // Apply filters
  if (status) {
    budgets = budgets.filter((budget) => budget.status === status);
  }

  if (year) {
    budgets = budgets.filter((budget) => budget.month.startsWith(year));
  }

  // Sort by month descending (most recent first)
  budgets.sort((a, b) => b.month.localeCompare(a.month));

  // Apply pagination
  const total = budgets.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedBudgets = budgets.slice(startIndex, endIndex);

  return paginatedResponse(paginatedBudgets, page, limit, total);
});

// POST /api/budgets - Create new budget
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  // Validate request body
  const data = await validateRequest(request, createBudgetSchema);

  // Create budget with user ID
  const budgetInput = {
    ...data,
    userId: user.id,
  };

  const budget = await repositories.budgets.create(budgetInput);

  return createdResponse(budget);
});
