import { CategoryAllocation } from '@/shared/types/common';
import { CategoryAllocationRepository } from '@/features/budgets/model/category-allocation-repository';

describe('CategoryAllocationRepository', () => {
  let repository: CategoryAllocationRepository;

  beforeEach(() => {
    repository = new CategoryAllocationRepository();
  });

  describe('create', () => {
    it('should create a new category allocation with valid data', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      };

      const result = await repository.create(allocationData);

      expect(result).toMatchObject(allocationData);
      expect(result.allocationId).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique allocationId', async () => {
      const baseData = {
        budgetId: 'budget123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      };

      const allocation1 = await repository.create({
        ...baseData,
        categoryId: 'category1',
      });

      const allocation2 = await repository.create({
        ...baseData,
        categoryId: 'category2',
      });

      expect(allocation1.allocationId).toBeDefined();
      expect(allocation2.allocationId).toBeDefined();
      expect(allocation1.allocationId).not.toBe(allocation2.allocationId);
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const before = new Date();
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      };

      const result = await repository.create(allocationData);
      const after = new Date();

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.createdAt).toEqual(result.updatedAt);
    });

    it('should calculate allocatedMinor for fixed allocation type', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 150000,
        allocatedMinor: 150000,
        spentMinor: 0,
        remainingMinor: 150000,
        rollover: false,
      };

      const result = await repository.create(allocationData);

      expect(result.allocatedMinor).toBe(150000);
      expect(result.allocationValue).toBe(150000);
    });

    it('should calculate allocatedMinor for percentage allocation type', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'percentage' as const,
        allocationValue: 25, // 25%
        allocatedMinor: 125000, // This would be calculated by service
        spentMinor: 0,
        remainingMinor: 125000,
        rollover: false,
      };

      const result = await repository.create(allocationData);

      expect(result.allocationType).toBe('percentage');
      expect(result.allocationValue).toBe(25);
      expect(result.allocatedMinor).toBe(125000);
    });

    it('should initialize spentMinor to 0', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      };

      const result = await repository.create(allocationData);

      expect(result.spentMinor).toBe(0);
    });

    it('should calculate remainingMinor correctly', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 30000,
        remainingMinor: 70000,
        rollover: false,
      };

      const result = await repository.create(allocationData);

      expect(result.remainingMinor).toBe(70000);
    });

    it('should reject negative allocation value', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: -1000,
        allocatedMinor: -1000,
        spentMinor: 0,
        remainingMinor: -1000,
        rollover: false,
      };

      await expect(repository.create(allocationData)).rejects.toThrow(
        'Allocation value must be non-negative',
      );
    });

    it('should reject percentage greater than 100', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'percentage' as const,
        allocationValue: 101,
        allocatedMinor: 505000,
        spentMinor: 0,
        remainingMinor: 505000,
        rollover: false,
      };

      await expect(repository.create(allocationData)).rejects.toThrow(
        'Percentage allocation cannot exceed 100%',
      );
    });

    it('should reject duplicate allocation for same budget and category', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      };

      await repository.create(allocationData);

      await expect(repository.create(allocationData)).rejects.toThrow(
        'Allocation already exists for this category in this budget',
      );
    });
  });

  describe('findByBudgetId', () => {
    it('should find all allocations for a budget', async () => {
      const budgetId = 'budget123';

      await repository.create({
        budgetId,
        categoryId: 'category1',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      await repository.create({
        budgetId,
        categoryId: 'category2',
        allocationType: 'fixed' as const,
        allocationValue: 50000,
        allocatedMinor: 50000,
        spentMinor: 0,
        remainingMinor: 50000,
        rollover: false,
      });

      const result = await repository.findByBudgetId(budgetId);

      expect(result).toHaveLength(2);
      expect(result[0].budgetId).toBe(budgetId);
      expect(result[1].budgetId).toBe(budgetId);
    });

    it('should return empty array when no allocations exist', async () => {
      const result = await repository.findByBudgetId('nonexistent');
      expect(result).toEqual([]);
    });

    it('should return allocations sorted by category name', async () => {
      const budgetId = 'budget123';

      await repository.create({
        budgetId,
        categoryId: 'zcategory',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      await repository.create({
        budgetId,
        categoryId: 'acategory',
        allocationType: 'fixed' as const,
        allocationValue: 50000,
        allocatedMinor: 50000,
        spentMinor: 0,
        remainingMinor: 50000,
        rollover: false,
      });

      const result = await repository.findByBudgetId(budgetId);

      expect(result[0].categoryId).toBe('acategory');
      expect(result[1].categoryId).toBe('zcategory');
    });

    it('should not return allocations from other budgets', async () => {
      await repository.create({
        budgetId: 'budget123',
        categoryId: 'category1',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      await repository.create({
        budgetId: 'budget456',
        categoryId: 'category2',
        allocationType: 'fixed' as const,
        allocationValue: 50000,
        allocatedMinor: 50000,
        spentMinor: 0,
        remainingMinor: 50000,
        rollover: false,
      });

      const result = await repository.findByBudgetId('budget123');

      expect(result).toHaveLength(1);
      expect(result[0].budgetId).toBe('budget123');
    });
  });

  describe('findByBudgetIdAndCategoryId', () => {
    it('should find specific allocation', async () => {
      const budgetId = 'budget123';
      const categoryId = 'category123';

      const created = await repository.create({
        budgetId,
        categoryId,
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      const found = await repository.findByBudgetIdAndCategoryId(budgetId, categoryId);

      expect(found).toBeDefined();
      expect(found?.allocationId).toBe(created.allocationId);
      expect(found?.budgetId).toBe(budgetId);
      expect(found?.categoryId).toBe(categoryId);
    });

    it('should return null when allocation not found', async () => {
      const result = await repository.findByBudgetIdAndCategoryId('budget123', 'category123');
      expect(result).toBeNull();
    });

    it('should match exact budget and category IDs', async () => {
      await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      await repository.create({
        budgetId: 'budget123',
        categoryId: 'category456',
        allocationType: 'fixed' as const,
        allocationValue: 50000,
        allocatedMinor: 50000,
        spentMinor: 0,
        remainingMinor: 50000,
        rollover: false,
      });

      const result = await repository.findByBudgetIdAndCategoryId('budget123', 'category123');

      expect(result?.categoryId).toBe('category123');
      expect(result?.allocatedMinor).toBe(100000);
    });
  });

  describe('update', () => {
    it('should update allocation value', async () => {
      const created = await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      const updated = await repository.update(created.allocationId, {
        allocationValue: 150000,
        allocatedMinor: 150000,
      });

      expect(updated.allocationValue).toBe(150000);
      expect(updated.allocatedMinor).toBe(150000);
    });

    it('should update allocation type', async () => {
      const created = await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      const updated = await repository.update(created.allocationId, {
        allocationType: 'percentage',
        allocationValue: 20,
      });

      expect(updated.allocationType).toBe('percentage');
      expect(updated.allocationValue).toBe(20);
    });

    it('should update rollover setting', async () => {
      const created = await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      const updated = await repository.update(created.allocationId, {
        rollover: true,
      });

      expect(updated.rollover).toBe(true);
    });

    it('should recalculate allocatedMinor on value change', async () => {
      const created = await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      const updated = await repository.update(created.allocationId, {
        allocationValue: 200000,
        allocatedMinor: 200000,
      });

      expect(updated.allocatedMinor).toBe(200000);
    });

    it('should recalculate remainingMinor on spent change', async () => {
      const created = await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      const updated = await repository.update(created.allocationId, {
        spentMinor: 40000,
      });

      expect(updated.remainingMinor).toBe(60000);
    });

    it('should not allow updating allocationId', async () => {
      const created = await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      await expect(
        repository.update(created.allocationId, {
          allocationId: 'new-id',
        } as Partial<CategoryAllocation>),
      ).rejects.toThrow('Cannot update allocationId');
    });

    it('should not allow updating budgetId', async () => {
      const created = await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      await expect(
        repository.update(created.allocationId, {
          budgetId: 'budget456',
        } as Partial<CategoryAllocation>),
      ).rejects.toThrow('Cannot update budgetId');
    });

    it('should not allow updating categoryId', async () => {
      const created = await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      await expect(
        repository.update(created.allocationId, {
          categoryId: 'category456',
        } as Partial<CategoryAllocation>),
      ).rejects.toThrow('Cannot update categoryId');
    });

    it('should preserve createdAt timestamp', async () => {
      const created = await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.update(created.allocationId, {
        rollover: true,
      });

      expect(updated.createdAt).toEqual(created.createdAt);
    });

    it('should update updatedAt timestamp', async () => {
      const created = await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.update(created.allocationId, {
        rollover: true,
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });
  });

  describe('delete', () => {
    it('should delete existing allocation', async () => {
      const created = await repository.create({
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      });

      await repository.delete(created.allocationId);

      const found = await repository.findById(created.allocationId);
      expect(found).toBeNull();
    });

    it('should throw error when allocation not found', async () => {
      await expect(repository.delete('nonexistent')).rejects.toThrow(
        'Entity with id nonexistent not found',
      );
    });
  });

  describe('allocation validation', () => {
    it('should validate allocation type values', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'invalid' as CategoryAllocation['allocationType'],
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      };

      await expect(repository.create(allocationData)).rejects.toThrow('Invalid allocation type');
    });

    it('should ensure allocation value is non-negative', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: -1,
        allocatedMinor: -1,
        spentMinor: 0,
        remainingMinor: -1,
        rollover: false,
      };

      await expect(repository.create(allocationData)).rejects.toThrow(
        'Allocation value must be non-negative',
      );
    });

    it('should ensure allocated amount is non-negative', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: -100000,
        spentMinor: 0,
        remainingMinor: -100000,
        rollover: false,
      };

      await expect(repository.create(allocationData)).rejects.toThrow(
        'Allocated amount must be non-negative',
      );
    });

    it('should ensure spent amount is non-negative', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: -1000,
        remainingMinor: 101000,
        rollover: false,
      };

      await expect(repository.create(allocationData)).rejects.toThrow(
        'Spent amount must be non-negative',
      );
    });

    it('should validate percentage is between 0 and 100', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'percentage' as const,
        allocationValue: 150,
        allocatedMinor: 150000,
        spentMinor: 0,
        remainingMinor: 150000,
        rollover: false,
      };

      await expect(repository.create(allocationData)).rejects.toThrow(
        'Percentage allocation cannot exceed 100%',
      );
    });
  });

  describe('allocation constraints', () => {
    it('should enforce unique allocation per category per budget', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: false,
      };

      await repository.create(allocationData);

      await expect(repository.create(allocationData)).rejects.toThrow(
        'Allocation already exists for this category in this budget',
      );
    });

    it('should ensure spent does not exceed allocated', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 150000,
        remainingMinor: -50000,
        rollover: false,
      };

      await expect(repository.create(allocationData)).rejects.toThrow(
        'Spent amount cannot exceed allocated amount',
      );
    });

    it('should calculate remaining as allocated minus spent', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 35000,
        remainingMinor: 65000,
        rollover: false,
      };

      const result = await repository.create(allocationData);

      expect(result.remainingMinor).toBe(65000);
    });

    it('should handle rollover allocations correctly', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 100000,
        allocatedMinor: 100000,
        spentMinor: 0,
        remainingMinor: 100000,
        rollover: true,
      };

      const result = await repository.create(allocationData);

      expect(result.rollover).toBe(true);
    });
  });

  describe('allocation calculations', () => {
    it('should calculate fixed allocation correctly', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 250000,
        allocatedMinor: 250000,
        spentMinor: 0,
        remainingMinor: 250000,
        rollover: false,
      };

      const result = await repository.create(allocationData);

      expect(result.allocationType).toBe('fixed');
      expect(result.allocationValue).toBe(250000);
      expect(result.allocatedMinor).toBe(250000);
    });

    it('should calculate percentage allocation based on budget income', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'percentage' as const,
        allocationValue: 30, // 30%
        allocatedMinor: 150000, // Service would calculate this from budget income of 500000
        spentMinor: 0,
        remainingMinor: 150000,
        rollover: false,
      };

      const result = await repository.create(allocationData);

      expect(result.allocationType).toBe('percentage');
      expect(result.allocationValue).toBe(30);
      expect(result.allocatedMinor).toBe(150000);
    });

    it('should round percentage calculations properly', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'percentage' as const,
        allocationValue: 33.33, // 33.33%
        allocatedMinor: 166650, // Service would calculate and round this
        spentMinor: 0,
        remainingMinor: 166650,
        rollover: false,
      };

      const result = await repository.create(allocationData);

      expect(result.allocationType).toBe('percentage');
      expect(result.allocationValue).toBe(33.33);
      expect(result.allocatedMinor).toBe(166650);
    });

    it('should handle zero allocation value', async () => {
      const allocationData = {
        budgetId: 'budget123',
        categoryId: 'category123',
        allocationType: 'fixed' as const,
        allocationValue: 0,
        allocatedMinor: 0,
        spentMinor: 0,
        remainingMinor: 0,
        rollover: false,
      };

      const result = await repository.create(allocationData);

      expect(result.allocationValue).toBe(0);
      expect(result.allocatedMinor).toBe(0);
      expect(result.remainingMinor).toBe(0);
    });
  });
});
