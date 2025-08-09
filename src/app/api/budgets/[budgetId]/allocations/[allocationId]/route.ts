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
import { updateCategoryAllocationSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';

interface RouteContext {
  params: { budgetId: string; allocationId: string };
}

// GET /api/budgets/[budgetId]/allocations/[allocationId] - Get specific allocation
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const budgetId = validateId(params.budgetId, 'Budget ID');
  const allocationId = validateId(params.allocationId, 'Allocation ID');

  // Find the budget
  const budget = await repositories.budgets.findById(budgetId);
  if (!budget) {
    throw new ApiError('Budget not found', 404);
  }

  // Ensure user owns this budget
  requireOwnership(budget.userId, user.id);

  // Find the allocation
  const allocation = await repositories.categoryAllocations.findById(allocationId);
  if (!allocation) {
    throw new ApiError('Allocation not found', 404);
  }

  // Ensure allocation belongs to the budget
  if (allocation.budgetId !== budgetId) {
    throw new ApiError('Allocation does not belong to this budget', 400);
  }

  // Get category details
  const category = await repositories.categories.findById(allocation.categoryId);

  return successResponse({
    ...allocation,
    category: category ? {
      categoryId: category.categoryId,
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color
    } : null
  });
});

// PUT /api/budgets/[budgetId]/allocations/[allocationId] - Update allocation
export const PUT = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const budgetId = validateId(params.budgetId, 'Budget ID');
  const allocationId = validateId(params.allocationId, 'Allocation ID');

  // Validate request body
  const data = await validateRequest(request, updateCategoryAllocationSchema);

  // Find the budget
  const budget = await repositories.budgets.findById(budgetId);
  if (!budget) {
    throw new ApiError('Budget not found', 404);
  }

  // Ensure user owns this budget
  requireOwnership(budget.userId, user.id);

  // Find the allocation
  const existingAllocation = await repositories.categoryAllocations.findById(allocationId);
  if (!existingAllocation) {
    throw new ApiError('Allocation not found', 404);
  }

  // Ensure allocation belongs to the budget
  if (existingAllocation.budgetId !== budgetId) {
    throw new ApiError('Allocation does not belong to this budget', 400);
  }

  // Calculate new allocated amount if allocation type or value changed
  let allocatedMinor = existingAllocation.allocatedMinor;

  if (data.allocationType || data.allocationValue !== undefined) {
    const allocationType = data.allocationType || existingAllocation.allocationType;
    const allocationValue = data.allocationValue !== undefined ? data.allocationValue : existingAllocation.allocationValue;

    if (allocationType === 'fixed') {
      allocatedMinor = allocationValue;
    } else if (allocationType === 'percentage') {
      if (allocationValue < 0 || allocationValue > 100) {
        throw new ApiError('Percentage allocation must be between 0 and 100', 400);
      }
      allocatedMinor = Math.round((budget.plannedIncomeMinor * allocationValue) / 100);
    }
  }

  // Calculate remaining amount
  const remainingMinor = allocatedMinor - existingAllocation.spentMinor;

  // Update the allocation
  const updatedAllocation = await repositories.categoryAllocations.update(allocationId, {
    ...data,
    allocatedMinor,
    remainingMinor,
    updatedAt: new Date()
  });

  // Update budget's total allocated amount
  const allAllocations = await repositories.categoryAllocations.findByBudgetId(budgetId);
  const totalAllocated = allAllocations.reduce((sum, alloc) => sum + alloc.allocatedMinor, 0);

  await repositories.budgets.update(budgetId, {
    totalAllocatedMinor: totalAllocated,
    updatedAt: new Date()
  });

  return successResponse(updatedAllocation);
});

// DELETE /api/budgets/[budgetId]/allocations/[allocationId] - Delete allocation
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const budgetId = validateId(params.budgetId, 'Budget ID');
  const allocationId = validateId(params.allocationId, 'Allocation ID');

  // Find the budget
  const budget = await repositories.budgets.findById(budgetId);
  if (!budget) {
    throw new ApiError('Budget not found', 404);
  }

  // Ensure user owns this budget
  requireOwnership(budget.userId, user.id);

  // Find the allocation
  const existingAllocation = await repositories.categoryAllocations.findById(allocationId);
  if (!existingAllocation) {
    throw new ApiError('Allocation not found', 404);
  }

  // Ensure allocation belongs to the budget
  if (existingAllocation.budgetId !== budgetId) {
    throw new ApiError('Allocation does not belong to this budget', 400);
  }

  // Check if allocation has been used (has spent amount)
  if (existingAllocation.spentMinor > 0) {
    throw new ApiError('Cannot delete allocation that has spent amount. Set allocation to 0 instead.', 400);
  }

  // Delete the allocation
  await repositories.categoryAllocations.delete(allocationId);

  // Update budget's total allocated amount
  const allAllocations = await repositories.categoryAllocations.findByBudgetId(budgetId);
  const totalAllocated = allAllocations.reduce((sum, alloc) => sum + alloc.allocatedMinor, 0);

  await repositories.budgets.update(budgetId, {
    totalAllocatedMinor: totalAllocated,
    updatedAt: new Date()
  });

  return noContentResponse();
});
