import {
  Transaction,
  TransactionService as ITransactionService,
  CreateTransactionInput,
  SplitInput,
  BusinessError,
  TransactionSplit,
  Account,
  Category,
  User,
} from '@/shared/types/common';
import { TransactionRepository } from '@/features/transactions/model/transaction-repository';
import { AccountRepository } from '@/features/accounts/model/account-repository';
import { CategoryRepository } from '@/features/categories/model/category-repository';
import { UserRepository } from '@/features/users/model/user-repository';
import { v4 as uuidv4 } from 'uuid';

export class TransactionService implements ITransactionService {
  constructor(
    private transactionRepo: TransactionRepository,
    private accountRepo: AccountRepository,
    private categoryRepo: CategoryRepository,
    private userRepo: UserRepository,
  ) {}

  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    // Validate entities exist and belong to user
    const user = await this.validateUser(input.userId);
    const account = await this.validateAccount(input.accountId, input.userId);

    // Prepare splits
    const splits = await this.prepareSplits(input, user);

    // Validate business rules
    this.validateTransactionDate(input.date);
    await this.validateAccountBalance(account, input.amountMinor, input.type);

    // Create transaction
    const transaction = await this.transactionRepo.create({
      transactionId: uuidv4(),
      userId: input.userId,
      accountId: input.accountId,
      date: input.date,
      amountMinor: input.amountMinor,
      type: input.type,
      status: input.status || 'pending',
      counterparty: input.counterparty,
      description: this.sanitizeDescription(input.description),
      splits,
      attachmentIds: [],
      recurringTransactionId: input.recurringTransactionId,
    });

    // Update account balance
    await this.updateAccountBalance(account, transaction);

    // Handle transfers
    if (input.type === 'transfer' && input.counterparty) {
      if (input.counterparty === input.accountId) {
        throw new BusinessError(
          'Cannot transfer between the same account',
          'SAME_ACCOUNT_TRANSFER',
        );
      }
      await this.createTransferCounterpart(transaction, input.counterparty);
    }

    return transaction;
  }

  async splitTransaction(transactionId: string, splits: SplitInput[]): Promise<Transaction> {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) {
      throw new BusinessError('Transaction not found', 'TRANSACTION_NOT_FOUND');
    }

    if (transaction.status === 'reconciled') {
      throw new BusinessError('Cannot modify reconciled transaction', 'CANNOT_MODIFY_RECONCILED');
    }

    // Validate splits
    const validatedSplits = await this.validateSplits(
      splits,
      transaction.amountMinor,
      transaction.userId,
      transaction.type,
    );

    // Update transaction
    return this.transactionRepo.update(transactionId, {
      splits: validatedSplits,
    });
  }

  async reconcileTransaction(transactionId: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) {
      throw new BusinessError('Transaction not found', 'TRANSACTION_NOT_FOUND');
    }

    if (transaction.status === 'reconciled') {
      throw new BusinessError('Transaction is already reconciled', 'ALREADY_RECONCILED');
    }

    return this.transactionRepo.update(transactionId, {
      status: 'reconciled',
    });
  }

  private async validateUser(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new BusinessError('User not found', 'USER_NOT_FOUND');
    }
    return user;
  }

  private async validateAccount(accountId: string, userId: string): Promise<Account> {
    const account = await this.accountRepo.findById(accountId);
    if (!account) {
      throw new BusinessError('Account not found', 'ACCOUNT_NOT_FOUND');
    }
    if (account.userId !== userId) {
      throw new BusinessError('Account does not belong to user', 'UNAUTHORIZED_ACCOUNT');
    }
    if (!account.isActive) {
      throw new BusinessError('Account is not active', 'INACTIVE_ACCOUNT');
    }
    return account;
  }

  private async prepareSplits(
    input: CreateTransactionInput,
    user: User,
  ): Promise<Omit<TransactionSplit, 'splitId'>[]> {
    if (input.splits && input.splits.length > 0) {
      return this.validateSplits(input.splits, input.amountMinor, user.userId, input.type);
    }

    // Single split with default category
    if (!input.categoryId) {
      throw new BusinessError('Category is required', 'CATEGORY_REQUIRED');
    }

    const category = await this.validateCategory(input.categoryId, user.userId, input.type);

    return [
      {
        categoryId: category.categoryId,
        amountMinor: input.amountMinor,
        note: input.description,
      },
    ];
  }

  private async validateSplits(
    splits: SplitInput[],
    totalAmount: number,
    userId: string,
    transactionType: string,
  ): Promise<TransactionSplit[]> {
    const validatedSplits: TransactionSplit[] = [];
    let splitTotal = 0;

    for (const split of splits) {
      const category = await this.validateCategory(split.categoryId, userId, transactionType);

      validatedSplits.push({
        splitId: uuidv4(),
        categoryId: category.categoryId,
        amountMinor: split.amountMinor,
        note: split.note,
      });

      splitTotal += split.amountMinor;
    }

    if (splitTotal !== totalAmount) {
      throw new BusinessError(
        `Split amounts (${splitTotal}) must equal total (${totalAmount})`,
        'SPLIT_AMOUNT_MISMATCH',
      );
    }

    return validatedSplits;
  }

  private async validateCategory(
    categoryId: string,
    userId: string,
    transactionType: string,
  ): Promise<Category> {
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) {
      throw new BusinessError('Category not found', 'CATEGORY_NOT_FOUND');
    }
    if (category.userId !== userId) {
      throw new BusinessError('Category does not belong to user', 'UNAUTHORIZED_CATEGORY');
    }
    if (!category.isActive) {
      throw new BusinessError('Category is not active', 'INACTIVE_CATEGORY');
    }
    if (category.type !== transactionType && category.type !== 'transfer') {
      throw new BusinessError(
        `Category type ${category.type} does not match transaction type ${transactionType}`,
        'CATEGORY_TYPE_MISMATCH',
      );
    }
    return category;
  }

  private validateTransactionDate(date: Date): void {
    const now = new Date();
    if (date > now) {
      throw new BusinessError('Transaction date cannot be in the future', 'FUTURE_DATE');
    }

    // Check if date is too old (e.g., more than 10 years)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (date < tenYearsAgo) {
      throw new BusinessError('Transaction date is too old', 'DATE_TOO_OLD');
    }
  }

  private async validateAccountBalance(
    account: Account,
    amount: number,
    type: string,
  ): Promise<void> {
    if (type === 'expense' && account.type !== 'credit') {
      const newBalance = account.balanceMinor - amount;
      if (newBalance < 0) {
        throw new BusinessError('Insufficient funds', 'INSUFFICIENT_FUNDS', [
          { field: 'amount', message: 'Transaction would overdraft account', code: 'OVERDRAFT' },
        ]);
      }
    }
  }

  private async updateAccountBalance(account: Account, transaction: Transaction): Promise<void> {
    let newBalance = account.balanceMinor;

    if (transaction.type === 'income') {
      newBalance += transaction.amountMinor;
    } else if (transaction.type === 'expense') {
      newBalance -= transaction.amountMinor;
    }
    // Transfer balance updates handled separately

    if (transaction.type !== 'transfer') {
      await this.accountRepo.update(account.accountId, {
        balanceMinor: newBalance,
      });
    }
  }

  private async createTransferCounterpart(
    sourceTransaction: Transaction,
    targetAccountId: string,
  ): Promise<Transaction> {
    const targetAccount = await this.validateAccount(targetAccountId, sourceTransaction.userId);

    // Create opposite transaction
    const counterpartTransaction = await this.transactionRepo.create({
      transactionId: uuidv4(),
      userId: sourceTransaction.userId,
      accountId: targetAccountId,
      date: sourceTransaction.date,
      amountMinor: sourceTransaction.amountMinor,
      type: 'transfer',
      status: sourceTransaction.status,
      counterparty: sourceTransaction.accountId, // Link back to source
      description: `Transfer from ${sourceTransaction.accountId}`,
      splits: sourceTransaction.splits.map((split) => ({
        categoryId: split.categoryId,
        amountMinor: split.amountMinor,
        note: split.note,
      })),
      attachmentIds: [],
      recurringTransactionId: sourceTransaction.recurringTransactionId,
    });

    // Update balances
    await this.accountRepo.update(sourceTransaction.accountId, {
      balanceMinor:
        (await this.accountRepo.findById(sourceTransaction.accountId))!.balanceMinor -
        sourceTransaction.amountMinor,
    });

    await this.accountRepo.update(targetAccountId, {
      balanceMinor: targetAccount.balanceMinor + sourceTransaction.amountMinor,
    });

    return counterpartTransaction;
  }

  private sanitizeDescription(description?: string): string | undefined {
    if (!description) return undefined;

    // Remove excessive whitespace
    return description.trim().replace(/\s+/g, ' ').slice(0, 500);
  }
}
