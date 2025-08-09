import { DynamoDB } from '@aws-sdk/client-dynamodb';
import type { DynamoDBTableConfig } from '@/shared/types/dynamodb';

// Mock the entire AWS SDK to avoid MSW conflicts
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDB: jest.fn(),
}));

// Mock the dynamodb module
jest.mock('../dynamodb', () => ({
  createDynamoDBClient: jest.fn(),
  getTableConfig: jest.fn(),
}));

// Import after mocks
import {
  DynamoDBTableManager,
  createPersonalBudgetTable,
  deletePersonalBudgetTable,
} from '../dynamodb-table-manager';

// Mock DynamoDB client
const mockDynamoDBClient = {
  createTable: jest.fn(),
  deleteTable: jest.fn(),
  describeTable: jest.fn(),
  listTables: jest.fn(),
  updateTable: jest.fn(),
  updateContinuousBackups: jest.fn(),
} as unknown as DynamoDB;

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

describe('DynamoDBTableManager', () => {
  let tableManager: DynamoDBTableManager;

  beforeAll(async () => {
    // Setup mocks
    const dynamodbModule = await import('../dynamodb');
    (dynamodbModule.createDynamoDBClient as jest.Mock).mockReturnValue(mockDynamoDBClient);
    (dynamodbModule.getTableConfig as jest.Mock).mockReturnValue(testConfig);
  });

  beforeEach(() => {
    tableManager = new DynamoDBTableManager(mockDynamoDBClient, testConfig);
    jest.clearAllMocks();
  });

  describe('createTable', () => {
    it('should create a table with default PAY_PER_REQUEST billing', async () => {
      // Mock table doesn't exist
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValueOnce({
        name: 'ResourceNotFoundException',
      });

      // Mock successful table creation
      (mockDynamoDBClient.createTable as jest.Mock).mockResolvedValue({
        TableDescription: { TableName: 'test-table' },
      });

      // Mock table becoming active
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      await tableManager.createTable();

      expect(mockDynamoDBClient.createTable).toHaveBeenCalledWith({
        TableName: 'test-table',
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'pk', AttributeType: 'S' },
          { AttributeName: 'sk', AttributeType: 'S' },
          { AttributeName: 'gsi1pk', AttributeType: 'S' },
          { AttributeName: 'gsi1sk', AttributeType: 'S' },
          { AttributeName: 'gsi2pk', AttributeType: 'S' },
          { AttributeName: 'gsi2sk', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'pk', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1',
            KeySchema: [
              { AttributeName: 'gsi1pk', KeyType: 'HASH' },
              { AttributeName: 'gsi1sk', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
          {
            IndexName: 'GSI2',
            KeySchema: [
              { AttributeName: 'gsi2pk', KeyType: 'HASH' },
              { AttributeName: 'gsi2sk', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES',
        },
      });
    });

    it('should create a table with PROVISIONED billing and capacity settings', async () => {
      // Mock table doesn't exist
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValueOnce({
        name: 'ResourceNotFoundException',
      });

      // Mock successful table creation
      (mockDynamoDBClient.createTable as jest.Mock).mockResolvedValue({
        TableDescription: { TableName: 'test-table' },
      });

      // Mock table becoming active
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      await tableManager.createTable({
        billingMode: 'PROVISIONED',
        readCapacityUnits: 10,
        writeCapacityUnits: 10,
        gsi1ReadCapacityUnits: 5,
        gsi1WriteCapacityUnits: 5,
        gsi2ReadCapacityUnits: 5,
        gsi2WriteCapacityUnits: 5,
      });

      expect(mockDynamoDBClient.createTable).toHaveBeenCalledWith(
        expect.objectContaining({
          BillingMode: 'PROVISIONED',
          ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10,
          },
          GlobalSecondaryIndexes: expect.arrayContaining([
            expect.objectContaining({
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5,
              },
            }),
          ]),
        }),
      );
    });

    it('should create a table with deletion protection and tags', async () => {
      // Mock table doesn't exist
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValueOnce({
        name: 'ResourceNotFoundException',
      });

      // Mock successful table creation
      (mockDynamoDBClient.createTable as jest.Mock).mockResolvedValue({
        TableDescription: { TableName: 'test-table' },
      });

      // Mock table becoming active
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      await tableManager.createTable({
        deletionProtection: true,
        tags: {
          Environment: 'production',
          Owner: 'test-team',
        },
      });

      expect(mockDynamoDBClient.createTable).toHaveBeenCalledWith(
        expect.objectContaining({
          DeletionProtectionEnabled: true,
          Tags: [
            { Key: 'Environment', Value: 'production' },
            { Key: 'Owner', Value: 'test-team' },
          ],
        }),
      );
    });

    it('should skip creation if table already exists', async () => {
      // Mock table exists
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      await tableManager.createTable();

      expect(mockDynamoDBClient.createTable).not.toHaveBeenCalled();
    });

    it('should wait for table to become active', async () => {
      // Mock table doesn't exist initially
      (mockDynamoDBClient.describeTable as jest.Mock)
        .mockRejectedValueOnce({ name: 'ResourceNotFoundException' })
        .mockResolvedValueOnce({ Table: { TableStatus: 'CREATING' } })
        .mockResolvedValueOnce({ Table: { TableStatus: 'CREATING' } })
        .mockResolvedValueOnce({ Table: { TableStatus: 'ACTIVE' } });

      (mockDynamoDBClient.createTable as jest.Mock).mockResolvedValue({
        TableDescription: { TableName: 'test-table' },
      });

      await tableManager.createTable();

      expect(mockDynamoDBClient.describeTable).toHaveBeenCalledTimes(4);
    });

    it('should handle errors during table creation', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      // Mock table doesn't exist
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValueOnce({
        name: 'ResourceNotFoundException',
      });

      const error = new Error('DynamoDB error');
      (mockDynamoDBClient.createTable as jest.Mock).mockRejectedValue(error);

      await expect(tableManager.createTable()).rejects.toThrow('DynamoDB error');
    });
  });

  describe('deleteTable', () => {
    it('should delete an existing table', async () => {
      // Mock table exists
      (mockDynamoDBClient.describeTable as jest.Mock)
        .mockResolvedValueOnce({ Table: { TableStatus: 'ACTIVE' } })
        .mockResolvedValueOnce({ Table: { TableStatus: 'DELETING' } })
        .mockRejectedValueOnce({ name: 'ResourceNotFoundException' });

      (mockDynamoDBClient.deleteTable as jest.Mock).mockResolvedValue({});

      await tableManager.deleteTable();

      expect(mockDynamoDBClient.deleteTable).toHaveBeenCalledWith({
        TableName: 'test-table',
      });
    });

    it('should skip deletion if table does not exist', async () => {
      // Mock table doesn't exist
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValue({
        name: 'ResourceNotFoundException',
      });

      await tableManager.deleteTable();

      expect(mockDynamoDBClient.deleteTable).not.toHaveBeenCalled();
    });

    it('should wait for table to be deleted', async () => {
      // Mock table exists, then is deleting, then doesn't exist
      (mockDynamoDBClient.describeTable as jest.Mock)
        .mockResolvedValueOnce({ Table: { TableStatus: 'ACTIVE' } })
        .mockResolvedValueOnce({ Table: { TableStatus: 'DELETING' } })
        .mockResolvedValueOnce({ Table: { TableStatus: 'DELETING' } })
        .mockRejectedValueOnce({ name: 'ResourceNotFoundException' });

      (mockDynamoDBClient.deleteTable as jest.Mock).mockResolvedValue({});

      await tableManager.deleteTable();

      expect(mockDynamoDBClient.describeTable).toHaveBeenCalledTimes(4);
    });

    it('should handle errors during table deletion', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      // Mock table exists
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      const error = new Error('DynamoDB error');
      (mockDynamoDBClient.deleteTable as jest.Mock).mockRejectedValue(error);

      await expect(tableManager.deleteTable()).rejects.toThrow('DynamoDB error');
    });
  });

  describe('tableExists', () => {
    it('should return true if table exists', async () => {
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      const result = await tableManager.tableExists();

      expect(result).toBe(true);
      expect(mockDynamoDBClient.describeTable).toHaveBeenCalledWith({
        TableName: 'test-table',
      });
    });

    it('should return false if table does not exist', async () => {
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValue({
        name: 'ResourceNotFoundException',
      });

      const result = await tableManager.tableExists();

      expect(result).toBe(false);
    });

    it('should rethrow non-ResourceNotFoundException errors', async () => {
      const error = new Error('Access denied');
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValue(error);

      await expect(tableManager.tableExists()).rejects.toThrow('Access denied');
    });
  });

  describe('getTableStatus', () => {
    it('should return table status', async () => {
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      const result = await tableManager.getTableStatus();

      expect(result).toBe('ACTIVE');
    });

    it('should return undefined if table does not exist', async () => {
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValue({
        name: 'ResourceNotFoundException',
      });

      const result = await tableManager.getTableStatus();

      expect(result).toBeUndefined();
    });

    it('should rethrow non-ResourceNotFoundException errors', async () => {
      const error = new Error('Access denied');
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValue(error);

      await expect(tableManager.getTableStatus()).rejects.toThrow('Access denied');
    });
  });

  describe('waitForTableToBeActive', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should resolve immediately if table is already active', async () => {
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      await tableManager.waitForTableToBeActive();

      expect(mockDynamoDBClient.describeTable).toHaveBeenCalledTimes(1);
    });

    it('should poll until table becomes active', async () => {
      (mockDynamoDBClient.describeTable as jest.Mock)
        .mockResolvedValueOnce({ Table: { TableStatus: 'CREATING' } })
        .mockResolvedValueOnce({ Table: { TableStatus: 'CREATING' } })
        .mockResolvedValueOnce({ Table: { TableStatus: 'ACTIVE' } });

      const waitPromise = tableManager.waitForTableToBeActive();

      // Advance timers to trigger polling
      await jest.advanceTimersByTimeAsync(4000);
      await waitPromise;

      expect(mockDynamoDBClient.describeTable).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should throw error for unexpected table status', async () => {
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'UNKNOWN' },
      });

      await expect(tableManager.waitForTableToBeActive()).rejects.toThrow(
        'Table test-table is in unexpected status: UNKNOWN',
      );
    }, 10000);

    it.skip('should timeout if table does not become active within max wait time', async () => {
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'CREATING' },
      });

      // Test with a very short timeout to avoid waiting too long
      await expect(tableManager.waitForTableToBeActive('test-table', 100)).rejects.toThrow(
        'Timeout waiting for table test-table to become active',
      );
    }, 15000);
  });

  describe('listTables', () => {
    it('should return list of table names', async () => {
      (mockDynamoDBClient.listTables as jest.Mock).mockResolvedValue({
        TableNames: ['table1', 'table2', 'table3'],
      });

      const result = await tableManager.listTables();

      expect(result).toEqual(['table1', 'table2', 'table3']);
    });

    it('should return empty array if no tables', async () => {
      (mockDynamoDBClient.listTables as jest.Mock).mockResolvedValue({});

      const result = await tableManager.listTables();

      expect(result).toEqual([]);
    });

    it('should handle errors during list tables', async () => {
      const error = new Error('DynamoDB error');
      (mockDynamoDBClient.listTables as jest.Mock).mockRejectedValue(error);

      await expect(tableManager.listTables()).rejects.toThrow('DynamoDB error');
    });
  });

  describe('getTableInfo', () => {
    it('should return table information', async () => {
      const tableInfo = {
        TableName: 'test-table',
        TableStatus: 'ACTIVE',
        CreationDateTime: new Date(),
      };

      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: tableInfo,
      });

      const result = await tableManager.getTableInfo();

      expect(result).toEqual(tableInfo);
    });

    it('should handle errors during get table info', async () => {
      const error = new Error('DynamoDB error');
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValue(error);

      await expect(tableManager.getTableInfo()).rejects.toThrow('DynamoDB error');
    });
  });

  describe('updateTable', () => {
    it('should update table billing mode to PROVISIONED', async () => {
      (mockDynamoDBClient.updateTable as jest.Mock).mockResolvedValue({
        TableDescription: { TableName: 'test-table' },
      });

      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      await tableManager.updateTable({
        billingMode: 'PROVISIONED',
        readCapacityUnits: 10,
        writeCapacityUnits: 10,
        gsi1ReadCapacityUnits: 5,
        gsi1WriteCapacityUnits: 5,
        gsi2ReadCapacityUnits: 5,
        gsi2WriteCapacityUnits: 5,
      });

      expect(mockDynamoDBClient.updateTable).toHaveBeenCalledWith({
        TableName: 'test-table',
        BillingMode: 'PROVISIONED',
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10,
        },
        GlobalSecondaryIndexUpdates: [
          {
            Update: {
              IndexName: 'GSI1',
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5,
              },
            },
          },
          {
            Update: {
              IndexName: 'GSI2',
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5,
              },
            },
          },
        ],
      });
    });

    it('should update deletion protection', async () => {
      (mockDynamoDBClient.updateTable as jest.Mock).mockResolvedValue({
        TableDescription: { TableName: 'test-table' },
      });

      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      await tableManager.updateTable({
        deletionProtection: true,
      });

      expect(mockDynamoDBClient.updateTable).toHaveBeenCalledWith({
        TableName: 'test-table',
        DeletionProtectionEnabled: true,
      });
    });

    it('should handle errors during table update', async () => {
      const error = new Error('DynamoDB error');
      (mockDynamoDBClient.updateTable as jest.Mock).mockRejectedValue(error);

      await expect(tableManager.updateTable({})).rejects.toThrow('DynamoDB error');
    });
  });

  describe('Point-in-time recovery', () => {
    it('should enable point-in-time recovery', async () => {
      (mockDynamoDBClient.updateContinuousBackups as jest.Mock).mockResolvedValue({});

      await tableManager.enablePointInTimeRecovery();

      expect(mockDynamoDBClient.updateContinuousBackups).toHaveBeenCalledWith({
        TableName: 'test-table',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });
    });

    it('should disable point-in-time recovery', async () => {
      (mockDynamoDBClient.updateContinuousBackups as jest.Mock).mockResolvedValue({});

      await tableManager.disablePointInTimeRecovery();

      expect(mockDynamoDBClient.updateContinuousBackups).toHaveBeenCalledWith({
        TableName: 'test-table',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: false,
        },
      });
    });

    it('should handle errors during point-in-time recovery operations', async () => {
      const error = new Error('DynamoDB error');
      (mockDynamoDBClient.updateContinuousBackups as jest.Mock).mockRejectedValue(error);

      await expect(tableManager.enablePointInTimeRecovery()).rejects.toThrow('DynamoDB error');
      await expect(tableManager.disablePointInTimeRecovery()).rejects.toThrow('DynamoDB error');
    });
  });
});

describe('Convenience functions', () => {
  // Mock the createDynamoDBClient function
  jest.mock('../dynamodb', () => ({
    createDynamoDBClient: jest.fn().mockReturnValue(mockDynamoDBClient),
    getTableConfig: jest.fn().mockReturnValue(testConfig),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPersonalBudgetTable', () => {
    it('should create table with default options', async () => {
      // Mock table doesn't exist
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValueOnce({
        name: 'ResourceNotFoundException',
      });

      // Mock successful table creation
      (mockDynamoDBClient.createTable as jest.Mock).mockResolvedValue({
        TableDescription: { TableName: 'test-table' },
      });

      // Mock table becoming active
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      // Mock process.env.NODE_ENV for non-production
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        configurable: true,
      });

      await createPersonalBudgetTable();

      expect(mockDynamoDBClient.createTable).toHaveBeenCalledWith(
        expect.objectContaining({
          BillingMode: 'PAY_PER_REQUEST',
          DeletionProtectionEnabled: false,
          Tags: expect.arrayContaining([
            { Key: 'Environment', Value: 'development' },
            { Key: 'Application', Value: 'personal-budget-manager' },
          ]),
        }),
      );

      // Restore original env
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        configurable: true,
      });
    }, 10000);

    it('should enable point-in-time recovery for production', async () => {
      // Mock table doesn't exist
      (mockDynamoDBClient.describeTable as jest.Mock).mockRejectedValueOnce({
        name: 'ResourceNotFoundException',
      });

      // Mock successful table creation
      (mockDynamoDBClient.createTable as jest.Mock).mockResolvedValue({
        TableDescription: { TableName: 'test-table' },
      });

      // Mock table becoming active
      (mockDynamoDBClient.describeTable as jest.Mock).mockResolvedValue({
        Table: { TableStatus: 'ACTIVE' },
      });

      // Mock point-in-time recovery
      (mockDynamoDBClient.updateContinuousBackups as jest.Mock).mockResolvedValue({});

      // Mock process.env.NODE_ENV for production
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        configurable: true,
      });

      await createPersonalBudgetTable();

      expect(mockDynamoDBClient.createTable).toHaveBeenCalledWith(
        expect.objectContaining({
          DeletionProtectionEnabled: true,
        }),
      );

      expect(mockDynamoDBClient.updateContinuousBackups).toHaveBeenCalledWith({
        TableName: 'test-table',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });

      // Restore original env
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        configurable: true,
      });
    }, 10000);
  });

  describe('deletePersonalBudgetTable', () => {
    it('should delete the table', async () => {
      // Mock table exists
      (mockDynamoDBClient.describeTable as jest.Mock)
        .mockResolvedValueOnce({ Table: { TableStatus: 'ACTIVE' } })
        .mockResolvedValueOnce({ Table: { TableStatus: 'DELETING' } })
        .mockRejectedValueOnce({ name: 'ResourceNotFoundException' });

      (mockDynamoDBClient.deleteTable as jest.Mock).mockResolvedValue({});

      await deletePersonalBudgetTable();

      expect(mockDynamoDBClient.deleteTable).toHaveBeenCalledWith({
        TableName: 'test-table',
      });
    }, 10000);
  });
});
