import { TransactionValidator } from '@/features/transactions/services/transaction-validator';
import { CreateTransactionInput, TransactionSplit, Account, Category } from '@/shared/types/common';

describe('TransactionValidator', () => {
  let validator: TransactionValidator;

  beforeEach(() => {
    validator = new TransactionValidator();
  });

  describe('validateAmount', () => {
    it('should accept positive amounts', () => {
      const result = validator.validateAmount(1000);
      expect(result).toBe(true);
    });

    it('should reject negative amounts', () => {
      expect(() => validator.validateAmount(-1000)).toThrow('Amount must be positive');
    });

    it('should reject zero amount', () => {
      expect(() => validator.validateAmount(0)).toThrow('Amount must be positive');
    });

    it('should reject non-integer amounts', () => {
      expect(() => validator.validateAmount(100.5)).toThrow('Amount must be an integer');
    });

    it('should reject amounts exceeding safe integer', () => {
      expect(() => validator.validateAmount(Number.MAX_SAFE_INTEGER + 1)).toThrow(
        'Amount exceeds maximum allowed value',
      );
    });

    it('should accept maximum safe integer', () => {
      const result = validator.validateAmount(Number.MAX_SAFE_INTEGER);
      expect(result).toBe(true);
    });
  });

  describe('validateDate', () => {
    it('should accept valid past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const result = validator.validateDate(pastDate);
      expect(result).toBe(true);
    });

    it('should accept today date', () => {
      const result = validator.validateDate(new Date());
      expect(result).toBe(true);
    });

    it('should reject future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(() => validator.validateDate(futureDate)).toThrow('Date cannot be in the future');
    });

    it('should reject date older than 10 years', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 11);
      expect(() => validator.validateDate(oldDate)).toThrow('Date is too old');
    });

    it('should accept date exactly 10 years old', () => {
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      tenYearsAgo.setDate(tenYearsAgo.getDate() + 1); // Just within 10 years
      const result = validator.validateDate(tenYearsAgo);
      expect(result).toBe(true);
    });

    it('should reject invalid date object', () => {
      expect(() => validator.validateDate(new Date('invalid'))).toThrow('Invalid date');
    });
  });

  describe('validateSplits', () => {
    it('should accept splits that equal total amount', () => {
      const splits: TransactionSplit[] = [
        { splitId: '1', categoryId: 'cat-1', amountMinor: 6000 },
        { splitId: '2', categoryId: 'cat-2', amountMinor: 4000 },
      ];
      const result = validator.validateSplits(splits, 10000);
      expect(result).toBe(true);
    });

    it('should reject empty splits array', () => {
      expect(() => validator.validateSplits([], 1000)).toThrow(
        'Transaction must have at least one split',
      );
    });

    it('should reject splits that do not equal total', () => {
      const splits: TransactionSplit[] = [
        { splitId: '1', categoryId: 'cat-1', amountMinor: 3000 },
        { splitId: '2', categoryId: 'cat-2', amountMinor: 4000 },
      ];
      expect(() => validator.validateSplits(splits, 10000)).toThrow(
        'Split amounts (7000) must equal transaction amount (10000)',
      );
    });

    it('should reject splits with negative amounts', () => {
      const splits: TransactionSplit[] = [
        { splitId: '1', categoryId: 'cat-1', amountMinor: -5000 },
        { splitId: '2', categoryId: 'cat-2', amountMinor: 15000 },
      ];
      expect(() => validator.validateSplits(splits, 10000)).toThrow(
        'Split amounts must be positive',
      );
    });

    it('should reject splits with zero amounts', () => {
      const splits: TransactionSplit[] = [
        { splitId: '1', categoryId: 'cat-1', amountMinor: 0 },
        { splitId: '2', categoryId: 'cat-2', amountMinor: 10000 },
      ];
      expect(() => validator.validateSplits(splits, 10000)).toThrow(
        'Split amounts must be positive',
      );
    });

    it('should accept single split equal to total', () => {
      const splits: TransactionSplit[] = [{ splitId: '1', categoryId: 'cat-1', amountMinor: 5000 }];
      const result = validator.validateSplits(splits, 5000);
      expect(result).toBe(true);
    });

    it('should handle many splits', () => {
      const splits: TransactionSplit[] = Array.from({ length: 10 }, (_, i) => ({
        splitId: `${i}`,
        categoryId: `cat-${i}`,
        amountMinor: 1000,
      }));
      const result = validator.validateSplits(splits, 10000);
      expect(result).toBe(true);
    });
  });

  describe('validateCategoryMatch', () => {
    it('should accept matching transaction and category types', () => {
      const category: Category = {
        categoryId: 'cat-1',
        userId: 'user-1',
        name: 'Groceries',
        type: 'expense',
        budgetingMethod: 'fixed',
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = validator.validateCategoryMatch('expense', category);
      expect(result).toBe(true);
    });

    it('should accept transfer category for any transaction type', () => {
      const category: Category = {
        categoryId: 'cat-1',
        userId: 'user-1',
        name: 'Transfer',
        type: 'transfer',
        budgetingMethod: 'fixed',
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = validator.validateCategoryMatch('expense', category);
      expect(result).toBe(true);
    });

    it('should reject mismatched category type', () => {
      const category: Category = {
        categoryId: 'cat-1',
        userId: 'user-1',
        name: 'Salary',
        type: 'income',
        budgetingMethod: 'fixed',
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(() => validator.validateCategoryMatch('expense', category)).toThrow(
        'Category type income does not match transaction type expense',
      );
    });

    it('should reject inactive category', () => {
      const category: Category = {
        categoryId: 'cat-1',
        userId: 'user-1',
        name: 'Old Category',
        type: 'expense',
        budgetingMethod: 'fixed',
        isActive: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(() => validator.validateCategoryMatch('expense', category)).toThrow(
        'Category is not active',
      );
    });
  });

  describe('validateAccountBalance', () => {
    it('should accept expense within balance for checking account', () => {
      const account: Account = {
        accountId: 'acc-1',
        userId: 'user-1',
        name: 'Checking',
        type: 'checking',
        balanceMinor: 10000,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = validator.validateAccountBalance(account, 5000, 'expense');
      expect(result).toBe(true);
    });

    it('should accept expense equal to balance', () => {
      const account: Account = {
        accountId: 'acc-1',
        userId: 'user-1',
        name: 'Checking',
        type: 'checking',
        balanceMinor: 5000,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = validator.validateAccountBalance(account, 5000, 'expense');
      expect(result).toBe(true);
    });

    it('should reject expense exceeding balance for non-credit account', () => {
      const account: Account = {
        accountId: 'acc-1',
        userId: 'user-1',
        name: 'Checking',
        type: 'checking',
        balanceMinor: 5000,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(() => validator.validateAccountBalance(account, 6000, 'expense')).toThrow(
        'Insufficient funds',
      );
    });

    it('should allow overdraft for credit account', () => {
      const account: Account = {
        accountId: 'acc-1',
        userId: 'user-1',
        name: 'Credit Card',
        type: 'credit',
        balanceMinor: -5000,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = validator.validateAccountBalance(account, 10000, 'expense');
      expect(result).toBe(true);
    });

    it('should always accept income transactions', () => {
      const account: Account = {
        accountId: 'acc-1',
        userId: 'user-1',
        name: 'Checking',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = validator.validateAccountBalance(account, 10000, 'income');
      expect(result).toBe(true);
    });

    it('should always accept transfer transactions', () => {
      const account: Account = {
        accountId: 'acc-1',
        userId: 'user-1',
        name: 'Checking',
        type: 'checking',
        balanceMinor: 5000,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = validator.validateAccountBalance(account, 10000, 'transfer');
      expect(result).toBe(true);
    });
  });

  describe('validateTransfer', () => {
    it('should accept valid transfer with counterparty', () => {
      const result = validator.validateTransfer('transfer', 'account-2', 'account-1');
      expect(result).toBe(true);
    });

    it('should reject transfer without counterparty', () => {
      expect(() => validator.validateTransfer('transfer', undefined, 'account-1')).toThrow(
        'Transfer transactions require a counterparty account',
      );
    });

    it('should reject transfer to same account', () => {
      expect(() => validator.validateTransfer('transfer', 'account-1', 'account-1')).toThrow(
        'Cannot transfer to the same account',
      );
    });

    it('should accept non-transfer without counterparty', () => {
      const result = validator.validateTransfer('expense', undefined, 'account-1');
      expect(result).toBe(true);
    });

    it('should ignore counterparty for non-transfer transactions', () => {
      const result = validator.validateTransfer('expense', 'some-value', 'account-1');
      expect(result).toBe(true);
    });
  });

  describe('validateDescription', () => {
    it('should accept valid description', () => {
      const result = validator.validateDescription('Purchase at store');
      expect(result).toBe('Purchase at store');
    });

    it('should trim whitespace', () => {
      const result = validator.validateDescription('  Purchase at store  ');
      expect(result).toBe('Purchase at store');
    });

    it('should normalize multiple spaces', () => {
      const result = validator.validateDescription('Purchase   at    store');
      expect(result).toBe('Purchase at store');
    });

    it('should truncate long descriptions', () => {
      const longText = 'a'.repeat(600);
      const result = validator.validateDescription(longText);
      expect(result).toBeDefined();
      expect(result!.length).toBe(500);
    });

    it('should handle empty description', () => {
      const result = validator.validateDescription('');
      expect(result).toBe('');
    });

    it('should handle undefined description', () => {
      const result = validator.validateDescription(undefined);
      expect(result).toBeUndefined();
    });

    it('should handle description with newlines', () => {
      const result = validator.validateDescription('Line 1\nLine 2\rLine 3');
      expect(result).toBe('Line 1 Line 2 Line 3');
    });
  });

  describe('validateCounterparty', () => {
    it('should accept valid counterparty name', () => {
      const result = validator.validateCounterparty('Store Name');
      expect(result).toBe('Store Name');
    });

    it('should trim counterparty name', () => {
      const result = validator.validateCounterparty('  Store Name  ');
      expect(result).toBe('Store Name');
    });

    it('should truncate long counterparty names', () => {
      const longName = 'a'.repeat(150);
      const result = validator.validateCounterparty(longName);
      expect(result).toBeDefined();
      expect(result!.length).toBe(100);
    });

    it('should handle undefined counterparty', () => {
      const result = validator.validateCounterparty(undefined);
      expect(result).toBeUndefined();
    });

    it('should reject empty counterparty after trim', () => {
      const result = validator.validateCounterparty('   ');
      expect(result).toBe('');
    });
  });

  describe('validateRecurringTransactionId', () => {
    it('should accept valid UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = validator.validateRecurringTransactionId(uuid);
      expect(result).toBe(true);
    });

    it('should accept undefined recurring ID', () => {
      const result = validator.validateRecurringTransactionId(undefined);
      expect(result).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      expect(() => validator.validateRecurringTransactionId('invalid-uuid')).toThrow(
        'Invalid recurring transaction ID format',
      );
    });

    it('should reject empty string', () => {
      expect(() => validator.validateRecurringTransactionId('')).toThrow(
        'Invalid recurring transaction ID format',
      );
    });
  });

  describe('validateCompleteTransaction', () => {
    it('should validate a complete valid transaction', () => {
      const input: CreateTransactionInput = {
        userId: 'user-1',
        accountId: 'account-1',
        date: new Date(),
        amountMinor: 5000,
        type: 'expense',
        categoryId: 'cat-1',
        description: 'Test transaction',
      };

      const account: Account = {
        accountId: 'account-1',
        userId: 'user-1',
        name: 'Checking',
        type: 'checking',
        balanceMinor: 10000,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const category: Category = {
        categoryId: 'cat-1',
        userId: 'user-1',
        name: 'Groceries',
        type: 'expense',
        budgetingMethod: 'fixed',
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateCompleteTransaction(input, account, [category]);
      expect(result).toBe(true);
    });

    it('should validate transaction with splits', () => {
      const input: CreateTransactionInput = {
        userId: 'user-1',
        accountId: 'account-1',
        date: new Date(),
        amountMinor: 10000,
        type: 'expense',
        splits: [
          { categoryId: 'cat-1', amountMinor: 6000 },
          { categoryId: 'cat-2', amountMinor: 4000 },
        ],
      };

      const account: Account = {
        accountId: 'account-1',
        userId: 'user-1',
        name: 'Checking',
        type: 'checking',
        balanceMinor: 15000,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const categories: Category[] = [
        {
          categoryId: 'cat-1',
          userId: 'user-1',
          name: 'Groceries',
          type: 'expense',
          budgetingMethod: 'fixed',
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          categoryId: 'cat-2',
          userId: 'user-1',
          name: 'Dining',
          type: 'expense',
          budgetingMethod: 'fixed',
          isActive: true,
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = validator.validateCompleteTransaction(input, account, categories);
      expect(result).toBe(true);
    });

    it('should reject transaction with invalid amount', () => {
      const input: CreateTransactionInput = {
        userId: 'user-1',
        accountId: 'account-1',
        date: new Date(),
        amountMinor: -5000,
        type: 'expense',
        categoryId: 'cat-1',
      };

      const account: Account = {
        accountId: 'account-1',
        userId: 'user-1',
        name: 'Checking',
        type: 'checking',
        balanceMinor: 10000,
        currency: 'USD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const category: Category = {
        categoryId: 'cat-1',
        userId: 'user-1',
        name: 'Groceries',
        type: 'expense',
        budgetingMethod: 'fixed',
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => validator.validateCompleteTransaction(input, account, [category])).toThrow(
        'Amount must be positive',
      );
    });
  });
});
