import {
  BudgetService,
  Budget,
  CategoryAllocation,
  AllocationInput,
  BusinessError,
  Category,
} from '@/shared/types/common';
import { BudgetRepository } from '@/features/budgets/model/budget-repository';
import { CategoryAllocationRepository } from '@/features/budgets/model/category-allocation-repository';
import { CategoryRepository } from '@/features/categories/model/category-repository';
import { BudgetCalculator } from './budget-calculator';

export class BudgetServiceImpl implements BudgetService {
  private calculator: BudgetCalculator;

  constructor(
    private budgetRepo: BudgetRepository,
    private allocationRepo: CategoryAllocationRepository,
    private categoryRepo: CategoryRepository,
  ) {
    this.calculator = new BudgetCalculator();
  }

  async createMonthlyBudget(userId: string, month: string, plannedIncome: number): Promise<Budget> {
    this.validateIncomeAmount(plannedIncome);

    const existingBudget = await this.budgetRepo.findByUserIdAndMonth(userId, month);
    if (existingBudget && existingBudget.status === 'active') {
      throw new BusinessError(
        'Active budget already exists for this month',
        'DUPLICATE_ACTIVE_BUDGET',
      );
    }

    const budget = await this.budgetRepo.create({
      userId,
      month,
      plannedIncomeMinor: plannedIncome,
      actualIncomeMinor: 0,
      totalAllocatedMinor: 0,
      status: 'draft',
    });

    return budget;
  }

  async allocateToCategory(
    budgetId: string,
    categoryId: string,
    allocation: AllocationInput,
  ): Promise<CategoryAllocation> {
    const [budget, category] = await Promise.all([
      this.getBudgetOrThrow(budgetId),
      this.getCategoryOrThrow(categoryId),
    ]);

    this.validateBudgetEditable(budget);
    this.validateCategoryActive(category);
    this.validateAllocationInput(allocation);

    const allocatedMinor = this.calculateAllocationAmount(allocation, budget.plannedIncomeMinor);

    const existingAllocation = await this.allocationRepo.findByBudgetIdAndCategoryId(
      budgetId,
      categoryId,
    );

    let result: CategoryAllocation;
    if (existingAllocation) {
      result = await this.updateExistingAllocation(existingAllocation, allocation, allocatedMinor);
    } else {
      result = await this.createNewAllocation(budgetId, categoryId, allocation, allocatedMinor);
    }

    await this.updateBudgetTotals(budget);
    return result;
  }

  async calculateRemainingBudget(budgetId: string): Promise<number> {
    const budget = await this.getBudgetOrThrow(budgetId);
    const allocations = await this.allocationRepo.findByBudgetId(budgetId);

    return this.calculator.calculateRemainingBudget(budget, allocations);
  }

  async closeBudget(budgetId: string): Promise<Budget> {
    const budget = await this.getBudgetOrThrow(budgetId);

    if (budget.status === 'closed') {
      throw new BusinessError('Budget is already closed', 'BUDGET_ALREADY_CLOSED');
    }

    return this.budgetRepo.update(budgetId, { status: 'closed' });
  }

  private validateIncomeAmount(amount: number): void {
    if (amount <= 0) {
      throw new BusinessError('Planned income must be greater than zero', 'INVALID_INCOME_AMOUNT');
    }

    if (amount > Number.MAX_SAFE_INTEGER) {
      throw new BusinessError('Income amount exceeds maximum allowed value', 'INCOME_TOO_LARGE');
    }
  }

  private async getBudgetOrThrow(budgetId: string): Promise<Budget> {
    const budget = await this.budgetRepo.findById(budgetId);
    if (!budget) {
      throw new BusinessError('Budget not found', 'BUDGET_NOT_FOUND');
    }
    return budget;
  }

  private async getCategoryOrThrow(categoryId: string): Promise<Category> {
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) {
      throw new BusinessError('Category not found', 'CATEGORY_NOT_FOUND');
    }
    return category;
  }

  private validateBudgetEditable(budget: Budget): void {
    if (budget.status === 'closed') {
      throw new BusinessError('Cannot modify closed budget', 'BUDGET_CLOSED');
    }
  }

  private validateCategoryActive(category: Category): void {
    if (!category.isActive) {
      throw new BusinessError('Cannot allocate to inactive category', 'CATEGORY_INACTIVE');
    }
  }

  private validateAllocationInput(allocation: AllocationInput): void {
    if (allocation.allocationValue < 0) {
      throw new BusinessError('Allocation value must be non-negative', 'NEGATIVE_ALLOCATION_VALUE');
    }

    if (allocation.allocationType === 'percentage' && allocation.allocationValue > 100) {
      throw new BusinessError('Percentage allocation cannot exceed 100%', 'PERCENTAGE_TOO_HIGH');
    }
  }

  private calculateAllocationAmount(allocation: AllocationInput, budgetIncome: number): number {
    if (allocation.allocationType === 'fixed') {
      return allocation.allocationValue;
    }

    return this.calculator.calculatePercentageAllocation(allocation.allocationValue, budgetIncome);
  }

  private async updateExistingAllocation(
    existing: CategoryAllocation,
    allocation: AllocationInput,
    allocatedMinor: number,
  ): Promise<CategoryAllocation> {
    return this.allocationRepo.update(existing.allocationId, {
      allocationType: allocation.allocationType,
      allocationValue: allocation.allocationValue,
      allocatedMinor,
      rollover: allocation.rollover ?? existing.rollover,
      remainingMinor: allocatedMinor - existing.spentMinor,
    });
  }

  private async createNewAllocation(
    budgetId: string,
    categoryId: string,
    allocation: AllocationInput,
    allocatedMinor: number,
  ): Promise<CategoryAllocation> {
    return this.allocationRepo.create({
      budgetId,
      categoryId,
      allocationType: allocation.allocationType,
      allocationValue: allocation.allocationValue,
      allocatedMinor,
      spentMinor: 0,
      remainingMinor: allocatedMinor,
      rollover: allocation.rollover ?? false,
    });
  }

  private async updateBudgetTotals(budget: Budget): Promise<void> {
    const allocations = await this.allocationRepo.findByBudgetId(budget.budgetId);

    const totalAllocated = this.calculator.calculateTotalAllocated(
      allocations,
      budget.plannedIncomeMinor,
    );

    await this.validateTotalAllocations(allocations, budget.plannedIncomeMinor);

    await this.budgetRepo.update(budget.budgetId, {
      totalAllocatedMinor: totalAllocated,
    });
  }

  private async validateTotalAllocations(
    allocations: CategoryAllocation[],
    budgetIncome: number,
  ): Promise<void> {
    const validation = this.calculator.validateAllocationTotals(allocations, budgetIncome);

    if (!validation.isValid) {
      throw new BusinessError(validation.errors[0], 'ALLOCATION_VALIDATION_FAILED');
    }
  }
}
