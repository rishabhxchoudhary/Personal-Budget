import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { DynamoDBUserRepository } from '../dynamodb-user-repository';
import { DynamoDBConverters, KeyPatterns } from '@/shared/types/dynamodb';
import type { User } from '@/shared/types/common';
import type { DynamoDBTableConfig } from '@/shared/types/dynamodb';

// Mock DynamoDB client
const mockDynamoDBClient = {
  put: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  query: jest.fn(),
  batchGet: jest.fn(),
  batchWrite: jest.fn(),
  transactWrite: jest.fn(),
} as unknown as DynamoDBDocument;

const testConfig: DynamoDBTableConfig = {
  tableName: 'test-table',
  partitionKey: 'pk',
  sortKey: 'sk',
  gsi1Name: 'GSI1',
  gsi1PartitionKey: 'gsi1pk',
  gsi1SortKey: 'gsi1sk',
  gsi2Name: 'GSI2',
  gsi2PartitionKey: 'gsi2pk',
  gsi2SortKey: 'gsi2sk',
};

describe('DynamoDBUserRepository', () => {
  let repository: DynamoDBUserRepository;

  beforeEach(() => {
    repository = new DynamoDBUserRepository(mockDynamoDBClient, testConfig);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user with all provided fields', async () => {
      const createInput = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'EUR',
        monthStartDay: 15,
      };

      (mockDynamoDBClient.put as jest.Mock).mockResolvedValue({});

      const result = await repository.create(createInput);

      expect(mockDynamoDBClient.put).toHaveBeenCalledWith({
        TableName: 'test-table',
        Item: expect.objectContaining({
          pk: 'USER#user-123',
          sk: 'USER#user-123',
          gsi1pk: 'EMAIL#test@example.com',
          gsi1sk: 'USER',
          entityType: 'USER',
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          defaultCurrency: 'EUR',
          monthStartDay: 15,
        }),
      });

      expect(result).toMatchObject({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'EUR',
        monthStartDay: 15,
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a user with generated userId when not provided', async () => {
      const createInput = {
        email: 'test@example.com',
        name: 'Test User',
      };

      (mockDynamoDBClient.put as jest.Mock).mockResolvedValue({});

      const result = await repository.create(createInput);

      expect(result.userId).toBeDefined();
      expect(result.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.defaultCurrency).toBe('USD'); // default value
      expect(result.monthStartDay).toBe(1); // default value
    });

    it('should create a user with default values when optional fields not provided', async () => {
      const createInput = {
        email: 'test@example.com',
        name: 'Test User',
      };

      (mockDynamoDBClient.put as jest.Mock).mockResolvedValue({});

      const result = await repository.create(createInput);

      expect(result.defaultCurrency).toBe('USD');
      expect(result.monthStartDay).toBe(1);
    });

    it('should create user item with correct GSI keys for email lookup', async () => {
      const createInput = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      (mockDynamoDBClient.put as jest.Mock).mockResolvedValue({});

      await repository.create(createInput);

      expect(mockDynamoDBClient.put).toHaveBeenCalledWith({
        TableName: 'test-table',
        Item: expect.objectContaining({
          gsi1pk: 'EMAIL#test@example.com',
          gsi1sk: 'USER',
        }),
      });
    });

    it('should handle errors during user creation', async () => {
      const createInput = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const error = new Error('DynamoDB error');
      (mockDynamoDBClient.put as jest.Mock).mockRejectedValue(error);

      await expect(repository.create(createInput)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('findById', () => {
    it('should find a user by ID successfully', async () => {
      const userId = 'user-123';
      const userItem = {
        pk: 'USER#user-123',
        sk: 'USER#user-123',
        gsi1pk: 'EMAIL#test@example.com',
        gsi1sk: 'USER',
        entityType: 'USER',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      (mockDynamoDBClient.get as jest.Mock).mockResolvedValue({
        Item: userItem,
      });

      const result = await repository.findById(userId);

      expect(mockDynamoDBClient.get).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'USER#user-123',
          sk: 'USER#user-123',
        },
      });

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when user not found', async () => {
      const userId = 'non-existent-user';

      (mockDynamoDBClient.get as jest.Mock).mockResolvedValue({});

      const result = await repository.findById(userId);

      expect(mockDynamoDBClient.get).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'USER#non-existent-user',
          sk: 'USER#non-existent-user',
        },
      });

      expect(result).toBeNull();
    });

    it('should handle errors during user lookup', async () => {
      const userId = 'user-123';
      const error = new Error('DynamoDB error');
      (mockDynamoDBClient.get as jest.Mock).mockRejectedValue(error);

      await expect(repository.findById(userId)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email successfully', async () => {
      const email = 'test@example.com';
      const userItem = {
        pk: 'USER#user-123',
        sk: 'USER#user-123',
        gsi1pk: 'EMAIL#test@example.com',
        gsi1sk: 'USER',
        entityType: 'USER',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      (mockDynamoDBClient.query as jest.Mock).mockResolvedValue({
        Items: [userItem],
      });

      const result = await repository.findByEmail(email);

      expect(mockDynamoDBClient.query).toHaveBeenCalledWith({
        TableName: 'test-table',
        IndexName: 'GSI1',
        KeyConditionExpression: '#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk',
        ExpressionAttributeNames: {
          '#gsi1pk': 'gsi1pk',
          '#gsi1sk': 'gsi1sk',
        },
        ExpressionAttributeValues: {
          ':gsi1pk': 'EMAIL#test@example.com',
          ':gsi1sk': 'USER',
        },
      });

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when user not found by email', async () => {
      const email = 'non-existent@example.com';

      (mockDynamoDBClient.query as jest.Mock).mockResolvedValue({
        Items: [],
      });

      const result = await repository.findByEmail(email);

      expect(mockDynamoDBClient.query).toHaveBeenCalledWith({
        TableName: 'test-table',
        IndexName: 'GSI1',
        KeyConditionExpression: '#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk',
        ExpressionAttributeNames: {
          '#gsi1pk': 'gsi1pk',
          '#gsi1sk': 'gsi1sk',
        },
        ExpressionAttributeValues: {
          ':gsi1pk': 'EMAIL#non-existent@example.com',
          ':gsi1sk': 'USER',
        },
      });

      expect(result).toBeNull();
    });

    it('should handle errors during email lookup', async () => {
      const email = 'test@example.com';
      const error = new Error('DynamoDB error');
      (mockDynamoDBClient.query as jest.Mock).mockRejectedValue(error);

      await expect(repository.findByEmail(email)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('findAll', () => {
    it('should throw error as findAll is not supported', async () => {
      await expect(repository.findAll()).rejects.toThrow(
        'findAll is not supported for User repository - would require scan operation',
      );
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const userId = 'user-123';
      const updates = {
        name: 'Updated Name',
        defaultCurrency: 'EUR',
        monthStartDay: 15,
      };

      const updatedItem = {
        pk: 'USER#user-123',
        sk: 'USER#user-123',
        gsi1pk: 'EMAIL#test@example.com',
        gsi1sk: 'USER',
        entityType: 'USER',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
        defaultCurrency: 'EUR',
        monthStartDay: 15,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T01:00:00.000Z',
      };

      (mockDynamoDBClient.update as jest.Mock).mockResolvedValue({
        Attributes: updatedItem,
      });

      const result = await repository.update(userId, updates);

      expect(mockDynamoDBClient.update).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'USER#user-123',
          sk: 'USER#user-123',
        },
        UpdateExpression: expect.stringContaining('SET'),
        ExpressionAttributeNames: expect.objectContaining({
          '#pk': 'pk',
        }),
        ExpressionAttributeValues: expect.objectContaining({
          ':val0': 'Updated Name',
          ':val1': 'EUR',
          ':val2': 15,
        }),
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_exists(#pk)',
      });

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
        defaultCurrency: 'EUR',
        monthStartDay: 15,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T01:00:00.000Z'),
      });
    });

    it('should filter out protected fields from updates', async () => {
      const userId = 'user-123';
      const updates: Partial<User> = {
        name: 'Updated Name',
        // These fields should be filtered out in the implementation
        userId: 'SHOULD_BE_FILTERED',
        createdAt: new Date('2025-01-01T00:00:00.000Z'), // Should be filtered
      };

      const updatedItem = {
        pk: 'USER#user-123',
        sk: 'USER#user-123',
        gsi1pk: 'EMAIL#test@example.com',
        gsi1sk: 'USER',
        entityType: 'USER',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T01:00:00.000Z',
      };

      (mockDynamoDBClient.update as jest.Mock).mockResolvedValue({
        Attributes: updatedItem,
      });

      await repository.update(userId, updates);

      // Verify that protected fields are not included in the update
      const updateCall = (mockDynamoDBClient.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.ExpressionAttributeValues).not.toHaveProperty(
        ':val1',
        'SHOULD_BE_FILTERED',
      );
      expect(updateCall.UpdateExpression).not.toContain('userId');
      expect(updateCall.UpdateExpression).not.toContain('createdAt');
    });

    it('should handle errors during update', async () => {
      const userId = 'user-123';
      const updates = { name: 'Updated Name' };
      const error = new Error('DynamoDB error');
      (mockDynamoDBClient.update as jest.Mock).mockRejectedValue(error);

      await expect(repository.update(userId, updates)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('delete', () => {
    it('should delete a user successfully', async () => {
      const userId = 'user-123';

      (mockDynamoDBClient.delete as jest.Mock).mockResolvedValue({});

      await repository.delete(userId);

      expect(mockDynamoDBClient.delete).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'USER#user-123',
          sk: 'USER#user-123',
        },
        ConditionExpression: 'attribute_exists(#pk)',
        ExpressionAttributeNames: {
          '#pk': 'pk',
        },
      });
    });

    it('should handle errors during delete', async () => {
      const userId = 'user-123';
      const error = new Error('DynamoDB error');
      (mockDynamoDBClient.delete as jest.Mock).mockRejectedValue(error);

      await expect(repository.delete(userId)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('exists', () => {
    it('should return true when user exists', async () => {
      const userId = 'user-123';

      (mockDynamoDBClient.get as jest.Mock).mockResolvedValue({
        Item: { pk: 'USER#user-123' },
      });

      const result = await repository.exists(userId);

      expect(mockDynamoDBClient.get).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'USER#user-123',
          sk: 'USER#user-123',
        },
        ProjectionExpression: 'pk',
      });

      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      const userId = 'non-existent-user';

      (mockDynamoDBClient.get as jest.Mock).mockResolvedValue({});

      const result = await repository.exists(userId);

      expect(result).toBe(false);
    });
  });

  describe('updateDefaultCurrency', () => {
    it('should update default currency successfully', async () => {
      const userId = 'user-123';
      const currency = 'EUR';

      const updatedItem = {
        pk: 'USER#user-123',
        sk: 'USER#user-123',
        gsi1pk: 'EMAIL#test@example.com',
        gsi1sk: 'USER',
        entityType: 'USER',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'EUR',
        monthStartDay: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T01:00:00.000Z',
      };

      (mockDynamoDBClient.update as jest.Mock).mockResolvedValue({
        Attributes: updatedItem,
      });

      const result = await repository.updateDefaultCurrency(userId, currency);

      expect(result.defaultCurrency).toBe('EUR');
      expect(mockDynamoDBClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ':val0': 'EUR',
          }),
        }),
      );
    });
  });

  describe('updateMonthStartDay', () => {
    it('should update month start day successfully', async () => {
      const userId = 'user-123';
      const monthStartDay = 15;

      const updatedItem = {
        pk: 'USER#user-123',
        sk: 'USER#user-123',
        gsi1pk: 'EMAIL#test@example.com',
        gsi1sk: 'USER',
        entityType: 'USER',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 15,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T01:00:00.000Z',
      };

      (mockDynamoDBClient.update as jest.Mock).mockResolvedValue({
        Attributes: updatedItem,
      });

      const result = await repository.updateMonthStartDay(userId, monthStartDay);

      expect(result.monthStartDay).toBe(15);
      expect(mockDynamoDBClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ':val0': 15,
          }),
        }),
      );
    });

    it('should throw error for invalid month start day (too low)', async () => {
      const userId = 'user-123';
      const monthStartDay = 0;

      await expect(repository.updateMonthStartDay(userId, monthStartDay)).rejects.toThrow(
        'Month start day must be between 1 and 28',
      );
    });

    it('should throw error for invalid month start day (too high)', async () => {
      const userId = 'user-123';
      const monthStartDay = 29;

      await expect(repository.updateMonthStartDay(userId, monthStartDay)).rejects.toThrow(
        'Month start day must be between 1 and 28',
      );
    });

    it('should accept valid month start day at boundary values', async () => {
      const userId = 'user-123';

      const updatedItem = {
        pk: 'USER#user-123',
        sk: 'USER#user-123',
        gsi1pk: 'EMAIL#test@example.com',
        gsi1sk: 'USER',
        entityType: 'USER',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T01:00:00.000Z',
      };

      (mockDynamoDBClient.update as jest.Mock).mockResolvedValue({
        Attributes: updatedItem,
      });

      // Test boundary values
      await expect(repository.updateMonthStartDay(userId, 1)).resolves.not.toThrow();
      await expect(repository.updateMonthStartDay(userId, 28)).resolves.not.toThrow();
    });
  });

  describe('data conversion', () => {
    it('should correctly convert between User entity and DynamoDB item', () => {
      const user: User = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      // Convert to item
      const item = DynamoDBConverters.userToItem(user);
      expect(item).toMatchObject({
        pk: 'USER#user-123',
        sk: 'USER#user-123',
        gsi1pk: 'EMAIL#test@example.com',
        gsi1sk: 'USER',
        entityType: 'USER',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      });

      // Convert back to entity
      const convertedUser = DynamoDBConverters.itemToUser(item);
      expect(convertedUser).toEqual(user);
    });

    it('should generate correct key patterns', () => {
      const userId = 'user-123';
      const keys = KeyPatterns.user(userId);

      expect(keys).toEqual({
        pk: 'USER#user-123',
        sk: 'USER#user-123',
      });
    });
  });
});
