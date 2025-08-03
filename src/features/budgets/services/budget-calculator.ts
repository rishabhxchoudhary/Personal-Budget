import { Budget, CategoryAllocation, BusinessError } from '@/shared/types/common';

export interface BudgetSummary {
  totalIncomeMinor: number;
  totalAllocatedMinor: number;
  totalSpentMinor: number;
  totalRemainingMinor: number;
  allocationPercentage: number;
  spendingPercentage: number;
  unallocatedMinor: number;
}

export interface CategorySummary {
  categoryId: string;
  allocatedMinor: number;
  spentMinor: number;
  remainingMinor: number;
  usagePercentage: number;
  allocationPercentage: number;
  isOverspent: boolean;
}

export interface AllocationValidation {
  isValid: boolean;
  errors: string[];
  totalFixedMinor: number;
  totalPercentage: number;
  projectedTotalMinor: number;
}

export interface BudgetComparison {
  incomeChange: number;
  incomeChangePercentage: number;
  allocationChange: number;
  allocationChangePercentage: number;
  spendingChange: number;
  spendingChangePercentage: number;
}

export interface SpendingProjection {
  projectedSpendingMinor: number;
  projectedRemainingMinor: number;
  daysInMonth: number;
  daysElapsed: number;
  dailySpendingRate: number;
  categoriesAtRisk: string[];
}

export class BudgetCalculator {
  calculateTotalAllocated(allocations: CategoryAllocation[], budgetIncomeMinor: number): number {
    let total = 0;

    for (const allocation of allocations) {
      if (allocation.allocationType === 'fixed') {
        total += allocation.allocatedMinor;
      } else {
        const amount = this.calculatePercentageAllocation(
          allocation.allocationValue,
          budgetIncomeMinor,
        );
        total += amount;
      }
    }

    return Math.round(total);
  }

  calculateRemainingBudget(budget: Budget, allocations: CategoryAllocation[]): number {
    const totalAllocated = this.calculateTotalAllocated(allocations, budget.plannedIncomeMinor);
    return budget.plannedIncomeMinor - totalAllocated;
  }

  calculatePercentageAllocation(percentage: number, budgetIncomeMinor: number): number {
    if (percentage < 0) {
      throw new BusinessError('Percentage cannot be negative', 'NEGATIVE_PERCENTAGE');
    }

    if (percentage > 100) {
      throw new BusinessError('Percentage cannot exceed 100', 'PERCENTAGE_TOO_HIGH');
    }

    return Math.round((percentage / 100) * budgetIncomeMinor);
  }

  calculateAllocationPercentage(allocationMinor: number, budgetIncomeMinor: number): number {
    if (budgetIncomeMinor === 0) {
      return 0;
    }

    const percentage = (allocationMinor / budgetIncomeMinor) * 100;
    return Math.round(percentage * 100) / 100; // Round to 2 decimal places
  }

  calculateCategoryRemaining(allocation: CategoryAllocation): number {
    return allocation.allocatedMinor - allocation.spentMinor;
  }

  calculateBudgetSummary(budget: Budget, allocations: CategoryAllocation[]): BudgetSummary {
    const totalAllocated = this.calculateTotalAllocated(allocations, budget.plannedIncomeMinor);

    const totalSpent = allocations.reduce((sum, a) => sum + a.spentMinor, 0);

    const totalRemaining = totalAllocated - totalSpent;
    const unallocated = budget.plannedIncomeMinor - totalAllocated;

    const allocationPercentage =
      budget.plannedIncomeMinor > 0 ? (totalAllocated / budget.plannedIncomeMinor) * 100 : 0;

    const spendingPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    return {
      totalIncomeMinor: budget.plannedIncomeMinor,
      totalAllocatedMinor: totalAllocated,
      totalSpentMinor: totalSpent,
      totalRemainingMinor: totalRemaining,
      allocationPercentage: Math.round(allocationPercentage * 100) / 100,
      spendingPercentage: Math.round(spendingPercentage * 100) / 100,
      unallocatedMinor: unallocated,
    };
  }

  calculateCategorySummary(
    allocation: CategoryAllocation,
    budgetIncomeMinor: number,
  ): CategorySummary {
    const remaining = this.calculateCategoryRemaining(allocation);
    const usagePercentage =
      allocation.allocatedMinor > 0 ? (allocation.spentMinor / allocation.allocatedMinor) * 100 : 0;

    const allocationPercentage = this.calculateAllocationPercentage(
      allocation.allocatedMinor,
      budgetIncomeMinor,
    );

    return {
      categoryId: allocation.categoryId,
      allocatedMinor: allocation.allocatedMinor,
      spentMinor: allocation.spentMinor,
      remainingMinor: remaining,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      allocationPercentage,
      isOverspent: remaining < 0,
    };
  }

  validateAllocationTotals(
    allocations: CategoryAllocation[],
    budgetIncomeMinor: number,
  ): AllocationValidation {
    const errors: string[] = [];
    let totalFixedMinor = 0;
    let totalPercentage = 0;

    for (const allocation of allocations) {
      if (allocation.allocationType === 'fixed') {
        totalFixedMinor += allocation.allocatedMinor;
      } else {
        totalPercentage += allocation.allocationValue;
      }
    }

    // Calculate percentage amount without validation to allow checking over-allocation
    const percentageMinor = Math.round((totalPercentage / 100) * budgetIncomeMinor);
    const projectedTotal = totalFixedMinor + percentageMinor;

    if (totalPercentage > 100) {
      errors.push('Total percentage allocations exceed 100%');
    }

    if (projectedTotal > budgetIncomeMinor) {
      errors.push('Total allocations exceed budget income');
    }

    return {
      isValid: errors.length === 0,
      errors,
      totalFixedMinor,
      totalPercentage,
      projectedTotalMinor: projectedTotal,
    };
  }

  calculateRolloverAmount(allocation: CategoryAllocation): number {
    if (!allocation.rollover) {
      return 0;
    }

    const remaining = this.calculateCategoryRemaining(allocation);
    return remaining > 0 ? remaining : 0;
  }

  calculateTotalRollover(allocations: CategoryAllocation[]): number {
    return allocations.reduce((total, a) => total + this.calculateRolloverAmount(a), 0);
  }

  compareBudgets(currentBudget: Budget, previousBudget: Budget): BudgetComparison {
    const incomeChange = currentBudget.plannedIncomeMinor - previousBudget.plannedIncomeMinor;

    const allocationChange = currentBudget.totalAllocatedMinor - previousBudget.totalAllocatedMinor;

    const spendingChange = currentBudget.actualIncomeMinor - previousBudget.actualIncomeMinor;

    const incomeChangePercentage =
      previousBudget.plannedIncomeMinor > 0
        ? (incomeChange / previousBudget.plannedIncomeMinor) * 100
        : 0;

    const allocationChangePercentage =
      previousBudget.totalAllocatedMinor > 0
        ? (allocationChange / previousBudget.totalAllocatedMinor) * 100
        : 0;

    const spendingChangePercentage =
      previousBudget.actualIncomeMinor > 0
        ? (spendingChange / previousBudget.actualIncomeMinor) * 100
        : 0;

    return {
      incomeChange,
      incomeChangePercentage: Math.round(incomeChangePercentage * 100) / 100,
      allocationChange,
      allocationChangePercentage: Math.round(allocationChangePercentage * 100) / 100,
      spendingChange,
      spendingChangePercentage: Math.round(spendingChangePercentage * 100) / 100,
    };
  }

  projectSpending(
    budget: Budget,
    allocations: CategoryAllocation[],
    currentDate: Date,
  ): SpendingProjection {
    const monthStart = new Date(budget.month + '-01');
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const daysInMonth = monthEnd.getDate();
    const daysElapsed = Math.min(currentDate.getDate(), daysInMonth);

    const totalSpent = allocations.reduce((sum, a) => sum + a.spentMinor, 0);

    const dailyRate = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
    const projectedSpending = Math.round(dailyRate * daysInMonth);

    const categoriesAtRisk: string[] = [];

    for (const allocation of allocations) {
      if (allocation.allocatedMinor === 0) continue;

      const categoryDailyRate = daysElapsed > 0 ? allocation.spentMinor / daysElapsed : 0;

      const projectedCategorySpending = categoryDailyRate * daysInMonth;

      if (projectedCategorySpending > allocation.allocatedMinor) {
        categoriesAtRisk.push(allocation.categoryId);
      }
    }

    return {
      projectedSpendingMinor: projectedSpending,
      projectedRemainingMinor: budget.totalAllocatedMinor - projectedSpending,
      daysInMonth,
      daysElapsed,
      dailySpendingRate: Math.round(dailyRate),
      categoriesAtRisk,
    };
  }
}
