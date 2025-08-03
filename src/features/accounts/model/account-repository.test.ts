import { AccountRepository } from './account-repository';

describe('AccountRepository', () => {
  let repository: AccountRepository;

  beforeEach(() => {
    repository = new AccountRepository();
  });

  describe('create', () => {
    it('should create a valid account', async () => {
      const input = {
        userId: 'user-123',
        name: 'Test Checking',
        type: 'checking' as const,
        balanceMinor: 100000,
        currency: 'USD',
      };

      const account = await repository.create(input);

      expect(account.accountId).toBeDefined();
      expect(account.userId).toBe('user-123');
      expect(account.name).toBe('Test Checking');
      expect(account.type).toBe('checking');
      expect(account.balanceMinor).toBe(100000);
      expect(account.currency).toBe('USD');
      expect(account.isActive).toBe(true);
      expect(account.createdAt).toBeInstanceOf(Date);
      expect(account.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate account before creating', async () => {
      const input = {
        userId: 'user-123',
        name: '',
        type: 'checking' as const,
        balanceMinor: 0,
        currency: 'USD',
      };

      await expect(repository.create(input)).rejects.toThrow('Account validation failed');
    });

    it('should allow multiple accounts for the same user', async () => {
      const account1 = await repository.create({
        userId: 'user-123',
        name: 'Checking Account',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
      });

      const account2 = await repository.create({
        userId: 'user-123',
        name: 'Savings Account',
        type: 'savings',
        balanceMinor: 500000,
        currency: 'USD',
      });

      expect(account1.accountId).not.toBe(account2.accountId);
      expect(account1.userId).toBe(account2.userId);
    });

    it('should create accounts with optional fields', async () => {
      const account = await repository.create({
        userId: 'user-123',
        name: 'Bank Account',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
        institution: 'Test Bank',
        lastFour: '1234',
      });

      expect(account.institution).toBe('Test Bank');
      expect(account.lastFour).toBe('1234');
    });

    it('should create inactive accounts when specified', async () => {
      const account = await repository.create({
        userId: 'user-123',
        name: 'Closed Account',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
        isActive: false,
      });

      expect(account.isActive).toBe(false);
    });
  });

  describe('findByUserId', () => {
    it('should find all accounts for a user', async () => {
      const userId = 'user-123';

      const account1 = await repository.create({
        userId,
        name: 'Checking',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
      });

      const account2 = await repository.create({
        userId,
        name: 'Savings',
        type: 'savings',
        balanceMinor: 500000,
        currency: 'USD',
      });

      const account3 = await repository.create({
        userId,
        name: 'Credit Card',
        type: 'credit',
        balanceMinor: -50000,
        currency: 'USD',
      });

      const accounts = await repository.findByUserId(userId);

      expect(accounts).toHaveLength(3);
      expect(accounts).toContainEqual(account1);
      expect(accounts).toContainEqual(account2);
      expect(accounts).toContainEqual(account3);
    });

    it('should return empty array for user with no accounts', async () => {
      const accounts = await repository.findByUserId('user-no-accounts');
      expect(accounts).toEqual([]);
    });

    it('should not return accounts for other users', async () => {
      await repository.create({
        userId: 'user-123',
        name: 'User 123 Account',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
      });

      await repository.create({
        userId: 'user-456',
        name: 'User 456 Account',
        type: 'checking',
        balanceMinor: 200000,
        currency: 'USD',
      });

      const accounts = await repository.findByUserId('user-123');
      expect(accounts).toHaveLength(1);
      expect(accounts[0].userId).toBe('user-123');
    });

    it('should return copies of accounts', async () => {
      await repository.create({
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
      });

      const accounts1 = await repository.findByUserId('user-123');
      const accounts2 = await repository.findByUserId('user-123');

      expect(accounts1).toEqual(accounts2);
      expect(accounts1[0]).not.toBe(accounts2[0]); // Different object references
    });
  });

  describe('findActiveByUserId', () => {
    it('should only return active accounts', async () => {
      const userId = 'user-123';

      const activeAccount1 = await repository.create({
        userId,
        name: 'Active Checking',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
        isActive: true,
      });

      const inactiveAccount = await repository.create({
        userId,
        name: 'Closed Savings',
        type: 'savings',
        balanceMinor: 0,
        currency: 'USD',
        isActive: false,
      });

      const activeAccount2 = await repository.create({
        userId,
        name: 'Active Credit',
        type: 'credit',
        balanceMinor: -25000,
        currency: 'USD',
        isActive: true,
      });

      const activeAccounts = await repository.findActiveByUserId(userId);

      expect(activeAccounts).toHaveLength(2);
      expect(activeAccounts).toContainEqual(activeAccount1);
      expect(activeAccounts).toContainEqual(activeAccount2);
      expect(activeAccounts).not.toContainEqual(inactiveAccount);
    });

    it('should return empty array when user has no active accounts', async () => {
      const userId = 'user-123';

      await repository.create({
        userId,
        name: 'Closed Account',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
        isActive: false,
      });

      const activeAccounts = await repository.findActiveByUserId(userId);
      expect(activeAccounts).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update account fields', async () => {
      const created = await repository.create({
        userId: 'user-123',
        name: 'Original Name',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
      });

      const updated = await repository.update(created.accountId, {
        name: 'Updated Name',
        balanceMinor: 150000,
      });

      expect(updated.accountId).toBe(created.accountId);
      expect(updated.name).toBe('Updated Name');
      expect(updated.balanceMinor).toBe(150000);
      expect(updated.type).toBe('checking'); // Unchanged
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should validate updates', async () => {
      const created = await repository.create({
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
      });

      await expect(
        repository.update(created.accountId, {
          name: '',
        }),
      ).rejects.toThrow('Account validation failed');
    });

    it('should update account status', async () => {
      const created = await repository.create({
        userId: 'user-123',
        name: 'Active Account',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
        isActive: true,
      });

      const updated = await repository.update(created.accountId, {
        isActive: false,
      });

      expect(updated.isActive).toBe(false);
    });

    it('should update optional fields', async () => {
      const created = await repository.create({
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
      });

      const updated = await repository.update(created.accountId, {
        institution: 'New Bank',
        lastFour: '5678',
      });

      expect(updated.institution).toBe('New Bank');
      expect(updated.lastFour).toBe('5678');
    });

    it('should not change userId during update', async () => {
      const created = await repository.create({
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
      });

      const updated = await repository.update(created.accountId, {
        userId: 'user-456',
        name: 'Updated Name',
      });

      expect(updated.userId).toBe('user-123'); // Should remain unchanged
    });
  });

  describe('delete', () => {
    it('should delete account', async () => {
      const created = await repository.create({
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
      });

      await repository.delete(created.accountId);

      const found = await repository.findById(created.accountId);
      expect(found).toBeNull();

      const userAccounts = await repository.findByUserId('user-123');
      expect(userAccounts).toEqual([]);
    });

    it('should only delete specified account', async () => {
      const account1 = await repository.create({
        userId: 'user-123',
        name: 'Account 1',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
      });

      const account2 = await repository.create({
        userId: 'user-123',
        name: 'Account 2',
        type: 'savings',
        balanceMinor: 200000,
        currency: 'USD',
      });

      await repository.delete(account1.accountId);

      const userAccounts = await repository.findByUserId('user-123');
      expect(userAccounts).toHaveLength(1);
      expect(userAccounts[0]).toEqual(account2);
    });
  });

  describe('findById', () => {
    it('should find account by id', async () => {
      const created = await repository.create({
        userId: 'user-123',
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
      });

      const found = await repository.findById(created.accountId);

      expect(found).toBeDefined();
      expect(found).toEqual(created);
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all accounts', async () => {
      const account1 = await repository.create({
        userId: 'user-123',
        name: 'Account 1',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
      });

      const account2 = await repository.create({
        userId: 'user-456',
        name: 'Account 2',
        type: 'savings',
        balanceMinor: 200000,
        currency: 'USD',
      });

      const account3 = await repository.create({
        userId: 'user-789',
        name: 'Account 3',
        type: 'credit',
        balanceMinor: -50000,
        currency: 'USD',
      });

      const all = await repository.findAll();

      expect(all).toHaveLength(3);
      expect(all).toContainEqual(account1);
      expect(all).toContainEqual(account2);
      expect(all).toContainEqual(account3);
    });

    it('should return empty array when no accounts exist', async () => {
      const all = await repository.findAll();
      expect(all).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle accounts with zero balance', async () => {
      const account = await repository.create({
        userId: 'user-123',
        name: 'Zero Balance',
        type: 'checking',
        balanceMinor: 0,
        currency: 'USD',
      });

      expect(account.balanceMinor).toBe(0);
    });

    it('should handle credit accounts with negative balance', async () => {
      const account = await repository.create({
        userId: 'user-123',
        name: 'Credit Card',
        type: 'credit',
        balanceMinor: -150000,
        currency: 'USD',
      });

      expect(account.balanceMinor).toBe(-150000);
    });

    it('should handle concurrent operations safely', async () => {
      const userId = 'user-123';
      const promises = Array.from({ length: 10 }, (_, i) =>
        repository.create({
          userId,
          name: `Account ${i}`,
          type: i % 2 === 0 ? 'checking' : 'savings',
          balanceMinor: i * 10000,
          currency: 'USD',
        }),
      );

      const accounts = await Promise.all(promises);

      expect(accounts).toHaveLength(10);
      const userAccounts = await repository.findByUserId(userId);
      expect(userAccounts).toHaveLength(10);

      // All account IDs should be unique
      const accountIds = accounts.map((a) => a.accountId);
      expect(new Set(accountIds).size).toBe(10);
    });

    it('should handle different currencies', async () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
      const userId = 'user-123';

      const accounts = await Promise.all(
        currencies.map((currency) =>
          repository.create({
            userId,
            name: `${currency} Account`,
            type: 'checking',
            balanceMinor: 100000,
            currency,
          }),
        ),
      );

      expect(accounts).toHaveLength(4);
      accounts.forEach((account, index) => {
        expect(account.currency).toBe(currencies[index]);
      });
    });
  });
});
