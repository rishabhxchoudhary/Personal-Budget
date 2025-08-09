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
import { createCategorySchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';

// GET /api/categories - List user's categories with optional filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { page, limit } = getPaginationParams(request);

  // Parse query parameters
  const type = getQueryParam(request, 'type');
  const isActiveParam = getQueryParam(request, 'isActive');
  const isActive = isActiveParam ? isActiveParam === 'true' : undefined;

  // Get user's categories
  let categories = await repositories.categories.findByUserId(user.id);

  // Apply filters
  if (type) {
    categories = categories.filter((category) => category.type === type);
  }

  if (isActive !== undefined) {
    categories = categories.filter((category) => category.isActive === isActive);
  }

  // Sort by sortOrder, then by name
  categories.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.name.localeCompare(b.name);
  });

  // Apply pagination
  const total = categories.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedCategories = categories.slice(startIndex, endIndex);

  return paginatedResponse(paginatedCategories, page, limit, total);
});

// POST /api/categories - Create new category
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  // Validate request body
  const data = await validateRequest(request, createCategorySchema);

  // Create category with user ID
  const categoryInput = {
    ...data,
    userId: user.id,
  };

  const category = await repositories.categories.create(categoryInput);

  return createdResponse(category);
});
