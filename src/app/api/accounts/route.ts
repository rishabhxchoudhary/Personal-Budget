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
import { createAccountSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';

// GET /api/accounts - List user's accounts with optional filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();
  const { page, limit } = getPaginationParams(request);

  // Parse query parameters
  const type = getQueryParam(request, 'type');
  const isActiveParam = getQueryParam(request, 'isActive');
  const isActive = isActiveParam ? isActiveParam === 'true' : undefined;

  // Get user's accounts
  let accounts = await repositories.accounts.findByUserId(user.id);

  // Apply filters
  if (type) {
    accounts = accounts.filter((account) => account.type === type);
  }

  if (isActive !== undefined) {
    accounts = accounts.filter((account) => account.isActive === isActive);
  }

  // Sort by name
  accounts.sort((a, b) => a.name.localeCompare(b.name));

  // Apply pagination
  const total = accounts.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedAccounts = accounts.slice(startIndex, endIndex);

  return paginatedResponse(paginatedAccounts, page, limit, total);
});

// POST /api/accounts - Create new account
export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await requireAuth();

  // Validate request body
  const data = await validateRequest(request, createAccountSchema);

  // Create account with user ID
  const accountInput = {
    ...data,
    userId: user.id,
  };

  const account = await repositories.accounts.create(accountInput);

  return createdResponse(account);
});
