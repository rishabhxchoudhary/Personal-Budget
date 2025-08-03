import { UserRepository } from './user-repository';

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    repository = new UserRepository();
  });

  describe('create', () => {
    it('should create a valid user', async () => {
      const input = {
        email: 'test@example.com',
        name: 'Test User',
        defaultCurrency: 'USD',
        monthStartDay: 1,
      };

      const user = await repository.create(input);

      expect(user.userId).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.defaultCurrency).toBe('USD');
      expect(user.monthStartDay).toBe(1);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate user before creating', async () => {
      const input = {
        email: 'invalid-email',
        name: 'Test User',
      };

      await expect(repository.create(input)).rejects.toThrow('User validation failed');
    });

    it('should prevent duplicate emails', async () => {
      await repository.create({
        email: 'test@example.com',
        name: 'First User',
      });

      await expect(
        repository.create({
          email: 'test@example.com',
          name: 'Second User',
        }),
      ).rejects.toThrow('User with email test@example.com already exists');
    });

    it('should allow duplicate emails with different case if not normalized', async () => {
      await repository.create({
        email: 'test@example.com',
        name: 'First User',
      });

      // This should also fail because createUser normalizes email to lowercase
      await expect(
        repository.create({
          email: 'TEST@EXAMPLE.COM',
          name: 'Second User',
        }),
      ).rejects.toThrow('User with email test@example.com already exists');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const created = await repository.create({
        email: 'test@example.com',
        name: 'Test User',
      });

      const found = await repository.findByEmail('test@example.com');

      expect(found).toBeDefined();
      expect(found).toEqual(created);
    });

    it('should return null for non-existent email', async () => {
      const found = await repository.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });

    it('should find user by email case-insensitively', async () => {
      await repository.create({
        email: 'test@example.com',
        name: 'Test User',
      });

      const found = await repository.findByEmail('TEST@EXAMPLE.COM');
      expect(found).toBeDefined();
      expect(found?.email).toBe('test@example.com');
    });

    it('should return a copy of the user', async () => {
      await repository.create({
        email: 'test@example.com',
        name: 'Test User',
      });

      const found1 = await repository.findByEmail('test@example.com');
      const found2 = await repository.findByEmail('test@example.com');

      expect(found1).toEqual(found2);
      expect(found1).not.toBe(found2); // Different object references
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const created = await repository.create({
        email: 'test@example.com',
        name: 'Original Name',
        monthStartDay: 1,
      });

      const updated = await repository.update(created.userId, {
        name: 'Updated Name',
        monthStartDay: 15,
      });

      expect(updated.userId).toBe(created.userId);
      expect(updated.email).toBe('test@example.com');
      expect(updated.name).toBe('Updated Name');
      expect(updated.monthStartDay).toBe(15);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should validate updates', async () => {
      const created = await repository.create({
        email: 'test@example.com',
        name: 'Test User',
      });

      await expect(
        repository.update(created.userId, {
          email: 'invalid-email',
        }),
      ).rejects.toThrow('User validation failed');
    });

    it('should prevent email updates that would create duplicates', async () => {
      const user1 = await repository.create({
        email: 'user1@example.com',
        name: 'User 1',
      });

      await repository.create({
        email: 'user2@example.com',
        name: 'User 2',
      });

      await expect(
        repository.update(user1.userId, {
          email: 'user2@example.com',
        }),
      ).rejects.toThrow('User with email user2@example.com already exists');
    });

    it('should allow updating to the same email', async () => {
      const created = await repository.create({
        email: 'test@example.com',
        name: 'Test User',
      });

      const updated = await repository.update(created.userId, {
        email: 'test@example.com',
        name: 'Updated Name',
      });

      expect(updated.email).toBe('test@example.com');
      expect(updated.name).toBe('Updated Name');
    });

    it('should normalize email on update', async () => {
      const created = await repository.create({
        email: 'test@example.com',
        name: 'Test User',
      });

      const updated = await repository.update(created.userId, {
        email: 'TEST@EXAMPLE.COM',
      });

      expect(updated.email).toBe('test@example.com');
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const created = await repository.create({
        email: 'test@example.com',
        name: 'Test User',
      });

      await repository.delete(created.userId);

      const found = await repository.findById(created.userId);
      expect(found).toBeNull();

      const foundByEmail = await repository.findByEmail('test@example.com');
      expect(foundByEmail).toBeNull();
    });

    it('should free up email for reuse after deletion', async () => {
      const user1 = await repository.create({
        email: 'test@example.com',
        name: 'First User',
      });

      await repository.delete(user1.userId);

      const user2 = await repository.create({
        email: 'test@example.com',
        name: 'Second User',
      });

      expect(user2).toBeDefined();
      expect(user2.email).toBe('test@example.com');
      expect(user2.name).toBe('Second User');
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const created = await repository.create({
        email: 'test@example.com',
        name: 'Test User',
      });

      const found = await repository.findById(created.userId);

      expect(found).toBeDefined();
      expect(found).toEqual(created);
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const user1 = await repository.create({
        email: 'user1@example.com',
        name: 'User 1',
      });

      const user2 = await repository.create({
        email: 'user2@example.com',
        name: 'User 2',
      });

      const user3 = await repository.create({
        email: 'user3@example.com',
        name: 'User 3',
      });

      const all = await repository.findAll();

      expect(all).toHaveLength(3);
      expect(all).toContainEqual(user1);
      expect(all).toContainEqual(user2);
      expect(all).toContainEqual(user3);
    });

    it('should return empty array when no users exist', async () => {
      const all = await repository.findAll();
      expect(all).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle users with minimal required fields', async () => {
      const user = await repository.create({
        email: 'minimal@example.com',
        name: 'Minimal User',
      });

      expect(user.defaultCurrency).toBe('USD');
      expect(user.monthStartDay).toBe(1);
    });

    it('should handle concurrent operations safely', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        repository.create({
          email: `user${i}@example.com`,
          name: `User ${i}`,
        }),
      );

      const users = await Promise.all(promises);

      expect(users).toHaveLength(10);
      const all = await repository.findAll();
      expect(all).toHaveLength(10);

      // All emails should be unique
      const emails = users.map((u) => u.email);
      expect(new Set(emails).size).toBe(10);
    });

    it('should handle special characters in email', async () => {
      await repository.create({
        email: 'test+filter@example.com',
        name: 'Test User',
      });

      const found = await repository.findByEmail('test+filter@example.com');
      expect(found).toBeDefined();
      expect(found?.email).toBe('test+filter@example.com');
    });

    it('should handle very long valid names and emails', async () => {
      const longName = 'A'.repeat(254);
      const longEmail = 'a'.repeat(243) + '@example.com'; // Total 255 chars

      const user = await repository.create({
        email: longEmail,
        name: longName,
      });

      expect(user.name).toBe(longName);
      expect(user.email).toBe(longEmail.toLowerCase());
    });
  });
});
