import { NextRequest } from 'next/server';
import {
  withErrorHandling,
  requireAuth,
  requireOwnership,
  validateRequest,
  paginatedResponse,
  createdResponse,
  getPaginationParams,
  validateId,
  ApiError,
} from '@/shared/api/utils';
import { createCategoryAllocationSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';

interface RouteContext {
  params: { id: string };
}

// GET /api/budgets/[id]/allocations - List allocations for a budget
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const budgetId = validateId(params.id, 'Budget ID');
  const { page, limit } = getPaginationParams(request);

  // Find the budget
  const budget = await repositories.budgets.findById(budgetId);
  if (!budget) {
    throw new ApiError('Budget not found', 404);
  }

  // Ensure user owns this budget
  requireOwnership(budget.userId, user.id);

  // Get allocations for this budget
  const allocations = await repositories.categoryAllocations.findByBudgetId(budgetId);

  // Get category details for each allocation
  const allocationsWithCategories = await Promise.all(
    allocations.map(async (allocation) => {
      const category = await repositories.categories.findById(allocation.categoryId);
      return {
        ...allocation,
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

  // Sort by category name
  allocationsWithCategories.sort((a, b) => {
    const nameA = a.category?.name || '';
    const nameB = b.category?.name || '';
    return nameA.localeCompare(nameB);
  });

  // Apply pagination
  const total = allocationsWithCategories.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedAllocations = allocationsWithCategories.slice(startIndex, endIndex);

  return paginatedResponse(paginatedAllocations, page, limit, total);
});

// POST /api/budgets/[id]/allocations - Create new allocation for a budget
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const budgetId = validateId(params.id, 'Budget ID');

  // Validate request body
  const data = await validateRequest(request, createCategoryAllocationSchema);

  // Ensure the budgetId in the URL matches the one in the body
  if (data.budgetId !== budgetId) {
    throw new ApiError('Budget ID mismatch between URL and request body', 400);
  }

  // Find the budget
  const budget = await repositories.budgets.findById(budgetId);
  if (!budget) {
    throw new ApiError('Budget not found', 404);
  }

  // Ensure user owns this budget
  requireOwnership(budget.userId, user.id);

  // Verify the category exists and user owns it
  const category = await repositories.categories.findById(data.categoryId);
  if (!category) {
    throw new ApiError('Category not found', 404);
  }
  requireOwnership(category.userId, user.id);

  // Check if allocation already exists for this category in this budget
  const existingAllocation = await repositories.categoryAllocations.findByBudgetIdAndCategoryId(
    budgetId,
    data.categoryId,
  );
  if (existingAllocation) {
    throw new ApiError('Allocation already exists for this category in this budget', 409);
  }

  // Calculate allocated amount based on type
  let allocatedMinor: number;
  if (data.allocationType === 'fixed') {
    allocatedMinor = data.allocationValue;
  } else if (data.allocationType === 'percentage') {
    if (data.allocationValue < 0 || data.allocationValue > 100) {
      throw new ApiError('Percentage allocation must be between 0 and 100', 400);
    }
    allocatedMinor = Math.round((budget.plannedIncomeMinor * data.allocationValue) / 100);
  } else {
    throw new ApiError('Invalid allocation type', 400);
  }

  // Create allocation
  const allocationInput = {
    budgetId: data.budgetId,
    categoryId: data.categoryId,
    allocationType: data.allocationType,
    allocationValue: data.allocationValue,
    allocatedMinor,
    spentMinor: 0,
    remainingMinor: allocatedMinor,
    rollover: data.rollover || false,
  };

  const allocation = await repositories.categoryAllocations.create(allocationInput);

  // Update budget's total allocated amount
  const allAllocations = await repositories.categoryAllocations.findByBudgetId(budgetId);
  const totalAllocated = allAllocations.reduce((sum, alloc) => sum + alloc.allocatedMinor, 0);

  await repositories.budgets.update(budgetId, {
    totalAllocatedMinor: totalAllocated,
    updatedAt: new Date(),
  });

  return createdResponse(allocation);
});
