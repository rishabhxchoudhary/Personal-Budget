import { NextRequest } from 'next/server';
import { GET, POST } from '../external-people/route';
import { GET as getExternalPersonById, PUT, DELETE } from '../external-people/[id]/route';
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

describe('External People API', () => {
  let repos: MockRepositories;
  let factory: TestDataFactory;

  beforeEach(async () => {
    repos = getMockRepositories();
    factory = new TestDataFactory(repos);
    await resetMockRepositories();
  });

  describe('GET /api/external-people', () => {
    it('should return paginated list of user external people', async () => {
      const user = await factory.createTestUser();
      await factory.createTestExternalPerson(user.userId, { name: 'John Doe' });
      await factory.createTestExternalPerson(user.userId, { name: 'Jane Smith' });

      const request = createTestRequest('/api/external-people');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(2);
      expect(data.data.some((person: { name: string }) => person.name === 'John Doe')).toBe(true);
      expect(data.data.some((person: { name: string }) => person.name === 'Jane Smith')).toBe(true);
    });

    it('should return empty list when user has no external people', async () => {
      await factory.createTestUser();

      const request = createTestRequest('/api/external-people');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(0);
    });

    it('should filter external people by active status', async () => {
      const user = await factory.createTestUser();
      await factory.createTestExternalPerson(user.userId, {
        name: 'Active Person',
        isActive: true,
      });
      await factory.createTestExternalPerson(user.userId, {
        name: 'Inactive Person',
        isActive: false,
      });

      const request = createTestRequest('/api/external-people', {
        searchParams: { isActive: 'true' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].isActive).toBe(true);
      expect(data.data[0].name).toBe('Active Person');
    });

    it('should handle pagination correctly', async () => {
      const user = await factory.createTestUser();
      // Create 5 external people
      for (let i = 1; i <= 5; i++) {
        await factory.createTestExternalPerson(user.userId, { name: `Person ${i}` });
      }

      const request = createTestRequest('/api/external-people', {
        searchParams: { page: '2', limit: '2' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response, 2, 2);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(5);
      expect(data.pagination.totalPages).toBe(3);
    });

    it('should sort external people by name', async () => {
      const user = await factory.createTestUser();
      await factory.createTestExternalPerson(user.userId, { name: 'Zulu Person' });
      await factory.createTestExternalPerson(user.userId, { name: 'Alpha Person' });
      await factory.createTestExternalPerson(user.userId, { name: 'Beta Person' });

      const request = createTestRequest('/api/external-people');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data[0].name).toBe('Alpha Person');
      expect(data.data[1].name).toBe('Beta Person');
      expect(data.data[2].name).toBe('Zulu Person');
    });

    it('should only return external people for authenticated user', async () => {
      const user1 = await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });

      await factory.createTestExternalPerson(user1.userId, { name: 'User 1 Contact' });
      await factory.createTestExternalPerson(user2.userId, { name: 'User 2 Contact' });

      const request = createTestRequest('/api/external-people');
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('User 1 Contact');
    });

    it('should search external people by name', async () => {
      const user = await factory.createTestUser();
      await factory.createTestExternalPerson(user.userId, { name: 'John Smith' });
      await factory.createTestExternalPerson(user.userId, { name: 'Jane Doe' });
      await factory.createTestExternalPerson(user.userId, { name: 'John Brown' });

      const request = createTestRequest('/api/external-people', {
        searchParams: { search: 'John' },
      });
      const response = await GET(request);

      const data = await expectPaginatedResponse(response);
      expect(data.data).toHaveLength(2);
      expect(data.data.every((person: { name: string }) => person.name.includes('John'))).toBe(
        true,
      );
    });
  });

  describe('POST /api/external-people', () => {
    it('should create a new external person with valid data', async () => {
      const user = await factory.createTestUser();

      const personData = {
        name: 'New Contact',
        email: 'newcontact@example.com',
        phone: '+1234567890',
        isActive: true,
      };

      const request = createTestRequest('/api/external-people', {
        method: 'POST',
        body: personData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data).toMatchObject({
        ...personData,
        userId: user.userId,
      });
      expect(data.data).toHaveProperty('externalPersonId');
      expect(data.data).toHaveProperty('createdAt');
    });

    it('should create external person with minimal required fields', async () => {
      const user = await factory.createTestUser();

      const personData = {
        name: 'Simple Contact',
      };

      const request = createTestRequest('/api/external-people', {
        method: 'POST',
        body: personData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data).toMatchObject({
        ...personData,
        isActive: true, // default value
        userId: user.userId,
      });
      expect(data.data.email).toBeUndefined();
      expect(data.data.phone).toBeUndefined();
    });

    it('should validate required fields', async () => {
      await factory.createTestUser();

      const invalidData = {
        email: 'test@example.com',
        // missing name
      };

      const request = createTestRequest('/api/external-people', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'Name is required');
    });

    it('should validate email format', async () => {
      await factory.createTestUser();

      const invalidData = {
        name: 'Test Person',
        email: 'invalid-email',
      };

      const request = createTestRequest('/api/external-people', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'Invalid email');
    });

    it('should validate phone format', async () => {
      await factory.createTestUser();

      const invalidData = {
        name: 'Test Person',
        phone: '123', // too short
      };

      const request = createTestRequest('/api/external-people', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'Phone must be at least 7 characters');
    });

    it('should validate name length', async () => {
      await factory.createTestUser();

      const invalidData = {
        name: 'a'.repeat(101), // too long
      };

      const request = createTestRequest('/api/external-people', {
        method: 'POST',
        body: invalidData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, '100 characters');
    });

    it('should prevent duplicate names within user scope', async () => {
      const user = await factory.createTestUser();
      await factory.createTestExternalPerson(user.userId, { name: 'Existing Person' });

      const duplicateData = {
        name: 'Existing Person',
      };

      const request = createTestRequest('/api/external-people', {
        method: 'POST',
        body: duplicateData,
      });
      const response = await POST(request);

      await expectErrorResponse(response, 400, 'already exists');
    });

    it('should allow same name for different users', async () => {
      const user1 = await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });

      await factory.createTestExternalPerson(user2.userId, { name: 'Shared Name' });

      const personData = {
        name: 'Shared Name',
      };

      // Mock auth to return user1
      const request = createTestRequest('/api/external-people', {
        method: 'POST',
        body: personData,
      });
      const response = await POST(request);

      const data = await expectSuccessResponse(response, 201);
      expect(data.data.name).toBe('Shared Name');
      expect(data.data.userId).toBe(user1.userId);
    });

    it('should reject invalid JSON', async () => {
      await factory.createTestUser();

      const request = new Request('http://localhost:3000/api/external-people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request as NextRequest);
      await expectErrorResponse(response, 400, 'Invalid request body');
    });
  });

  describe('GET /api/external-people/[id]', () => {
    it('should return external person by ID', async () => {
      const user = await factory.createTestUser();
      const person = await factory.createTestExternalPerson(user.userId);

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`);
      const response = await getExternalPersonById(request, {
        params: { id: person.externalPersonId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data).toMatchObject({
        externalPersonId: person.externalPersonId,
        name: person.name,
        email: person.email,
      });
    });

    it('should return 404 for non-existent external person', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/external-people/${nonExistentId}`);
      const response = await getExternalPersonById(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should return 400 for invalid external person ID format', async () => {
      await factory.createTestUser();
      const invalidId = generateInvalidUuid();

      const request = createTestRequest(`/api/external-people/${invalidId}`);
      const response = await getExternalPersonById(request, {
        params: { id: invalidId },
      });

      await expectErrorResponse(response, 400, 'Invalid UUID');
    });

    it('should deny access to other users external people', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const person = await factory.createTestExternalPerson(user2.userId);

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`);
      const response = await getExternalPersonById(request, {
        params: { id: person.externalPersonId },
      });

      await expectErrorResponse(response, 403, 'Access denied');
    });
  });

  describe('PUT /api/external-people/[id]', () => {
    it('should update external person with valid data', async () => {
      const user = await factory.createTestUser();
      const person = await factory.createTestExternalPerson(user.userId);

      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        phone: '+9876543210',
        isActive: false,
      };

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: person.externalPersonId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data).toMatchObject({
        ...updateData,
        externalPersonId: person.externalPersonId,
      });
      expect(data.data.updatedAt).toBeDefined();
    });

    it('should allow partial updates', async () => {
      const user = await factory.createTestUser();
      const person = await factory.createTestExternalPerson(user.userId);

      const updateData = {
        name: 'Partially Updated Name',
      };

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: person.externalPersonId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data.name).toBe('Partially Updated Name');
      expect(data.data.email).toBe(person.email); // unchanged
    });

    it('should validate update data', async () => {
      const user = await factory.createTestUser();
      const person = await factory.createTestExternalPerson(user.userId);

      const invalidData = {
        name: '', // empty name
      };

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`, {
        method: 'PUT',
        body: invalidData,
      });
      const response = await PUT(request, {
        params: { id: person.externalPersonId },
      });

      await expectErrorResponse(response, 400, 'Name is required');
    });

    it('should validate email format on update', async () => {
      const user = await factory.createTestUser();
      const person = await factory.createTestExternalPerson(user.userId);

      const invalidData = {
        email: 'invalid-email-format',
      };

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`, {
        method: 'PUT',
        body: invalidData,
      });
      const response = await PUT(request, {
        params: { id: person.externalPersonId },
      });

      await expectErrorResponse(response, 400, 'Invalid email');
    });

    it('should return 404 for non-existent external person', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/external-people/${nonExistentId}`, {
        method: 'PUT',
        body: { name: 'Updated Name' },
      });
      const response = await PUT(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should deny access to other users external people', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const person = await factory.createTestExternalPerson(user2.userId);

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`, {
        method: 'PUT',
        body: { name: 'Hacked Name' },
      });
      const response = await PUT(request, {
        params: { id: person.externalPersonId },
      });

      await expectErrorResponse(response, 403, 'Access denied');
    });

    it('should prevent duplicate names on update', async () => {
      const user = await factory.createTestUser();
      await factory.createTestExternalPerson(user.userId, { name: 'Person 1' });
      const person2 = await factory.createTestExternalPerson(user.userId, { name: 'Person 2' });

      const updateData = {
        name: 'Person 1', // trying to use existing name
      };

      const request = createTestRequest(`/api/external-people/${person2.externalPersonId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: person2.externalPersonId },
      });

      await expectErrorResponse(response, 400, 'already exists');
    });

    it('should allow keeping same name on update', async () => {
      const user = await factory.createTestUser();
      const person = await factory.createTestExternalPerson(user.userId, { name: 'Original Name' });

      const updateData = {
        name: 'Original Name', // keeping same name
        email: 'newemail@example.com',
      };

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`, {
        method: 'PUT',
        body: updateData,
      });
      const response = await PUT(request, {
        params: { id: person.externalPersonId },
      });

      const data = await expectSuccessResponse(response);
      expect(data.data.name).toBe('Original Name');
      expect(data.data.email).toBe('newemail@example.com');
    });
  });

  describe('DELETE /api/external-people/[id]', () => {
    it('should delete external person successfully', async () => {
      const user = await factory.createTestUser();
      const person = await factory.createTestExternalPerson(user.userId);

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: person.externalPersonId },
      });

      expect(response.status).toBe(204);

      // Verify external person is deleted
      const deletedPerson = await repos.externalPeople.findById(person.externalPersonId);
      expect(deletedPerson).toBeNull();
    });

    it('should return 404 for non-existent external person', async () => {
      await factory.createTestUser();
      const nonExistentId = generateValidUuid();

      const request = createTestRequest(`/api/external-people/${nonExistentId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: nonExistentId },
      });

      await expectErrorResponse(response, 404, 'not found');
    });

    it('should deny access to other users external people', async () => {
      await factory.createTestUser();
      const user2 = await factory.createTestUser({ email: 'user2@example.com' });
      const person = await factory.createTestExternalPerson(user2.userId);

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: person.externalPersonId },
      });

      await expectErrorResponse(response, 403, 'Access denied');

      // Verify external person still exists
      const existingPerson = await repos.externalPeople.findById(person.externalPersonId);
      expect(existingPerson).not.toBeNull();
    });

    it('should return 400 for invalid external person ID format', async () => {
      await factory.createTestUser();
      const invalidId = generateInvalidUuid();

      const request = createTestRequest(`/api/external-people/${invalidId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: invalidId },
      });

      await expectErrorResponse(response, 400, 'Invalid UUID');
    });

    it('should prevent deletion of external person with pending debt shares', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');
      const person = await factory.createTestExternalPerson(user.userId);

      // Create a transaction and debt share
      const transaction = await factory.createTestTransaction(
        user.userId,
        account.accountId,
        category.categoryId,
      );
      await factory.createTestDebtShare(transaction.transactionId, person.externalPersonId, {
        status: 'pending',
      });

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: person.externalPersonId },
      });

      await expectErrorResponse(response, 400, 'has pending debt shares');
    });

    it('should allow deletion of external person with paid debt shares', async () => {
      const user = await factory.createTestUser();
      const account = await factory.createTestAccount(user.userId);
      const category = await factory.createTestCategory(user.userId, 'expense');
      const person = await factory.createTestExternalPerson(user.userId);

      // Create a transaction and paid debt share
      const transaction = await factory.createTestTransaction(
        user.userId,
        account.accountId,
        category.categoryId,
      );
      await factory.createTestDebtShare(transaction.transactionId, person.externalPersonId, {
        status: 'paid',
      });

      const request = createTestRequest(`/api/external-people/${person.externalPersonId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: { id: person.externalPersonId },
      });

      expect(response.status).toBe(204);

      // Verify external person is deleted
      const deletedPerson = await repos.externalPeople.findById(person.externalPersonId);
      expect(deletedPerson).toBeNull();
    });
  });
});
