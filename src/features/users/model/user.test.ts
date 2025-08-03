import { createUser, validateUser, UserValidationError } from './user';
import { User } from '@/shared/types/common';

describe('User Model', () => {
  describe('createUser', () => {
    it('should create a valid user with all required fields', () => {
      const input = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
      };

      const user = createUser(input);

      expect(user.userId).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.defaultCurrency).toBe('USD');
      expect(user.monthStartDay).toBe(1);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.createdAt).toEqual(user.updatedAt);
    });

    it('should generate userId if not provided', () => {
      const input = {
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
      };

      const user = createUser(input);

      expect(user.userId).toBeDefined();
      expect(user.userId).toMatch(/^user-[a-z0-9]+$/);
    });

    it('should use default values for optional fields', () => {
      const input = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const user = createUser(input);

      expect(user.defaultCurrency).toBe('USD');
      expect(user.monthStartDay).toBe(1);
    });

    it('should normalize email to lowercase', () => {
      const input = {
        email: 'TEST@EXAMPLE.COM',
        name: 'Test User',
      };

      const user = createUser(input);

      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from name', () => {
      const input = {
        email: 'test@example.com',
        name: '  Test User  ',
      };

      const user = createUser(input);

      expect(user.name).toBe('Test User');
    });

    it('should accept different valid month start days', () => {
      const days = [1, 15, 28, 31];

      days.forEach(day => {
        const user = createUser({
          email: 'test@example.com',
          name: 'Test User',
          monthStartDay: day,
        });

        expect(user.monthStartDay).toBe(day);
      });
    });

    it('should accept supported currencies', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];

      currencies.forEach(currency => {
        const user = createUser({
          email: 'test@example.com',
          name: 'Test User',
          defaultCurrency: currency,
        });

        expect(user.defaultCurrency).toBe(currency);
      });
    });
  });

  describe('validateUser', () => {
    it('should validate a valid user', () => {
      const user: User = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(user);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid email', () => {
      const user: User = {
        userId: 'user-123',
        email: 'invalid-email',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Invalid email address',
        code: 'INVALID_EMAIL',
      });
    });

    it('should reject empty email', () => {
      const user: User = {
        userId: 'user-123',
        email: '',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Email is required',
        code: 'REQUIRED_FIELD',
      });
    });

    it('should reject empty name', () => {
      const user: User = {
        userId: 'user-123',
        email: 'test@example.com',
        name: '',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name is required',
        code: 'REQUIRED_FIELD',
      });
    });

    it('should reject invalid currency', () => {
      const user: User = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'INVALID',
        monthStartDay: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'defaultCurrency',
        message: 'Invalid currency code',
        code: 'INVALID_CURRENCY',
      });
    });

    it('should reject invalid month start day', () => {
      const invalidDays = [0, 32, -1, 100];

      invalidDays.forEach(day => {
        const user: User = {
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          defaultCurrency: 'USD',
          monthStartDay: day,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = validateUser(user);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'monthStartDay',
          message: 'Month start day must be between 1 and 31',
          code: 'INVALID_MONTH_START_DAY',
        });
      });
    });

    it('should collect multiple validation errors', () => {
      const user: User = {
        userId: 'user-123',
        email: 'invalid-email',
        name: '',
        defaultCurrency: 'INVALID',
        monthStartDay: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors.map(e => e.field)).toEqual(
        expect.arrayContaining(['email', 'name', 'defaultCurrency', 'monthStartDay'])
      );
    });

    it('should reject name that is too long', () => {
      const user: User = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'a'.repeat(256),
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name must be less than 255 characters',
        code: 'NAME_TOO_LONG',
      });
    });

    it('should reject email that is too long', () => {
      const user: User = {
        userId: 'user-123',
        email: 'a'.repeat(245) + '@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Email must be less than 255 characters',
        code: 'EMAIL_TOO_LONG',
      });
    });
  });

  describe('UserValidationError', () => {
    it('should create error with validation details', () => {
      const errors = [
        { field: 'email', message: 'Invalid email', code: 'INVALID_EMAIL' },
        { field: 'name', message: 'Name required', code: 'REQUIRED_FIELD' },
      ];

      const error = new UserValidationError(errors);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('User validation failed');
      expect(error.errors).toEqual(errors);
      expect(error.name).toBe('UserValidationError');
    });
  });
});
