import { v4 as uuidv4 } from 'uuid';
import {
  RecurringTransaction,
  CreateRecurringTransactionInput,
  RecurringTransactionTemplate,
  RecurringTransactionSplit,
  BusinessError,
  ValidationError,
} from '@/shared/types/common';

export class RecurringTransactionValidationError extends BusinessError {
  constructor(message: string, details?: ValidationError[]) {
    super(message, 'RECURRING_TRANSACTION_VALIDATION_ERROR', details);
  }
}

export function createRecurringTransactionId(): string {
  return uuidv4();
}

export function createRecurringTransaction(
  input: CreateRecurringTransactionInput & { userId: string; recurringId?: string },
): RecurringTransaction {
  const now = new Date();
  const recurringId = input.recurringId || createRecurringTransactionId();

  // Calculate initial next run date
  const nextRunAt = calculateNextRunDate(input.schedule, now);

  const recurringTransaction: RecurringTransaction = {
    recurringId,
    userId: input.userId,
    name: input.name,
    template: {
      ...input.template,
      splits: input.template.splits.map((split) => ({
        ...split,
        categoryId: split.categoryId || undefined,
      })),
    },
    schedule: input.schedule,
    nextRunAt,
    lastRunAt: undefined,
    isActive: true,
    autoPost: input.autoPost || false,
    createdAt: now,
    updatedAt: now,
  };

  return recurringTransaction;
}

export function validateRecurringTransaction(
  recurringTransaction: Partial<RecurringTransaction>,
): void {
  if (!recurringTransaction.name || recurringTransaction.name.trim().length === 0) {
    throw new RecurringTransactionValidationError('Name is required');
  }

  if (recurringTransaction.name.length > 100) {
    throw new RecurringTransactionValidationError('Name must be 100 characters or less');
  }

  if (!recurringTransaction.template) {
    throw new RecurringTransactionValidationError('Template is required');
  }

  validateTemplate(recurringTransaction.template);

  if (!recurringTransaction.schedule || recurringTransaction.schedule.trim().length === 0) {
    throw new RecurringTransactionValidationError('Schedule is required');
  }

  // Basic schedule validation - for now just check it's not empty
  // In a real implementation, you'd validate the RRULE format
  if (!isValidSchedule(recurringTransaction.schedule)) {
    throw new RecurringTransactionValidationError('Invalid schedule format');
  }
}

export function validateTemplate(template: RecurringTransactionTemplate): void {
  if (!template.accountId || template.accountId.trim().length === 0) {
    throw new RecurringTransactionValidationError('Template account ID is required');
  }

  if (!template.amountMinor || template.amountMinor <= 0) {
    throw new RecurringTransactionValidationError('Template amount must be positive');
  }

  if (!template.type || !['income', 'expense', 'transfer'].includes(template.type)) {
    throw new RecurringTransactionValidationError(
      'Template type must be income, expense, or transfer',
    );
  }

  if (!template.splits || template.splits.length === 0) {
    throw new RecurringTransactionValidationError('Template must have at least one split');
  }

  // Validate splits
  let totalSplitAmount = 0;
  for (const split of template.splits) {
    validateSplit(split);
    totalSplitAmount += split.amountMinor;
  }

  if (totalSplitAmount !== template.amountMinor) {
    throw new RecurringTransactionValidationError(
      `Split amounts (${totalSplitAmount}) must equal template amount (${template.amountMinor})`,
    );
  }

  if (template.counterparty && template.counterparty.length > 100) {
    throw new RecurringTransactionValidationError(
      'Template counterparty must be 100 characters or less',
    );
  }

  if (template.description && template.description.length > 255) {
    throw new RecurringTransactionValidationError(
      'Template description must be 255 characters or less',
    );
  }
}

export function validateSplit(split: RecurringTransactionSplit): void {
  if (!split.amountMinor || split.amountMinor <= 0) {
    throw new RecurringTransactionValidationError('Split amount must be positive');
  }

  if (split.note && split.note.length > 255) {
    throw new RecurringTransactionValidationError('Split note must be 255 characters or less');
  }
}

export function isValidSchedule(schedule: string): boolean {
  // Basic validation - in a real implementation you'd use a proper RRULE parser
  // For now, support simple formats like:
  // - "FREQ=DAILY"
  // - "FREQ=WEEKLY"
  // - "FREQ=MONTHLY"
  // - "FREQ=YEARLY"
  // - "FREQ=MONTHLY;BYMONTHDAY=15"
  // - "FREQ=WEEKLY;BYDAY=MO,WE,FR"

  if (!schedule.startsWith('FREQ=')) {
    return false;
  }

  const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
  const parts = schedule.split(';');
  const freqPart = parts[0];
  const frequency = freqPart.split('=')[1];

  return validFrequencies.includes(frequency);
}

export function calculateNextRunDate(schedule: string, fromDate: Date = new Date()): Date {
  // Simple implementation - in a real app you'd use a proper RRULE library
  const nextRun = new Date(fromDate);

  if (schedule.includes('FREQ=DAILY')) {
    nextRun.setDate(nextRun.getDate() + 1);
  } else if (schedule.includes('FREQ=WEEKLY')) {
    nextRun.setDate(nextRun.getDate() + 7);
  } else if (schedule.includes('FREQ=MONTHLY')) {
    if (schedule.includes('BYMONTHDAY=')) {
      // Extract the day of month
      const dayMatch = schedule.match(/BYMONTHDAY=(\d+)/);
      if (dayMatch) {
        const dayOfMonth = parseInt(dayMatch[1], 10);
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(dayOfMonth);
      } else {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    } else {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
  } else if (schedule.includes('FREQ=YEARLY')) {
    nextRun.setFullYear(nextRun.getFullYear() + 1);
  } else {
    // Default to daily if we can't parse
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun;
}

export function updateLastRunAt(
  recurringTransaction: RecurringTransaction,
  lastRunAt: Date,
): RecurringTransaction {
  return {
    ...recurringTransaction,
    lastRunAt,
    nextRunAt: calculateNextRunDate(recurringTransaction.schedule, lastRunAt),
    updatedAt: new Date(),
  };
}

export function deactivateRecurringTransaction(
  recurringTransaction: RecurringTransaction,
): RecurringTransaction {
  return {
    ...recurringTransaction,
    isActive: false,
    updatedAt: new Date(),
  };
}

export function createTransactionFromTemplate(
  recurringTransaction: RecurringTransaction,
  userId: string,
  overrides: Partial<RecurringTransactionTemplate> = {},
): {
  userId: string;
  accountId: string;
  date: Date;
  amountMinor: number;
  type: 'income' | 'expense' | 'transfer';
  status: 'pending';
  counterparty?: string;
  description?: string;
  splits: Array<{
    splitId: string;
    categoryId: string;
    amountMinor: number;
    note?: string;
  }>;
  recurringTransactionId: string;
} {
  const template = { ...recurringTransaction.template, ...overrides };

  return {
    userId,
    accountId: template.accountId,
    date: new Date(),
    amountMinor: template.amountMinor,
    type: template.type,
    status: 'pending' as const,
    counterparty: template.counterparty,
    description: template.description,
    splits: template.splits.map((split) => ({
      splitId: uuidv4(),
      categoryId: split.categoryId || '',
      amountMinor: split.amountMinor,
      note: split.note,
    })),
    recurringTransactionId: recurringTransaction.recurringId,
  };
}

export function isDue(
  recurringTransaction: RecurringTransaction,
  asOfDate: Date = new Date(),
): boolean {
  return recurringTransaction.isActive && recurringTransaction.nextRunAt <= asOfDate;
}

export function getDaysUntilDue(
  recurringTransaction: RecurringTransaction,
  fromDate: Date = new Date(),
): number {
  const timeDiff = recurringTransaction.nextRunAt.getTime() - fromDate.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}
