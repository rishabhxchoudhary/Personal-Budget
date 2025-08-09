import { DynamoDBDocument, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBItem, QueryParams, DynamoDBTableConfig } from '@/shared/types/dynamodb';
import { DEFAULT_TABLE_CONFIG } from '@/shared/types/dynamodb';

// DynamoDB specific errors
export class DynamoDBError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable?: boolean,
  ) {
    super(message);
    this.name = 'DynamoDBError';
  }
}

export class ItemNotFoundError extends DynamoDBError {
  constructor(entityType: string, id: string) {
    super(`${entityType} with id ${id} not found`, 'ITEM_NOT_FOUND', 404, false);
    this.name = 'ItemNotFoundError';
  }
}

export class ConditionalCheckFailedError extends DynamoDBError {
  constructor(message: string = 'Conditional check failed') {
    super(message, 'CONDITIONAL_CHECK_FAILED', 400, false);
    this.name = 'ConditionalCheckFailedError';
  }
}

export class ValidationError extends DynamoDBError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400, false);
    this.name = 'ValidationError';
  }
}

// Base DynamoDB repository interface
export interface BaseDynamoDBRepository<TItem extends DynamoDBItem> {
  // Basic CRUD operations
  putItem(item: TItem): Promise<TItem>;
  getItem(pk: string, sk: string): Promise<TItem | null>;
  updateItem(pk: string, sk: string, updates: Partial<TItem>): Promise<TItem>;
  deleteItem(pk: string, sk: string): Promise<void>;

  // Query operations
  query(params: QueryParams): Promise<TItem[]>;
  queryWithPagination(params: QueryParams): Promise<{
    items: TItem[];
    lastEvaluatedKey?: Record<string, unknown>;
    count: number;
  }>;

  // Batch operations
  batchGet(keys: Array<{ pk: string; sk: string }>): Promise<TItem[]>;
  batchWrite(items: TItem[]): Promise<void>;
  batchDelete(keys: Array<{ pk: string; sk: string }>): Promise<void>;

  // Transaction operations
  transactWrite(
    items: Array<{
      operation: 'PUT' | 'UPDATE' | 'DELETE';
      item?: TItem;
      pk?: string;
      sk?: string;
      updates?: Partial<TItem>;
      conditionExpression?: string;
    }>,
  ): Promise<void>;

  // Utility methods
  exists(pk: string, sk: string): Promise<boolean>;
  count(params: QueryParams): Promise<number>;
}

// Abstract base repository implementation
export abstract class AbstractDynamoDBRepository<TItem extends DynamoDBItem>
  implements BaseDynamoDBRepository<TItem>
{
  protected readonly client: DynamoDBDocument;
  protected readonly config: DynamoDBTableConfig;

  constructor(client: DynamoDBDocument, config: DynamoDBTableConfig = DEFAULT_TABLE_CONFIG) {
    this.client = client;
    this.config = config;
  }

  async putItem(item: TItem): Promise<TItem> {
    try {
      await this.client.put({
        TableName: this.config.tableName,
        Item: item,
      });
      return item;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getItem(pk: string, sk: string): Promise<TItem | null> {
    try {
      const result = await this.client.get({
        TableName: this.config.tableName,
        Key: {
          [this.config.partitionKey]: pk,
          [this.config.sortKey]: sk,
        },
      });
      return (result.Item as TItem) || null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateItem(pk: string, sk: string, updates: Partial<TItem>): Promise<TItem> {
    try {
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, unknown> = {};

      // Filter out readonly fields
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        pk: _pk,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        sk: _sk,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        createdAt: _createdAt,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        entityType: _entityType,
        ...safeUpdates
      } = updates as Partial<TItem> & {
        pk?: string;
        sk?: string;
        createdAt?: Date;
        entityType?: string;
      };

      // Move validation before adding updatedAt
      if (Object.keys(safeUpdates).length === 0) {
        throw new ValidationError('No valid updates provided');
      }

      // Add updatedAt
      const updatesWithTimestamp = {
        ...safeUpdates,
        updatedAt: new Date().toISOString(),
      };

      Object.entries(updatesWithTimestamp).forEach(([key, value], index) => {
        if (value !== undefined) {
          const attrName = `#attr${index}`;
          const attrValue = `:val${index}`;
          updateExpression.push(`${attrName} = ${attrValue}`);
          expressionAttributeNames[attrName] = key;
          expressionAttributeValues[attrValue] = value;
        }
      });

      const result = await this.client.update({
        TableName: this.config.tableName,
        Key: {
          [this.config.partitionKey]: pk,
          [this.config.sortKey]: sk,
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_exists(#pk)',
        ExpressionAttributeNames: {
          ...expressionAttributeNames,
          '#pk': this.config.partitionKey,
        },
      });

      return result.Attributes as TItem;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteItem(pk: string, sk: string): Promise<void> {
    try {
      await this.client.delete({
        TableName: this.config.tableName,
        Key: {
          [this.config.partitionKey]: pk,
          [this.config.sortKey]: sk,
        },
        ConditionExpression: 'attribute_exists(#pk)',
        ExpressionAttributeNames: {
          '#pk': this.config.partitionKey,
        },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async query(params: QueryParams): Promise<TItem[]> {
    try {
      const queryParams = this.buildQueryParams(params);
      const result = await this.client.query(queryParams as QueryCommandInput);
      return (result.Items as TItem[]) || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async queryWithPagination(params: QueryParams): Promise<{
    items: TItem[];
    lastEvaluatedKey?: Record<string, unknown>;
    count: number;
  }> {
    try {
      const queryParams = this.buildQueryParams(params);
      const result = await this.client.query(queryParams as QueryCommandInput);

      return {
        items: (result.Items as TItem[]) || [],
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count || 0,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async batchGet(keys: Array<{ pk: string; sk: string }>): Promise<TItem[]> {
    try {
      if (keys.length === 0) return [];

      const requestItems = {
        [this.config.tableName]: {
          Keys: keys.map((key) => ({
            [this.config.partitionKey]: key.pk,
            [this.config.sortKey]: key.sk,
          })),
        },
      };

      const result = await this.client.batchGet({
        RequestItems: requestItems,
      });

      return (result.Responses?.[this.config.tableName] as TItem[]) || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async batchWrite(items: TItem[]): Promise<void> {
    try {
      if (items.length === 0) return;

      // DynamoDB batch write limit is 25 items
      const chunks = this.chunkArray(items, 25);

      for (const chunk of chunks) {
        const requestItems = {
          [this.config.tableName]: chunk.map((item) => ({
            PutRequest: { Item: item },
          })),
        };

        await this.client.batchWrite({
          RequestItems: requestItems,
        });
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async batchDelete(keys: Array<{ pk: string; sk: string }>): Promise<void> {
    try {
      if (keys.length === 0) return;

      const chunks = this.chunkArray(keys, 25);

      for (const chunk of chunks) {
        const requestItems = {
          [this.config.tableName]: chunk.map((key) => ({
            DeleteRequest: {
              Key: {
                [this.config.partitionKey]: key.pk,
                [this.config.sortKey]: key.sk,
              },
            },
          })),
        };

        await this.client.batchWrite({
          RequestItems: requestItems,
        });
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async transactWrite(
    items: Array<{
      operation: 'PUT' | 'UPDATE' | 'DELETE';
      item?: TItem;
      pk?: string;
      sk?: string;
      updates?: Partial<TItem>;
      conditionExpression?: string;
    }>,
  ): Promise<void> {
    try {
      const transactItems = items.map((item) => {
        const baseParams = {
          TableName: this.config.tableName,
          ConditionExpression: item.conditionExpression,
        };

        switch (item.operation) {
          case 'PUT':
            if (!item.item) throw new ValidationError('Item required for PUT operation');
            return { Put: { ...baseParams, Item: item.item } };

          case 'UPDATE':
            if (!item.pk || !item.sk)
              throw new ValidationError('pk and sk required for UPDATE operation');
            if (!item.updates) throw new ValidationError('Updates required for UPDATE operation');

            // Build update expression (simplified version)
            const updateExpression = Object.keys(item.updates)
              .map((key, index) => `#attr${index} = :val${index}`)
              .join(', ');

            const expressionAttributeNames = Object.keys(item.updates).reduce(
              (acc, key, index) => ({ ...acc, [`#attr${index}`]: key }),
              {},
            );

            const expressionAttributeValues = Object.entries(item.updates).reduce(
              (acc, [, value], index) => ({ ...acc, [`:val${index}`]: value }),
              {},
            );

            return {
              Update: {
                ...baseParams,
                Key: {
                  [this.config.partitionKey]: item.pk,
                  [this.config.sortKey]: item.sk,
                },
                UpdateExpression: `SET ${updateExpression}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
              },
            };

          case 'DELETE':
            if (!item.pk || !item.sk)
              throw new ValidationError('pk and sk required for DELETE operation');
            return {
              Delete: {
                ...baseParams,
                Key: {
                  [this.config.partitionKey]: item.pk,
                  [this.config.sortKey]: item.sk,
                },
              },
            };

          default:
            throw new ValidationError(`Unknown operation: ${item.operation}`);
        }
      });

      await this.client.transactWrite({
        TransactItems: transactItems,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async exists(pk: string, sk: string): Promise<boolean> {
    try {
      const result = await this.client.get({
        TableName: this.config.tableName,
        Key: {
          [this.config.partitionKey]: pk,
          [this.config.sortKey]: sk,
        },
        ProjectionExpression: this.config.partitionKey,
      });
      return !!result.Item;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async count(params: QueryParams): Promise<number> {
    try {
      const queryParams = this.buildQueryParams(params);
      queryParams.Select = 'COUNT';

      const result = await this.client.query(queryParams as QueryCommandInput);
      return result.Count || 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Protected helper methods
  protected buildQueryParams(params: QueryParams): Record<string, unknown> {
    const queryParams: Record<string, unknown> = {
      TableName: this.config.tableName,
    };

    // Set index if needed
    if (params.indexName) {
      queryParams.IndexName =
        params.indexName === 'GSI1' ? this.config.gsi1Name : this.config.gsi2Name;
    }

    // Build key condition expression
    const keyConditions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    if (params.indexName === 'GSI1') {
      if (params.gsi1pk) {
        keyConditions.push('#gsi1pk = :gsi1pk');
        expressionAttributeNames['#gsi1pk'] = this.config.gsi1PartitionKey;
        expressionAttributeValues[':gsi1pk'] = params.gsi1pk;
      }
      if (params.gsi1sk) {
        keyConditions.push('#gsi1sk = :gsi1sk');
        expressionAttributeNames['#gsi1sk'] = this.config.gsi1SortKey;
        expressionAttributeValues[':gsi1sk'] = params.gsi1sk;
      } else if (params.gsi1skPrefix) {
        keyConditions.push('begins_with(#gsi1sk, :gsi1skPrefix)');
        expressionAttributeNames['#gsi1sk'] = this.config.gsi1SortKey;
        expressionAttributeValues[':gsi1skPrefix'] = params.gsi1skPrefix;
      }
    } else if (params.indexName === 'GSI2') {
      if (params.gsi2pk) {
        keyConditions.push('#gsi2pk = :gsi2pk');
        expressionAttributeNames['#gsi2pk'] = this.config.gsi2PartitionKey;
        expressionAttributeValues[':gsi2pk'] = params.gsi2pk;
      }
      if (params.gsi2sk) {
        keyConditions.push('#gsi2sk = :gsi2sk');
        expressionAttributeNames['#gsi2sk'] = this.config.gsi2SortKey;
        expressionAttributeValues[':gsi2sk'] = params.gsi2sk;
      } else if (params.gsi2skPrefix) {
        keyConditions.push('begins_with(#gsi2sk, :gsi2skPrefix)');
        expressionAttributeNames['#gsi2sk'] = this.config.gsi2SortKey;
        expressionAttributeValues[':gsi2skPrefix'] = params.gsi2skPrefix;
      }
    } else {
      // Main table query
      if (params.pk) {
        keyConditions.push('#pk = :pk');
        expressionAttributeNames['#pk'] = this.config.partitionKey;
        expressionAttributeValues[':pk'] = params.pk;
      }
      if (params.sk) {
        keyConditions.push('#sk = :sk');
        expressionAttributeNames['#sk'] = this.config.sortKey;
        expressionAttributeValues[':sk'] = params.sk;
      } else if (params.skPrefix) {
        keyConditions.push('begins_with(#sk, :skPrefix)');
        expressionAttributeNames['#sk'] = this.config.sortKey;
        expressionAttributeValues[':skPrefix'] = params.skPrefix;
      }
    }

    if (keyConditions.length > 0) {
      queryParams.KeyConditionExpression = keyConditions.join(' AND ');
    }

    if (Object.keys(expressionAttributeNames).length > 0) {
      queryParams.ExpressionAttributeNames = {
        ...(queryParams.ExpressionAttributeNames || {}),
        ...expressionAttributeNames,
      };
    }

    if (Object.keys(expressionAttributeValues).length > 0) {
      queryParams.ExpressionAttributeValues = {
        ...(queryParams.ExpressionAttributeValues || {}),
        ...expressionAttributeValues,
      };
    }

    // Add filter expression if provided
    if (params.filterExpression) {
      queryParams.FilterExpression = params.filterExpression;
    }

    // Add expression attributes from params
    if (params.expressionAttributeNames) {
      queryParams.ExpressionAttributeNames = {
        ...(queryParams.ExpressionAttributeNames || {}),
        ...params.expressionAttributeNames,
      };
    }

    if (params.expressionAttributeValues) {
      queryParams.ExpressionAttributeValues = {
        ...(queryParams.ExpressionAttributeValues || {}),
        ...params.expressionAttributeValues,
      };
    }

    // Add pagination and limits
    if (params.limit) {
      queryParams.Limit = params.limit;
    }

    if (params.lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = params.lastEvaluatedKey;
    }

    if (params.scanIndexForward !== undefined) {
      queryParams.ScanIndexForward = params.scanIndexForward;
    }

    return queryParams;
  }

  protected handleError(error: unknown): never {
    if (error instanceof DynamoDBError) {
      throw error;
    }

    const awsError = error as {
      name?: string;
      message?: string;
      $metadata?: { httpStatusCode?: number };
    };

    switch (awsError.name) {
      case 'ConditionalCheckFailedException':
        throw new ConditionalCheckFailedError(awsError.message);
      case 'ResourceNotFoundException':
        throw new DynamoDBError(
          awsError.message || 'Resource not found',
          'RESOURCE_NOT_FOUND',
          404,
          false,
        );
      case 'ValidationException':
        throw new ValidationError(awsError.message || 'Validation error');
      case 'ProvisionedThroughputExceededException':
      case 'ThrottlingException':
        throw new DynamoDBError(awsError.message || 'Request throttled', 'THROTTLED', 429, true);
      default:
        throw new DynamoDBError(
          awsError.message || 'Unknown DynamoDB error',
          'UNKNOWN_ERROR',
          awsError.$metadata?.httpStatusCode || 500,
          false,
        );
    }
  }

  protected chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
