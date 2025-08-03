import { createAccount, validateAccount, AccountValidationError } from './account';
import { Account, AccountType } from '@/shared/types/common';

describe('Account Model', () => {
  describe('createAccount', () => {
    it('should create a valid account with all required fields', () => {
      const input = {
        accountId: 'account-123',
        userId: 'user-123',
        name: 'Test Checking',
        type: 'checking' as const,
        balanceMinor: 100000,
        currency: 'USD',
        isActive: true,
        institution: 'Test Bank',
        lastFour: '1234',
      };

      const account = createAccount(input);

      expect(account.accountId).toBe('account-123');
      expect(account.userId).toBe('user-123');
      expect(account.name).toBe('Test Checking');
      expect(account.type).toBe('checking');
      expect(account.balanceMinor).toBe(100000);
      expect(account.currency).toBe('USD');
      expect(account.isActive).toBe(true);
      expect(account.institution).toBe('Test Bank');
      expect(account.lastFour).toBe('1234');
      expect(account.createdAt).toBeInstanceOf(Date);
      expect(account.updatedAt).toBeInstanceOf(Date);
      expect(account.createdAt).toEqual(account.updatedAt);
    });

    it('should generate accountId if not provided', () => {
      const input = {
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking' as const,
        balanceMinor: 0,
        currency: 'USD',
      };

      const account = createAccount(input);

      expect(account.accountId).toBeDefined();
      expect(account.accountId).toMatch(/^account-[a-z0-9]+$/);
    });

    it('should use default values for optional fields', () => {
      const input = {
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking' as const,
        balanceMinor: 0,
        currency: 'USD',
      };

      const account = createAccount(input);

      expect(account.isActive).toBe(true);
      expect(account.institution).toBeUndefined();
      expect(account.lastFour).toBeUndefined();
    });

    it('should trim whitespace from name', () => {
      const input = {
        userId: 'user-123',
        name: '  Test Account  ',
        type: 'checking' as const,
        balanceMinor: 0,
        currency: 'USD',
      };

      const account = createAccount(input);

      expect(account.name).toBe('Test Account');
    });

    it('should trim whitespace from institution', () => {
      const input = {
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking' as const,
        balanceMinor: 0,
        currency: 'USD',
        institution: '  Test Bank  ',
      };

      const account = createAccount(input);

      expect(account.institution).toBe('Test Bank');
    });

    it('should accept all valid account types', () => {
      const types = ['checking', 'savings', 'credit', 'cash'] as const;

      types.forEach((type) => {
        const account = createAccount({
          userId: 'user-123',
          name: `Test ${type}`,
          type,
          balanceMinor: 0,
          currency: 'USD',
        });

        expect(account.type).toBe(type);
      });
    });

    it('should accept negative balance for credit accounts', () => {
      const account = createAccount({
        userId: 'user-123',
        name: 'Credit Card',
        type: 'credit',
        balanceMinor: -50000,
        currency: 'USD',
      });

      expect(account.balanceMinor).toBe(-50000);
    });

    it('should accept zero balance', () => {
      const account = createAccount({
        userId: 'user-123',
        name: 'New Account',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
      });

      expect(account.balanceMinor).toBe(0);
    });

    it('should set isActive to false when specified', () => {
      const account = createAccount({
        userId: 'user-123',
        name: 'Closed Account',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
        isActive: false,
      });

      expect(account.isActive).toBe(false);
    });
  });

  describe('validateAccount', () => {
    it('should validate a valid account', () => {
      const account: Account = {
        accountId: 'account-123',
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateAccount(account);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty name', () => {
      const account: Account = {
        accountId: 'account-123',
        userId: 'user-123',
        name: '',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateAccount(account);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Account name is required',
        code: 'REQUIRED_FIELD',
      });
    });

    it('should reject name that is too long', () => {
      const account: Account = {
        accountId: 'account-123',
        userId: 'user-123',
        name: 'a'.repeat(256),
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateAccount(account);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Account name must be less than 255 characters',
        code: 'NAME_TOO_LONG',
      });
    });

    it('should reject invalid account type', () => {
      const account: Account = {
        accountId: 'account-123',
        userId: 'user-123',
        name: 'Test Account',
        type: 'invalid' as AccountType,
        balanceMinor: 0,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateAccount(account);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'type',
        message: 'Invalid account type',
        code: 'INVALID_ACCOUNT_TYPE',
      });
    });

    it('should reject invalid currency', () => {
      const account: Account = {
        accountId: 'account-123',
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 0,
        currency: 'INVALID',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateAccount(account);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'currency',
        message: 'Invalid currency code',
        code: 'INVALID_CURRENCY',
      });
    });

    it('should reject non-integer balance', () => {
      const account: Account = {
        accountId: 'account-123',
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 100.5,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateAccount(account);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'balanceMinor',
        message: 'Balance must be an integer (minor units)',
        code: 'INVALID_BALANCE',
      });
    });

    it('should reject empty userId', () => {
      const account: Account = {
        accountId: 'account-123',
        userId: '',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateAccount(account);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID is required',
        code: 'REQUIRED_FIELD',
      });
    });

    it('should reject institution that is too long', () => {
      const account: Account = {
        accountId: 'account-123',
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
        isActive: true,
        institution: 'a'.repeat(256),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateAccount(account);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'institution',
        message: 'Institution name must be less than 255 characters',
        code: 'INSTITUTION_TOO_LONG',
      });
    });

    it('should reject invalid lastFour', () => {
      const invalidLastFours = ['123', '12345', 'abcd', '12 34', ''];

      invalidLastFours.forEach((lastFour) => {
        const account: Account = {
          accountId: 'account-123',
          userId: 'user-123',
          name: 'Test Account',
          type: 'checking',
          balanceMinor: 0,
          currency: 'USD',
          isActive: true,
          lastFour,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = validateAccount(account);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lastFour',
          message: 'Last four must be exactly 4 digits',
          code: 'INVALID_LAST_FOUR',
        });
      });
    });

    it('should accept valid lastFour', () => {
      const account: Account = {
        accountId: 'account-123',
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
        isActive: true,
        lastFour: '1234',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateAccount(account);

      expect(result.isValid).toBe(true);
    });

    it('should collect multiple validation errors', () => {
      const account: Account = {
        accountId: 'account-123',
        userId: '',
        name: '',
        type: 'invalid' as AccountType,
        balanceMinor: 100.5,
        currency: 'INVALID',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateAccount(account);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(5);
      expect(result.errors.map((e) => e.field)).toEqual(
        expect.arrayContaining(['userId', 'name', 'type', 'balanceMinor', 'currency']),
      );
    });
  });

  describe('AccountValidationError', () => {
    it('should create error with validation details', () => {
      const errors = [
        { field: 'name', message: 'Name required', code: 'REQUIRED_FIELD' },
        { field: 'type', message: 'Invalid type', code: 'INVALID_ACCOUNT_TYPE' },
      ];

      const error = new AccountValidationError(errors);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Account validation failed');
      expect(error.errors).toEqual(errors);
      expect(error.name).toBe('AccountValidationError');
    });
  });
});
