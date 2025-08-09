import { GET, POST } from '../budgets/route';
import { GET as getBudgetById, PUT, DELETE } from '../budgets/[id]/route';
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

describe('Budgets API', () => {
  let repos: MockRepositories;
  let factory: TestDataFactory;

  beforeEach(async () => {
    repos = getMockRepositories();
    factory = new TestDataFactory(repos);
    await resetMockRepositories();
  });

  describe('GET /api/budgets', () => {
    it('should return paginated list of user budgets', async () => {
      const user = await factory.createTestUser();
      await factory.createTestBudget(user.userId, { month: '2024-01' });
      await factory.createTestBudget(user.userId, { month: '2024-02' });

      const request = createTestRequest('/api/budgets');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(2);
      expect(data.data.some((budget: { month: string }) => budget.month === '2024-01')).toBe(true);
      expect(data.data.some((budget: { month: string }) => budget.month === '2024-02')).toBe(true);
    });

    it('should return empty list when user has no budgets', async () => {
      await factory.createTestUser();

      const request = createTestRequest('/api/budgets');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(0);
    });

    it('should filter budgets by status', async () => {
      const user = await factory.createTestUser();
      await factory.createTestBudget(user.userId, { status: 'draft' });
      await factory.createTestBudget(user.userId, { status: 'active' });
      await factory.createTestBudget(user.userId, { status: 'closed' });

      const request = createTestRequest('/api/budgets', {
        searchParams: { status: 'active' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].status).toBe('active');
    });

    it('should filter budgets by year', async () => {
      const user = await factory.createTestUser();
      await factory.createTestBudget(user.userId, { month: '2023-12' });
      await factory.createTestBudget(user.userId, { month: '2024-01' });
      await factory.createTestBudget(user.userId, { month: '2024-02' });

      const request = createTestRequest('/api/budgets', {
        searchParams: { year: '2024' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(2);
      expect(data.data.every((budget: { month: string }) => budget.month.startsWith('2024'))).toBe(
        true,
      );
    });

    it('should handle pagination correctly', async () => {
      const user = await factory.createTestUser();
      // Create 5 budgets
      for (let i = 1; i <= 5; i++) {
        const month = `2024-${i.toString().padStart(2, '0')}`;
        await factory.createTestBudget(user.userId, { month });
      }

      const request = createTestRequest('/api/budgets', {
        searchParams: { page: '2', limit: '2' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response, 2, 2);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(5);
      expect(data.pagination.totalPages).toBe(3);
    });

    it('should sort budgets by month descending', async () => {
      const user = await factory.createTestUser();
      await factory.createTestBudget(user.userId, { month: '2024-01' });
      await factory.createTestBudget(user.userId, { month: '2024-03' });
      await factory.createTestBudget(user.userId, { month: '2024-02' });

      const request = createTestRequest('/api/budgets');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data[0].month).toBe('2024-03');
      expect(data.data[1].month).toBe('2024-02');
      expect(data.data[2].month).toBe('2024-01');
    });

    it('should only return budgets for authenticated user', async () => {
      const user1 = await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });

      await factory.createTestBudget(user1.userId, { month: '2024-01' });
      await factory.createTestBudget(user2.userId, { month: '2024-02' });

      const request = createTestRequest('/api/budgets');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].month).toBe('2024-01');
    });
  });

  describe('POST /api/budgets', () => {
    it('should create a new budget with valid data', async () => {
      const user = await factory.createTestUser();

      const budgetData = {
        month: '2024-03',
        plannedIncomeMinor: 600000,
        actualIncomeMinor: 550000,
        totalAllocatedMinor: 400000,
        status: 'active',
      };

      const request = createTestRequest('/api/budgets', {
        method: 'POST',
        body: budgetData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data).toMatchObject({
        ...budgetData,
        userId: user.userId,
      });
      expect(data.data).toHaveProperty('budgetId');
      expect(data.data).toHaveProperty('createdAt');
    });

    it('should create budget with minimal required fields', async () => {
      const user = await factory.createTestUser();

      const budgetData = {
        month: '2024-04',
        plannedIncomeMinor: 500000,
      };

      const request = createTestRequest('/api/budgets', {
        method: 'POST',
        body: budgetData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data).toMatchObject({
        ...budgetData,
        actualIncomeMinor: 0, // default value
        totalAllocatedMinor: 0, // default value
        status: 'draft', // default value
        userId: user.userId,
      });
    });

    it('should validate required fields', async () => {
      await factory.createTestUser();

      const invalidData = {
        plannedIncomeMinor: 500000,
        // missing month
      };

      const request = createTestRequest('/api/budgets', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'month');
    });

    it('should validate month format', async () => {
      await factory.createTestUser();

      const invalidData = {
        month: '2024-13', // invalid month
        plannedIncomeMinor: 500000,
      };

      const request = createTestRequest('/api/budgets', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'YYYY-MM format');
    });

    it('should validate status values', async () => {
      await factory.createTestUser();

      const invalidData = {
        month: '2024-03',
        plannedIncomeMinor: 500000,
        status: 'invalid-status',
      };

      const request = createTestRequest('/api/budgets', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'status');
    });

    it('should validate planned income is non-negative', async () => {
      await factory.createTestUser();

      const invalidData = {
        month: '2024-03',
        plannedIncomeMinor: -1000,
      };

      const request = createTestRequest('/api/budgets', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'non-negative');
    });

    it('should validate actual income is non-negative', async () => {
      await factory.createTestUser();

      const invalidData = {
        month: '2024-03',
        plannedIncomeMinor: 500000,
        actualIncomeMinor: -1000,
      };

      const request = createTestRequest('/api/budgets', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'non-negative');
    });

    it('should prevent duplicate budgets for same month', async () => {
      const user = await factory.createTestUser();
      await factory.createTestBudget(user.userId, { month: '2024-03' });

      const duplicateData = {
        month: '2024-03',
        plannedIncomeMinor: 500000,
      };

      const request = createTestRequest('/api/budgets', {
        method: 'POST',
        body: duplicateData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'already exists');
    });
  });

  describe('GET /api/budgets/[id]', () => {
    it('should return budget by ID', async () => {
      const user = await factory.createTestUser();
      const budget = await factory.createTestBudget(user.userId);

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`);
      const response = await getBudgetById(request, {
        params: { id: budget.budgetId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data).toMatchObject({
        budgetId: budget.budgetId,
        month: budget.month,
        plannedIncomeMinor: budget.plannedIncomeMinor,
      });
    });

    it('should return 404 for non-existent budget', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/budgets/${nonExistentId}`);
      const response = await getBudgetById(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should return 400 for invalid budget ID format', async () => {
      await factory.createTestUser();
      const invalidId = generateInvalidUuid();

      const request = createTestRequest(`/api/budgets/${invalidId}`);
      const response = await getBudgetById(request, {
        params: { id: invalidId },
      });

      await expectErrorResponse(response, 400, 'Invalid UUID');
    });

    it('should deny access to other users budgets', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const budget = await factory.createTestBudget(user2.userId);

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`);
      const response = await getBudgetById(request, {
        params: { id: budget.budgetId },
      });

      await expectErrorResponse(response, 403, 'Access denied');
    });
  });

  describe('PUT /api/budgets/[id]', () => {
    it('should update budget with valid data', async () => {
      const user = await factory.createTestUser();
      const budget = await factory.createTestBudget(user.userId);

      const updateData = {
        plannedIncomeMinor: 700000,
        actualIncomeMinor: 650000,
        totalAllocatedMinor: 500000,
        status: 'active',
      };

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: budget.budgetId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data).toMatchObject({
        ...updateData,
        budgetId: budget.budgetId,
        month: budget.month, // unchanged
      });
      expect(data.data.updatedAt).toBeDefined();
    });

    it('should allow partial updates', async () => {
      const user = await factory.createTestUser();
      const budget = await factory.createTestBudget(user.userId);

      const updateData = {
        actualIncomeMinor: 550000,
      };

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: budget.budgetId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data.actualIncomeMinor).toBe(550000);
      expect(data.data.plannedIncomeMinor).toBe(budget.plannedIncomeMinor); // unchanged
    });

    it('should prevent updating month field', async () => {
      const user = await factory.createTestUser();
      const budget = await factory.createTestBudget(user.userId);

      const updateData = {
        month: '2024-12', // trying to change month
        plannedIncomeMinor: 600000,
      };

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: budget.budgetId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data.month).toBe(budget.month); // should remain unchanged
      expect(data.data.plannedIncomeMinor).toBe(600000); // should be updated
    });

    it('should validate update data', async () => {
      const user = await factory.createTestUser();
      const budget = await factory.createTestBudget(user.userId);

      const invalidData = {
        plannedIncomeMinor: -1000, // negative amount
      };

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`, {
        method: 'PUT',
        body: invalidData,
      });
      const response = await PUT(request, {
        params: { id: budget.budgetId },
      });

      await expectErrorResponse(response, 400, 'non-negative');
    });

    it('should return 404 for non-existent budget', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/budgets/${nonExistentId}`, {
        method: 'PUT',
        body: { plannedIncomeMinor: 600000 },
      });
      const response = await PUT(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should deny access to other users budgets', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const budget = await factory.createTestBudget(user2.userId);

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`, {
        method: 'PUT',
        body: { plannedIncomeMinor: 999999 },
      });
      const response = await PUT(request, {
        params: { id: budget.budgetId },
      });

      await expectErrorResponse(response, 403, 'Access denied');
    });

    it('should validate status transitions', async () => {
      const user = await factory.createTestUser();
      const budget = await factory.createTestBudget(user.userId, { status: 'closed' });

      const updateData = {
        status: 'draft', // invalid transition from closed to draft
      };

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: budget.budgetId },
      });

      await expectErrorResponse(response, 400, 'Invalid status transition');
    });
  });

  describe('DELETE /api/budgets/[id]', () => {
    it('should delete budget successfully', async () => {
      const user = await factory.createTestUser();
      const budget = await factory.createTestBudget(user.userId);

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: budget.budgetId },
      });

      expect(response.status).toBe(204);

      // Verify budget is deleted
      const deletedBudget = await repos.budgets.findById(budget.budgetId);
      expect(deletedBudget).toBeNull();
    });

    it('should return 404 for non-existent budget', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/budgets/${nonExistentId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should deny access to other users budgets', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const budget = await factory.createTestBudget(user2.userId);

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: budget.budgetId },
      });

      await expectErrorResponse(response, 403, 'Access denied');

      // Verify budget still exists
      const existingBudget = await repos.budgets.findById(budget.budgetId);
      expect(existingBudget).not.toBeNull();
    });

    it('should return 400 for invalid budget ID format', async () => {
      await factory.createTestUser();
      const invalidId = generateInvalidUuid();

      const request = createTestRequest(`/api/budgets/${invalidId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: invalidId },
      });

      await expectErrorResponse(response, 400, 'Invalid UUID');
    });

    it('should prevent deletion of budget with allocations', async () => {
      const user = await factory.createTestUser();
      const budget = await factory.createTestBudget(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');

      // Create a category allocation for this budget
      await factory.createTestCategoryAllocation(budget.budgetId, category.categoryId);

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: budget.budgetId },
      });

      await expectErrorResponse(response, 400, 'has category allocations');
    });

    it('should prevent deletion of active budget', async () => {
      const user = await factory.createTestUser();
      const budget = await factory.createTestBudget(user.userId, { status: 'active' });

      const request = createTestRequest(`/api/budgets/${budget.budgetId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: budget.budgetId },
      });

      await expectErrorResponse(response, 400, 'Cannot delete active budget');
    });
  });
});
