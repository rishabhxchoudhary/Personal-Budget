// Common types and interfaces for the Personal Budget Manager

// User entity
export interface User {
  userId: string;
  email: string;
  name: string;
  defaultCurrency: string;
  monthStartDay: number;
  createdAt: Date;
  updatedAt: Date;
}

// Account entity
export interface Account {
  accountId: string;
  userId: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash';
  balanceMinor: number;
  currency: string;
  isActive: boolean;
  institution?: string;
  lastFour?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Category entity
export interface Category {
  categoryId: string;
  userId: string;
  name: string;
  type: 'income' | 'expense' | 'transfer' | 'debt';
  parentCategoryId?: string;
  icon?: string;
  color?: string;
  budgetingMethod: 'fixed' | 'percentage' | 'envelope' | 'goal';
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Budget entity (monthly)
export interface Budget {
  budgetId: string;
  userId: string;
  month: string; // YYYY-MM format
  plannedIncomeMinor: number;
  actualIncomeMinor: number;
  totalAllocatedMinor: number;
  status: 'draft' | 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

// Category Allocation
export interface CategoryAllocation {
  allocationId: string;
  budgetId: string;
  categoryId: string;
  allocationType: 'fixed' | 'percentage';
  allocationValue: number;
  allocatedMinor: number;
  spentMinor: number;
  remainingMinor: number;
  rollover: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction entity
export interface Transaction {
  transactionId: string;
  userId: string;
  accountId: string;
  date: Date;
  amountMinor: number;
  type: 'income' | 'expense' | 'transfer';
  status: 'pending' | 'cleared' | 'reconciled';
  counterparty?: string;
  description?: string;
  splits: TransactionSplit[];
  attachmentIds?: string[];
  recurringTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionSplit {
  splitId: string;
  categoryId: string;
  amountMinor: number;
  note?: string;
}

// Debt Share entity
export interface DebtShare {
  debtShareId: string;
  creditorId: string;
  debtorId: string;
  transactionId: string;
  amountMinor: number;
  status: 'pending' | 'partial' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

// External Person entity
export interface ExternalPerson {
  personId: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Common type definitions
export type AccountType = Account['type'];
export type CategoryType = Category['type'];
export type BudgetingMethod = Category['budgetingMethod'];
export type BudgetStatus = Budget['status'];
export type TransactionType = Transaction['type'];
export type TransactionStatus = Transaction['status'];
export type DebtStatus = DebtShare['status'];
export type AllocationType = CategoryAllocation['allocationType'];

// Input types for services
export interface CreateTransactionInput {
  userId: string;
  accountId: string;
  date: Date;
  amountMinor: number;
  type: TransactionType;
  status?: TransactionStatus;
  counterparty?: string;
  description?: string;
  categoryId?: string;
  splits?: Omit<TransactionSplit, 'splitId'>[];
}

export interface SplitInput {
  categoryId: string;
  amountMinor: number;
  note?: string;
}

export interface AllocationInput {
  allocationType: AllocationType;
  allocationValue: number;
  rollover?: boolean;
}

export interface DebtShareInput {
  debtorId: string;
  amountMinor: number;
}

export interface DebtPayment {
  paymentId: string;
  debtShareId: string;
  amountMinor: number;
  paymentDate: Date;
  transactionId?: string;
  createdAt: Date;
}

export interface DebtSummary {
  personId: string;
  personName: string;
  totalOwedMinor: number;
  currency: string;
  debtCount: number;
  oldestDebtDate: Date;
}

// Repository interfaces
export interface Repository<T, TCreateInput = Omit<T, 'createdAt' | 'updatedAt'>> {
  create(item: TCreateInput): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface UserRepository
  extends Repository<
    User,
    Omit<User, 'createdAt' | 'updatedAt' | 'userId' | 'defaultCurrency' | 'monthStartDay'> & {
      userId?: string;
      defaultCurrency?: string;
      monthStartDay?: number;
    }
  > {
  findByEmail(email: string): Promise<User | null>;
}

export interface AccountRepository
  extends Repository<
    Account,
    {
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
  > {
  findByUserId(userId: string): Promise<Account[]>;
  findActiveByUserId(userId: string): Promise<Account[]>;
}

export interface CategoryRepository extends Repository<Category> {
  findByUserId(userId: string): Promise<Category[]>;
  findByUserIdAndType(userId: string, type: CategoryType): Promise<Category[]>;
}

export interface BudgetRepository extends Repository<Budget> {
  findByUserIdAndMonth(userId: string, month: string): Promise<Budget | null>;
  findByUserId(userId: string): Promise<Budget[]>;
}

export interface CategoryAllocationRepository extends Repository<CategoryAllocation> {
  findByBudgetId(budgetId: string): Promise<CategoryAllocation[]>;
  findByBudgetIdAndCategoryId(
    budgetId: string,
    categoryId: string,
  ): Promise<CategoryAllocation | null>;
}

export interface TransactionRepository extends Repository<Transaction> {
  findByUserId(userId: string): Promise<Transaction[]>;
  findByAccountId(accountId: string): Promise<Transaction[]>;
  findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;
}

export interface DebtShareRepository extends Repository<DebtShare> {
  findByCreditorId(creditorId: string): Promise<DebtShare[]>;
  findByDebtorId(debtorId: string): Promise<DebtShare[]>;
  findByTransactionId(transactionId: string): Promise<DebtShare[]>;
}

export interface ExternalPersonRepository extends Repository<ExternalPerson> {
  findByUserId(userId: string): Promise<ExternalPerson[]>;
  findByEmail(email: string): Promise<ExternalPerson | null>;
}

// Service interfaces
export interface BudgetService {
  createMonthlyBudget(userId: string, month: string, plannedIncome: number): Promise<Budget>;
  allocateToCategory(
    budgetId: string,
    categoryId: string,
    allocation: AllocationInput,
  ): Promise<CategoryAllocation>;
  calculateRemainingBudget(budgetId: string): Promise<number>;
  closeBudget(budgetId: string): Promise<Budget>;
}

export interface TransactionService {
  createTransaction(input: CreateTransactionInput): Promise<Transaction>;
  splitTransaction(transactionId: string, splits: SplitInput[]): Promise<Transaction>;
  reconcileTransaction(transactionId: string): Promise<Transaction>;
}

export interface DebtService {
  createDebtShare(transactionId: string, shares: DebtShareInput[]): Promise<DebtShare[]>;
  recordPayment(debtShareId: string, amountMinor: number): Promise<DebtPayment>;
  getDebtsOwedToMe(userId: string): Promise<DebtSummary[]>;
  getDebtsIOwe(userId: string): Promise<DebtSummary[]>;
}

// Utility types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: ValidationError[],
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}
