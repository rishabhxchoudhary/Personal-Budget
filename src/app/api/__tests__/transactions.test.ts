import { GET, POST } from '../transactions/route';
import { GET as getTransactionById, PUT, DELETE } from '../transactions/[id]/route';
import {
  createTestRequest,
  expectSuccessResponse,
  expectErrorResponse,
  expectPaginatedResponse,
  TestDataFactory,
  MockRepositories,
  generateInvalidUuid,
  generateValidUuid,
  generateFutureDate,
  generatePastDate,
} from './api-test-helpers';
import './setup-api-mocks';
import { getMockRepositories, resetMockRepositories } from './setup-api-mocks';

describe('Transactions API', () => {
  let repos: MockRepositories;
  let factory: TestDataFactory;

  beforeEach(async () => {
    repos = getMockRepositories();
    factory = new TestDataFactory(repos);
    await resetMockRepositories();
  });

  describe('GET /api/transactions', () => {
    it('should return paginated list of user transactions', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');

      await factory.createTestTransaction(user.userId, account.accountId, category.categoryId, {
        description: 'Transaction 1',
      });
      await factory.createTestTransaction(user.userId, account.accountId, category.categoryId, {
        description: 'Transaction 2',
      });

      const request = createTestRequest('/api/transactions');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(2);
      expect(
        data.data.some((txn: { description: string }) => txn.description === 'Transaction 1'),
      ).toBe(true);
      expect(
        data.data.some((txn: { description: string }) => txn.description === 'Transaction 2'),
      ).toBe(true);
    });

    it('should return empty list when user has no transactions', async () => {
      await factory.createTestUser();

      const request = createTestRequest('/api/transactions');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(0);
    });

    it('should filter transactions by type', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const expenseCategory = await factory.createTestCategory(user.userId, 'expense');
      const incomeCategory = await factory.createTestCategory(user.userId, 'income');

      await factory.createTestTransaction(
        user.userId,
        account.accountId,
        expenseCategory.categoryId,
        {
          type: 'expense',
        },
      );
      await factory.createTestTransaction(
        user.userId,
        account.accountId,
        incomeCategory.categoryId,
        {
          type: 'income',
        },
      );

      const request = createTestRequest('/api/transactions', {
        searchParams: { type: 'expense' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].type).toBe('expense');
    });

    it('should filter transactions by account', async () => {
      const user = await factory.createTestUser();
      const account1 = await factory.createTestAccount(user.userId, { name: 'Account 1' });
      const account2 = await factory.createTestAccount(user.userId, { name: 'Account 2' });
      const category = await factory.createTestCategory(user.userId, 'expense');

      await factory.createTestTransaction(user.userId, account1.accountId, category.categoryId);
      await factory.createTestTransaction(user.userId, account2.accountId, category.categoryId);

      const request = createTestRequest('/api/transactions', {
        searchParams: { accountId: account1.accountId },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].accountId).toBe(account1.accountId);
    });

    it('should filter transactions by category', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category1 = await factory.createTestCategory(user.userId, 'expense', { name: 'Food' });
      const category2 = await factory.createTestCategory(user.userId, 'expense', { name: 'Gas' });

      await factory.createTestTransaction(user.userId, account.accountId, category1.categoryId);
      await factory.createTestTransaction(user.userId, account.accountId, category2.categoryId);

      const request = createTestRequest('/api/transactions', {
        searchParams: { categoryId: category1.categoryId },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].splits[0].categoryId).toBe(category1.categoryId);
    });

    it('should filter transactions by date range', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');

      await factory.createTestTransaction(user.userId, account.accountId, category.categoryId, {
        date: '2024-01-15',
      });
      await factory.createTestTransaction(user.userId, account.accountId, category.categoryId, {
        date: '2024-02-15',
      });
      await factory.createTestTransaction(user.userId, account.accountId, category.categoryId, {
        date: '2024-03-15',
      });

      const request = createTestRequest('/api/transactions', {
        searchParams: { startDate: '2024-02-01', endDate: '2024-02-28' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].date).toBe('2024-02-15');
    });

    it('should filter transactions by status', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');

      await factory.createTestTransaction(user.userId, account.accountId, category.categoryId, {
        status: 'pending',
      });
      await factory.createTestTransaction(user.userId, account.accountId, category.categoryId, {
        status: 'cleared',
      });

      const request = createTestRequest('/api/transactions', {
        searchParams: { status: 'cleared' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].status).toBe('cleared');
    });

    it('should handle pagination correctly', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');

      // Create 5 transactions
      for (let i = 1; i <= 5; i++) {
        await factory.createTestTransaction(user.userId, account.accountId, category.categoryId, {
          description: `Transaction ${i}`,
        });
      }

      const request = createTestRequest('/api/transactions', {
        searchParams: { page: '2', limit: '2' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response, 2, 2);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(5);
      expect(data.pagination.totalPages).toBe(3);
    });

    it('should sort transactions by date descending', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');

      await factory.createTestTransaction(user.userId, account.accountId, category.categoryId, {
        date: '2024-01-01',
      });
      await factory.createTestTransaction(user.userId, account.accountId, category.categoryId, {
        date: '2024-03-01',
      });
      await factory.createTestTransaction(user.userId, account.accountId, category.categoryId, {
        date: '2024-02-01',
      });

      const request = createTestRequest('/api/transactions');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data[0].date).toBe('2024-03-01');
      expect(data.data[1].date).toBe('2024-02-01');
      expect(data.data[2].date).toBe('2024-01-01');
    });

    it('should only return transactions for authenticated user', async () => {
      const user1 = await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });

      const account1 = await factory.createTestAccount(user1.userId);
      const account2 = await factory.createTestAccount(user2.userId);
      const category1 = await factory.createTestCategory(user1.userId, 'expense');
      const category2 = await factory.createTestCategory(user2.userId, 'expense');

      await factory.createTestTransaction(user1.userId, account1.accountId, category1.categoryId);
      await factory.createTestTransaction(user2.userId, account2.accountId, category2.categoryId);

      const request = createTestRequest('/api/transactions');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].accountId).toBe(account1.accountId);
    });
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction with valid data', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');

      const transactionData = {
        accountId: account.accountId,
        date: generatePastDate(),
        amountMinor: 5000,
        type: 'expense',
        status: 'pending',
        counterparty: 'Test Store',
        description: 'Test purchase',
        splits: [
          {
            categoryId: category.categoryId,
            amountMinor: 5000,
            note: 'Test split',
          },
        ],
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: transactionData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data).toMatchObject({
        ...transactionData,
        userId: user.userId,
      });
      expect(data.data).toHaveProperty('transactionId');
      expect(data.data).toHaveProperty('createdAt');
    });

    it('should create transaction with minimal required fields', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);

      const transactionData = {
        accountId: account.accountId,
        date: generatePastDate(),
        amountMinor: 3000,
        type: 'expense',
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: transactionData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data).toMatchObject({
        ...transactionData,
        status: 'pending', // default value
        userId: user.userId,
      });
    });

    it('should create transaction with multiple splits', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category1 = await factory.createTestCategory(user.userId, 'expense', { name: 'Food' });
      const category2 = await factory.createTestCategory(user.userId, 'expense', { name: 'Gas' });

      const transactionData = {
        accountId: account.accountId,
        date: generatePastDate(),
        amountMinor: 10000,
        type: 'expense',
        splits: [
          {
            categoryId: category1.categoryId,
            amountMinor: 6000,
            note: 'Food portion',
          },
          {
            categoryId: category2.categoryId,
            amountMinor: 4000,
            note: 'Gas portion',
          },
        ],
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: transactionData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data.splits).toHaveLength(2);
      expect(data.data.splits[0].amountMinor).toBe(6000);
      expect(data.data.splits[1].amountMinor).toBe(4000);
    });

    it('should validate required fields', async () => {
      await factory.createTestUser();

      const invalidData = {
        date: generatePastDate(),
        amountMinor: 5000,
        type: 'expense',
        // missing accountId
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'accountId');
    });

    it('should validate transaction type', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);

      const invalidData = {
        accountId: account.accountId,
        date: generatePastDate(),
        amountMinor: 5000,
        type: 'invalid-type',
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'type');
    });

    it('should validate status values', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);

      const invalidData = {
        accountId: account.accountId,
        date: generatePastDate(),
        amountMinor: 5000,
        type: 'expense',
        status: 'invalid-status',
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'status');
    });

    it('should validate amount is positive', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);

      const invalidData = {
        accountId: account.accountId,
        date: generatePastDate(),
        amountMinor: 0, // should be positive
        type: 'expense',
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'positive');
    });

    it('should validate date format', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);

      const invalidData = {
        accountId: account.accountId,
        date: '2024/01/01', // wrong format
        amountMinor: 5000,
        type: 'expense',
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'YYYY-MM-DD format');
    });

    it('should reject future dates', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);

      const invalidData = {
        accountId: account.accountId,
        date: generateFutureDate(),
        amountMinor: 5000,
        type: 'expense',
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'future date');
    });

    it('should validate account exists and belongs to user', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const otherAccount = await factory.createTestAccount(user2.userId);

      const invalidData = {
        accountId: otherAccount.accountId,
        date: generatePastDate(),
        amountMinor: 5000,
        type: 'expense',
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'Account not found');
    });

    it('should validate split amounts equal total amount', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');

      const invalidData = {
        accountId: account.accountId,
        date: generatePastDate(),
        amountMinor: 10000,
        type: 'expense',
        splits: [
          {
            categoryId: category.categoryId,
            amountMinor: 5000, // doesn't equal total
          },
        ],
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'split amounts must equal total');
    });

    it('should validate categories exist and belong to user', async () => {
      const user1 = await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const account = await factory.createTestAccount(user1.userId);
      const otherCategory = await factory.createTestCategory(user2.userId, 'expense');

      const invalidData = {
        accountId: account.accountId,
        date: generatePastDate(),
        amountMinor: 5000,
        type: 'expense',
        splits: [
          {
            categoryId: otherCategory.categoryId,
            amountMinor: 5000,
          },
        ],
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'Category not found');
    });

    it('should validate category type matches transaction type', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const incomeCategory = await factory.createTestCategory(user.userId, 'income');

      const invalidData = {
        accountId: account.accountId,
        date: generatePastDate(),
        amountMinor: 5000,
        type: 'expense', // mismatched with income category
        splits: [
          {
            categoryId: incomeCategory.categoryId,
            amountMinor: 5000,
          },
        ],
      };

      const request = createTestRequest('/api/transactions', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'Category type mismatch');
    });
  });

  describe('GET /api/transactions/[id]', () => {
    it('should return transaction by ID', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');
      const transaction = await factory.createTestTransaction(
        user.userId,
        account.accountId,
        category.categoryId,
      );

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`);
      const response = await getTransactionById(request, {
        params: { id: transaction.transactionId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data).toMatchObject({
        transactionId: transaction.transactionId,
        accountId: transaction.accountId,
        amountMinor: transaction.amountMinor,
      });
    });

    it('should return 404 for non-existent transaction', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/transactions/${nonExistentId}`);
      const response = await getTransactionById(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should return 400 for invalid transaction ID format', async () => {
      await factory.createTestUser();
      const invalidId = generateInvalidUuid();

      const request = createTestRequest(`/api/transactions/${invalidId}`);
      const response = await getTransactionById(request, {
        params: { id: invalidId },
      });

      await expectErrorResponse(response, 400, 'Invalid UUID');
    });

    it('should deny access to other users transactions', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const account = await factory.createTestAccount(user2.userId);
      const category = await factory.createTestCategory(user2.userId, 'expense');
      const transaction = await factory.createTestTransaction(
        user2.userId,
        account.accountId,
        category.categoryId,
      );

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`);
      const response = await getTransactionById(request, {
        params: { id: transaction.transactionId },
      });

      await expectErrorResponse(response, 403, 'Access denied');
    });
  });

  describe('PUT /api/transactions/[id]', () => {
    it('should update transaction with valid data', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');
      const transaction = await factory.createTestTransaction(
        user.userId,
        account.accountId,
        category.categoryId,
      );

      const updateData = {
        amountMinor: 7500,
        description: 'Updated description',
        counterparty: 'Updated Store',
        status: 'cleared',
      };

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: transaction.transactionId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data).toMatchObject({
        ...updateData,
        transactionId: transaction.transactionId,
        accountId: transaction.accountId, // unchanged
      });
      expect(data.data.updatedAt).toBeDefined();
    });

    it('should allow partial updates', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');
      const transaction = await factory.createTestTransaction(
        user.userId,
        account.accountId,
        category.categoryId,
      );

      const updateData = {
        description: 'Partially updated',
      };

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: transaction.transactionId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data.description).toBe('Partially updated');
      expect(data.data.amountMinor).toBe(transaction.amountMinor); // unchanged
    });

    it('should update transaction splits', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category1 = await factory.createTestCategory(user.userId, 'expense', { name: 'Food' });
      const category2 = await factory.createTestCategory(user.userId, 'expense', { name: 'Gas' });
      const transaction = await factory.createTestTransaction(
        user.userId,
        account.accountId,
        category1.categoryId,
      );

      const updateData = {
        amountMinor: 8000,
        splits: [
          {
            categoryId: category1.categoryId,
            amountMinor: 5000,
            note: 'Updated food',
          },
          {
            categoryId: category2.categoryId,
            amountMinor: 3000,
            note: 'New gas split',
          },
        ],
      };

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: transaction.transactionId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data.splits).toHaveLength(2);
      expect(data.data.amountMinor).toBe(8000);
    });

    it('should validate update data', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');
      const transaction = await factory.createTestTransaction(
        user.userId,
        account.accountId,
        category.categoryId,
      );

      const invalidData = {
        amountMinor: -1000, // negative amount
      };

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`, {
        method: 'PUT',
        body: invalidData,
      });
      const response = await PUT(request, {
        params: { id: transaction.transactionId },
      });

      await expectErrorResponse(response, 400, 'positive');
    });

    it('should return 404 for non-existent transaction', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/transactions/${nonExistentId}`, {
        method: 'PUT',
        body: { description: 'Updated' },
      });
      const response = await PUT(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should deny access to other users transactions', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const account = await factory.createTestAccount(user2.userId);
      const category = await factory.createTestCategory(user2.userId, 'expense');
      const transaction = await factory.createTestTransaction(
        user2.userId,
        account.accountId,
        category.categoryId,
      );

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`, {
        method: 'PUT',
        body: { description: 'Hacked' },
      });
      const response = await PUT(request, {
        params: { id: transaction.transactionId },
      });

      await expectErrorResponse(response, 403, 'Access denied');
    });

    it('should prevent updates to reconciled transactions', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');
      const transaction = await factory.createTestTransaction(
        user.userId,
        account.accountId,
        category.categoryId,
        { status: 'reconciled' },
      );

      const updateData = {
        description: 'Should not update',
      };

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: transaction.transactionId },
      });

      await expectErrorResponse(response, 400, 'Cannot modify reconciled');
    });
  });

  describe('DELETE /api/transactions/[id]', () => {
    it('should delete transaction successfully', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');
      const transaction = await factory.createTestTransaction(
        user.userId,
        account.accountId,
        category.categoryId,
      );

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: transaction.transactionId },
      });

      expect(response.status).toBe(204);

      // Verify transaction is deleted
      const deletedTransaction = await repos.transactions.findById(transaction.transactionId);
      expect(deletedTransaction).toBeNull();
    });

    it('should return 404 for non-existent transaction', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/transactions/${nonExistentId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should deny access to other users transactions', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const account = await factory.createTestAccount(user2.userId);
      const category = await factory.createTestCategory(user2.userId, 'expense');
      const transaction = await factory.createTestTransaction(
        user2.userId,
        account.accountId,
        category.categoryId,
      );

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: transaction.transactionId },
      });

      await expectErrorResponse(response, 403, 'Access denied');

      // Verify transaction still exists
      const existingTransaction = await repos.transactions.findById(transaction.transactionId);
      expect(existingTransaction).not.toBeNull();
    });

    it('should return 400 for invalid transaction ID format', async () => {
      await factory.createTestUser();
      const invalidId = generateInvalidUuid();

      const request = createTestRequest(`/api/transactions/${invalidId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: invalidId },
      });

      await expectErrorResponse(response, 400, 'Invalid UUID');
    });

    it('should prevent deletion of reconciled transactions', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');
      const transaction = await factory.createTestTransaction(
        user.userId,
        account.accountId,
        category.categoryId,
        { status: 'reconciled' },
      );

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: transaction.transactionId },
      });

      await expectErrorResponse(response, 400, 'Cannot delete reconciled');
    });

    it('should prevent deletion of transactions with debt shares', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');
      const transaction = await factory.createTestTransaction(
        user.userId,
        account.accountId,
        category.categoryId,
      );

      const externalPerson = await factory.createTestExternalPerson(user.userId);
      await factory.createTestDebtShare(transaction.transactionId, externalPerson.externalPersonId);

      const request = createTestRequest(`/api/transactions/${transaction.transactionId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: transaction.transactionId },
      });

      await expectErrorResponse(response, 400, 'has debt shares');
    });
  });
});
