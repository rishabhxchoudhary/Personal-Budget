import { User, ValidationError } from '@/shared/types/common';
import { validateEmail, validateCurrency, validateMonthStartDay, validateNonEmptyString } from '@/shared/utils/validation';

export interface CreateUserInput {
  userId?: string;
  email: string;
  name: string;
  defaultCurrency?: string;
  monthStartDay?: number;
}

export interface UserValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class UserValidationError extends Error {
  constructor(public errors: ValidationError[]) {
    super('User validation failed');
    this.name = 'UserValidationError';
  }
}

export function createUser(input: CreateUserInput): User {
  const now = new Date();

  return {
    userId: input.userId || generateUserId(),
    email: input.email.toLowerCase().trim(),
    name: input.name.trim(),
    defaultCurrency: input.defaultCurrency || 'USD',
    monthStartDay: input.monthStartDay || 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateUser(user: User): UserValidationResult {
  const errors: ValidationError[] = [];

  // Validate email
  if (!user.email) {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (user.email.length > 255) {
    errors.push({
      field: 'email',
      message: 'Email must be less than 255 characters',
      code: 'EMAIL_TOO_LONG',
    });
  } else if (!validateEmail(user.email)) {
    errors.push({
      field: 'email',
      message: 'Invalid email address',
      code: 'INVALID_EMAIL',
    });
  }

  // Validate name
  if (!validateNonEmptyString(user.name)) {
    errors.push({
      field: 'name',
      message: 'Name is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (user.name.length > 255) {
    errors.push({
      field: 'name',
      message: 'Name must be less than 255 characters',
      code: 'NAME_TOO_LONG',
    });
  }

  // Validate currency
  if (!validateCurrency(user.defaultCurrency)) {
    errors.push({
      field: 'defaultCurrency',
      message: 'Invalid currency code',
      code: 'INVALID_CURRENCY',
    });
  }

  // Validate month start day
  if (!validateMonthStartDay(user.monthStartDay)) {
    errors.push({
      field: 'monthStartDay',
      message: 'Month start day must be between 1 and 31',
      code: 'INVALID_MONTH_START_DAY',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function generateUserId(): string {
  const random = Math.random().toString(36).substr(2, 9);
  return `user-${random}`;
}
