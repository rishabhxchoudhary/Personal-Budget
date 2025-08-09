// Repository container for dependency injection
import { AccountRepository } from '@/features/accounts/model/account-repository';
import { BudgetRepository } from '@/features/budgets/model/budget-repository';
import { CategoryAllocationRepository } from '@/features/budgets/model/category-allocation-repository';
import { CategoryRepository } from '@/features/categories/model/category-repository';
import { DebtShareRepositoryImpl } from '@/features/debts/model/debt-share-repository';
import { DebtPaymentRepositoryImpl } from '@/features/debts/model/debt-payment-repository';
import { ExternalPersonRepositoryImpl } from '@/features/debts/model/external-person-repository';
import { TransactionRepository } from '@/features/transactions/model/transaction-repository';
import { UserRepository } from '@/features/users/model/user-repository';
import { RecurringTransactionRepository } from '@/features/recurring-transactions/model/recurring-transaction-repository';

// Repository container class
export class RepositoryContainer {
  private static instance: RepositoryContainer;

  public readonly accounts: AccountRepository;
  public readonly budgets: BudgetRepository;
  public readonly categoryAllocations: CategoryAllocationRepository;
  public readonly categories: CategoryRepository;
  public readonly debtShares: DebtShareRepositoryImpl;
  public readonly debtPayments: DebtPaymentRepositoryImpl;
  public readonly externalPeople: ExternalPersonRepositoryImpl;
  public readonly transactions: TransactionRepository;
  public readonly users: UserRepository;
  public readonly recurringTransactions: RecurringTransactionRepository;

  private constructor() {
    // Initialize all repositories
    this.accounts = new AccountRepository();
    this.budgets = new BudgetRepository();
    this.categoryAllocations = new CategoryAllocationRepository();
    this.categories = new CategoryRepository();
    this.debtShares = new DebtShareRepositoryImpl();
    this.debtPayments = new DebtPaymentRepositoryImpl();
    this.externalPeople = new ExternalPersonRepositoryImpl();
    this.transactions = new TransactionRepository();
    this.users = new UserRepository();
    this.recurringTransactions = new RecurringTransactionRepository();
  }

  public static getInstance(): RepositoryContainer {
    if (!RepositoryContainer.instance) {
      RepositoryContainer.instance = new RepositoryContainer();
    }
    return RepositoryContainer.instance;
  }

  // Method to reset all repositories (useful for testing)
  public async reset(): Promise<void> {
    // Reset all in-memory repositories
    // Reset all repository data structures
    // Note: This accesses private properties for testing purposes
    // In a real implementation, repositories would expose reset methods

    await this.accounts.clear();
    await this.budgets.clear();
    await this.categoryAllocations.clear();
    await this.categories.clear();
    await this.debtShares.clear();
    await this.debtPayments.clear();
    await this.externalPeople.clear();
    await this.transactions.clear();
    await this.users.clear();
    await this.recurringTransactions.clear();

    // Reset any indexes
    if ('userIdIndex' in this.accounts) {
      // @ts-expect-error - Accessing private property for testing
      this.accounts.userIdIndex.clear();
    }
  }
}

// Export singleton instance
export const repositories = RepositoryContainer.getInstance();
