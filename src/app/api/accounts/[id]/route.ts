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
import { updateAccountSchema } from '@/shared/api/schemas';
import { repositories } from '@/shared/repositories/container';

interface RouteContext {
  params: { id: string };
}

// GET /api/accounts/[id] - Get specific account
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const accountId = validateId(params.id, 'Account ID');

  // Find the account
  const account = await repositories.accounts.findById(accountId);
  if (!account) {
    throw new ApiError('Account not found', 404);
  }

  // Ensure user owns this account
  requireOwnership(account.userId, user.id);

  return successResponse(account);
});

// PUT /api/accounts/[id] - Update account
export const PUT = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const accountId = validateId(params.id, 'Account ID');

  // Validate request body
  const data = await validateRequest(request, updateAccountSchema);

  // Find the account
  const existingAccount = await repositories.accounts.findById(accountId);
  if (!existingAccount) {
    throw new ApiError('Account not found', 404);
  }

  // Ensure user owns this account
  requireOwnership(existingAccount.userId, user.id);

  // Update the account
  const updatedAccount = await repositories.accounts.update(accountId, {
    ...data,
    updatedAt: new Date()
  });

  return successResponse(updatedAccount);
});

// DELETE /api/accounts/[id] - Delete account (soft delete by setting isActive = false)
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteContext) => {
  const user = await requireAuth();
  const accountId = validateId(params.id, 'Account ID');

  // Find the account
  const existingAccount = await repositories.accounts.findById(accountId);
  if (!existingAccount) {
    throw new ApiError('Account not found', 404);
  }

  // Ensure user owns this account
  requireOwnership(existingAccount.userId, user.id);

  // Check if account has transactions (in a real implementation, you'd check this)
  // For now, we'll just perform a soft delete by setting isActive = false
  await repositories.accounts.update(accountId, {
    isActive: false,
    updatedAt: new Date()
  });

  return noContentResponse();
});
