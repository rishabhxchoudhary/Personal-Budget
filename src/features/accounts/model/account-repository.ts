import { InMemoryRepository } from '@/shared/repositories/in-memory-repository';
import { Account, AccountRepository as IAccountRepository } from '@/shared/types/common';
import {
  createAccount,
  validateAccount,
  AccountValidationError,
  CreateAccountInput,
} from './account';

export class AccountRepository
  extends InMemoryRepository<Account, CreateAccountInput>
  implements IAccountRepository
{
  private userIdIndex: Map<string, Set<string>> = new Map(); // userId -> Set<accountId>

  protected getEntityId(entity: Account): string {
    return entity.accountId;
  }

  async create(item: CreateAccountInput): Promise<Account> {
    // Create account using the factory function
    const account = createAccount(item);

    // Validate the account
    const validation = validateAccount(account);
    if (!validation.isValid) {
      throw new AccountValidationError(validation.errors);
    }

    // Create the account
    const created = await super.create(account);

    // Update userId index
    if (!this.userIdIndex.has(created.userId)) {
      this.userIdIndex.set(created.userId, new Set());
    }
    this.userIdIndex.get(created.userId)!.add(created.accountId);

    return created;
  }

  async update(id: string, updates: Partial<Account>): Promise<Account> {
    // Get the existing account
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }

    // Filter out userId to prevent changing it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId: _userId, ...safeUpdates } = updates;

    // Create the updated account object for validation
    const updatedAccount = { ...existing, ...safeUpdates };

    // Validate the updated account
    const validation = validateAccount(updatedAccount);
    if (!validation.isValid) {
      throw new AccountValidationError(validation.errors);
    }

    // Update the account
    const updated = await super.update(id, safeUpdates);

    return updated;
  }

  async delete(id: string): Promise<void> {
    // Get the account to remove from userId index
    const account = await this.findById(id);
    if (account) {
      const userAccounts = this.userIdIndex.get(account.userId);
      if (userAccounts) {
        userAccounts.delete(account.accountId);
        if (userAccounts.size === 0) {
          this.userIdIndex.delete(account.userId);
        }
      }
    }

    await super.delete(id);
  }

  async findByUserId(userId: string): Promise<Account[]> {
    const accountIds = this.userIdIndex.get(userId);
    if (!accountIds || accountIds.size === 0) {
      return [];
    }

    const accounts: Account[] = [];
    for (const accountId of accountIds) {
      const account = await this.findById(accountId);
      if (account) {
        accounts.push(account);
      }
    }

    return accounts;
  }

  async findActiveByUserId(userId: string): Promise<Account[]> {
    const allAccounts = await this.findByUserId(userId);
    return allAccounts.filter((account) => account.isActive);
  }
}
