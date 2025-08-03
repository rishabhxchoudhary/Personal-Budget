import { Budget } from '@/shared/types/common';
import { BudgetRepository } from '@/features/budgets/model/budget-repository';

describe('BudgetRepository', () => {
  let repository: BudgetRepository;

  beforeEach(() => {
    repository = new BudgetRepository();
  });

  describe('create', () => {
    it('should create a new budget with valid data', async () => {
      const budgetData = {
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      };

      const result = await repository.create(budgetData);

      expect(result).toMatchObject(budgetData);
      expect(result.budgetId).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique budgetId', async () => {
      const budgetData = {
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      };

      const budget1 = await repository.create(budgetData);
      const budget2 = await repository.create({ ...budgetData, month: '2024-02' });

      expect(budget1.budgetId).toBeDefined();
      expect(budget2.budgetId).toBeDefined();
      expect(budget1.budgetId).not.toBe(budget2.budgetId);
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const before = new Date();
      const budgetData = {
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      };

      const result = await repository.create(budgetData);
      const after = new Date();

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.createdAt).toEqual(result.updatedAt);
    });

    it('should reject negative planned income', async () => {
      const budgetData = {
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: -1000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      };

      await expect(repository.create(budgetData)).rejects.toThrow(
        'Income amounts must be non-negative',
      );
    });

    it('should reject invalid month format', async () => {
      const budgetData = {
        userId: 'user123',
        month: '2024/01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      };

      await expect(repository.create(budgetData)).rejects.toThrow('Invalid month format');
    });

    it('should reject future months', async () => {
      const futureMonth = new Date();
      futureMonth.setMonth(futureMonth.getMonth() + 2);
      const month = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;

      const budgetData = {
        userId: 'user123',
        month,
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      };

      await expect(repository.create(budgetData)).rejects.toThrow(
        'Cannot create budget for future months',
      );
    });

    it('should reject duplicate budgets for same user and month', async () => {
      const budgetData = {
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'active' as const,
      };

      await repository.create(budgetData);
      await expect(repository.create(budgetData)).rejects.toThrow(
        'Only one active budget allowed per month',
      );
    });
  });

  describe('findByUserIdAndMonth', () => {
    it('should find budget by user ID and month', async () => {
      const budgetData = {
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      };

      const created = await repository.create(budgetData);
      const found = await repository.findByUserIdAndMonth('user123', '2024-01');

      expect(found).toBeDefined();
      expect(found?.budgetId).toBe(created.budgetId);
      expect(found?.month).toBe('2024-01');
    });

    it('should return null when budget not found', async () => {
      const result = await repository.findByUserIdAndMonth('nonexistent', '2024-01');
      expect(result).toBeNull();
    });

    it('should find budget with exact month match', async () => {
      await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      await repository.create({
        userId: 'user123',
        month: '2024-02',
        plannedIncomeMinor: 600000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      const result = await repository.findByUserIdAndMonth('user123', '2024-01');
      expect(result?.month).toBe('2024-01');
      expect(result?.plannedIncomeMinor).toBe(500000);
    });
  });

  describe('findByUserId', () => {
    it('should find all budgets for a user', async () => {
      await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      await repository.create({
        userId: 'user123',
        month: '2024-02',
        plannedIncomeMinor: 600000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      const result = await repository.findByUserId('user123');
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user123');
      expect(result[1].userId).toBe('user123');
    });

    it('should return empty array when no budgets exist', async () => {
      const result = await repository.findByUserId('nonexistent');
      expect(result).toEqual([]);
    });

    it('should return budgets in chronological order', async () => {
      await repository.create({
        userId: 'user123',
        month: '2024-03',
        plannedIncomeMinor: 700000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      await repository.create({
        userId: 'user123',
        month: '2024-02',
        plannedIncomeMinor: 600000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      const result = await repository.findByUserId('user123');
      expect(result[0].month).toBe('2024-01');
      expect(result[1].month).toBe('2024-02');
      expect(result[2].month).toBe('2024-03');
    });

    it('should not return budgets from other users', async () => {
      await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      await repository.create({
        userId: 'user456',
        month: '2024-01',
        plannedIncomeMinor: 600000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      const result = await repository.findByUserId('user123');
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user123');
    });
  });

  describe('update', () => {
    it('should update budget fields', async () => {
      const created = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      const updated = await repository.update(created.budgetId, {
        plannedIncomeMinor: 600000,
        status: 'active',
      });

      expect(updated.plannedIncomeMinor).toBe(600000);
      expect(updated.status).toBe('active');
      expect(updated.budgetId).toBe(created.budgetId);
    });

    it('should update actualIncomeMinor', async () => {
      const created = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      const updated = await repository.update(created.budgetId, {
        actualIncomeMinor: 480000,
      });

      expect(updated.actualIncomeMinor).toBe(480000);
    });

    it('should update totalAllocatedMinor', async () => {
      const created = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      const updated = await repository.update(created.budgetId, {
        totalAllocatedMinor: 450000,
      });

      expect(updated.totalAllocatedMinor).toBe(450000);
    });

    it('should update status', async () => {
      const created = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      const updated = await repository.update(created.budgetId, {
        status: 'active',
      });

      expect(updated.status).toBe('active');
    });

    it('should not allow updating budgetId', async () => {
      const created = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      await expect(
        repository.update(created.budgetId, {
          budgetId: 'new-id',
        } as Partial<Budget>),
      ).rejects.toThrow('Cannot update budgetId');
    });

    it('should not allow updating userId', async () => {
      const created = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      await expect(
        repository.update(created.budgetId, {
          userId: 'user456',
        } as Partial<Budget>),
      ).rejects.toThrow('Cannot update userId');
    });

    it('should not allow updating month', async () => {
      const created = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      await expect(
        repository.update(created.budgetId, {
          month: '2024-02',
        } as Partial<Budget>),
      ).rejects.toThrow('Cannot update month');
    });

    it('should preserve createdAt timestamp', async () => {
      const created = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.update(created.budgetId, {
        status: 'active',
      });

      expect(updated.createdAt).toEqual(created.createdAt);
    });

    it('should update updatedAt timestamp', async () => {
      const created = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.update(created.budgetId, {
        status: 'active',
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });
  });

  describe('delete', () => {
    it('should delete existing budget', async () => {
      const created = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      await repository.delete(created.budgetId);

      const found = await repository.findById(created.budgetId);
      expect(found).toBeNull();
    });

    it('should throw error when budget not found', async () => {
      await expect(repository.delete('nonexistent')).rejects.toThrow(
        'Entity with id nonexistent not found',
      );
    });
  });

  describe('budget validation', () => {
    it('should validate month format YYYY-MM', async () => {
      const invalidFormats = ['2024-1', '2024', '24-01', '2024/01', '2024-13', '2024-00'];

      for (const month of invalidFormats) {
        await expect(
          repository.create({
            userId: 'user123',
            month,
            plannedIncomeMinor: 500000,
            actualIncomeMinor: 0,
            totalAllocatedMinor: 0,
            status: 'draft' as const,
          }),
        ).rejects.toThrow('Invalid month format');
      }
    });

    it('should validate status values', async () => {
      await expect(
        repository.create({
          userId: 'user123',
          month: '2024-01',
          plannedIncomeMinor: 500000,
          actualIncomeMinor: 0,
          totalAllocatedMinor: 0,
          status: 'invalid' as Budget['status'],
        }),
      ).rejects.toThrow('Invalid budget status');
    });

    it('should ensure plannedIncomeMinor is non-negative', async () => {
      await expect(
        repository.create({
          userId: 'user123',
          month: '2024-01',
          plannedIncomeMinor: -1,
          actualIncomeMinor: 0,
          totalAllocatedMinor: 0,
          status: 'draft' as const,
        }),
      ).rejects.toThrow('Income amounts must be non-negative');
    });

    it('should ensure actualIncomeMinor is non-negative', async () => {
      await expect(
        repository.create({
          userId: 'user123',
          month: '2024-01',
          plannedIncomeMinor: 500000,
          actualIncomeMinor: -1,
          totalAllocatedMinor: 0,
          status: 'draft' as const,
        }),
      ).rejects.toThrow('Income amounts must be non-negative');
    });

    it('should ensure totalAllocatedMinor is non-negative', async () => {
      await expect(
        repository.create({
          userId: 'user123',
          month: '2024-01',
          plannedIncomeMinor: 500000,
          actualIncomeMinor: 0,
          totalAllocatedMinor: -1,
          status: 'draft' as const,
        }),
      ).rejects.toThrow('Income amounts must be non-negative');
    });
  });

  describe('budget constraints', () => {
    it('should enforce one active budget per month per user', async () => {
      await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'active' as const,
      });

      await expect(
        repository.create({
          userId: 'user123',
          month: '2024-01',
          plannedIncomeMinor: 600000,
          actualIncomeMinor: 0,
          totalAllocatedMinor: 0,
          status: 'active' as const,
        }),
      ).rejects.toThrow('Only one active budget allowed per month');
    });

    it('should allow draft and active budgets in same month', async () => {
      await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'active' as const,
      });

      const draft = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 600000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      expect(draft).toBeDefined();
      expect(draft.status).toBe('draft');
    });

    it('should allow closed and draft budgets in same month', async () => {
      const active = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'active' as const,
      });

      await repository.update(active.budgetId, { status: 'closed' });

      const draft = await repository.create({
        userId: 'user123',
        month: '2024-01',
        plannedIncomeMinor: 600000,
        actualIncomeMinor: 0,
        totalAllocatedMinor: 0,
        status: 'draft' as const,
      });

      expect(draft).toBeDefined();
      expect(draft.status).toBe('draft');
    });
  });
});
