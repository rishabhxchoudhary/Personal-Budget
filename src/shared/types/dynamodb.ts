// DynamoDB item types and patterns for single table design

import type {
  User,
  Account,
  Category,
  Budget,
  CategoryAllocation,
  Transaction,
  DebtShare,
  ExternalPerson,
  DebtPayment,
} from './common';

// Base DynamoDB item interface
export interface DynamoDBItem {
  pk: string; // Partition Key
  sk: string; // Sort Key
  gsi1pk?: string; // GSI1 Partition Key
  gsi1sk?: string; // GSI1 Sort Key
  gsi2pk?: string; // GSI2 Partition Key
  gsi2sk?: string; // GSI2 Sort Key
  entityType: string;
  ttl?: number; // TTL for temporary items
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Key patterns for different entities
export const KeyPatterns = {
  // User patterns
  user: (userId: string) => ({
    pk: `USER#${userId}`,
    sk: `USER#${userId}`,
  }),

  // Account patterns
  account: (userId: string, accountId: string) => ({
    pk: `USER#${userId}`,
    sk: `ACCOUNT#${accountId}`,
  }),
  accountsByUser: (userId: string) => ({
    pk: `USER#${userId}`,
    skPrefix: 'ACCOUNT#',
  }),

  // Category patterns
  category: (userId: string, categoryId: string) => ({
    pk: `USER#${userId}`,
    sk: `CATEGORY#${categoryId}`,
  }),
  categoriesByUser: (userId: string) => ({
    pk: `USER#${userId}`,
    skPrefix: 'CATEGORY#',
  }),

  // Budget patterns
  budget: (userId: string, budgetId: string) => ({
    pk: `USER#${userId}`,
    sk: `BUDGET#${budgetId}`,
  }),
  budgetsByUser: (userId: string) => ({
    pk: `USER#${userId}`,
    skPrefix: 'BUDGET#',
  }),
  budgetByMonth: (userId: string, month: string) => ({
    gsi1pk: `USER#${userId}`,
    gsi1sk: `BUDGET_MONTH#${month}`,
  }),

  // Category Allocation patterns
  allocation: (budgetId: string, allocationId: string) => ({
    pk: `BUDGET#${budgetId}`,
    sk: `ALLOCATION#${allocationId}`,
  }),
  allocationsByBudget: (budgetId: string) => ({
    pk: `BUDGET#${budgetId}`,
    skPrefix: 'ALLOCATION#',
  }),
  allocationByCategory: (budgetId: string, categoryId: string) => ({
    gsi1pk: `BUDGET#${budgetId}`,
    gsi1sk: `CATEGORY#${categoryId}`,
  }),

  // Transaction patterns
  transaction: (userId: string, transactionId: string) => ({
    pk: `USER#${userId}`,
    sk: `TRANSACTION#${transactionId}`,
  }),
  transactionsByUser: (userId: string) => ({
    pk: `USER#${userId}`,
    skPrefix: 'TRANSACTION#',
  }),
  transactionsByAccount: (accountId: string) => ({
    gsi1pk: `ACCOUNT#${accountId}`,
    gsi1skPrefix: 'TRANSACTION#',
  }),
  transactionsByDate: (userId: string, date: string) => ({
    gsi2pk: `USER#${userId}`,
    gsi2sk: `DATE#${date}#TRANSACTION`,
  }),

  // Debt Share patterns
  debtShare: (creditorId: string, debtShareId: string) => ({
    pk: `USER#${creditorId}`,
    sk: `DEBT_SHARE#${debtShareId}`,
  }),
  debtSharesByCreditor: (creditorId: string) => ({
    pk: `USER#${creditorId}`,
    skPrefix: 'DEBT_SHARE#',
  }),
  debtSharesByDebtor: (debtorId: string) => ({
    gsi1pk: `DEBTOR#${debtorId}`,
    gsi1skPrefix: 'DEBT_SHARE#',
  }),
  debtSharesByTransaction: (transactionId: string) => ({
    gsi2pk: `TRANSACTION#${transactionId}`,
    gsi2skPrefix: 'DEBT_SHARE#',
  }),

  // Debt Payment patterns
  debtPayment: (debtShareId: string, paymentId: string) => ({
    pk: `DEBT_SHARE#${debtShareId}`,
    sk: `PAYMENT#${paymentId}`,
  }),
  debtPaymentsByShare: (debtShareId: string) => ({
    pk: `DEBT_SHARE#${debtShareId}`,
    skPrefix: 'PAYMENT#',
  }),

  // External Person patterns
  externalPerson: (userId: string, personId: string) => ({
    pk: `USER#${userId}`,
    sk: `PERSON#${personId}`,
  }),
  externalPersonsByUser: (userId: string) => ({
    pk: `USER#${userId}`,
    skPrefix: 'PERSON#',
  }),
  externalPersonByEmail: (email: string) => ({
    gsi1pk: `EMAIL#${email}`,
    gsi1sk: `PERSON`,
  }),
} as const;

// DynamoDB item type mappings
export interface UserItem extends DynamoDBItem {
  entityType: 'USER';
  userId: string;
  email: string;
  name: string;
  defaultCurrency: string;
  monthStartDay: number;
}

export interface AccountItem extends DynamoDBItem {
  entityType: 'ACCOUNT';
  accountId: string;
  userId: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash';
  balanceMinor: number;
  currency: string;
  isActive: boolean;
  institution?: string;
  lastFour?: string;
}

export interface CategoryItem extends DynamoDBItem {
  entityType: 'CATEGORY';
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
}

export interface BudgetItem extends DynamoDBItem {
  entityType: 'BUDGET';
  budgetId: string;
  userId: string;
  month: string; // YYYY-MM format
  plannedIncomeMinor: number;
  actualIncomeMinor: number;
  totalAllocatedMinor: number;
  status: 'draft' | 'active' | 'closed';
}

export interface CategoryAllocationItem extends DynamoDBItem {
  entityType: 'CATEGORY_ALLOCATION';
  allocationId: string;
  budgetId: string;
  categoryId: string;
  allocationType: 'fixed' | 'percentage';
  allocationValue: number;
  allocatedMinor: number;
  spentMinor: number;
  remainingMinor: number;
  rollover: boolean;
}

export interface TransactionItem extends DynamoDBItem {
  entityType: 'TRANSACTION';
  transactionId: string;
  userId: string;
  accountId: string;
  date: string; // ISO date string
  amountMinor: number;
  type: 'income' | 'expense' | 'transfer';
  status: 'pending' | 'cleared' | 'reconciled';
  counterparty?: string;
  description?: string;
  splits: string; // JSON stringified TransactionSplit[]
  attachmentIds?: string[]; // Array of attachment IDs
  recurringTransactionId?: string;
}

export interface DebtShareItem extends DynamoDBItem {
  entityType: 'DEBT_SHARE';
  debtShareId: string;
  creditorId: string;
  debtorId: string;
  transactionId: string;
  amountMinor: number;
  status: 'pending' | 'partial' | 'paid';
}

export interface DebtPaymentItem extends DynamoDBItem {
  entityType: 'DEBT_PAYMENT';
  paymentId: string;
  debtShareId: string;
  payerId: string;
  payeeId: string;
  amountMinor: number;
  paymentDate: string; // ISO date string
  note?: string;
  transactionId?: string;
}

export interface ExternalPersonItem extends DynamoDBItem {
  entityType: 'EXTERNAL_PERSON';
  personId: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

// Union type for all DynamoDB items
export type AnyDynamoDBItem =
  | UserItem
  | AccountItem
  | CategoryItem
  | BudgetItem
  | CategoryAllocationItem
  | TransactionItem
  | DebtShareItem
  | DebtPaymentItem
  | ExternalPersonItem;

// Utility type to extract entity type from item
export type EntityTypeFromItem<T extends AnyDynamoDBItem> = T['entityType'];

// Query parameters for DynamoDB operations
export interface QueryParams {
  pk: string;
  sk?: string;
  skPrefix?: string;
  gsi1pk?: string;
  gsi1sk?: string;
  gsi1skPrefix?: string;
  gsi2pk?: string;
  gsi2sk?: string;
  gsi2skPrefix?: string;
  indexName?: 'GSI1' | 'GSI2';
  limit?: number;
  lastEvaluatedKey?: Record<string, unknown>;
  filterExpression?: string;
  expressionAttributeValues?: Record<string, unknown>;
  expressionAttributeNames?: Record<string, string>;
  scanIndexForward?: boolean; // true for ascending, false for descending
}

// DynamoDB table configuration
export interface DynamoDBTableConfig {
  tableName: string;
  partitionKey: string;
  sortKey: string;
  gsi1Name: string;
  gsi1PartitionKey: string;
  gsi1SortKey: string;
  gsi2Name: string;
  gsi2PartitionKey: string;
  gsi2SortKey: string;
}

// Default table configuration
export const DEFAULT_TABLE_CONFIG: DynamoDBTableConfig = {
  tableName: process.env.DYNAMODB_TABLE_NAME ?? 'personal-budget',
  partitionKey: 'pk',
  sortKey: 'sk',
  gsi1Name: 'GSI1',
  gsi1PartitionKey: 'gsi1pk',
  gsi1SortKey: 'gsi1sk',
  gsi2Name: 'GSI2',
  gsi2PartitionKey: 'gsi2pk',
  gsi2SortKey: 'gsi2sk',
};

// Conversion utilities
export const DynamoDBConverters = {
  // Convert domain entity to DynamoDB item
  userToItem: (user: User): UserItem => {
    const item: UserItem = {
      ...KeyPatterns.user(user.userId),
      entityType: 'USER',
      userId: user.userId,
      email: user.email,
      name: user.name,
      defaultCurrency: user.defaultCurrency,
      monthStartDay: user.monthStartDay,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
    if (user.email) {
      item.gsi1pk = `EMAIL#${user.email}`;
      item.gsi1sk = 'USER';
    }
    return item;
  },

  // Convert DynamoDB item to domain entity
  itemToUser: (item: UserItem): User => ({
    userId: item.userId,
    email: item.email,
    name: item.name,
    defaultCurrency: item.defaultCurrency,
    monthStartDay: item.monthStartDay,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }),

  accountToItem: (account: Account): AccountItem => ({
    ...KeyPatterns.account(account.userId, account.accountId),
    entityType: 'ACCOUNT',
    accountId: account.accountId,
    userId: account.userId,
    name: account.name,
    type: account.type,
    balanceMinor: account.balanceMinor,
    currency: account.currency,
    isActive: account.isActive,
    institution: account.institution,
    lastFour: account.lastFour,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  }),

  itemToAccount: (item: AccountItem): Account => ({
    accountId: item.accountId,
    userId: item.userId,
    name: item.name,
    type: item.type,
    balanceMinor: item.balanceMinor,
    currency: item.currency,
    isActive: item.isActive,
    institution: item.institution,
    lastFour: item.lastFour,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }),

  categoryToItem: (category: Category): CategoryItem => ({
    ...KeyPatterns.category(category.userId, category.categoryId),
    entityType: 'CATEGORY',
    categoryId: category.categoryId,
    userId: category.userId,
    name: category.name,
    type: category.type,
    parentCategoryId: category.parentCategoryId,
    icon: category.icon,
    color: category.color,
    budgetingMethod: category.budgetingMethod,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }),

  itemToCategory: (item: CategoryItem): Category => ({
    categoryId: item.categoryId,
    userId: item.userId,
    name: item.name,
    type: item.type,
    parentCategoryId: item.parentCategoryId,
    icon: item.icon,
    color: item.color,
    budgetingMethod: item.budgetingMethod,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }),

  budgetToItem: (budget: Budget): BudgetItem => ({
    ...KeyPatterns.budget(budget.userId, budget.budgetId),
    gsi1pk: `USER#${budget.userId}`,
    gsi1sk: `BUDGET_MONTH#${budget.month}`,
    entityType: 'BUDGET',
    budgetId: budget.budgetId,
    userId: budget.userId,
    month: budget.month,
    plannedIncomeMinor: budget.plannedIncomeMinor,
    actualIncomeMinor: budget.actualIncomeMinor,
    totalAllocatedMinor: budget.totalAllocatedMinor,
    status: budget.status,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  }),

  itemToBudget: (item: BudgetItem): Budget => ({
    budgetId: item.budgetId,
    userId: item.userId,
    month: item.month,
    plannedIncomeMinor: item.plannedIncomeMinor,
    actualIncomeMinor: item.actualIncomeMinor,
    totalAllocatedMinor: item.totalAllocatedMinor,
    status: item.status,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }),

  allocationToItem: (allocation: CategoryAllocation): CategoryAllocationItem => ({
    ...KeyPatterns.allocation(allocation.budgetId, allocation.allocationId),
    gsi1pk: `BUDGET#${allocation.budgetId}`,
    gsi1sk: `CATEGORY#${allocation.categoryId}`,
    entityType: 'CATEGORY_ALLOCATION',
    allocationId: allocation.allocationId,
    budgetId: allocation.budgetId,
    categoryId: allocation.categoryId,
    allocationType: allocation.allocationType,
    allocationValue: allocation.allocationValue,
    allocatedMinor: allocation.allocatedMinor,
    spentMinor: allocation.spentMinor,
    remainingMinor: allocation.remainingMinor,
    rollover: allocation.rollover,
    createdAt: allocation.createdAt.toISOString(),
    updatedAt: allocation.updatedAt.toISOString(),
  }),

  itemToAllocation: (item: CategoryAllocationItem): CategoryAllocation => ({
    allocationId: item.allocationId,
    budgetId: item.budgetId,
    categoryId: item.categoryId,
    allocationType: item.allocationType,
    allocationValue: item.allocationValue,
    allocatedMinor: item.allocatedMinor,
    spentMinor: item.spentMinor,
    remainingMinor: item.remainingMinor,
    rollover: item.rollover,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }),

  transactionToItem: (transaction: Transaction): TransactionItem => {
    const dateKey = transaction.date.toISOString().split('T')[0]; // YYYY-MM-DD
    return {
      ...KeyPatterns.transaction(transaction.userId, transaction.transactionId),
      gsi1pk: `ACCOUNT#${transaction.accountId}`,
      gsi1sk: `TRANSACTION#${transaction.transactionId}`,
      gsi2pk: `USER#${transaction.userId}`,
      gsi2sk: `DATE#${dateKey}#TRANSACTION#${transaction.transactionId}`,
      entityType: 'TRANSACTION',
      transactionId: transaction.transactionId,
      userId: transaction.userId,
      accountId: transaction.accountId,
      date: transaction.date.toISOString(),
      amountMinor: transaction.amountMinor,
      type: transaction.type,
      status: transaction.status,
      counterparty: transaction.counterparty,
      description: transaction.description,
      splits: JSON.stringify(transaction.splits),
      attachmentIds: transaction.attachmentIds,
      recurringTransactionId: transaction.recurringTransactionId,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  },

  itemToTransaction: (item: TransactionItem): Transaction => ({
    transactionId: item.transactionId,
    userId: item.userId,
    accountId: item.accountId,
    date: new Date(item.date),
    amountMinor: item.amountMinor,
    type: item.type,
    status: item.status,
    counterparty: item.counterparty,
    description: item.description,
    splits: JSON.parse(item.splits),
    attachmentIds: item.attachmentIds,
    recurringTransactionId: item.recurringTransactionId,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }),

  debtShareToItem: (debtShare: DebtShare): DebtShareItem => ({
    ...KeyPatterns.debtShare(debtShare.creditorId, debtShare.debtShareId),
    gsi1pk: `DEBTOR#${debtShare.debtorId}`,
    gsi1sk: `DEBT_SHARE#${debtShare.debtShareId}`,
    gsi2pk: `TRANSACTION#${debtShare.transactionId}`,
    gsi2sk: `DEBT_SHARE#${debtShare.debtShareId}`,
    entityType: 'DEBT_SHARE',
    debtShareId: debtShare.debtShareId,
    creditorId: debtShare.creditorId,
    debtorId: debtShare.debtorId,
    transactionId: debtShare.transactionId,
    amountMinor: debtShare.amountMinor,
    status: debtShare.status,
    createdAt: debtShare.createdAt.toISOString(),
    updatedAt: debtShare.updatedAt.toISOString(),
  }),

  itemToDebtShare: (item: DebtShareItem): DebtShare => ({
    debtShareId: item.debtShareId,
    creditorId: item.creditorId,
    debtorId: item.debtorId,
    transactionId: item.transactionId,
    amountMinor: item.amountMinor,
    status: item.status,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }),

  debtPaymentToItem: (debtPayment: DebtPayment): DebtPaymentItem => ({
    ...KeyPatterns.debtPayment(debtPayment.debtShareId, debtPayment.paymentId),
    entityType: 'DEBT_PAYMENT',
    paymentId: debtPayment.paymentId,
    debtShareId: debtPayment.debtShareId,
    payerId: debtPayment.payerId,
    payeeId: debtPayment.payeeId,
    amountMinor: debtPayment.amountMinor,
    paymentDate: debtPayment.paymentDate.toISOString(),
    note: debtPayment.note,
    transactionId: debtPayment.transactionId,
    createdAt: debtPayment.createdAt.toISOString(),
    updatedAt: debtPayment.updatedAt.toISOString(),
  }),

  itemToDebtPayment: (item: DebtPaymentItem): DebtPayment => ({
    paymentId: item.paymentId,
    debtShareId: item.debtShareId,
    payerId: item.payerId,
    payeeId: item.payeeId,
    amountMinor: item.amountMinor,
    paymentDate: new Date(item.paymentDate),
    note: item.note,
    transactionId: item.transactionId,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }),

  externalPersonToItem: (person: ExternalPerson): ExternalPersonItem => {
    const item: ExternalPersonItem = {
      ...KeyPatterns.externalPerson(person.userId, person.personId),
      entityType: 'EXTERNAL_PERSON',
      personId: person.personId,
      userId: person.userId,
      name: person.name,
      email: person.email,
      phone: person.phone,
      isActive: person.isActive,
      createdAt: person.createdAt.toISOString(),
      updatedAt: person.updatedAt.toISOString(),
    };

    // Add GSI1 for email lookup if email exists
    if (person.email) {
      item.gsi1pk = `EMAIL#${person.email}`;
      item.gsi1sk = 'PERSON';
    }

    return item;
  },

  itemToExternalPerson: (item: ExternalPersonItem): ExternalPerson => ({
    personId: item.personId,
    userId: item.userId,
    name: item.name,
    email: item.email,
    phone: item.phone,
    isActive: item.isActive,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }),
};
