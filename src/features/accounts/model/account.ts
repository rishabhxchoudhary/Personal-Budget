import { Account, ValidationError, AccountType } from '@/shared/types/common';
import { validateCurrency, validateNonEmptyString } from '@/shared/utils/validation';

export interface CreateAccountInput {
  accountId?: string;
  userId: string;
  name: string;
  type: AccountType;
  balanceMinor: number;
  currency: string;
  isActive?: boolean;
  institution?: string;
  lastFour?: string;
}

export interface AccountValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class AccountValidationError extends Error {
  constructor(public errors: ValidationError[]) {
    super('Account validation failed');
    this.name = 'AccountValidationError';
  }
}

export function createAccount(input: CreateAccountInput): Account {
  const now = new Date();

  return {
    accountId: input.accountId || generateAccountId(),
    userId: input.userId,
    name: input.name.trim(),
    type: input.type,
    balanceMinor: input.balanceMinor,
    currency: input.currency,
    isActive: input.isActive !== undefined ? input.isActive : true,
    institution: input.institution?.trim(),
    lastFour: input.lastFour,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateAccount(account: Account): AccountValidationResult {
  const errors: ValidationError[] = [];

  // Validate userId
  if (!validateNonEmptyString(account.userId)) {
    errors.push({
      field: 'userId',
      message: 'User ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate name
  if (!validateNonEmptyString(account.name)) {
    errors.push({
      field: 'name',
      message: 'Account name is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (account.name.length > 255) {
    errors.push({
      field: 'name',
      message: 'Account name must be less than 255 characters',
      code: 'NAME_TOO_LONG',
    });
  }

  // Validate account type
  const validTypes: AccountType[] = ['checking', 'savings', 'credit', 'cash'];
  if (!validTypes.includes(account.type)) {
    errors.push({
      field: 'type',
      message: 'Invalid account type',
      code: 'INVALID_ACCOUNT_TYPE',
    });
  }

  // Validate currency
  if (!validateCurrency(account.currency)) {
    errors.push({
      field: 'currency',
      message: 'Invalid currency code',
      code: 'INVALID_CURRENCY',
    });
  }

  // Validate balance is an integer
  if (!Number.isInteger(account.balanceMinor)) {
    errors.push({
      field: 'balanceMinor',
      message: 'Balance must be an integer (minor units)',
      code: 'INVALID_BALANCE',
    });
  }

  // Validate institution if provided
  if (account.institution !== undefined) {
    if (account.institution.length > 255) {
      errors.push({
        field: 'institution',
        message: 'Institution name must be less than 255 characters',
        code: 'INSTITUTION_TOO_LONG',
      });
    }
  }

  // Validate lastFour if provided
  if (account.lastFour !== undefined) {
    if (!/^\d{4}$/.test(account.lastFour)) {
      errors.push({
        field: 'lastFour',
        message: 'Last four must be exactly 4 digits',
        code: 'INVALID_LAST_FOUR',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function generateAccountId(): string {
  const random = Math.random().toString(36).substr(2, 9);
  return `account-${random}`;
}
