import { GET, POST } from '../categories/route';
import { GET as getCategoryById, PUT, DELETE } from '../categories/[id]/route';
import {
  createTestRequest,
  expectSuccessResponse,
  expectErrorResponse,
  expectPaginatedResponse,
  TestDataFactory,
  MockRepositories,
  generateInvalidUuid,
  generateValidUuid,
} from './api-test-helpers';
import './setup-api-mocks';
import { getMockRepositories, resetMockRepositories } from './setup-api-mocks';

describe('Categories API', () => {
  let repos: MockRepositories;
  let factory: TestDataFactory;

  beforeEach(async () => {
    repos = getMockRepositories();
    factory = new TestDataFactory(repos);
    await resetMockRepositories();
  });

  describe('GET /api/categories', () => {
    it('should return paginated list of user categories', async () => {
      const user = await factory.createTestUser();
      await factory.createTestCategory(user.userId, 'expense', { name: 'Food' });
      await factory.createTestCategory(user.userId, 'income', { name: 'Salary' });

      const request = createTestRequest('/api/categories');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(2);
      expect(data.data.some((cat: { name: string }) => cat.name === 'Food')).toBe(true);
      expect(data.data.some((cat: { name: string }) => cat.name === 'Salary')).toBe(true);
    });

    it('should return empty list when user has no categories', async () => {
      await factory.createTestUser();

      const request = createTestRequest('/api/categories');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(0);
    });

    it('should filter categories by type', async () => {
      const user = await factory.createTestUser();
      await factory.createTestCategory(user.userId, 'expense', { name: 'Food' });
      await factory.createTestCategory(user.userId, 'income', { name: 'Salary' });
      await factory.createTestCategory(user.userId, 'transfer', { name: 'Transfer' });

      const request = createTestRequest('/api/categories', {
        searchParams: { type: 'expense' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].type).toBe('expense');
      expect(data.data[0].name).toBe('Food');
    });

    it('should filter categories by active status', async () => {
      const user = await factory.createTestUser();
      await factory.createTestCategory(user.userId, 'expense', { isActive: true });
      await factory.createTestCategory(user.userId, 'expense', { isActive: false });

      const request = createTestRequest('/api/categories', {
        searchParams: { isActive: 'true' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].isActive).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const user = await factory.createTestUser();
      // Create 5 categories
      for (let i = 1; i <= 5; i++) {
        await factory.createTestCategory(user.userId, 'expense', { name: `Category ${i}` });
      }

      const request = createTestRequest('/api/categories', {
        searchParams: { page: '2', limit: '2' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response, 2, 2);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(5);
      expect(data.pagination.totalPages).toBe(3);
    });

    it('should sort categories by sortOrder then name', async () => {
      const user = await factory.createTestUser();
      await factory.createTestCategory(user.userId, 'expense', { name: 'Zebra', sortOrder: 3 });
      await factory.createTestCategory(user.userId, 'expense', { name: 'Alpha', sortOrder: 1 });
      await factory.createTestCategory(user.userId, 'expense', { name: 'Beta', sortOrder: 1 });

      const request = createTestRequest('/api/categories');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data[0].name).toBe('Alpha'); // sortOrder 1, name Alpha
      expect(data.data[1].name).toBe('Beta'); // sortOrder 1, name Beta
      expect(data.data[2].name).toBe('Zebra'); // sortOrder 3
    });

    it('should only return categories for authenticated user', async () => {
      const user1 = await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });

      await factory.createTestCategory(user1.userId, 'expense', { name: 'User 1 Category' });
      await factory.createTestCategory(user2.userId, 'expense', { name: 'User 2 Category' });

      const request = createTestRequest('/api/categories');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('User 1 Category');
    });

    it('should include parent category information', async () => {
      const user = await factory.createTestUser();
      const parentCategory = await factory.createTestCategory(user.userId, 'expense', {
        name: 'Parent',
      });
      await factory.createTestCategory(user.userId, 'expense', {
        name: 'Child',
        parentCategoryId: parentCategory.categoryId,
      });

      const request = createTestRequest('/api/categories');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      const child = data.data.find((cat: { name: string }) => cat.name === 'Child');
      expect(child.parentCategoryId).toBe(parentCategory.categoryId);
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category with valid data', async () => {
      const user = await factory.createTestUser();

      const categoryData = {
        name: 'New Category',
        type: 'expense',
        budgetingMethod: 'fixed',
        icon: 'shopping-cart',
        color: '#FF5733',
        isActive: true,
        sortOrder: 5,
      };

      const request = createTestRequest('/api/categories', {
        method: 'POST',
        body: categoryData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data).toMatchObject({
        ...categoryData,
        userId: user.userId,
      });
      expect(data.data).toHaveProperty('categoryId');
      expect(data.data).toHaveProperty('createdAt');
    });

    it('should create category with minimal required fields', async () => {
      const user = await factory.createTestUser();

      const categoryData = {
        name: 'Simple Category',
        type: 'income',
        budgetingMethod: 'percentage',
      };

      const request = createTestRequest('/api/categories', {
        method: 'POST',
        body: categoryData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data).toMatchObject({
        ...categoryData,
        isActive: true, // default value
        sortOrder: 0, // default value
        userId: user.userId,
      });
    });

    it('should create subcategory with parent reference', async () => {
      const user = await factory.createTestUser();
      const parentCategory = await factory.createTestCategory(user.userId, 'expense');

      const categoryData = {
        name: 'Subcategory',
        type: 'expense',
        parentCategoryId: parentCategory.categoryId,
        budgetingMethod: 'envelope',
      };

      const request = createTestRequest('/api/categories', {
        method: 'POST',
        body: categoryData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data.parentCategoryId).toBe(parentCategory.categoryId);
    });

    it('should validate required fields', async () => {
      await factory.createTestUser();

      const invalidData = {
        type: 'expense',
        budgetingMethod: 'fixed',
        // missing name
      };

      const request = createTestRequest('/api/categories', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'Name is required');
    });

    it('should validate category type', async () => {
      await factory.createTestUser();

      const invalidData = {
        name: 'Test Category',
        type: 'invalid-type',
        budgetingMethod: 'fixed',
      };

      const request = createTestRequest('/api/categories', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'type');
    });

    it('should validate budgeting method', async () => {
      await factory.createTestUser();

      const invalidData = {
        name: 'Test Category',
        type: 'expense',
        budgetingMethod: 'invalid-method',
      };

      const request = createTestRequest('/api/categories', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'budgetingMethod');
    });

    it('should validate color format', async () => {
      await factory.createTestUser();

      const invalidData = {
        name: 'Test Category',
        type: 'expense',
        budgetingMethod: 'fixed',
        color: 'invalid-color',
      };

      const request = createTestRequest('/api/categories', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'valid hex color');
    });

    it('should validate parent category exists and belongs to user', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const otherUserCategory = await factory.createTestCategory(user2.userId, 'expense');

      const invalidData = {
        name: 'Test Category',
        type: 'expense',
        parentCategoryId: otherUserCategory.categoryId,
        budgetingMethod: 'fixed',
      };

      const request = createTestRequest('/api/categories', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'Parent category not found');
    });

    it('should validate sortOrder is non-negative', async () => {
      await factory.createTestUser();

      const invalidData = {
        name: 'Test Category',
        type: 'expense',
        budgetingMethod: 'fixed',
        sortOrder: -1,
      };

      const request = createTestRequest('/api/categories', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'non-negative');
    });

    it('should validate name length', async () => {
      await factory.createTestUser();

      const invalidData = {
        name: 'a'.repeat(51), // too long
        type: 'expense',
        budgetingMethod: 'fixed',
      };

      const request = createTestRequest('/api/categories', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, '50 characters');
    });
  });

  describe('GET /api/categories/[id]', () => {
    it('should return category by ID', async () => {
      const user = await factory.createTestUser();
      const category = await factory.createTestCategory(user.userId, 'expense');

      const request = createTestRequest(`/api/categories/${category.categoryId}`);
      const response = await getCategoryById(request, {
        params: { id: category.categoryId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data).toMatchObject({
        categoryId: category.categoryId,
        name: category.name,
        type: category.type,
      });
    });

    it('should return 404 for non-existent category', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/categories/${nonExistentId}`);
      const response = await getCategoryById(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should return 400 for invalid category ID format', async () => {
      await factory.createTestUser();
      const invalidId = generateInvalidUuid();

      const request = createTestRequest(`/api/categories/${invalidId}`);
      const response = await getCategoryById(request, {
        params: { id: invalidId },
      });

      await expectErrorResponse(response, 400, 'Invalid UUID');
    });

    it('should deny access to other users categories', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const category = await factory.createTestCategory(user2.userId, 'expense');

      const request = createTestRequest(`/api/categories/${category.categoryId}`);
      const response = await getCategoryById(request, {
        params: { id: category.categoryId },
      });

      await expectErrorResponse(response, 403, 'Access denied');
    });
  });

  describe('PUT /api/categories/[id]', () => {
    it('should update category with valid data', async () => {
      const user = await factory.createTestUser();
      const category = await factory.createTestCategory(user.userId, 'expense');

      const updateData = {
        name: 'Updated Category Name',
        icon: 'new-icon',
        color: '#00FF00',
        sortOrder: 10,
      };

      const request = createTestRequest(`/api/categories/${category.categoryId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: category.categoryId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data).toMatchObject({
        ...updateData,
        categoryId: category.categoryId,
        type: category.type, // unchanged
        budgetingMethod: category.budgetingMethod, // unchanged
      });
      expect(data.data.updatedAt).toBeDefined();
    });

    it('should allow partial updates', async () => {
      const user = await factory.createTestUser();
      const category = await factory.createTestCategory(user.userId, 'expense');

      const updateData = {
        name: 'Partially Updated Category',
      };

      const request = createTestRequest(`/api/categories/${category.categoryId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: category.categoryId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data.name).toBe('Partially Updated Category');
      expect(data.data.type).toBe(category.type); // unchanged
    });

    it('should validate update data', async () => {
      const user = await factory.createTestUser();
      const category = await factory.createTestCategory(user.userId, 'expense');

      const invalidData = {
        name: '', // empty name
      };

      const request = createTestRequest(`/api/categories/${category.categoryId}`, {
        method: 'PUT',
        body: invalidData,
      });
      const response = await PUT(request, {
        params: { id: category.categoryId },
      });

      await expectErrorResponse(response, 400, 'Name is required');
    });

    it('should return 404 for non-existent category', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/categories/${nonExistentId}`, {
        method: 'PUT',
        body: { name: 'Updated Name' },
      });
      const response = await PUT(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should deny access to other users categories', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const category = await factory.createTestCategory(user2.userId, 'expense');

      const request = createTestRequest(`/api/categories/${category.categoryId}`, {
        method: 'PUT',
        body: { name: 'Hacked Name' },
      });
      const response = await PUT(request, {
        params: { id: category.categoryId },
      });

      await expectErrorResponse(response, 403, 'Access denied');
    });

    it('should validate parent category change', async () => {
      const user = await factory.createTestUser();
      const category = await factory.createTestCategory(user.userId, 'expense');
      const nonExistentParentId = generateValidUuid();

      const updateData = {
        parentCategoryId: nonExistentParentId,
      };

      const request = createTestRequest(`/api/categories/${category.categoryId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: category.categoryId },
      });

      await expectErrorResponse(response, 400, 'Parent category not found');
    });
  });

  describe('DELETE /api/categories/[id]', () => {
    it('should delete category successfully', async () => {
      const user = await factory.createTestUser();
      const category = await factory.createTestCategory(user.userId, 'expense');

      const request = createTestRequest(`/api/categories/${category.categoryId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: category.categoryId },
      });

      expect(response.status).toBe(204);

      // Verify category is deleted
      const deletedCategory = await repos.categories.findById(category.categoryId);
      expect(deletedCategory).toBeNull();
    });

    it('should return 404 for non-existent category', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/categories/${nonExistentId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should deny access to other users categories', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const category = await factory.createTestCategory(user2.userId, 'expense');

      const request = createTestRequest(`/api/categories/${category.categoryId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: category.categoryId },
      });

      await expectErrorResponse(response, 403, 'Access denied');

      // Verify category still exists
      const existingCategory = await repos.categories.findById(category.categoryId);
      expect(existingCategory).not.toBeNull();
    });

    it('should return 400 for invalid category ID format', async () => {
      await factory.createTestUser();
      const invalidId = generateInvalidUuid();

      const request = createTestRequest(`/api/categories/${invalidId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: invalidId },
      });

      await expectErrorResponse(response, 400, 'Invalid UUID');
    });

    it('should prevent deletion of category with subcategories', async () => {
      const user = await factory.createTestUser();
      const parentCategory = await factory.createTestCategory(user.userId, 'expense', {
        name: 'Parent',
      });
      await factory.createTestCategory(user.userId, 'expense', {
        name: 'Child',
        parentCategoryId: parentCategory.categoryId,
      });

      const request = createTestRequest(`/api/categories/${parentCategory.categoryId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: parentCategory.categoryId },
      });

      await expectErrorResponse(response, 400, 'has subcategories');
    });

    it('should prevent deletion of category used in transactions', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');

      // Create a transaction using this category
      await factory.createTestTransaction(user.userId, account.accountId, category.categoryId);

      const request = createTestRequest(`/api/categories/${category.categoryId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: category.categoryId },
      });

      await expectErrorResponse(response, 400, 'used in transactions');
    });
  });
});
