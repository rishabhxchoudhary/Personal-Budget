import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import {
  AbstractDynamoDBRepository,
  DynamoDBError,
  ConditionalCheckFailedError,
  ValidationError,
} from '../dynamodb-repository';
import type { DynamoDBItem, DynamoDBTableConfig } from '@/shared/types/dynamodb';

// Type for error with name property for type-safe assignment
type ErrorWithName = Error & { name?: string };

// Test item interface
interface TestItem extends DynamoDBItem {
  entityType: 'TEST';
  testId: string;
  name: string;
  value: number;
}

// Concrete implementation for testing
class TestDynamoDBRepository extends AbstractDynamoDBRepository<TestItem> {
  // Expose protected methods for testing  
  public buildQueryParamsPublic(params: Record<string, unknown>) {
    return this.buildQueryParams(params as unknown as Parameters<typeof this.buildQueryParams>[0]);
  }

  public handleErrorPublic(error: unknown): never {
    return this.handleError(error);
  }

  public chunkArrayPublic<T>(array: T[], size: number): T[][] {
    return this.chunkArray(array, size);
  }
}

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

describe('AbstractDynamoDBRepository', () => {
  let repository: TestDynamoDBRepository;

  beforeEach(() => {
    repository = new TestDynamoDBRepository(mockDynamoDBClient, testConfig);
    jest.clearAllMocks();
  });

  describe('putItem', () => {
    it('should put an item successfully', async () => {
      const testItem: TestItem = {
        pk: 'TEST#123',
        sk: 'TEST#123',
        entityType: 'TEST',
        testId: '123',
        name: 'Test Item',
        value: 100,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      (mockDynamoDBClient.put as jest.Mock).mockResolvedValue({});

      const result = await repository.putItem(testItem);

      expect(mockDynamoDBClient.put).toHaveBeenCalledWith({
        TableName: 'test-table',
        Item: testItem,
      });
      expect(result).toEqual(testItem);
    });

    it('should handle errors in putItem', async () => {
      const testItem: TestItem = {
        pk: 'TEST#123',
        sk: 'TEST#123',
        entityType: 'TEST',
        testId: '123',
        name: 'Test Item',
        value: 100,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const error = new Error('DynamoDB error');
      (error as unknown as { name?: string }).name = 'ValidationException';
      (mockDynamoDBClient.put as jest.Mock).mockRejectedValue(error);

      await expect(repository.putItem(testItem)).rejects.toThrow(ValidationError);
    });
  });

  describe('getItem', () => {
    it('should get an item successfully', async () => {
      const testItem: TestItem = {
        pk: 'TEST#123',
        sk: 'TEST#123',
        entityType: 'TEST',
        testId: '123',
        name: 'Test Item',
        value: 100,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      (mockDynamoDBClient.get as jest.Mock).mockResolvedValue({
        Item: testItem,
      });

      const result = await repository.getItem('TEST#123', 'TEST#123');

      expect(mockDynamoDBClient.get).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'TEST#123',
          sk: 'TEST#123',
        },
      });
      expect(result).toEqual(testItem);
    });

    it('should return null when item not found', async () => {
      (mockDynamoDBClient.get as jest.Mock).mockResolvedValue({});

      const result = await repository.getItem('TEST#123', 'TEST#123');

      expect(result).toBeNull();
    });

    it('should handle errors in getItem', async () => {
      const error = new Error('DynamoDB error');
      (error as unknown as { name?: string }).name = 'ResourceNotFoundException';
      (mockDynamoDBClient.get as jest.Mock).mockRejectedValue(error);

      await expect(repository.getItem('TEST#123', 'TEST#123')).rejects.toThrow(DynamoDBError);
    });
  });

  describe('updateItem', () => {
    it('should update an item successfully', async () => {
      const updates = { name: 'Updated Item', value: 200 };
      const updatedItem: TestItem = {
        pk: 'TEST#123',
        sk: 'TEST#123',
        entityType: 'TEST',
        testId: '123',
        name: 'Updated Item',
        value: 200,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T01:00:00.000Z',
      };

      (mockDynamoDBClient.update as jest.Mock).mockResolvedValue({
        Attributes: updatedItem,
      });

      const result = await repository.updateItem('TEST#123', 'TEST#123', updates);

      expect(mockDynamoDBClient.update).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'TEST#123',
          sk: 'TEST#123',
        },
        UpdateExpression: expect.stringContaining('SET'),
        ExpressionAttributeNames: expect.objectContaining({
          '#pk': 'pk',
        }),
        ExpressionAttributeValues: expect.objectContaining({
          ':val0': 'Updated Item',
          ':val1': 200,
        }),
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_exists(#pk)',
      });
      expect(result).toEqual(updatedItem);
    });

    it('should throw validation error when no updates provided', async () => {
      (mockDynamoDBClient.update as jest.Mock).mockImplementation(() => {
        throw new Error('Should not be called');
      });
      await expect(repository.updateItem('TEST#123', 'TEST#123', {})).rejects.toThrow(
        ValidationError,
      );
      expect(mockDynamoDBClient.update).not.toHaveBeenCalled();
    });

    it('should filter out readonly fields from updates', async () => {
      const updates: Partial<TestItem> = {
        name: 'Updated Item',
        pk: 'SHOULD_BE_FILTERED',
        sk: 'SHOULD_BE_FILTERED',
        createdAt: 'SHOULD_BE_FILTERED',
        entityType: 'TEST' as const,
      };

      const updatedItem: TestItem = {
        pk: 'TEST#123',
        sk: 'TEST#123',
        entityType: 'TEST',
        testId: '123',
        name: 'Updated Item',
        value: 100,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T01:00:00.000Z',
      };

      (mockDynamoDBClient.update as jest.Mock).mockResolvedValue({
        Attributes: updatedItem,
      });

      await repository.updateItem('TEST#123', 'TEST#123', updates);

      expect(mockDynamoDBClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.not.objectContaining({
            ':val1': 'SHOULD_BE_FILTERED',
          }),
        }),
      );
    });

    it('should handle conditional check failed error', async () => {
      const error = new Error('Conditional check failed');
      type ErrorWithName = Error & { name?: string };
      (error as ErrorWithName).name = 'ConditionalCheckFailedException';
      (mockDynamoDBClient.update as jest.Mock).mockRejectedValue(error);

      await expect(
        repository.updateItem('TEST#123', 'TEST#123', { name: 'Updated' }),
      ).rejects.toThrow(ConditionalCheckFailedError);
    });
  });

  describe('deleteItem', () => {
    it('should delete an item successfully', async () => {
      (mockDynamoDBClient.delete as jest.Mock).mockResolvedValue({});

      await repository.deleteItem('TEST#123', 'TEST#123');

      expect(mockDynamoDBClient.delete).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'TEST#123',
          sk: 'TEST#123',
        },
        ConditionExpression: 'attribute_exists(#pk)',
        ExpressionAttributeNames: {
          '#pk': 'pk',
        },
      });
    });

    it('should handle conditional check failed error when item does not exist', async () => {
      const error = new Error('Conditional check failed');
      (error as ErrorWithName).name = 'ConditionalCheckFailedException';
      (mockDynamoDBClient.delete as jest.Mock).mockRejectedValue(error);

      await expect(repository.deleteItem('TEST#123', 'TEST#123')).rejects.toThrow(
        ConditionalCheckFailedError,
      );
    });
  });

  describe('query', () => {
    it('should query items successfully', async () => {
      const testItems: TestItem[] = [
        {
          pk: 'TEST#123',
          sk: 'TEST#123',
          entityType: 'TEST',
          testId: '123',
          name: 'Test Item 1',
          value: 100,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        {
          pk: 'TEST#123',
          sk: 'TEST#456',
          entityType: 'TEST',
          testId: '456',
          name: 'Test Item 2',
          value: 200,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      ];

      (mockDynamoDBClient.query as jest.Mock).mockResolvedValue({
        Items: testItems,
      });

      const result = await repository.query({
        pk: 'TEST#123',
        skPrefix: 'TEST#',
      });

      expect(mockDynamoDBClient.query).toHaveBeenCalledWith({
        TableName: 'test-table',
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
        ExpressionAttributeNames: {
          '#pk': 'pk',
          '#sk': 'sk',
        },
        ExpressionAttributeValues: {
          ':pk': 'TEST#123',
          ':skPrefix': 'TEST#',
        },
      });
      expect(result).toEqual(testItems);
    });

    it('should query with GSI1', async () => {
      (mockDynamoDBClient.query as jest.Mock).mockResolvedValue({
        Items: [],
      });

      await repository.query({
        indexName: 'GSI1',
        gsi1pk: 'USER#123',
        gsi1skPrefix: 'ACCOUNT#',
      } as unknown as Parameters<typeof repository.query>[0]);

      expect(mockDynamoDBClient.query).toHaveBeenCalledWith({
        TableName: 'test-table',
        IndexName: 'GSI1',
        KeyConditionExpression: '#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :gsi1skPrefix)',
        ExpressionAttributeNames: {
          '#gsi1pk': 'gsi1pk',
          '#gsi1sk': 'gsi1sk',
        },
        ExpressionAttributeValues: {
          ':gsi1pk': 'USER#123',
          ':gsi1skPrefix': 'ACCOUNT#',
        },
      });
    });

    it('should query with filter expression', async () => {
      (mockDynamoDBClient.query as jest.Mock).mockResolvedValue({
        Items: [],
      });

      await repository.query({
        pk: 'TEST#123',
        filterExpression: '#value > :minValue',
        expressionAttributeNames: { '#value': 'value' },
        expressionAttributeValues: { ':minValue': 50 },
      });

      expect(mockDynamoDBClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: '#value > :minValue',
          ExpressionAttributeNames: expect.objectContaining({
            '#value': 'value',
          }),
          ExpressionAttributeValues: expect.objectContaining({
            ':minValue': 50,
          }),
        }),
      );
    });

    it('should handle empty query results', async () => {
      (mockDynamoDBClient.query as jest.Mock).mockResolvedValue({});

      const result = await repository.query({ pk: 'TEST#123' });

      expect(result).toEqual([]);
    });
  });

  describe('queryWithPagination', () => {
    it('should query with pagination successfully', async () => {
      const testItems: TestItem[] = [
        {
          pk: 'TEST#123',
          sk: 'TEST#123',
          entityType: 'TEST',
          testId: '123',
          name: 'Test Item',
          value: 100,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      ];

      const lastEvaluatedKey = { pk: 'TEST#123', sk: 'TEST#123' };

      (mockDynamoDBClient.query as jest.Mock).mockResolvedValue({
        Items: testItems,
        LastEvaluatedKey: lastEvaluatedKey,
        Count: 1,
      });

      const result = await repository.queryWithPagination({
        pk: 'TEST#123',
        limit: 10,
      });

      expect(result).toEqual({
        items: testItems,
        lastEvaluatedKey,
        count: 1,
      });
    });
  });

  describe('batchGet', () => {
    it('should batch get items successfully', async () => {
      const testItems: TestItem[] = [
        {
          pk: 'TEST#123',
          sk: 'TEST#123',
          entityType: 'TEST',
          testId: '123',
          name: 'Test Item 1',
          value: 100,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        {
          pk: 'TEST#456',
          sk: 'TEST#456',
          entityType: 'TEST',
          testId: '456',
          name: 'Test Item 2',
          value: 200,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      ];

      (mockDynamoDBClient.batchGet as jest.Mock).mockResolvedValue({
        Responses: {
          'test-table': testItems,
        },
      });

      const keys = [
        { pk: 'TEST#123', sk: 'TEST#123' },
        { pk: 'TEST#456', sk: 'TEST#456' },
      ];

      const result = await repository.batchGet(keys);

      expect(mockDynamoDBClient.batchGet).toHaveBeenCalledWith({
        RequestItems: {
          'test-table': {
            Keys: [
              { pk: 'TEST#123', sk: 'TEST#123' },
              { pk: 'TEST#456', sk: 'TEST#456' },
            ],
          },
        },
      });
      expect(result).toEqual(testItems);
    });

    it('should return empty array for empty keys', async () => {
      const result = await repository.batchGet([]);
      expect(result).toEqual([]);
      expect(mockDynamoDBClient.batchGet).not.toHaveBeenCalled();
    });

    it('should handle empty batch get response', async () => {
      (mockDynamoDBClient.batchGet as jest.Mock).mockResolvedValue({
        Responses: {},
      });

      const result = await repository.batchGet([{ pk: 'TEST#123', sk: 'TEST#123' }]);
      expect(result).toEqual([]);
    });
  });

  describe('batchWrite', () => {
    it('should batch write items successfully', async () => {
      const testItems: TestItem[] = [
        {
          pk: 'TEST#123',
          sk: 'TEST#123',
          entityType: 'TEST',
          testId: '123',
          name: 'Test Item 1',
          value: 100,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      ];

      (mockDynamoDBClient.batchWrite as jest.Mock).mockResolvedValue({});

      await repository.batchWrite(testItems);

      expect(mockDynamoDBClient.batchWrite).toHaveBeenCalledWith({
        RequestItems: {
          'test-table': [
            {
              PutRequest: { Item: testItems[0] },
            },
          ],
        },
      });
    });

    it('should handle empty batch write', async () => {
      await repository.batchWrite([]);
      expect(mockDynamoDBClient.batchWrite).not.toHaveBeenCalled();
    });

    it('should chunk large batch writes', async () => {
      // Create 30 items (more than the 25 limit)
      const testItems: TestItem[] = Array.from({ length: 30 }, (_, i) => ({
        pk: `TEST#${i}`,
        sk: `TEST#${i}`,
        entityType: 'TEST' as const,
        testId: i.toString(),
        name: `Test Item ${i}`,
        value: i * 10,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      }));

      (mockDynamoDBClient.batchWrite as jest.Mock).mockResolvedValue({});

      await repository.batchWrite(testItems);

      // Should be called twice (25 items + 5 items)
      expect(mockDynamoDBClient.batchWrite).toHaveBeenCalledTimes(2);
    });
  });

  describe('batchDelete', () => {
    it('should batch delete items successfully', async () => {
      const keys = [
        { pk: 'TEST#123', sk: 'TEST#123' },
        { pk: 'TEST#456', sk: 'TEST#456' },
      ];

      (mockDynamoDBClient.batchWrite as jest.Mock).mockResolvedValue({});

      await repository.batchDelete(keys);

      expect(mockDynamoDBClient.batchWrite).toHaveBeenCalledWith({
        RequestItems: {
          'test-table': [
            {
              DeleteRequest: {
                Key: { pk: 'TEST#123', sk: 'TEST#123' },
              },
            },
            {
              DeleteRequest: {
                Key: { pk: 'TEST#456', sk: 'TEST#456' },
              },
            },
          ],
        },
      });
    });

    it('should handle empty batch delete', async () => {
      await repository.batchDelete([]);
      expect(mockDynamoDBClient.batchWrite).not.toHaveBeenCalled();
    });
  });

  describe('transactWrite', () => {
    it('should perform transactional write successfully', async () => {
      const testItem: TestItem = {
        pk: 'TEST#123',
        sk: 'TEST#123',
        entityType: 'TEST',
        testId: '123',
        name: 'Test Item',
        value: 100,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      (mockDynamoDBClient.transactWrite as jest.Mock).mockResolvedValue({});

      await repository.transactWrite([
        {
          operation: 'PUT',
          item: testItem,
        },
        {
          operation: 'UPDATE',
          pk: 'TEST#456',
          sk: 'TEST#456',
          updates: { name: 'Updated Item' },
        },
        {
          operation: 'DELETE',
          pk: 'TEST#789',
          sk: 'TEST#789',
        },
      ]);

      expect(mockDynamoDBClient.transactWrite).toHaveBeenCalledWith({
        TransactItems: [
          {
            Put: {
              TableName: 'test-table',
              Item: testItem,
              ConditionExpression: undefined,
            },
          },
          {
            Update: {
              TableName: 'test-table',
              Key: { pk: 'TEST#456', sk: 'TEST#456' },
              UpdateExpression: 'SET #attr0 = :val0',
              ExpressionAttributeNames: { '#attr0': 'name' },
              ExpressionAttributeValues: { ':val0': 'Updated Item' },
              ConditionExpression: undefined,
            },
          },
          {
            Delete: {
              TableName: 'test-table',
              Key: { pk: 'TEST#789', sk: 'TEST#789' },
              ConditionExpression: undefined,
            },
          },
        ],
      });
    });

    it('should throw validation error for PUT without item', async () => {
      await expect(
        repository.transactWrite([
          {
            operation: 'PUT',
          },
        ]),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw validation error for UPDATE without required fields', async () => {
      await expect(
        repository.transactWrite([
          {
            operation: 'UPDATE',
          },
        ]),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw validation error for unknown operation', async () => {
      await expect(
        repository.transactWrite([
          {
            operation: 'UNKNOWN' as unknown as 'PUT' | 'UPDATE' | 'DELETE',
          },
        ]),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('exists', () => {
    it('should return true when item exists', async () => {
      (mockDynamoDBClient.get as jest.Mock).mockResolvedValue({
        Item: { pk: 'TEST#123' },
      });

      const result = await repository.exists('TEST#123', 'TEST#123');

      expect(mockDynamoDBClient.get).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'TEST#123',
          sk: 'TEST#123',
        },
        ProjectionExpression: 'pk',
      });
      expect(result).toBe(true);
    });

    it('should return false when item does not exist', async () => {
      (mockDynamoDBClient.get as jest.Mock).mockResolvedValue({});

      const result = await repository.exists('TEST#123', 'TEST#123');
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count items successfully', async () => {
      (mockDynamoDBClient.query as jest.Mock).mockResolvedValue({
        Count: 5,
      });

      const result = await repository.count({ pk: 'TEST#123' });

      expect(mockDynamoDBClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          Select: 'COUNT',
        }),
      );
      expect(result).toBe(5);
    });

    it('should return 0 when no count returned', async () => {
      (mockDynamoDBClient.query as jest.Mock).mockResolvedValue({});

      const result = await repository.count({ pk: 'TEST#123' });
      expect(result).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle ConditionalCheckFailedException', () => {
      const error = new Error('Conditional check failed');
      (error as unknown as { name?: string }).name = 'ConditionalCheckFailedException';

      expect(() => repository.handleErrorPublic(error)).toThrow(ConditionalCheckFailedError);
    });

    it('should handle ResourceNotFoundException', () => {
      const error = new Error('Resource not found');
      (error as unknown as { name?: string }).name = 'ResourceNotFoundException';

      expect(() => repository.handleErrorPublic(error)).toThrow(DynamoDBError);
    });

    it('should handle ValidationException', () => {
      const error = new Error('Validation error');
      (error as unknown as { name?: string }).name = 'ValidationException';

      expect(() => repository.handleErrorPublic(error)).toThrow(ValidationError);
    });

    it('should handle throttling errors as retryable', () => {
      const error = new Error('Throttled');
      (error as unknown as { name?: string }).name = 'ProvisionedThroughputExceededException';

      try {
        repository.handleErrorPublic(error);
      } catch (e) {
        expect(e).toBeInstanceOf(DynamoDBError);
        expect((e as DynamoDBError).retryable).toBe(true);
        expect((e as DynamoDBError).statusCode).toBe(429);
      }
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');

      expect(() => repository.handleErrorPublic(error)).toThrow(DynamoDBError);
    });

    it('should pass through DynamoDB errors', () => {
      const error = new DynamoDBError('Custom error', 'CUSTOM_ERROR');

      expect(() => repository.handleErrorPublic(error)).toThrow(error);
    });
  });

  describe('utility methods', () => {
    it('should chunk array correctly', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = repository.chunkArrayPublic(array, 3);

      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
    });

    it('should handle empty array chunking', () => {
      const chunks = repository.chunkArrayPublic([], 3);
      expect(chunks).toEqual([]);
    });

    it('should build query params correctly for main table', () => {
      const params = repository.buildQueryParamsPublic({
        pk: 'USER#123',
        skPrefix: 'ACCOUNT#',
        limit: 10,
        scanIndexForward: false,
      });

      expect(params).toMatchObject({
        TableName: 'test-table',
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
        ExpressionAttributeNames: {
          '#pk': 'pk',
          '#sk': 'sk',
        },
        ExpressionAttributeValues: {
          ':pk': 'USER#123',
          ':skPrefix': 'ACCOUNT#',
        },
        Limit: 10,
        ScanIndexForward: false,
      });
    });

    it('should build query params correctly for GSI', () => {
      const params = repository.buildQueryParamsPublic({
        indexName: 'GSI1' as const,
        gsi1pk: 'ACCOUNT#123',
        gsi1sk: 'TRANSACTION#456',
      });

      expect(params).toMatchObject({
        TableName: 'test-table',
        IndexName: 'GSI1',
        KeyConditionExpression: '#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk',
        ExpressionAttributeNames: {
          '#gsi1pk': 'gsi1pk',
          '#gsi1sk': 'gsi1sk',
        },
        ExpressionAttributeValues: {
          ':gsi1pk': 'ACCOUNT#123',
          ':gsi1sk': 'TRANSACTION#456',
        },
      });
    });
  });
});
