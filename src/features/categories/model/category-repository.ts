import { InMemoryRepository } from '@/shared/repositories/in-memory-repository';
import { Category, CategoryRepository as ICategoryRepository } from '@/shared/types/common';
import { BusinessError } from '@/shared/types/common';
import { v4 as uuidv4 } from 'uuid';

export class CategoryRepository
  extends InMemoryRepository<Category, Omit<Category, 'categoryId' | 'createdAt' | 'updatedAt'>>
  implements ICategoryRepository
{
  protected getEntityId(entity: Category): string {
    return entity.categoryId;
  }

  async create(
    input: Omit<Category, 'categoryId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Category> {
    // Validate input
    this.validateCategoryInput(input);

    // Check for duplicate category name for user
    await this.checkDuplicateName(input.userId, input.name);

    // Create category with generated ID
    const category: Category = {
      ...input,
      categoryId: uuidv4(),
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return super.create(category);
  }

  async findByUserId(userId: string): Promise<Category[]> {
    const categories = await this.findAll();

    return categories
      .filter((c) => c.userId === userId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findByUserIdAndType(userId: string, type: Category['type']): Promise<Category[]> {
    const userCategories = await this.findByUserId(userId);

    return userCategories.filter((c) => c.type === type);
  }

  async update(
    categoryId: string,
    updates: Partial<Category>,
  ): Promise<Category> {
    const existing = await this.findById(categoryId);
    if (!existing) {
      throw new BusinessError(
        `Category with id ${categoryId} not found`,
        'CATEGORY_NOT_FOUND'
      );
    }

    // Prevent updating immutable fields
    this.validateUpdates(updates);

    // Validate new values if provided
    if (updates.name && updates.name !== existing.name) {
      await this.checkDuplicateName(existing.userId, updates.name);
    }

    if (updates.type) {
      this.validateType(updates.type);
    }

    if (updates.budgetingMethod) {
      this.validateBudgetingMethod(updates.budgetingMethod);
    }

    return super.update(categoryId, updates);
  }

  private validateCategoryInput(
    input: Omit<Category, 'categoryId' | 'createdAt' | 'updatedAt'>
  ): void {
    // Validate name
    if (!input.name || input.name.trim().length === 0) {
      throw new BusinessError(
        'Category name is required',
        'CATEGORY_NAME_REQUIRED'
      );
    }

    if (input.name.length > 50) {
      throw new BusinessError(
        'Category name must be 50 characters or less',
        'CATEGORY_NAME_TOO_LONG'
      );
    }

    // Validate type
    this.validateType(input.type);

    // Validate budgeting method
    this.validateBudgetingMethod(input.budgetingMethod);

    // Validate sort order
    if (input.sortOrder < 0) {
      throw new BusinessError(
        'Sort order must be non-negative',
        'INVALID_SORT_ORDER'
      );
    }
  }

  private validateType(type: Category['type']): void {
    const validTypes: Category['type'][] = ['income', 'expense', 'transfer', 'debt'];
    if (!validTypes.includes(type)) {
      throw new BusinessError(
        'Invalid category type',
        'INVALID_CATEGORY_TYPE'
      );
    }
  }

  private validateBudgetingMethod(method: Category['budgetingMethod']): void {
    const validMethods: Category['budgetingMethod'][] = ['fixed', 'percentage', 'envelope', 'goal'];
    if (!validMethods.includes(method)) {
      throw new BusinessError(
        'Invalid budgeting method',
        'INVALID_BUDGETING_METHOD'
      );
    }
  }

  private async checkDuplicateName(
    userId: string,
    name: string
  ): Promise<void> {
    const userCategories = await this.findByUserId(userId);
    const duplicate = userCategories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      throw new BusinessError(
        'Category with this name already exists',
        'DUPLICATE_CATEGORY_NAME'
      );
    }
  }

  private validateUpdates(updates: Partial<Category>): void {
    const immutableFields = ['categoryId', 'userId'];

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
