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
import { updateCategorySchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';

interface RouteContext {
  params: { id: string };
}

// GET /api/categories/[id] - Get specific category
export const GET = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const categoryId = validateId(params.id, 'Category ID');

  // Find the category
  const category = await repositories.categories.findById(categoryId);
  if (!category) {
    throw new ApiError('Category not found', 404);
  }

  // Ensure user owns this category
  requireOwnership(category.userId, user.id);

  return successResponse(category);
});

// PUT /api/categories/[id] - Update category
export const PUT = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const categoryId = validateId(params.id, 'Category ID');

  // Validate request body
  const data = await validateRequest(request, updateCategorySchema);

  // Find the category
  const existingCategory = await repositories.categories.findById(categoryId);
  if (!existingCategory) {
    throw new ApiError('Category not found', 404);
  }

  // Ensure user owns this category
  requireOwnership(existingCategory.userId, user.id);

  // Update the category
  const updatedCategory = await repositories.categories.update(categoryId, {
    ...data,
    updatedAt: new Date(),
  });

  return successResponse(updatedCategory);
});

// DELETE /api/categories/[id] - Delete category (soft delete by setting isActive = false)
export const DELETE = withErrorHandling(async (request: NextRequest, context?: RouteContext) => {
  if (!context) throw new ApiError('Route context is required', 500);
  const { params } = context;
  const user = await requireAuth();
  const categoryId = validateId(params.id, 'Category ID');

  // Find the category
  const existingCategory = await repositories.categories.findById(categoryId);
  if (!existingCategory) {
    throw new ApiError('Category not found', 404);
  }

  // Ensure user owns this category
  requireOwnership(existingCategory.userId, user.id);

  // Check if category has transactions or allocations (in a real implementation)
  // For now, we'll just perform a soft delete by setting isActive = false
  await repositories.categories.update(categoryId, {
    isActive: false,
    updatedAt: new Date(),
  });

  return noContentResponse();
});
