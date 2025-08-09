import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
  requireOwnership,
  validateRequest,
  successResponse,
  noContentResponse,
  validateId,
  ApiError
} from '@/shared/api/utils';
import { updateBudgetSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';

interface RouteContext {
  params: { id: string };
}

// GET /api/budgets/[id] - Get specific budget with allocations
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const budgetId = validateId(params.id, 'Budget ID');

  // Find the budget
  const budget = await repositories.budgets.findById(budgetId);
  if (!budget) {
    throw new ApiError('Budget not found', 404);
  }

  // Ensure user owns this budget
  requireOwnership(budget.userId, user.id);

  // Get allocations for this budget
  const allocations = await repositories.categoryAllocations.findByBudgetId(budgetId);

  // Return budget with allocations
  return successResponse({
    ...budget,
    allocations
  });
});

// PUT /api/budgets/[id] - Update budget
export const PUT = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const budgetId = validateId(params.id, 'Budget ID');

  // Validate request body
  const data = await validateRequest(request, updateBudgetSchema);

  // Find the budget
  const existingBudget = await repositories.budgets.findById(budgetId);
  if (!existingBudget) {
    throw new ApiError('Budget not found', 404);
  }

  // Ensure user owns this budget
  requireOwnership(existingBudget.userId, user.id);

  // Update the budget
  const updatedBudget = await repositories.budgets.update(budgetId, {
    ...data,
    updatedAt: new Date()
  });

  return successResponse(updatedBudget);
});

// DELETE /api/budgets/[id] - Delete budget
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const budgetId = validateId(params.id, 'Budget ID');

  // Find the budget
  const existingBudget = await repositories.budgets.findById(budgetId);
  if (!existingBudget) {
    throw new ApiError('Budget not found', 404);
  }

  // Ensure user owns this budget
  requireOwnership(existingBudget.userId, user.id);

  // Check if budget is closed - only allow deletion of draft budgets
  if (existingBudget.status === 'active') {
    throw new ApiError('Cannot delete active budget. Close it first.', 400);
  }

  // Delete all allocations for this budget first
  const allocations = await repositories.categoryAllocations.findByBudgetId(budgetId);
  for (const allocation of allocations) {
    await repositories.categoryAllocations.delete(allocation.allocationId);
  }

  // Delete the budget
  await repositories.budgets.delete(budgetId);

  return noContentResponse();
});
