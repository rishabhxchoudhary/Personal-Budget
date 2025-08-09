import { TransactionRepository } from '@/features/transactions/model/transaction-repository';
import { AccountRepository } from '@/features/accounts/model/account-repository';
import { CategoryRepository } from '@/features/categories/model/category-repository';
import { UserRepository } from '@/features/users/model/user-repository';
import { BudgetRepository } from '@/features/budgets/model/budget-repository';
import { CategoryAllocationRepository } from '@/features/budgets/model/category-allocation-repository';
import { DebtShareRepositoryImpl } from '@/features/debts/model/debt-share-repository';
import { DebtPaymentRepositoryImpl } from '@/features/debts/model/debt-payment-repository';
import { ExternalPersonRepositoryImpl } from '@/features/debts/model/external-person-repository';

export class MockRepositories {
  transactions: TransactionRepository;
  accounts: AccountRepository;
  categories: CategoryRepository;
  users: UserRepository;
  budgets: BudgetRepository;
  categoryAllocations: CategoryAllocationRepository;
  debtShares: DebtShareRepositoryImpl;
  debtPayments: DebtPaymentRepositoryImpl;
  externalPeople: ExternalPersonRepositoryImpl;

  constructor() {
    this.transactions = new TransactionRepository();
    this.accounts = new AccountRepository();
    this.categories = new CategoryRepository();
    this.users = new UserRepository();
    this.budgets = new BudgetRepository();
    this.categoryAllocations = new CategoryAllocationRepository();
    this.debtShares = new DebtShareRepositoryImpl();
    this.debtPayments = new DebtPaymentRepositoryImpl();
    this.externalPeople = new ExternalPersonRepositoryImpl();
  }

  async reset() {
    // Clear all data
    await Promise.all([
      this.transactions.clear(),
      this.accounts.clear(),
      this.categories.clear(),
      this.users.clear(),
      this.budgets.clear(),
      this.categoryAllocations.clear(),
      this.debtShares.clear(),
      this.debtPayments.clear(),
      this.externalPeople.clear(),
    ]);
  }
}

// Create singleton instance for mocking
export const mockRepositories = new MockRepositories();

// Test data factory
export class TestDataFactory {
  constructor(private repos: MockRepositories) {}

  async createTestUser(overrides?: Partial<Parameters<UserRepository['create']>[0]>) {
    return this.repos.users.create({
      email: 'test@example.com',
      name: 'Test User',
      defaultCurrency: 'USD',
      monthStartDay: 1,
      ...overrides,
    });
  }

  async createTestAccount(
    userId: string,
    overrides?: Partial<Parameters<AccountRepository['create']>[0]>,
  ) {
    return this.repos.accounts.create({
      userId,
      name: 'Test Account',
      type: 'checking',
      balanceMinor: 100000,
      currency: 'USD',
      isActive: true,
      ...overrides,
    });
  }

  async createTestCategory(
    userId: string,
    type: 'income' | 'expense' | 'transfer' | 'debt',
    overrides?: Partial<Parameters<CategoryRepository['create']>[0]>,
  ) {
    return this.repos.categories.create({
      userId,
      name: `Test ${type} Category`,
      type,
      budgetingMethod: 'fixed',
      isActive: true,
      sortOrder: 0,
      ...overrides,
    });
  }

  async createTestBudget(
    userId: string,
    overrides?: Partial<Parameters<BudgetRepository['create']>[0]>,
  ) {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM format
    return this.repos.budgets.create({
      userId,
      month,
      plannedIncomeMinor: 500000, // $5000
      actualIncomeMinor: 0,
      totalAllocatedMinor: 0,
      status: 'draft',
      ...overrides,
    });
  }

  async createTestCategoryAllocation(
    budgetId: string,
    categoryId: string,
    overrides?: Partial<Parameters<CategoryAllocationRepository['create']>[0]>,
  ) {
    return this.repos.categoryAllocations.create({
      budgetId,
      categoryId,
      allocationType: 'fixed',
      allocationValue: 100000, // $1000
      allocatedMinor: 100000,
      spentMinor: 0,
      remainingMinor: 100000,
      rollover: false,
      ...overrides,
    });
  }

  async createTestTransaction(
    userId: string,
    accountId: string,
    categoryId: string,
    overrides?: Partial<Parameters<TransactionRepository['create']>[0]>,
  ) {
    const today = new Date();
    return this.repos.transactions.create({
      userId,
      accountId,
      date: today,
      amountMinor: 5000, // $50
      type: 'expense',
      status: 'pending',
      description: 'Test transaction',
      splits: [
        {
          categoryId,
          amountMinor: 5000,
          note: 'Test split',
        },
      ],
      ...overrides,
    });
  }

  async createTestExternalPerson(
    userId: string,
    overrides?: Partial<Parameters<ExternalPersonRepositoryImpl['create']>[0]>,
  ) {
    return this.repos.externalPeople.create({
      userId,
      name: 'Test Person',
      email: 'testperson@example.com',
      phone: '+1234567890',
      isActive: true,
      ...overrides,
    });
  }

  async createTestDebtShare(
    transactionId: string,
    debtorId: string,
    creditorId: string,
    overrides?: Partial<Parameters<DebtShareRepositoryImpl['create']>[0]>,
  ) {
    return this.repos.debtShares.create({
      amountMinor: 2500, // $25
      transactionId,
      debtorId,
      creditorId,
      status: 'pending',
      ...overrides,
    });
  }

  async createTestDebtPayment(
    debtShareId: string,
    payerId: string,
    overrides?: Partial<Parameters<DebtPaymentRepositoryImpl['create']>[0]>,
  ) {
    const today = new Date();
    return this.repos.debtPayments.create({
      debtShareId,
      payerId,
      payeeId: payerId, // Default to same as payer for test
      amountMinor: 2500, // $25
      paymentDate: today,
      note: 'Test payment',
      ...overrides,
    });
  }
}
