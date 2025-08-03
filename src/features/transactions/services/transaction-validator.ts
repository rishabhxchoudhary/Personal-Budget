import {
  TransactionSplit,
  Account,
  Category,
  CreateTransactionInput,
  BusinessError,
} from '@/shared/types/common';

export class TransactionValidator {
  validateAmount(amount: number): boolean {
    if (!Number.isInteger(amount)) {
      throw new BusinessError('Amount must be an integer', 'INVALID_AMOUNT_TYPE');
    }

    if (amount <= 0) {
      throw new BusinessError('Amount must be positive', 'INVALID_AMOUNT');
    }

    if (amount > Number.MAX_SAFE_INTEGER) {
      throw new BusinessError('Amount exceeds maximum allowed value', 'AMOUNT_TOO_LARGE');
    }

    return true;
  }

  validateDate(date: Date): boolean {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new BusinessError('Invalid date', 'INVALID_DATE');
    }

    const now = new Date();
    if (date > now) {
      throw new BusinessError('Date cannot be in the future', 'FUTURE_DATE');
    }

    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (date < tenYearsAgo) {
      throw new BusinessError('Date is too old', 'DATE_TOO_OLD');
    }

    return true;
  }

  validateSplits(splits: TransactionSplit[], totalAmount: number): boolean {
    if (!splits || splits.length === 0) {
      throw new BusinessError('Transaction must have at least one split', 'NO_SPLITS');
    }

    let splitTotal = 0;
    for (const split of splits) {
      if (split.amountMinor <= 0) {
        throw new BusinessError('Split amounts must be positive', 'INVALID_SPLIT_AMOUNT');
      }
      splitTotal += split.amountMinor;
    }

    if (splitTotal !== totalAmount) {
      throw new BusinessError(
        `Split amounts (${splitTotal}) must equal transaction amount (${totalAmount})`,
        'SPLIT_AMOUNT_MISMATCH',
      );
    }

    return true;
  }

  validateCategoryMatch(transactionType: string, category: Category): boolean {
    if (!category.isActive) {
      throw new BusinessError('Category is not active', 'INACTIVE_CATEGORY');
    }

    if (category.type !== transactionType && category.type !== 'transfer') {
      throw new BusinessError(
        `Category type ${category.type} does not match transaction type ${transactionType}`,
        'CATEGORY_TYPE_MISMATCH',
      );
    }

    return true;
  }

  validateAccountBalance(account: Account, amount: number, transactionType: string): boolean {
    // Income and transfers don't require balance validation
    if (transactionType === 'income' || transactionType === 'transfer') {
      return true;
    }

    // Credit accounts can go negative
    if (account.type === 'credit') {
      return true;
    }

    // For expense transactions on non-credit accounts
    if (transactionType === 'expense') {
      const newBalance = account.balanceMinor - amount;
      if (newBalance < 0) {
        throw new BusinessError('Insufficient funds', 'INSUFFICIENT_FUNDS', [
          {
            field: 'amount',
            message: 'Transaction would overdraft account',
            code: 'OVERDRAFT',
          },
        ]);
      }
    }

    return true;
  }

  validateTransfer(
    transactionType: string,
    counterpartyAccountId?: string,
    sourceAccountId?: string,
  ): boolean {
    if (transactionType === 'transfer') {
      if (!counterpartyAccountId) {
        throw new BusinessError(
          'Transfer transactions require a counterparty account',
          'TRANSFER_NO_COUNTERPARTY',
        );
      }

      if (counterpartyAccountId === sourceAccountId) {
        throw new BusinessError('Cannot transfer to the same account', 'SAME_ACCOUNT_TRANSFER');
      }
    }

    return true;
  }

  validateDescription(description?: string): string | undefined {
    if (!description) {
      return description;
    }

    // Trim whitespace and normalize spaces
    let cleaned = description.trim();

    // Replace multiple spaces, tabs, newlines with single space
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Truncate to 500 characters
    if (cleaned.length > 500) {
      cleaned = cleaned.substring(0, 500);
    }

    return cleaned;
  }

  validateCounterparty(counterparty?: string): string | undefined {
    if (!counterparty) {
      return counterparty;
    }

    // Trim whitespace
    let cleaned = counterparty.trim();

    // Truncate to 100 characters
    if (cleaned.length > 100) {
      cleaned = cleaned.substring(0, 100);
    }

    return cleaned;
  }

  validateRecurringTransactionId(recurringId?: string): boolean {
    if (recurringId === undefined) {
      return true;
    }

    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(recurringId)) {
      throw new BusinessError('Invalid recurring transaction ID format', 'INVALID_RECURRING_ID');
    }

    return true;
  }

  validateCompleteTransaction(
    input: CreateTransactionInput,
    account: Account,
    categories: Category[],
  ): boolean {
    // Validate amount
    this.validateAmount(input.amountMinor);

    // Validate date
    this.validateDate(input.date);

    // Validate transfer
    this.validateTransfer(input.type, input.counterparty, input.accountId);

    // Validate account balance
    this.validateAccountBalance(account, input.amountMinor, input.type);

    // Validate recurring transaction ID
    this.validateRecurringTransactionId(input.recurringTransactionId);

    // Validate splits or single category
    if (input.splits && input.splits.length > 0) {
      // Create temporary splits with IDs for validation
      const tempSplits: TransactionSplit[] = input.splits.map((split, index) => ({
        splitId: `temp-${index}`,
        categoryId: split.categoryId,
        amountMinor: split.amountMinor,
        note: split.note,
      }));

      this.validateSplits(tempSplits, input.amountMinor);

      // Validate each category in splits
      for (const split of input.splits) {
        const category = categories.find((c) => c.categoryId === split.categoryId);
        if (!category) {
          throw new BusinessError('Category not found', 'CATEGORY_NOT_FOUND');
        }
        this.validateCategoryMatch(input.type, category);
      }
    } else {
      // Single category validation
      if (!input.categoryId) {
        throw new BusinessError('Category is required', 'CATEGORY_REQUIRED');
      }

      const category = categories.find((c) => c.categoryId === input.categoryId);
      if (!category) {
        throw new BusinessError('Category not found', 'CATEGORY_NOT_FOUND');
      }
      this.validateCategoryMatch(input.type, category);
    }

    return true;
  }
}
