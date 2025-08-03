import { InMemoryRepository } from '@/shared/repositories/in-memory-repository';
import {
  CategoryAllocation,
  CategoryAllocationRepository as ICategoryAllocationRepository,
} from '@/shared/types/common';
import { BusinessError } from '@/shared/types/common';
import { v4 as uuidv4 } from 'uuid';

export class CategoryAllocationRepository
  extends InMemoryRepository<
    CategoryAllocation,
    Omit<CategoryAllocation, 'allocationId' | 'createdAt' | 'updatedAt'>
  >
  implements ICategoryAllocationRepository
{
  protected getEntityId(entity: CategoryAllocation): string {
    return entity.allocationId;
  }

  async create(
    input: Omit<CategoryAllocation, 'allocationId' | 'createdAt' | 'updatedAt'>,
  ): Promise<CategoryAllocation> {
    // Validate input
    this.validateAllocationInput(input);

    // Check for duplicate allocation
    await this.checkDuplicateAllocation(input.budgetId, input.categoryId);

    // Initialize calculated fields
    const allocation: CategoryAllocation = {
      ...input,
      allocationId: uuidv4(),
      spentMinor: input.spentMinor || 0,
      remainingMinor: input.allocatedMinor - (input.spentMinor || 0),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return super.create(allocation);
  }

  async findByBudgetId(budgetId: string): Promise<CategoryAllocation[]> {
    const allocations = await this.findAll();

    return allocations
      .filter((a) => a.budgetId === budgetId)
      .sort((a, b) => a.categoryId.localeCompare(b.categoryId));
  }

  async findByBudgetIdAndCategoryId(
    budgetId: string,
    categoryId: string,
  ): Promise<CategoryAllocation | null> {
    const allocations = await this.findAll();

    const found = allocations.find((a) => a.budgetId === budgetId && a.categoryId === categoryId);

    return found || null;
  }

  async update(
    allocationId: string,
    updates: Partial<CategoryAllocation>,
  ): Promise<CategoryAllocation> {
    const existing = await this.findById(allocationId);
    if (!existing) {
      throw new BusinessError(
        `Allocation with id ${allocationId} not found`,
        'ALLOCATION_NOT_FOUND',
      );
    }

    // Prevent updating immutable fields
    this.validateUpdates(updates);

    // Validate new values if provided
    if (updates.allocationValue !== undefined) {
      this.validateAllocationValue(
        updates.allocationValue,
        updates.allocationType || existing.allocationType,
      );
    }

    // Recalculate fields if necessary
    const recalculated = { ...updates };

    // If allocation value changed, recalculate allocated amount
    if (updates.allocationValue !== undefined || updates.allocationType !== undefined) {
      const newType = updates.allocationType || existing.allocationType;
      const newValue =
        updates.allocationValue !== undefined ? updates.allocationValue : existing.allocationValue;

      if (newType === 'fixed') {
        recalculated.allocatedMinor = newValue;
      }
      // For percentage, we'd need the budget income which we don't have here
      // This would typically be handled by the service layer
    }

    // Recalculate remaining if allocated or spent changed
    const newAllocated =
      recalculated.allocatedMinor !== undefined
        ? recalculated.allocatedMinor
        : existing.allocatedMinor;
    const newSpent =
      recalculated.spentMinor !== undefined ? recalculated.spentMinor : existing.spentMinor;

    recalculated.remainingMinor = newAllocated - newSpent;

    return super.update(allocationId, recalculated);
  }

  private validateAllocationInput(
    input: Omit<CategoryAllocation, 'allocationId' | 'createdAt' | 'updatedAt'>,
  ): void {
    // Validate allocation type
    const validTypes: CategoryAllocation['allocationType'][] = ['fixed', 'percentage'];
    if (!validTypes.includes(input.allocationType)) {
      throw new BusinessError('Invalid allocation type', 'INVALID_ALLOCATION_TYPE');
    }

    // Validate allocation value
    this.validateAllocationValue(input.allocationValue, input.allocationType);

    // Validate amounts
    if (input.allocatedMinor < 0) {
      throw new BusinessError(
        'Allocated amount must be non-negative',
        'NEGATIVE_ALLOCATION_NOT_ALLOWED',
      );
    }

    if (input.spentMinor && input.spentMinor < 0) {
      throw new BusinessError('Spent amount must be non-negative', 'NEGATIVE_SPENT_NOT_ALLOWED');
    }

    // Validate spent doesn't exceed allocated
    if (input.spentMinor && input.spentMinor > input.allocatedMinor) {
      throw new BusinessError(
        'Spent amount cannot exceed allocated amount',
        'OVERSPENT_NOT_ALLOWED',
      );
    }
  }

  private validateAllocationValue(value: number, type: CategoryAllocation['allocationType']): void {
    if (value < 0) {
      throw new BusinessError('Allocation value must be non-negative', 'NEGATIVE_ALLOCATION_VALUE');
    }

    if (!Number.isFinite(value)) {
      throw new BusinessError(
        'Allocation value must be a valid number',
        'INVALID_ALLOCATION_VALUE',
      );
    }

    // Validate percentage constraints
    if (type === 'percentage' && value > 100) {
      throw new BusinessError('Percentage allocation cannot exceed 100%', 'PERCENTAGE_TOO_HIGH');
    }
  }

  private async checkDuplicateAllocation(budgetId: string, categoryId: string): Promise<void> {
    const existing = await this.findByBudgetIdAndCategoryId(budgetId, categoryId);

    if (existing) {
      throw new BusinessError(
        'Allocation already exists for this category in this budget',
        'DUPLICATE_ALLOCATION',
      );
    }
  }

  private validateUpdates(updates: Partial<CategoryAllocation>): void {
    const immutableFields = ['allocationId', 'budgetId', 'categoryId'];

    for (const field of immutableFields) {
      if (field in updates) {
        throw new BusinessError(`Cannot update ${field}`, 'IMMUTABLE_FIELD_UPDATE');
      }
    }
  }
}
