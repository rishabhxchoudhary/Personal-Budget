import { DynamoDB, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBTableConfig } from '@/shared/types/dynamodb';

// Environment configuration
export const getDynamoDBConfig = (): DynamoDBClientConfig => {
  const config: DynamoDBClientConfig = {
    region: process.env.AWS_REGION || process.env.DYNAMODB_REGION || 'us-east-1',
  };

  // Use provided credentials if available
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  // Use specific DynamoDB credentials if provided (for local development)
  if (process.env.DYNAMODB_ACCESS_KEY_ID && process.env.DYNAMODB_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID,
      secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY,
    };
  }

  // Override endpoint for local development (DynamoDB Local)
  if (process.env.DYNAMODB_ENDPOINT) {
    config.endpoint = process.env.DYNAMODB_ENDPOINT;
  }

  return config;
};

// Table configuration from environment
export const getTableConfig = (): DynamoDBTableConfig => ({
  tableName: process.env.DYNAMODB_TABLE_NAME || 'personal-budget',
  partitionKey: 'pk',
  sortKey: 'sk',
  gsi1Name: 'GSI1',
  gsi1PartitionKey: 'gsi1pk',
  gsi1SortKey: 'gsi1sk',
  gsi2Name: 'GSI2',
  gsi2PartitionKey: 'gsi2pk',
  gsi2SortKey: 'gsi2sk',
});

// Create DynamoDB client instance
export const createDynamoDBClient = (): DynamoDB => {
  const config = getDynamoDBConfig();
  return new DynamoDB(config);
};

// Create DynamoDB Document client instance
export const createDynamoDBDocumentClient = (): DynamoDBDocument => {
  const client = createDynamoDBClient();

  return DynamoDBDocument.from(client, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });
};

// Singleton instances for application use
let documentClientInstance: DynamoDBDocument | null = null;
let tableConfigInstance: DynamoDBTableConfig | null = null;

export const getDynamoDBDocumentClient = (): DynamoDBDocument => {
  if (!documentClientInstance) {
    documentClientInstance = createDynamoDBDocumentClient();
  }
  return documentClientInstance;
};

export const getDynamoDBTableConfig = (): DynamoDBTableConfig => {
  if (!tableConfigInstance) {
    tableConfigInstance = getTableConfig();
  }
  return tableConfigInstance;
};

// Helper to reset singletons (useful for testing)
export const resetDynamoDBSingletons = (): void => {
  documentClientInstance = null;
  tableConfigInstance = null;
};

// Connection test utility
export const testDynamoDBConnection = async (): Promise<boolean> => {
  try {
    const client = createDynamoDBClient();
    await client.listTables({ Limit: 1 });
    return true;
  } catch (error) {
    console.error('DynamoDB connection test failed:', error);
    return false;
  }
};

// Table existence check
export const checkTableExists = async (tableName?: string): Promise<boolean> => {
  try {
    const client = createDynamoDBClient();
    const config = getTableConfig();
    const targetTableName = tableName || config.tableName;

    const result = await client.listTables({});
    return result.TableNames?.includes(targetTableName) || false;
  } catch (error) {
    console.error('Error checking table existence:', error);
    return false;
  }
};
