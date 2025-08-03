// import { BudgetService } from '@/shared/types/common';
// import { BudgetServiceImpl } from '@/features/budgets/services/budget-service';
// import { BudgetRepository } from '@/features/budgets/model/budget-repository';
// import { CategoryAllocationRepository } from '@/features/budgets/model/category-allocation-repository';
// import { CategoryRepository } from '@/features/categories/model/category-repository';
// import { AllocationInput } from '@/shared/types/common';

describe('BudgetService', () => {
  // let service: BudgetService;
  // let budgetRepo: BudgetRepository;
  // let allocationRepo: CategoryAllocationRepository;
  // let categoryRepo: CategoryRepository;

  beforeEach(() => {
    // budgetRepo = new BudgetRepository();
    // allocationRepo = new CategoryAllocationRepository();
    // categoryRepo = new CategoryRepository();
    // service = new BudgetServiceImpl(budgetRepo, allocationRepo, categoryRepo);
  });

  describe('createMonthlyBudget', () => {
    it('should create budget with valid income', async () => {
      // Test implementation
    });

    it('should reject negative income', async () => {
      // Test implementation
    });

    it('should reject zero income', async () => {
      // Test implementation
    });

    it('should reject income exceeding maximum safe integer', async () => {
      // Test implementation
    });

    it('should prevent duplicate budgets for same month', async () => {
      // Test implementation
    });

    it('should allow only one active budget per month', async () => {
      // Test implementation
    });

    it('should validate month format', async () => {
      // Test implementation
    });

    it('should reject future months', async () => {
      // Test implementation
    });

    it('should create budget with draft status by default', async () => {
      // Test implementation
    });

    it('should initialize actualIncomeMinor to 0', async () => {
      // Test implementation
    });

    it('should initialize totalAllocatedMinor to 0', async () => {
      // Test implementation
    });

    it('should handle concurrent budget creation', async () => {
      // Test implementation
    });
  });

  describe('allocateToCategory', () => {
    it('should allocate fixed amount to category', async () => {
      // Test implementation
    });

    it('should allocate percentage to category', async () => {
      // Test implementation
    });

    it('should update existing allocation', async () => {
      // Test implementation
    });

    it('should reject allocation exceeding budget income', async () => {
      // Test implementation
    });

    it('should reject negative allocation value', async () => {
      // Test implementation
    });

    it('should reject percentage over 100', async () => {
      // Test implementation
    });

    it('should reject allocation to non-existent budget', async () => {
      // Test implementation
    });

    it('should reject allocation to non-existent category', async () => {
      // Test implementation
    });

    it('should reject allocation to inactive category', async () => {
      // Test implementation
    });

    it('should reject allocation to closed budget', async () => {
      // Test implementation
    });

    it('should update budget totalAllocatedMinor', async () => {
      // Test implementation
    });

    it('should handle rollover allocation', async () => {
      // Test implementation
    });

    it('should ensure total percentage allocations do not exceed 100%', async () => {
      // Test implementation
    });

    it('should calculate percentage based on planned income', async () => {
      // Test implementation
    });

    it('should round allocation amounts correctly', async () => {
      // Test implementation
    });

    it('should handle zero allocation value', async () => {
      // Test implementation
    });
  });

  describe('calculateRemainingBudget', () => {
    it('should calculate remaining from planned income minus allocations', async () => {
      // Test implementation
    });

    it('should handle budget with no allocations', async () => {
      // Test implementation
    });

    it('should handle fully allocated budget', async () => {
      // Test implementation
    });

    it('should handle over-allocated budget', async () => {
      // Test implementation
    });

    it('should calculate correctly with mixed allocation types', async () => {
      // Test implementation
    });

    it('should throw error for non-existent budget', async () => {
      // Test implementation
    });

    it('should include percentage allocations in calculation', async () => {
      // Test implementation
    });

    it('should handle budget with only percentage allocations', async () => {
      // Test implementation
    });

    it('should handle budget with only fixed allocations', async () => {
      // Test implementation
    });
  });

  describe('closeBudget', () => {
    it('should close active budget', async () => {
      // Test implementation
    });

    it('should close draft budget', async () => {
      // Test implementation
    });

    it('should reject closing already closed budget', async () => {
      // Test implementation
    });

    it('should reject closing non-existent budget', async () => {
      // Test implementation
    });

    it('should update budget status to closed', async () => {
      // Test implementation
    });

    it('should preserve all budget data when closing', async () => {
      // Test implementation
    });

    it('should update updatedAt timestamp', async () => {
      // Test implementation
    });

    it('should handle budget with rollover allocations', async () => {
      // Test implementation
    });
  });

  describe('budget lifecycle', () => {
    it('should support draft -> active -> closed workflow', async () => {
      // Test implementation
    });

    it('should allow editing draft budgets', async () => {
      // Test implementation
    });

    it('should restrict editing closed budgets', async () => {
      // Test implementation
    });

    it('should handle month transitions', async () => {
      // Test implementation
    });
  });

  describe('allocation constraints', () => {
    it('should enforce total allocations not exceeding income', async () => {
      // Test implementation
    });

    it('should validate category belongs to user', async () => {
      // Test implementation
    });

    it('should handle currency considerations', async () => {
      // Test implementation
    });

    it('should support envelope budgeting method', async () => {
      // Test implementation
    });

    it('should support goal-based budgeting method', async () => {
      // Test implementation
    });
  });

  describe('error handling', () => {
    it('should provide meaningful error messages', async () => {
      // Test implementation
    });

    it('should handle repository errors gracefully', async () => {
      // Test implementation
    });

    it('should validate all inputs before processing', async () => {
      // Test implementation
    });

    it('should handle concurrent modifications', async () => {
      // Test implementation
    });
  });

  describe('integration scenarios', () => {
    it('should create budget and allocate to multiple categories', async () => {
      // Test implementation
    });

    it('should handle budget with mixed allocation types', async () => {
      // Test implementation
    });

    it('should calculate totals correctly with multiple allocations', async () => {
      // Test implementation
    });

    it('should support modifying allocations', async () => {
      // Test implementation
    });
  });
});
