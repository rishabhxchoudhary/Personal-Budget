import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const positiveIntegerSchema = z.number().int().positive('Must be a positive integer');
export const nonNegativeIntegerSchema = z.number().int().min(0, 'Must be non-negative');
export const emailSchema = z.string().email('Invalid email format');
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
export const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format');
export const currencySchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'CNY',
  'INR',
  'KWD',
  'BHD',
  'OMR',
  'TND',
]);

// Account schemas
export const accountTypeSchema = z.enum(['checking', 'savings', 'credit', 'cash']);

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  type: accountTypeSchema,
  balanceMinor: nonNegativeIntegerSchema,
  currency: currencySchema,
  isActive: z.boolean().optional().default(true),
  institution: z.string().max(100, 'Institution must be 100 characters or less').optional(),
  lastFour: z
    .string()
    .regex(/^\d{4}$/, 'Last four must be exactly 4 digits')
    .optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

// Category schemas
export const categoryTypeSchema = z.enum(['income', 'expense', 'transfer', 'debt']);
export const budgetingMethodSchema = z.enum(['fixed', 'percentage', 'envelope', 'goal']);

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  type: categoryTypeSchema,
  parentCategoryId: uuidSchema.optional(),
  icon: z.string().max(50, 'Icon must be 50 characters or less').optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color')
    .optional(),
  budgetingMethod: budgetingMethodSchema,
  isActive: z.boolean().optional().default(true),
  sortOrder: nonNegativeIntegerSchema.optional().default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

// Budget schemas
export const budgetStatusSchema = z.enum(['draft', 'active', 'closed']);

export const createBudgetSchema = z.object({
  month: monthSchema,
  plannedIncomeMinor: nonNegativeIntegerSchema,
  actualIncomeMinor: nonNegativeIntegerSchema.optional().default(0),
  totalAllocatedMinor: nonNegativeIntegerSchema.optional().default(0),
  status: budgetStatusSchema.optional().default('draft'),
});

export const updateBudgetSchema = createBudgetSchema.partial().omit({ month: true });

// Category Allocation schemas
export const allocationTypeSchema = z.enum(['fixed', 'percentage']);

export const createCategoryAllocationSchema = z.object({
  budgetId: uuidSchema,
  categoryId: uuidSchema,
  allocationType: allocationTypeSchema,
  allocationValue: z.number().positive('Allocation value must be positive'),
  rollover: z.boolean().optional().default(false),
});

export const updateCategoryAllocationSchema = createCategoryAllocationSchema
  .partial()
  .omit({ budgetId: true, categoryId: true });

// Transaction schemas
export const transactionTypeSchema = z.enum(['income', 'expense', 'transfer']);
export const transactionStatusSchema = z.enum(['pending', 'cleared', 'reconciled']);

export const transactionSplitSchema = z.object({
  categoryId: uuidSchema,
  amountMinor: positiveIntegerSchema,
  note: z.string().max(255, 'Note must be 255 characters or less').optional(),
});

export const createTransactionSchema = z.object({
  accountId: uuidSchema,
  date: dateSchema,
  amountMinor: positiveIntegerSchema,
  type: transactionTypeSchema,
  status: transactionStatusSchema.optional().default('pending'),
  counterparty: z.string().max(100, 'Counterparty must be 100 characters or less').optional(),
  description: z.string().max(255, 'Description must be 255 characters or less').optional(),
  splits: z.array(transactionSplitSchema).optional(),
  recurringTransactionId: uuidSchema.optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

// Debt schemas
export const debtStatusSchema = z.enum(['pending', 'partial', 'paid']);

export const createDebtShareSchema = z.object({
  transactionId: uuidSchema,
  debtorId: uuidSchema,
  amountMinor: positiveIntegerSchema,
});

export const updateDebtShareSchema = z.object({
  status: debtStatusSchema,
});

export const createDebtPaymentSchema = z.object({
  debtShareId: uuidSchema,
  amountMinor: positiveIntegerSchema,
  paymentDate: dateSchema,
  note: z.string().max(255, 'Note must be 255 characters or less').optional(),
  transactionId: uuidSchema.optional(),
});

// External Person schemas
export const createExternalPersonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  email: emailSchema.optional(),
  phone: z
    .string()
    .min(7, 'Phone must be at least 7 characters')
    .max(17, 'Phone must be 17 characters or less')
    .optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateExternalPersonSchema = createExternalPersonSchema.partial();

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.string().transform((val) => Math.max(1, parseInt(val) || 1)),
  limit: z.string().transform((val) => Math.min(100, Math.max(1, parseInt(val) || 10))),
});

export const transactionQuerySchema = paginationSchema.extend({
  type: transactionTypeSchema.optional(),
  accountId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  status: transactionStatusSchema.optional(),
});

export const categoryQuerySchema = paginationSchema.extend({
  type: categoryTypeSchema.optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

export const accountQuerySchema = paginationSchema.extend({
  type: accountTypeSchema.optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

export const budgetQuerySchema = paginationSchema.extend({
  status: budgetStatusSchema.optional(),
  year: z
    .string()
    .regex(/^\d{4}$/, 'Year must be 4 digits')
    .optional(),
});

export const debtQuerySchema = paginationSchema.extend({
  status: debtStatusSchema.optional(),
  type: z.enum(['owed-to-me', 'i-owe']).optional(),
});
