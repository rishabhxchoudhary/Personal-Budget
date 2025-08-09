// Mock auth before any imports
jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
    },
  }),
}));

// Mock repositories before importing API routes
import { mockRepositories } from './mock-repositories';

jest.mock('@/shared/repositories/container', () => ({
  repositories: mockRepositories,
}));

// Now import the API routes
import { NextRequest } from 'next/server';
import { GET, POST } from '../accounts/route';
import { GET as getAccountById, PUT, DELETE } from '../accounts/[id]/route';
import { TestDataFactory } from './mock-repositories';
import { v4 as uuidv4 } from 'uuid';

// Helper functions
function createTestRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    searchParams?: Record<string, string>;
    headers?: Record<string, string>;
  } = {},
) {
  const { method = 'GET', body, searchParams = {}, headers = {} } = options;

  const baseUrl = 'http://localhost:3000';
  const fullUrl = new URL(url, baseUrl);

  Object.entries(searchParams).forEach(([key, value]) => {
    fullUrl.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  // Create a proper Request first, then wrap in NextRequest
  const request = new Request(fullUrl.toString(), requestInit);
  return new NextRequest(request);
}

async function expectSuccessResponse(response: Response, expectedStatus = 200) {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data).toHaveProperty('data');
  expect(data.error).toBeUndefined();
  return data;
}

async function expectErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedMessage?: string,
) {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data).toHaveProperty('error');
  expect(data.data).toBeUndefined();
  if (expectedMessage) {
    expect(data.error).toContain(expectedMessage);
  }
  return data;
}

async function expectPaginatedResponse(response: Response, expectedPage = 1, expectedLimit = 10) {
  const data = await expectSuccessResponse(response);
  expect(data).toHaveProperty('pagination');
  expect(data.pagination).toHaveProperty('page', expectedPage);
  expect(data.pagination).toHaveProperty('limit', expectedLimit);
  expect(data.pagination).toHaveProperty('total');
  expect(data.pagination).toHaveProperty('totalPages');
  expect(Array.isArray(data.data)).toBe(true);
  return data;
}

function generateValidUuid() {
  return uuidv4();
}

function generateInvalidUuid() {
  return 'invalid-uuid-format';
}

describe('Accounts API', () => {
  let factory: TestDataFactory;
  let userCounter = 0;

  beforeEach(async () => {
    factory = new TestDataFactory(mockRepositories);
    await mockRepositories.reset();
    userCounter = 0;
  });

  const createUniqueTestUser = async (
    overrides?: Partial<Parameters<UserRepository['create']>[0]>,
  ) => {
    userCounter++;
    return factory.createTestUser({
      email: `test${userCounter}@example.com`,
      ...overrides,
    });
  };

  describe('GET /api/accounts', () => {
    it('should return paginated list of user accounts', async () => {
      const user = await createUniqueTestUser();
      await factory.createTestAccount(user.userId, { name: 'Account 1' });
      await factory.createTestAccount(user.userId, { name: 'Account 2' });

      const request = createTestRequest('/api/accounts');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toHaveProperty('name', 'Account 1');
      expect(data.data[1]).toHaveProperty('name', 'Account 2');
    });

    it('should return empty list when user has no accounts', async () => {
      await createUniqueTestUser();

      const request = createTestRequest('/api/accounts');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(0);
    });

    it('should filter accounts by type', async () => {
      const user = await createUniqueTestUser();
      await factory.createTestAccount(user.userId, { type: 'checking' });
      await factory.createTestAccount(user.userId, { type: 'savings' });
      await factory.createTestAccount(user.userId, { type: 'credit' });

      const request = createTestRequest('/api/accounts', {
        searchParams: { type: 'checking' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].type).toBe('checking');
    });

    it('should filter accounts by active status', async () => {
      const user = await createUniqueTestUser();
      await factory.createTestAccount(user.userId, { isActive: true });
      await factory.createTestAccount(user.userId, { isActive: false });

      const request = createTestRequest('/api/accounts', {
        searchParams: { isActive: 'true' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].isActive).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const user = await createUniqueTestUser();
      for (let i = 1; i <= 5; i++) {
        await factory.createTestAccount(user.userId, { name: `Account ${i}` });
      }

      const request = createTestRequest('/api/accounts', {
        searchParams: { page: '2', limit: '2' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response, 2, 2);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(5);
      expect(data.pagination.totalPages).toBe(3);
    });

    it('should sort accounts by name', async () => {
      const user = await createUniqueTestUser();
      await factory.createTestAccount(user.userId, { name: 'Zulu Account' });
      await factory.createTestAccount(user.userId, { name: 'Alpha Account' });
      await factory.createTestAccount(user.userId, { name: 'Beta Account' });

      const request = createTestRequest('/api/accounts');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data[0].name).toBe('Alpha Account');
      expect(data.data[1].name).toBe('Beta Account');
      expect(data.data[2].name).toBe('Zulu Account');
    });

    it('should only return accounts for authenticated user', async () => {
      const user1 = await createUniqueTestUser();
      const user2 = await createUniqueTestUser();

      await factory.createTestAccount(user1.userId, { name: 'User 1 Account' });
      await factory.createTestAccount(user2.userId, { name: 'User 2 Account' });

      const request = createTestRequest('/api/accounts');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('User 1 Account');
    });
  });

  describe('POST /api/accounts', () => {
    it('should create a new account with valid data', async () => {
      const user = await createUniqueTestUser();

      const accountData = {
        name: 'New Account',
        type: 'checking',
        balanceMinor: 50000,
        currency: 'USD',
        isActive: true,
        institution: 'Test Bank',
        lastFour: '1234',
      };

      const request = createTestRequest('/api/accounts', {
        method: 'POST',
        body: accountData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data).toMatchObject({
        ...accountData,
        userId: user.userId,
      });
      expect(data.data).toHaveProperty('accountId');
      expect(data.data).toHaveProperty('createdAt');
    });

    it('should create account with minimal required fields', async () => {
      const user = await createUniqueTestUser();

      const accountData = {
        name: 'Simple Account',
        type: 'savings',
        balanceMinor: 0,
        currency: 'USD',
      };

      const request = createTestRequest('/api/accounts', {
        method: 'POST',
        body: accountData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data).toMatchObject({
        ...accountData,
        isActive: true,
        userId: user.userId,
      });
    });

    it('should validate required fields', async () => {
      await createUniqueTestUser();

      const invalidData = {
        type: 'checking',
        balanceMinor: 1000,
        currency: 'USD',
      };

      const request = createTestRequest('/api/accounts', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'name');
    });

    it('should validate account type', async () => {
      await createUniqueTestUser();

      const invalidData = {
        name: 'Test Account',
        type: 'invalid-type',
        balanceMinor: 1000,
        currency: 'USD',
      };

      const request = createTestRequest('/api/accounts', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'type');
    });

    it('should validate currency', async () => {
      await createUniqueTestUser();

      const invalidData = {
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 1000,
        currency: 'INVALID',
      };

      const request = createTestRequest('/api/accounts', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'currency');
    });

    it('should validate balance is non-negative', async () => {
      await createUniqueTestUser();

      const invalidData = {
        name: 'Test Account',
        type: 'checking',
        balanceMinor: -1000,
        currency: 'USD',
      };

      const request = createTestRequest('/api/accounts', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'non-negative');
    });

    it('should validate lastFour format', async () => {
      await createUniqueTestUser();

      const invalidData = {
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 1000,
        currency: 'USD',
        lastFour: '123',
      };

      const request = createTestRequest('/api/accounts', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'exactly 4 digits');
    });
  });

  describe('GET /api/accounts/[id]', () => {
    it('should return account by ID', async () => {
      const user = await createUniqueTestUser();
      const account = await factory.createTestAccount(user.userId);

      const request = createTestRequest(`/api/accounts/${account.accountId}`);
      const response = await getAccountById(request, {
        params: { id: account.accountId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data).toMatchObject({
        accountId: account.accountId,
        name: account.name,
        type: account.type,
      });
    });

    it('should return 404 for non-existent account', async () => {
      await createUniqueTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/accounts/${nonExistentId}`);
      const response = await getAccountById(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should return 400 for invalid account ID format', async () => {
      await createUniqueTestUser();
      const invalidId = generateInvalidUuid();

      const request = createTestRequest(`/api/accounts/${invalidId}`);
      const response = await getAccountById(request, {
        params: { id: invalidId },
      });

      await expectErrorResponse(response, 400, 'Invalid UUID');
    });

    it('should deny access to other users accounts', async () => {
      await createUniqueTestUser();
      const user2 = await createUniqueTestUser();
      const account = await factory.createTestAccount(user2.userId);

      const request = createTestRequest(`/api/accounts/${account.accountId}`);
      const response = await getAccountById(request, {
        params: { id: account.accountId },
      });

      await expectErrorResponse(response, 403, 'Access denied');
    });
  });

  describe('PUT /api/accounts/[id]', () => {
    it('should update account with valid data', async () => {
      const user = await createUniqueTestUser();
      const account = await factory.createTestAccount(user.userId);

      const updateData = {
        name: 'Updated Account Name',
        balanceMinor: 75000,
        institution: 'Updated Bank',
      };

      const request = createTestRequest(`/api/accounts/${account.accountId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: account.accountId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data).toMatchObject({
        ...updateData,
        accountId: account.accountId,
        type: account.type,
        currency: account.currency,
      });
      expect(data.data.updatedAt).toBeDefined();
    });

    it('should allow partial updates', async () => {
      const user = await createUniqueTestUser();
      const account = await factory.createTestAccount(user.userId);

      const updateData = {
        name: 'Partially Updated Account',
      };

      const request = createTestRequest(`/api/accounts/${account.accountId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: account.accountId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data.name).toBe('Partially Updated Account');
      expect(data.data.type).toBe(account.type);
    });

    it('should validate update data', async () => {
      const user = await createUniqueTestUser();
      const account = await factory.createTestAccount(user.userId);

      const invalidData = {
        name: '',
      };

      const request = createTestRequest(`/api/accounts/${account.accountId}`, {
        method: 'PUT',
        body: invalidData,
      });
      const response = await PUT(request, {
        params: { id: account.accountId },
      });

      await expectErrorResponse(response, 400, 'Name is required');
    });

    it('should return 404 for non-existent account', async () => {
      await createUniqueTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/accounts/${nonExistentId}`, {
        method: 'PUT',
        body: { name: 'Updated Name' },
      });
      const response = await PUT(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should deny access to other users accounts', async () => {
      await createUniqueTestUser();
      const user2 = await createUniqueTestUser();
      const account = await factory.createTestAccount(user2.userId);

      const request = createTestRequest(`/api/accounts/${account.accountId}`, {
        method: 'PUT',
        body: { name: 'Hacked Name' },
      });
      const response = await PUT(request, {
        params: { id: account.accountId },
      });

      await expectErrorResponse(response, 403, 'Access denied');
    });
  });

  describe('DELETE /api/accounts/[id]', () => {
    it('should delete account successfully', async () => {
      const user = await createUniqueTestUser();
      const account = await factory.createTestAccount(user.userId);

      const request = createTestRequest(`/api/accounts/${account.accountId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: account.accountId },
      });

      expect(response.status).toBe(204);

      const deletedAccount = await mockRepositories.accounts.findById(account.accountId);
      expect(deletedAccount).toBeNull();
    });

    it('should return 404 for non-existent account', async () => {
      await createUniqueTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/accounts/${nonExistentId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should deny access to other users accounts', async () => {
      await createUniqueTestUser();
      const user2 = await createUniqueTestUser();
      const account = await factory.createTestAccount(user2.userId);

      const request = createTestRequest(`/api/accounts/${account.accountId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: account.accountId },
      });

      await expectErrorResponse(response, 403, 'Access denied');

      const existingAccount = await mockRepositories.accounts.findById(account.accountId);
      expect(existingAccount).not.toBeNull();
    });

    it('should return 400 for invalid account ID format', async () => {
      await createUniqueTestUser();
      const invalidId = generateInvalidUuid();

      const request = createTestRequest(`/api/accounts/${invalidId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: invalidId },
      });

      await expectErrorResponse(response, 400, 'Invalid UUID');
    });
  });
});
