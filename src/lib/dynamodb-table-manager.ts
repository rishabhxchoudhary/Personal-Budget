import {
  DynamoDB,
  CreateTableCommandInput,
  UpdateTableCommandInput,
  DescribeTableCommandOutput,
} from '@aws-sdk/client-dynamodb';
import { createDynamoDBClient, getTableConfig } from './dynamodb';
import type { DynamoDBTableConfig } from '@/shared/types/dynamodb';

export interface TableCreationOptions {
  tableName?: string;
  billingMode?: 'PAY_PER_REQUEST' | 'PROVISIONED';
  readCapacityUnits?: number;
  writeCapacityUnits?: number;
  gsi1ReadCapacityUnits?: number;
  gsi1WriteCapacityUnits?: number;
  gsi2ReadCapacityUnits?: number;
  gsi2WriteCapacityUnits?: number;
  deletionProtection?: boolean;
  tags?: Record<string, string>;
}

export class DynamoDBTableManager {
  private client: DynamoDB;
  private config: DynamoDBTableConfig;

  constructor(client?: DynamoDB, config?: DynamoDBTableConfig) {
    this.client = client || createDynamoDBClient();
    this.config = config || getTableConfig();
  }

  async createTable(options: TableCreationOptions = {}): Promise<void> {
    const tableName = options.tableName || this.config.tableName;
    const billingMode = options.billingMode || 'PAY_PER_REQUEST';

    console.log(`Creating DynamoDB table: ${tableName}`);

    try {
      // Check if table already exists
      const exists = await this.tableExists(tableName);
      if (exists) {
        console.log(`Table ${tableName} already exists, skipping creation`);
        return;
      }

      const createTableInput: CreateTableCommandInput = {
        TableName: tableName,
        BillingMode: billingMode,
        AttributeDefinitions: [
          { AttributeName: this.config.partitionKey, AttributeType: 'S' },
          { AttributeName: this.config.sortKey, AttributeType: 'S' },
          { AttributeName: this.config.gsi1PartitionKey, AttributeType: 'S' },
          { AttributeName: this.config.gsi1SortKey, AttributeType: 'S' },
          { AttributeName: this.config.gsi2PartitionKey, AttributeType: 'S' },
          { AttributeName: this.config.gsi2SortKey, AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: this.config.partitionKey, KeyType: 'HASH' },
          { AttributeName: this.config.sortKey, KeyType: 'RANGE' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: this.config.gsi1Name,
            KeySchema: [
              { AttributeName: this.config.gsi1PartitionKey, KeyType: 'HASH' },
              { AttributeName: this.config.gsi1SortKey, KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
          {
            IndexName: this.config.gsi2Name,
            KeySchema: [
              { AttributeName: this.config.gsi2PartitionKey, KeyType: 'HASH' },
              { AttributeName: this.config.gsi2SortKey, KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: 'NEW_AND_OLD_IMAGES',
        },
      };

      // Add provisioned throughput if using PROVISIONED billing mode
      if (billingMode === 'PROVISIONED') {
        createTableInput.ProvisionedThroughput = {
          ReadCapacityUnits: options.readCapacityUnits || 5,
          WriteCapacityUnits: options.writeCapacityUnits || 5,
        };

        (createTableInput.GlobalSecondaryIndexes ?? []).forEach((gsi, index: number) => {
          (gsi as unknown as Record<string, unknown>).ProvisionedThroughput = {
            ReadCapacityUnits:
              index === 0 ? options.gsi1ReadCapacityUnits || 5 : options.gsi2ReadCapacityUnits || 5,
            WriteCapacityUnits:
              index === 0
                ? options.gsi1WriteCapacityUnits || 5
                : options.gsi2WriteCapacityUnits || 5,
          };
        });
      }

      // Add deletion protection if specified
      if (options.deletionProtection !== undefined) {
        createTableInput.DeletionProtectionEnabled = options.deletionProtection;
      }

      // Add tags if specified
      if (options.tags && Object.keys(options.tags).length > 0) {
        createTableInput.Tags = Object.entries(options.tags).map(([key, value]) => ({
          Key: key,
          Value: value,
        }));
      }

      const result = await this.client.createTable(createTableInput);
      console.log(`Table creation initiated: ${result.TableDescription?.TableName}`);

      // Wait for table to become active
      await this.waitForTableToBeActive(tableName);
      console.log(`Table ${tableName} is now active`);
    } catch (error) {
      console.error(`Error creating table ${tableName}:`, error);
      throw error;
    }
  }

  async deleteTable(tableName?: string): Promise<void> {
    const targetTableName = tableName || this.config.tableName;

    console.log(`Deleting DynamoDB table: ${targetTableName}`);

    try {
      const exists = await this.tableExists(targetTableName);
      if (!exists) {
        console.log(`Table ${targetTableName} does not exist, skipping deletion`);
        return;
      }

      const deleteTableInput: import('@aws-sdk/client-dynamodb').DeleteTableCommandInput = {
        TableName: targetTableName,
      };
      await this.client.deleteTable(deleteTableInput);

      console.log(`Table deletion initiated: ${targetTableName}`);

      // Wait for table to be deleted
      await this.waitForTableToBeDeleted(targetTableName);
      console.log(`Table ${targetTableName} has been deleted`);
    } catch (error) {
      console.error(`Error deleting table ${targetTableName}:`, error);
      throw error;
    }
  }

  async tableExists(tableName?: string): Promise<boolean> {
    const targetTableName = tableName || this.config.tableName;

    try {
      await this.client.describeTable({ TableName: targetTableName });
      return true;
    } catch (error: unknown) {
      if ((error as { name?: string }).name === 'ResourceNotFoundException') {
        return false;
      }
      throw error;
    }
  }

  async getTableStatus(tableName?: string): Promise<string | undefined> {
    const targetTableName = tableName || this.config.tableName;

    try {
      const result: DescribeTableCommandOutput = await this.client.describeTable({
        TableName: targetTableName,
      });
      return result.Table?.TableStatus;
    } catch (error) {
      if ((error as { name?: string }).name === 'ResourceNotFoundException') {
        return undefined;
      }
      throw error;
    }
  }

  async waitForTableToBeActive(tableName?: string, maxWaitTimeMs: number = 300000): Promise<void> {
    const targetTableName = tableName || this.config.tableName;
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    console.log(`Waiting for table ${targetTableName} to become active...`);

    while (Date.now() - startTime < maxWaitTimeMs) {
      try {
        const status = await this.getTableStatus(targetTableName);

        if (status === 'ACTIVE') {
          return;
        }

        if (status === 'CREATING' || status === 'UPDATING') {
          console.log(`Table status: ${status}, waiting...`);
          await this.sleep(pollInterval);
          continue;
        }

        throw new Error(`Table ${targetTableName} is in unexpected status: ${status}`);
      } catch (error) {
        if ((error as { name?: string }).name === 'ResourceNotFoundException') {
          console.log('Table not found, waiting for creation...');
          await this.sleep(pollInterval);
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Timeout waiting for table ${targetTableName} to become active`);
  }

  async waitForTableToBeDeleted(tableName?: string, maxWaitTimeMs: number = 300000): Promise<void> {
    const targetTableName = tableName || this.config.tableName;
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    console.log(`Waiting for table ${targetTableName} to be deleted...`);

    while (Date.now() - startTime < maxWaitTimeMs) {
      try {
        const status = await this.getTableStatus(targetTableName);
        if (status === undefined) {
          return; // Table is deleted
        }
        console.log(`Table status: ${status}, waiting...`);
        await this.sleep(pollInterval);
      } catch (error) {
        if ((error as { name?: string }).name === 'ResourceNotFoundException') {
          return; // Table has been deleted
        }
        throw error;
      }
    }

    throw new Error(`Timeout waiting for table ${targetTableName} to be deleted`);
  }

  async listTables(): Promise<string[]> {
    try {
      const result = await this.client.listTables({});
      return result.TableNames || [];
    } catch (error) {
      console.error('Error listing tables:', error);
      throw error;
    }
  }

  async getTableInfo(tableName?: string): Promise<DescribeTableCommandOutput['Table'] | undefined> {
    const targetTableName = tableName || this.config.tableName;

    try {
      const result: DescribeTableCommandOutput = await this.client.describeTable({
        TableName: targetTableName,
      });
      return result.Table;
    } catch (error) {
      console.error(`Error getting table info for ${targetTableName}:`, error);
      throw error;
    }
  }

  async updateTable(options: {
    tableName?: string;
    billingMode?: 'PAY_PER_REQUEST' | 'PROVISIONED';
    readCapacityUnits?: number;
    writeCapacityUnits?: number;
    gsi1ReadCapacityUnits?: number;
    gsi1WriteCapacityUnits?: number;
    gsi2ReadCapacityUnits?: number;
    gsi2WriteCapacityUnits?: number;
    deletionProtection?: boolean;
  }): Promise<void> {
    const targetTableName = options.tableName || this.config.tableName;

    console.log(`Updating table ${targetTableName}`);

    try {
      const updateTableInput: UpdateTableCommandInput = {
        TableName: targetTableName,
      };

      if (options.billingMode) {
        updateTableInput.BillingMode = options.billingMode;

        if (options.billingMode === 'PROVISIONED') {
          updateTableInput.ProvisionedThroughput = {
            ReadCapacityUnits: options.readCapacityUnits || 5,
            WriteCapacityUnits: options.writeCapacityUnits || 5,
          };

          updateTableInput.GlobalSecondaryIndexUpdates = [
            {
              Update: {
                IndexName: this.config.gsi1Name,
                ProvisionedThroughput: {
                  ReadCapacityUnits: options.gsi1ReadCapacityUnits || 5,
                  WriteCapacityUnits: options.gsi1WriteCapacityUnits || 5,
                },
              },
            },
            {
              Update: {
                IndexName: this.config.gsi2Name,
                ProvisionedThroughput: {
                  ReadCapacityUnits: options.gsi2ReadCapacityUnits || 5,
                  WriteCapacityUnits: options.gsi2WriteCapacityUnits || 5,
                },
              },
            },
          ];
        }
      }

      if (options.deletionProtection !== undefined) {
        updateTableInput.DeletionProtectionEnabled = options.deletionProtection;
      }

      const result = await this.client.updateTable(updateTableInput);
      console.log(`Table update initiated: ${result.TableDescription?.TableName}`);

      // Wait for table to become active after update
      await this.waitForTableToBeActive(targetTableName);
      console.log(`Table ${targetTableName} update completed`);
    } catch (error) {
      console.error(`Error updating table ${targetTableName}:`, error);
      throw error;
    }
  }

  async enablePointInTimeRecovery(tableName?: string): Promise<void> {
    const targetTableName = tableName || this.config.tableName;

    try {
      await this.client.updateContinuousBackups({
        TableName: targetTableName,
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });
      console.log(`Point-in-time recovery enabled for table ${targetTableName}`);
    } catch (error) {
      console.error(`Error enabling point-in-time recovery for table ${targetTableName}:`, error);
      throw error;
    }
  }

  async disablePointInTimeRecovery(tableName?: string): Promise<void> {
    const targetTableName = tableName || this.config.tableName;

    try {
      await this.client.updateContinuousBackups({
        TableName: targetTableName,
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: false,
        },
      });
      console.log(`Point-in-time recovery disabled for table ${targetTableName}`);
    } catch (error) {
      console.error(`Error disabling point-in-time recovery for table ${targetTableName}:`, error);
      throw error;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Convenience function to create and setup the main table
export async function createPersonalBudgetTable(options: TableCreationOptions = {}): Promise<void> {
  const tableManager = new DynamoDBTableManager();

  const defaultOptions: TableCreationOptions = {
    billingMode: 'PAY_PER_REQUEST',
    deletionProtection: process.env.NODE_ENV === 'production',
    tags: {
      Environment: process.env.NODE_ENV || 'development',
      Application: 'personal-budget-manager',
      CreatedBy: 'automated-setup',
    },
    ...options,
  };

  await tableManager.createTable(defaultOptions);

  // Enable point-in-time recovery for production
  if (process.env.NODE_ENV === 'production') {
    await tableManager.enablePointInTimeRecovery();
  }
}

// Convenience function to delete the main table
export async function deletePersonalBudgetTable(): Promise<void> {
  const tableManager = new DynamoDBTableManager();
  await tableManager.deleteTable();
}
