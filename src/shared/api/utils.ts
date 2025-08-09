import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { BusinessError } from '@/shared/types/common';
import { ZodSchema, ZodError } from 'zod';

// Common API response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication helper
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError('Authentication required', 401);
  }
  return session.user;
}

// Authorization helper - ensures user can only access their own data
export function requireOwnership(resourceUserId: string, authenticatedUserId: string) {
  if (resourceUserId !== authenticatedUserId) {
    throw new ApiError('Access denied', 403);
  }
}

// Request validation helper
export async function validateRequest<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new ApiError(`Validation error: ${errorMessage}`, 400);
    }
    throw new ApiError('Invalid request body', 400);
  }
}

// Query parameter helpers
export function getQueryParam(
  request: NextRequest,
  key: string,
  defaultValue?: string,
): string | undefined {
  return request.nextUrl.searchParams.get(key) || defaultValue;
}

export function getRequiredQueryParam(request: NextRequest, key: string): string {
  const value = request.nextUrl.searchParams.get(key);
  if (!value) {
    throw new ApiError(`Missing required query parameter: ${key}`, 400);
  }
  return value;
}

export function getPaginationParams(request: NextRequest) {
  const page = Math.max(1, parseInt(getQueryParam(request, 'page', '1') || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(getQueryParam(request, 'limit', '10') || '10', 10)),
  );
  return { page, limit };
}

// Custom API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error handler wrapper
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }

  if (error instanceof BusinessError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: 400 },
    );
  }

  if (error instanceof ZodError) {
    const errorMessage = error.issues
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    return NextResponse.json({ error: `Validation error: ${errorMessage}` }, { status: 400 });
  }

  // Generic error
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

// Success response helpers
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  status: number = 200,
): NextResponse {
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json(
    {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    },
    { status },
  );
}

export function createdResponse<T>(data: T): NextResponse {
  return successResponse(data, 201);
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// Route handler wrapper that catches errors
export function withErrorHandling<T = unknown>(
  handler: (request: NextRequest, context?: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Common ID validation
export function validateId(id: string, name: string = 'ID'): string {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new ApiError(`${name} is required`, 400);
  }
  return id.trim();
}
