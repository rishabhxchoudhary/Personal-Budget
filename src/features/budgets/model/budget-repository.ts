import { InMemoryRepository } from '@/shared/repositories/in-memory-repository';
import { Budget, BudgetRepository as IBudgetRepository } from '@/shared/types/common';
import { BusinessError } from '@/shared/types/common';
import { isValidMonth, isMonthInFuture } from '@/shared/utils/date-helpers';
import { v4 as uuidv4 } from 'uuid';

export class BudgetRepository
  extends InMemoryRepository<Budget, Omit<Budget, 'budgetId' | 'createdAt' | 'updatedAt'>>
  implements IBudgetRepository
{
  protected getEntityId(entity: Budget): string {
    return entity.budgetId;
  }

  async create(
    input: Omit<Budget, 'budgetId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Budget> {
    // Validate input
    this.validateBudgetInput(input);

    // Check for duplicate active budget
    await this.checkDuplicateBudget(input.userId, input.month, input.status);

    // Create budget with generated ID
    const budget: Budget = {
      ...input,
      budgetId: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return super.create(budget);
  }

  async findByUserIdAndMonth(userId: string, month: string): Promise<Budget | null> {
    const budgets = await this.findAll();

    const found = budgets.find(
      (b) => b.userId === userId && b.month === month
    );

    return found || null;
  }

  async findByUserId(userId: string): Promise<Budget[]> {
    const budgets = await this.findAll();

    const userBudgets = budgets
      .filter((b) => b.userId === userId)
      .sort((a, b) => a.month.localeCompare(b.month));

    return userBudgets;
  }

  async update(
    budgetId: string,
    updates: Partial<Budget>,
  ): Promise<Budget> {
    const existing = await this.findById(budgetId);
    if (!existing) {
      throw new BusinessError(`Budget with id ${budgetId} not found`, 'BUDGET_NOT_FOUND');
    }

    // Prevent updating immutable fields
    this.validateUpdates(updates);

    // Validate new values if provided
    if (updates.plannedIncomeMinor !== undefined) {
      this.validateIncome(updates.plannedIncomeMinor);
    }
    if (updates.actualIncomeMinor !== undefined) {
      this.validateIncome(updates.actualIncomeMinor);
    }
    if (updates.totalAllocatedMinor !== undefined) {
      this.validateIncome(updates.totalAllocatedMinor);
    }

    return super.update(budgetId, updates);
  }

  private validateBudgetInput(input: Omit<Budget, 'budgetId' | 'createdAt' | 'updatedAt'>): void {
    // Validate month format
    if (!isValidMonth(input.month)) {
      throw new BusinessError(
        'Invalid month format. Use YYYY-MM',
        'INVALID_MONTH_FORMAT'
      );
    }

    // Check if month is in future
    if (isMonthInFuture(input.month)) {
      throw new BusinessError(
        'Cannot create budget for future months',
        'FUTURE_MONTH_NOT_ALLOWED'
      );
    }

    // Validate income amounts
    this.validateIncome(input.plannedIncomeMinor);
    this.validateIncome(input.actualIncomeMinor);
    this.validateIncome(input.totalAllocatedMinor);

    // Validate status
    const validStatuses: Budget['status'][] = ['draft', 'active', 'closed'];
    if (!validStatuses.includes(input.status)) {
      throw new BusinessError(
        'Invalid budget status',
        'INVALID_BUDGET_STATUS'
      );
    }
  }

  private validateIncome(amount: number): void {
    if (amount < 0) {
      throw new BusinessError(
        'Income amounts must be non-negative',
        'NEGATIVE_INCOME_NOT_ALLOWED'
      );
    }

    if (!Number.isFinite(amount)) {
      throw new BusinessError(
        'Income amount must be a valid number',
        'INVALID_INCOME_AMOUNT'
      );
    }

    if (amount > Number.MAX_SAFE_INTEGER) {
      throw new BusinessError(
        'Income amount exceeds maximum allowed value',
        'INCOME_TOO_LARGE'
      );
    }
  }

  private async checkDuplicateBudget(
    userId: string,
    month: string,
    status: Budget['status']
  ): Promise<void> {
    const existing = await this.findByUserIdAndMonth(userId, month);

    if (!existing) return;

    if (existing.status === 'active' && status === 'active') {
      throw new BusinessError(
        'Only one active budget allowed per month',
        'DUPLICATE_ACTIVE_BUDGET'
      );
    }
  }

  private validateUpdates(updates: Partial<Budget>): void {
    const immutableFields = ['budgetId', 'userId', 'month'];

    for (const field of immutableFields) {
      if (field in updates) {
        throw new BusinessError(
          `Cannot update ${field}`,
          'IMMUTABLE_FIELD_UPDATE'
        );
      }
    }
  }
}
