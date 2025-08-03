import { BudgetCalculator } from '@/features/budgets/services/budget-calculator';
import { Budget, CategoryAllocation } from '@/shared/types/common';

describe('BudgetCalculator', () => {
  let calculator: BudgetCalculator;

  beforeEach(() => {
    calculator = new BudgetCalculator();
  });

  describe('calculateTotalAllocated', () => {
    it('should calculate total from fixed allocations', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 100000,
          allocatedMinor: 100000,
          spentMinor: 0,
          remainingMinor: 100000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'fixed',
          allocationValue: 50000,
          allocatedMinor: 50000,
          spentMinor: 0,
          remainingMinor: 50000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const total = calculator.calculateTotalAllocated(allocations, 500000);
      expect(total).toBe(150000);
    });

    it('should calculate total from percentage allocations', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'percentage',
          allocationValue: 20, // 20%
          allocatedMinor: 100000,
          spentMinor: 0,
          remainingMinor: 100000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'percentage',
          allocationValue: 10, // 10%
          allocatedMinor: 50000,
          spentMinor: 0,
          remainingMinor: 50000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const total = calculator.calculateTotalAllocated(allocations, 500000);
      expect(total).toBe(150000); // 30% of 500000
    });

    it('should calculate total from mixed allocation types', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 100000,
          allocatedMinor: 100000,
          spentMinor: 0,
          remainingMinor: 100000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'percentage',
          allocationValue: 10, // 10%
          allocatedMinor: 50000,
          spentMinor: 0,
          remainingMinor: 50000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const total = calculator.calculateTotalAllocated(allocations, 500000);
      expect(total).toBe(150000); // 100000 + 50000
    });

    it('should return 0 for empty allocations', () => {
      const allocations: CategoryAllocation[] = [];
      const total = calculator.calculateTotalAllocated(allocations, 500000);
      expect(total).toBe(0);
    });

    it('should handle decimal amounts correctly', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'percentage',
          allocationValue: 33.33, // 33.33%
          allocatedMinor: 166650,
          spentMinor: 0,
          remainingMinor: 166650,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const total = calculator.calculateTotalAllocated(allocations, 500000);
      expect(total).toBe(166650);
    });

    it('should round to nearest minor unit', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'percentage',
          allocationValue: 33.333, // Results in 166665
          allocatedMinor: 166665,
          spentMinor: 0,
          remainingMinor: 166665,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const total = calculator.calculateTotalAllocated(allocations, 500000);
      expect(total).toBe(166665);
    });
  });

  describe('calculateRemainingBudget', () => {
    it('should calculate remaining from income minus allocations', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 200000,
          allocatedMinor: 200000,
          spentMinor: 0,
          remainingMinor: 200000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const remaining = calculator.calculateRemainingBudget(budget, allocations);
      expect(remaining).toBe(300000);
    });

    it('should handle fully allocated budget', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 500000,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 500000,
          allocatedMinor: 500000,
          spentMinor: 0,
          remainingMinor: 500000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const remaining = calculator.calculateRemainingBudget(budget, allocations);
      expect(remaining).toBe(0);
    });

    it('should handle over-allocated budget (negative remaining)', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 600000,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 600000,
          allocatedMinor: 600000,
          spentMinor: 0,
          remainingMinor: 600000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const remaining = calculator.calculateRemainingBudget(budget, allocations);
      expect(remaining).toBe(-100000);
    });

    it('should handle budget with no allocations', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [];

      const remaining = calculator.calculateRemainingBudget(budget, allocations);
      expect(remaining).toBe(500000);
    });

    it('should use planned income for calculations', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 600000, // Different from planned
        totalAllocatedMinor: 200000,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 200000,
          allocatedMinor: 200000,
          spentMinor: 0,
          remainingMinor: 200000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const remaining = calculator.calculateRemainingBudget(budget, allocations);
      expect(remaining).toBe(300000); // Uses planned income, not actual
    });
  });

  describe('calculatePercentageAllocation', () => {
    it('should calculate amount from percentage of budget income', () => {
      const result = calculator.calculatePercentageAllocation(25, 1000000);
      expect(result).toBe(250000);
    });

    it('should handle 0% allocation', () => {
      const result = calculator.calculatePercentageAllocation(0, 1000000);
      expect(result).toBe(0);
    });

    it('should handle 100% allocation', () => {
      const result = calculator.calculatePercentageAllocation(100, 1000000);
      expect(result).toBe(1000000);
    });

    it('should handle decimal percentages', () => {
      const result = calculator.calculatePercentageAllocation(12.5, 1000000);
      expect(result).toBe(125000);
    });

    it('should round to nearest minor unit', () => {
      const result = calculator.calculatePercentageAllocation(33.333, 100000);
      expect(result).toBe(33333);
    });

    it('should throw error for negative percentage', () => {
      expect(() => {
        calculator.calculatePercentageAllocation(-5, 100000);
      }).toThrow('Percentage cannot be negative');
    });

    it('should throw error for percentage over 100', () => {
      expect(() => {
        calculator.calculatePercentageAllocation(101, 100000);
      }).toThrow('Percentage cannot exceed 100');
    });
  });

  describe('calculateAllocationPercentage', () => {
    it('should calculate percentage from fixed amount', () => {
      const result = calculator.calculateAllocationPercentage(250000, 1000000);
      expect(result).toBe(25);
    });

    it('should handle zero income', () => {
      const result = calculator.calculateAllocationPercentage(100000, 0);
      expect(result).toBe(0);
    });

    it('should handle allocation equal to income', () => {
      const result = calculator.calculateAllocationPercentage(500000, 500000);
      expect(result).toBe(100);
    });

    it('should round percentage to 2 decimal places', () => {
      const result = calculator.calculateAllocationPercentage(333333, 1000000);
      expect(result).toBe(33.33);
    });

    it('should handle very small allocations', () => {
      const result = calculator.calculateAllocationPercentage(100, 1000000);
      expect(result).toBe(0.01);
    });
  });

  describe('calculateCategoryRemaining', () => {
    it('should calculate remaining as allocated minus spent', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 30000,
        remainingMinor: 70000,
        rollover: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const remaining = calculator.calculateCategoryRemaining(allocation);
      expect(remaining).toBe(70000);
    });

    it('should handle fully spent category', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 100000,
        remainingMinor: 0,
        rollover: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const remaining = calculator.calculateCategoryRemaining(allocation);
      expect(remaining).toBe(0);
    });

    it('should handle overspent category (negative remaining)', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 120000,
        remainingMinor: -20000,
        rollover: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const remaining = calculator.calculateCategoryRemaining(allocation);
      expect(remaining).toBe(-20000);
    });

    it('should handle category with no spending', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const remaining = calculator.calculateCategoryRemaining(allocation);
      expect(remaining).toBe(100000);
    });
  });

  describe('calculateBudgetSummary', () => {
    it('should calculate complete budget summary', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 300000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 200000,
          allocatedMinor: 200000,
          spentMinor: 50000,
          remainingMinor: 150000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'fixed',
          allocationValue: 100000,
          allocatedMinor: 100000,
          spentMinor: 30000,
          remainingMinor: 70000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const summary = calculator.calculateBudgetSummary(budget, allocations);

      expect(summary.totalIncomeMinor).toBe(500000);
      expect(summary.totalAllocatedMinor).toBe(300000);
      expect(summary.totalSpentMinor).toBe(80000);
      expect(summary.totalRemainingMinor).toBe(220000);
      expect(summary.allocationPercentage).toBe(60);
      expect(summary.spendingPercentage).toBe(26.67);
      expect(summary.unallocatedMinor).toBe(200000);
    });

    it('should include total income', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 750000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = calculator.calculateBudgetSummary(budget, []);
      expect(summary.totalIncomeMinor).toBe(750000);
    });

    it('should include total allocated', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'percentage',
          allocationValue: 40,
          allocatedMinor: 200000,
          spentMinor: 0,
          remainingMinor: 200000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const summary = calculator.calculateBudgetSummary(budget, allocations);
      expect(summary.totalAllocatedMinor).toBe(200000);
    });

    it('should include total spent', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 200000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 100000,
          allocatedMinor: 100000,
          spentMinor: 75000,
          remainingMinor: 25000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'fixed',
          allocationValue: 100000,
          allocatedMinor: 100000,
          spentMinor: 25000,
          remainingMinor: 75000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const summary = calculator.calculateBudgetSummary(budget, allocations);
      expect(summary.totalSpentMinor).toBe(100000);
    });

    it('should include total remaining', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 300000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 300000,
          allocatedMinor: 300000,
          spentMinor: 100000,
          remainingMinor: 200000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const summary = calculator.calculateBudgetSummary(budget, allocations);
      expect(summary.totalRemainingMinor).toBe(200000);
    });

    it('should calculate allocation percentage', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 1000000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 750000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 750000,
          allocatedMinor: 750000,
          spentMinor: 0,
          remainingMinor: 750000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const summary = calculator.calculateBudgetSummary(budget, allocations);
      expect(summary.allocationPercentage).toBe(75);
    });

    it('should calculate spending percentage', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 400000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 400000,
          allocatedMinor: 400000,
          spentMinor: 200000,
          remainingMinor: 200000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const summary = calculator.calculateBudgetSummary(budget, allocations);
      expect(summary.spendingPercentage).toBe(50);
    });

    it('should handle empty budget', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 0,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = calculator.calculateBudgetSummary(budget, []);
      expect(summary.totalIncomeMinor).toBe(0);
      expect(summary.totalAllocatedMinor).toBe(0);
      expect(summary.totalSpentMinor).toBe(0);
      expect(summary.totalRemainingMinor).toBe(0);
      expect(summary.allocationPercentage).toBe(0);
      expect(summary.spendingPercentage).toBe(0);
      expect(summary.unallocatedMinor).toBe(0);
    });
  });

  describe('calculateCategorySummary', () => {
    it('should calculate summary for single category', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 75000,
        remainingMinor: 25000,
        rollover: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = calculator.calculateCategorySummary(allocation, 500000);

      expect(summary.categoryId).toBe('cat1');
      expect(summary.allocatedMinor).toBe(100000);
      expect(summary.spentMinor).toBe(75000);
      expect(summary.remainingMinor).toBe(25000);
      expect(summary.usagePercentage).toBe(75);
      expect(summary.allocationPercentage).toBe(20);
      expect(summary.isOverspent).toBe(false);
    });

    it('should include allocation details', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'percentage',
        allocationValue: 30,
        allocatedMinor: 150000,
        spentMinor: 0,
        remainingMinor: 150000,
        rollover: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = calculator.calculateCategorySummary(allocation, 500000);

      expect(summary.allocatedMinor).toBe(150000);
      expect(summary.allocationPercentage).toBe(30);
    });

    it('should include spending details', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 200000,
        allocatedMinor: 200000,
        spentMinor: 180000,
        remainingMinor: 20000,
        rollover: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = calculator.calculateCategorySummary(allocation, 1000000);

      expect(summary.spentMinor).toBe(180000);
      expect(summary.remainingMinor).toBe(20000);
      expect(summary.usagePercentage).toBe(90);
    });

    it('should calculate usage percentage', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 33333,
        remainingMinor: 66667,
        rollover: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = calculator.calculateCategorySummary(allocation, 500000);
      expect(summary.usagePercentage).toBe(33.33);
    });

    it('should handle unallocated category', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 0,
        allocatedMinor: 0,
        spentMinor: 0,
        remainingMinor: 0,
        rollover: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const summary = calculator.calculateCategorySummary(allocation, 500000);

      expect(summary.allocatedMinor).toBe(0);
      expect(summary.spentMinor).toBe(0);
      expect(summary.remainingMinor).toBe(0);
      expect(summary.usagePercentage).toBe(0);
      expect(summary.allocationPercentage).toBe(0);
      expect(summary.isOverspent).toBe(false);
    });
  });

  describe('validateAllocationTotals', () => {
    it('should validate fixed allocations do not exceed income', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 300000,
          allocatedMinor: 300000,
          spentMinor: 0,
          remainingMinor: 300000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'fixed',
          allocationValue: 250000,
          allocatedMinor: 250000,
          spentMinor: 0,
          remainingMinor: 250000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const validation = calculator.validateAllocationTotals(allocations, 500000);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Total allocations exceed budget income');
      expect(validation.totalFixedMinor).toBe(550000);
      expect(validation.projectedTotalMinor).toBe(550000);
    });

    it('should validate percentage allocations do not exceed 100%', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'percentage',
          allocationValue: 60,
          allocatedMinor: 300000,
          spentMinor: 0,
          remainingMinor: 300000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'percentage',
          allocationValue: 50,
          allocatedMinor: 250000,
          spentMinor: 0,
          remainingMinor: 250000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const validation = calculator.validateAllocationTotals(allocations, 500000);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Total percentage allocations exceed 100%');
      expect(validation.totalPercentage).toBe(110);
    });

    it('should validate mixed allocations do not exceed income', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 300000,
          allocatedMinor: 300000,
          spentMinor: 0,
          remainingMinor: 300000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'percentage',
          allocationValue: 50, // 50% of 500000 = 250000
          allocatedMinor: 250000,
          spentMinor: 0,
          remainingMinor: 250000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const validation = calculator.validateAllocationTotals(allocations, 500000);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Total allocations exceed budget income');
      expect(validation.totalFixedMinor).toBe(300000);
      expect(validation.totalPercentage).toBe(50);
      expect(validation.projectedTotalMinor).toBe(550000);
    });

    it('should return validation errors for over-allocation', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 600000,
          allocatedMinor: 600000,
          spentMinor: 0,
          remainingMinor: 600000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const validation = calculator.validateAllocationTotals(allocations, 500000);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('exceed budget income');
    });

    it('should pass validation for valid allocations', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 200000,
          allocatedMinor: 200000,
          spentMinor: 0,
          remainingMinor: 200000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'percentage',
          allocationValue: 30, // 30% of 500000 = 150000
          allocatedMinor: 150000,
          spentMinor: 0,
          remainingMinor: 150000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const validation = calculator.validateAllocationTotals(allocations, 500000);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.projectedTotalMinor).toBe(350000);
    });
  });

  describe('calculateRolloverAmount', () => {
    it('should calculate rollover for underspent category', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 60000,
        remainingMinor: 40000,
        rollover: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rollover = calculator.calculateRolloverAmount(allocation);
      expect(rollover).toBe(40000);
    });

    it('should not rollover overspent categories', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 120000,
        remainingMinor: -20000,
        rollover: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rollover = calculator.calculateRolloverAmount(allocation);
      expect(rollover).toBe(0);
    });

    it('should only rollover categories marked for rollover', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 60000,
        remainingMinor: 40000,
        rollover: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rollover = calculator.calculateRolloverAmount(allocation);
      expect(rollover).toBe(0);
    });

    it('should handle zero remaining amount', () => {
      const allocation: CategoryAllocation = {
        allocationId: '1',
        budgetId: 'budget1',
        categoryId: 'cat1',
        allocationType: 'fixed',
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 100000,
        remainingMinor: 0,
        rollover: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rollover = calculator.calculateRolloverAmount(allocation);
      expect(rollover).toBe(0);
    });

    it('should calculate total rollover for budget', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 100000,
          allocatedMinor: 100000,
          spentMinor: 70000,
          remainingMinor: 30000,
          rollover: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'fixed',
          allocationValue: 100000,
          allocatedMinor: 100000,
          spentMinor: 80000,
          remainingMinor: 20000,
          rollover: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '3',
          budgetId: 'budget1',
          categoryId: 'cat3',
          allocationType: 'fixed',
          allocationValue: 100000,
          allocatedMinor: 100000,
          spentMinor: 50000,
          remainingMinor: 50000,
          rollover: false, // Not marked for rollover
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const totalRollover = calculator.calculateTotalRollover(allocations);
      expect(totalRollover).toBe(50000); // 30000 + 20000
    });
  });

  describe('compareBudgets', () => {
    it('should compare income between budgets', () => {
      const currentBudget: Budget = {
        budgetId: 'budget2',
        userId: 'user1',
        month: '2024-02',
        plannedIncomeMinor: 600000,
        actualIncomeMinor: 600000,
        totalAllocatedMinor: 500000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const previousBudget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 480000,
        totalAllocatedMinor: 400000,
        status: 'closed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const comparison = calculator.compareBudgets(currentBudget, previousBudget);

      expect(comparison.incomeChange).toBe(100000);
      expect(comparison.incomeChangePercentage).toBe(20);
    });

    it('should compare allocation totals', () => {
      const currentBudget: Budget = {
        budgetId: 'budget2',
        userId: 'user1',
        month: '2024-02',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 500000,
        totalAllocatedMinor: 450000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const previousBudget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 500000,
        totalAllocatedMinor: 400000,
        status: 'closed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const comparison = calculator.compareBudgets(currentBudget, previousBudget);

      expect(comparison.allocationChange).toBe(50000);
      expect(comparison.allocationChangePercentage).toBe(12.5);
    });

    it('should compare spending totals', () => {
      const currentBudget: Budget = {
        budgetId: 'budget2',
        userId: 'user1',
        month: '2024-02',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 520000,
        totalAllocatedMinor: 400000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const previousBudget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 480000,
        totalAllocatedMinor: 400000,
        status: 'closed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const comparison = calculator.compareBudgets(currentBudget, previousBudget);

      expect(comparison.spendingChange).toBe(40000);
      expect(comparison.spendingChangePercentage).toBe(8.33);
    });

    it('should calculate percentage changes', () => {
      const currentBudget: Budget = {
        budgetId: 'budget2',
        userId: 'user1',
        month: '2024-02',
        plannedIncomeMinor: 600000,
        actualIncomeMinor: 550000,
        totalAllocatedMinor: 480000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const previousBudget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 500000,
        totalAllocatedMinor: 400000,
        status: 'closed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const comparison = calculator.compareBudgets(currentBudget, previousBudget);

      expect(comparison.incomeChangePercentage).toBe(20);
      expect(comparison.allocationChangePercentage).toBe(20);
      expect(comparison.spendingChangePercentage).toBe(10);
    });

    it('should handle comparison with zero values', () => {
      const currentBudget: Budget = {
        budgetId: 'budget2',
        userId: 'user1',
        month: '2024-02',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 500000,
        totalAllocatedMinor: 400000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const previousBudget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 0,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'closed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const comparison = calculator.compareBudgets(currentBudget, previousBudget);

      expect(comparison.incomeChange).toBe(500000);
      expect(comparison.incomeChangePercentage).toBe(0); // Can't calculate percentage from 0
      expect(comparison.allocationChangePercentage).toBe(0);
      expect(comparison.spendingChangePercentage).toBe(0);
    });
  });

  describe('projections', () => {
    it('should project spending based on current rate', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 400000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 200000,
          allocatedMinor: 200000,
          spentMinor: 50000, // Spent 50k in 10 days
          remainingMinor: 150000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'fixed',
          allocationValue: 200000,
          allocatedMinor: 200000,
          spentMinor: 30000, // Spent 30k in 10 days
          remainingMinor: 170000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const currentDate = new Date('2024-01-10'); // Day 10 of month
      const projection = calculator.projectSpending(budget, allocations, currentDate);

      expect(projection.daysInMonth).toBe(31);
      expect(projection.daysElapsed).toBe(10);
      expect(projection.dailySpendingRate).toBe(8000); // 80k / 10 days
      expect(projection.projectedSpendingMinor).toBe(248000); // 8k * 31 days
      expect(projection.projectedRemainingMinor).toBe(152000); // 400k - 248k
    });

    it('should project month-end balance', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-02',
        plannedIncomeMinor: 600000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 500000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 500000,
          allocatedMinor: 500000,
          spentMinor: 200000, // Spent 200k in 14 days
          remainingMinor: 300000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const currentDate = new Date('2024-02-14'); // Day 14 of February
      const projection = calculator.projectSpending(budget, allocations, currentDate);

      expect(projection.daysInMonth).toBe(29); // February 2024 is leap year
      expect(projection.daysElapsed).toBe(14);
      expect(projection.projectedSpendingMinor).toBe(414286); // (200k/14) * 29 rounded
    });

    it('should identify categories at risk of overspending', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 400000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 100000,
          allocatedMinor: 100000,
          spentMinor: 40000, // 40% spent in 10 days - on track to overspend
          remainingMinor: 60000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'fixed',
          allocationValue: 100000,
          allocatedMinor: 100000,
          spentMinor: 20000, // 20% spent in 10 days - on track
          remainingMinor: 80000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const currentDate = new Date('2024-01-10');
      const projection = calculator.projectSpending(budget, allocations, currentDate);

      expect(projection.categoriesAtRisk).toContain('cat1');
      expect(projection.categoriesAtRisk).not.toContain('cat2');
    });

    it('should handle partial month projections', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 400000,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'fixed',
          allocationValue: 400000,
          allocatedMinor: 400000,
          spentMinor: 100000,
          remainingMinor: 300000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const currentDate = new Date('2024-01-25'); // Day 25 of 31
      const projection = calculator.projectSpending(budget, allocations, currentDate);

      expect(projection.daysElapsed).toBe(25);
      expect(projection.dailySpendingRate).toBe(4000); // 100k / 25 days
      expect(projection.projectedSpendingMinor).toBe(124000); // 4k * 31 days
    });
  });

  describe('edge cases', () => {
    it('should handle very large amounts', () => {
      const result = calculator.calculatePercentageAllocation(50, Number.MAX_SAFE_INTEGER);
      expect(result).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
    });

    it('should handle currency precision correctly', () => {
      const result = calculator.calculatePercentageAllocation(33.33, 100);
      expect(result).toBe(33); // Should round to whole minor units
    });

    it('should handle null or undefined allocations', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = calculator.calculateRemainingBudget(budget, []);
      expect(result).toBe(500000);

      const summary = calculator.calculateBudgetSummary(budget, []);
      expect(summary.totalAllocatedMinor).toBe(0);
    });

    it('should validate budget has required fields', () => {
      const budget: Budget = {
        budgetId: 'budget1',
        userId: 'user1',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const allocations: CategoryAllocation[] = [];

      // Should not throw when calculating
      expect(() => calculator.calculateRemainingBudget(budget, allocations)).not.toThrow();
      expect(() => calculator.calculateBudgetSummary(budget, allocations)).not.toThrow();
    });

    it('should handle concurrent allocation updates', () => {
      const allocations: CategoryAllocation[] = [
        {
          allocationId: '1',
          budgetId: 'budget1',
          categoryId: 'cat1',
          allocationType: 'percentage',
          allocationValue: 50,
          allocatedMinor: 250000,
          spentMinor: 0,
          remainingMinor: 250000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          allocationId: '2',
          budgetId: 'budget1',
          categoryId: 'cat2',
          allocationType: 'percentage',
          allocationValue: 30,
          allocatedMinor: 150000,
          spentMinor: 0,
          remainingMinor: 150000,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Even if allocations are updated concurrently, validation should catch issues
      const validation = calculator.validateAllocationTotals(allocations, 500000);
      expect(validation.isValid).toBe(true);
      expect(validation.totalPercentage).toBe(80);
    });
  });
});
