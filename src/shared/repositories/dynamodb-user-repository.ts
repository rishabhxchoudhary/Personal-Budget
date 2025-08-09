import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { AbstractDynamoDBRepository } from './dynamodb-repository';
import type { User, UserRepository } from '@/shared/types/common';
import type { UserItem, DynamoDBTableConfig } from '@/shared/types/dynamodb';
import { DEFAULT_TABLE_CONFIG } from '@/shared/types/dynamodb';
import { DynamoDBConverters, KeyPatterns } from '@/shared/types/dynamodb';

export class DynamoDBUserRepository
  extends AbstractDynamoDBRepository<UserItem>
  implements UserRepository
{
  constructor(client: DynamoDBDocument, config: DynamoDBTableConfig = DEFAULT_TABLE_CONFIG) {
    super(client, config);
  }

  async create(input: {
    userId?: string;
    email: string;
    name: string;
    defaultCurrency?: string;
    monthStartDay?: number;
  }): Promise<User> {
    const now = new Date();
    const user: User = {
      userId: input.userId || uuidv4(),
      email: input.email,
      name: input.name,
      defaultCurrency: input.defaultCurrency || 'USD',
      monthStartDay: input.monthStartDay || 1,
      createdAt: now,
      updatedAt: now,
    };

    const item = DynamoDBConverters.userToItem(user);
    await this.putItem(item);

    return user;
  }

  async findById(userId: string): Promise<User | null> {
    const keys = KeyPatterns.user(userId);
    const item = await this.getItem(keys.pk, keys.sk);

    return item ? DynamoDBConverters.itemToUser(item) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    // Query GSI1 for email lookup
    const items = await this.query({
      indexName: 'GSI1',
      gsi1pk: `EMAIL#${email}`,
      gsi1sk: 'USER',
      pk: ''
    });

    return items.length > 0 ? DynamoDBConverters.itemToUser(items[0]) : null;
  }

  async findAll(): Promise<User[]> {
    // This is not efficient for production use - would need a different approach
    // For now, this method is mainly for testing purposes
    throw new Error('findAll is not supported for User repository - would require scan operation');
  }

  async update(userId: string, updates: Partial<User>): Promise<User> {
    const keys = KeyPatterns.user(userId);

    // Filter out protected fields that should not be updated
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId: _userId, createdAt: _createdAt, updatedAt, ...safeUpdates } = updates;

    // Convert to DynamoDB format
    const dynamoUpdates: Partial<UserItem> = {
      ...safeUpdates,
      ...(updatedAt && { updatedAt: updatedAt.toISOString() }),
    };

    const updatedItem = await this.updateItem(keys.pk, keys.sk, dynamoUpdates);
    return DynamoDBConverters.itemToUser(updatedItem);
  }

  async delete(userId: string): Promise<void> {
    const keys = KeyPatterns.user(userId);
    await this.deleteItem(keys.pk, keys.sk);
  }

  // Additional utility methods specific to User repository
  async exists(userId: string): Promise<boolean> {
    const keys = KeyPatterns.user(userId);
    return super.exists(keys.pk, keys.sk);
  }

  async updateDefaultCurrency(userId: string, currency: string): Promise<User> {
    return this.update(userId, { defaultCurrency: currency });
  }

  async updateMonthStartDay(userId: string, monthStartDay: number): Promise<User> {
    if (monthStartDay < 1 || monthStartDay > 28) {
      throw new Error('Month start day must be between 1 and 28');
    }
    return this.update(userId, { monthStartDay });
  }
}
