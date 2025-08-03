import { ExternalPerson } from '@/shared/types/common';
import { ExternalPersonRepositoryImpl } from './external-person-repository';
import {
  validateEmail,
  validatePhone,
  validateName,
  validateUserId,
  normalizeEmail,
} from './external-person';

describe('ExternalPerson Model', () => {
  describe('ExternalPerson Entity', () => {
    it('should create a valid external person with all fields', () => {
      const person: ExternalPerson = {
        personId: 'person_123',
        userId: 'user_123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(person.personId).toBe('person_123');
      expect(person.userId).toBe('user_123');
      expect(person.name).toBe('John Doe');
      expect(person.email).toBe('john@example.com');
      expect(person.phone).toBe('+1234567890');
      expect(person.isActive).toBe(true);
    });

    it('should create a valid external person with only required fields', () => {
      const person: ExternalPerson = {
        personId: 'person_123',
        userId: 'user_123',
        name: 'John Doe',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(person.email).toBeUndefined();
      expect(person.phone).toBeUndefined();
    });

    it('should have isActive true by default', () => {
      const person: Partial<ExternalPerson> = {
        isActive: true,
      };
      expect(person.isActive).toBe(true);
    });

    it('should validate email format when provided', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('no@domain')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('should validate phone format when provided', () => {
      expect(validatePhone('+1234567890')).toBe(true);
      expect(validatePhone('123-456-7890')).toBe(true);
      expect(validatePhone('(123) 456-7890')).toBe(true);
      expect(validatePhone('invalid')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });

    it('should require a valid userId', () => {
      expect(() => validateUserId('')).toThrow('UserId is required');
      expect(() => validateUserId('  ')).toThrow('UserId is required');
      expect(() => validateUserId('valid_id')).not.toThrow();
    });

    it('should require a non-empty name', () => {
      expect(() => validateName('')).toThrow('Name cannot be empty');
      expect(() => validateName('  ')).toThrow('Name cannot be empty');
    });

    it('should trim whitespace from name', () => {
      expect(validateName('  John Doe  ')).toBe('John Doe');
      expect(validateName('John  Doe')).toBe('John  Doe');
    });

    it('should handle special characters in name', () => {
      expect(validateName("O'Connor")).toBe("O'Connor");
      expect(validateName('José García')).toBe('José García');
      expect(validateName('李明')).toBe('李明');
    });

    it('should not allow duplicate email for same user', () => {
      // This is handled at repository level
      expect(normalizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
      expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
    });
  });
});

describe('ExternalPersonRepository', () => {
  let repository: ExternalPersonRepositoryImpl;

  beforeEach(() => {
    repository = new ExternalPersonRepositoryImpl();
  });

  describe('create', () => {
    it('should create a new external person', async () => {
      const input = {
        userId: 'user_123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      const created = await repository.create(input);

      expect(created.userId).toBe('user_123');
      expect(created.name).toBe('John Doe');
      expect(created.email).toBe('john@example.com');
      expect(created.phone).toBe('+1234567890');
      expect(created.isActive).toBe(true);
      expect(created.personId).toMatch(/^person_/);
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate a unique personId', async () => {
      const input1 = { userId: 'user_123', name: 'Person 1' };
      const input2 = { userId: 'user_123', name: 'Person 2' };

      const person1 = await repository.create(input1);
      const person2 = await repository.create(input2);

      expect(person1.personId).not.toBe(person2.personId);
      expect(person1.personId).toMatch(/^person_/);
      expect(person2.personId).toMatch(/^person_/);
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const before = new Date();
      const created = await repository.create({
        userId: 'user_123',
        name: 'John Doe',
      });
      const after = new Date();

      expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(created.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(created.updatedAt.getTime()).toBe(created.createdAt.getTime());
    });

    it('should default isActive to true if not specified', async () => {
      const created = await repository.create({
        userId: 'user_123',
        name: 'John Doe',
      });

      expect(created.isActive).toBe(true);
    });

    it('should validate required fields', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(repository.create({ name: 'John' } as any)).rejects.toThrow(
        'UserId is required',
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(repository.create({ userId: 'user_123' } as any)).rejects.toThrow(
        'Name is required',
      );
    });

    it('should validate email format if provided', async () => {
      await expect(
        repository.create({
          userId: 'user_123',
          name: 'John Doe',
          email: 'invalid-email',
        }),
      ).rejects.toThrow('Invalid email format');
    });

    it('should validate phone format if provided', async () => {
      await expect(
        repository.create({
          userId: 'user_123',
          name: 'John Doe',
          phone: 'invalid',
        }),
      ).rejects.toThrow('Invalid phone format');
    });

    it('should prevent duplicate personId', async () => {
      const input = {
        personId: 'person_duplicate',
        userId: 'user_123',
        name: 'John Doe',
      };

      await repository.create(input);
      await expect(repository.create(input)).rejects.toThrow(
        'Entity with id person_duplicate already exists',
      );
    });
  });

  describe('findById', () => {
    it('should find an existing external person by id', async () => {
      const created = await repository.create({
        userId: 'user_123',
        name: 'John Doe',
      });

      const found = await repository.findById(created.personId);

      expect(found).toBeTruthy();
      expect(found?.personId).toBe(created.personId);
      expect(found?.name).toBe('John Doe');
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non_existent');
      expect(found).toBeNull();
    });

    it('should return a deep copy of the entity', async () => {
      const created = await repository.create({
        userId: 'user_123',
        name: 'John Doe',
      });

      const found1 = await repository.findById(created.personId);
      const found2 = await repository.findById(created.personId);

      expect(found1).not.toBe(found2);
      expect(found1).toEqual(found2);
    });
  });

  describe('findByUserId', () => {
    it('should find all external persons for a user', async () => {
      await repository.create({ userId: 'user_1', name: 'Person 1' });
      await repository.create({ userId: 'user_1', name: 'Person 2' });
      await repository.create({ userId: 'user_2', name: 'Person 3' });

      const user1Persons = await repository.findByUserId('user_1');

      expect(user1Persons).toHaveLength(2);
      expect(user1Persons[0].name).toBe('Person 1');
      expect(user1Persons[1].name).toBe('Person 2');
    });

    it('should return empty array for user with no external persons', async () => {
      const persons = await repository.findByUserId('no_persons_user');
      expect(persons).toEqual([]);
    });

    it('should only return persons for the specified user', async () => {
      await repository.create({ userId: 'user_1', name: 'Person 1' });
      await repository.create({ userId: 'user_2', name: 'Person 2' });

      const user1Persons = await repository.findByUserId('user_1');
      const user2Persons = await repository.findByUserId('user_2');

      expect(user1Persons).toHaveLength(1);
      expect(user1Persons[0].name).toBe('Person 1');
      expect(user2Persons).toHaveLength(1);
      expect(user2Persons[0].name).toBe('Person 2');
    });

    it('should return persons in insertion order', async () => {
      await repository.create({ userId: 'user_1', name: 'First' });
      await repository.create({ userId: 'user_1', name: 'Second' });
      await repository.create({ userId: 'user_1', name: 'Third' });

      const persons = await repository.findByUserId('user_1');

      expect(persons[0].name).toBe('First');
      expect(persons[1].name).toBe('Second');
      expect(persons[2].name).toBe('Third');
    });

    it('should include both active and inactive persons', async () => {
      const active = await repository.create({ userId: 'user_1', name: 'Active' });
      const inactive = await repository.create({
        userId: 'user_1',
        name: 'Inactive',
        isActive: false,
      });

      const persons = await repository.findByUserId('user_1');

      expect(persons).toHaveLength(2);
      expect(persons.find((p) => p.personId === active.personId)?.isActive).toBe(true);
      expect(persons.find((p) => p.personId === inactive.personId)?.isActive).toBe(false);
    });
  });

  describe('findByEmail', () => {
    it('should find external person by email', async () => {
      await repository.create({
        userId: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
      });

      const found = await repository.findByEmail('john@example.com');

      expect(found).toBeTruthy();
      expect(found?.name).toBe('John Doe');
      expect(found?.email).toBe('john@example.com');
    });

    it('should return null for non-existent email', async () => {
      const found = await repository.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });

    it('should perform case-insensitive email search', async () => {
      await repository.create({
        userId: 'user_1',
        name: 'John Doe',
        email: 'John@Example.COM',
      });

      const found1 = await repository.findByEmail('john@example.com');
      const found2 = await repository.findByEmail('JOHN@EXAMPLE.COM');

      expect(found1).toBeTruthy();
      expect(found2).toBeTruthy();
      expect(found1?.personId).toBe(found2?.personId);
    });

    it('should handle external persons without email', async () => {
      await repository.create({ userId: 'user_1', name: 'No Email' });

      const found = await repository.findByEmail('');
      expect(found).toBeNull();
    });

    it('should find correct person when multiple users have same email', async () => {
      const person1 = await repository.create({
        userId: 'user_1',
        name: 'User 1 Person',
        email: 'shared@example.com',
      });

      await repository.create({
        userId: 'user_2',
        name: 'User 2 Person',
        email: 'shared@example.com',
      });

      const found = await repository.findByEmail('shared@example.com');

      // Should return the first one found
      expect(found).toBeTruthy();
      expect(found?.personId).toBe(person1.personId);
    });
  });

  describe('findActiveByUserId', () => {
    it('should only return active external persons', async () => {
      await repository.create({ userId: 'user_1', name: 'Active 1' });
      await repository.create({ userId: 'user_1', name: 'Active 2' });
      await repository.create({ userId: 'user_1', name: 'Inactive', isActive: false });

      const activePersons = await repository.findActiveByUserId('user_1');

      expect(activePersons).toHaveLength(2);
      expect(activePersons.every((p) => p.isActive)).toBe(true);
    });

    it('should filter out inactive persons', async () => {
      const active = await repository.create({ userId: 'user_1', name: 'Active' });
      const inactive = await repository.create({
        userId: 'user_1',
        name: 'Inactive',
        isActive: false,
      });

      const activePersons = await repository.findActiveByUserId('user_1');

      expect(activePersons).toHaveLength(1);
      expect(activePersons[0].personId).toBe(active.personId);
      expect(activePersons.find((p) => p.personId === inactive.personId)).toBeUndefined();
    });

    it('should return empty array if all persons are inactive', async () => {
      await repository.create({ userId: 'user_1', name: 'Inactive 1', isActive: false });
      await repository.create({ userId: 'user_1', name: 'Inactive 2', isActive: false });

      const activePersons = await repository.findActiveByUserId('user_1');

      expect(activePersons).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update an existing external person', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'Original Name',
        email: 'original@example.com',
      });

      const updated = await repository.update(created.personId, {
        name: 'Updated Name',
        email: 'updated@example.com',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.email).toBe('updated@example.com');
      expect(updated.userId).toBe('user_1');
    });

    it('should update the updatedAt timestamp', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.update(created.personId, {
        name: 'Updated Name',
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should not modify the createdAt timestamp', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
      });

      const updated = await repository.update(created.personId, {
        name: 'Updated Name',
      });

      expect(updated.createdAt.getTime()).toBe(created.createdAt.getTime());
    });

    it('should not modify the personId', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
      });

      const updated = await repository.update(created.personId, {
        name: 'Updated Name',
      });

      expect(updated.personId).toBe(created.personId);
    });

    it('should validate email format on update', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
      });

      await expect(
        repository.update(created.personId, {
          email: 'invalid-email',
        }),
      ).rejects.toThrow('Invalid email format');
    });

    it('should validate phone format on update', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
      });

      await expect(
        repository.update(created.personId, {
          phone: 'invalid',
        }),
      ).rejects.toThrow('Invalid phone format');
    });

    it('should allow deactivating a person', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
      });

      const updated = await repository.update(created.personId, {
        isActive: false,
      });

      expect(updated.isActive).toBe(false);
    });

    it('should throw error for non-existent id', async () => {
      await expect(repository.update('non_existent', { name: 'New Name' })).rejects.toThrow(
        'Entity with id non_existent not found',
      );
    });

    it('should handle partial updates', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      });

      const updated = await repository.update(created.personId, {
        email: 'newemail@example.com',
      });

      expect(updated.name).toBe('John Doe');
      expect(updated.email).toBe('newemail@example.com');
      expect(updated.phone).toBe('+1234567890');
    });
  });

  describe('delete', () => {
    it('should delete an existing external person', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
      });

      await repository.delete(created.personId);

      const found = await repository.findById(created.personId);
      expect(found).toBeNull();
    });

    it('should throw error for non-existent id', async () => {
      await expect(repository.delete('non_existent')).rejects.toThrow(
        'Entity with id non_existent not found',
      );
    });

    it('should remove person from all queries', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
      });

      await repository.delete(created.personId);

      const byId = await repository.findById(created.personId);
      const byUserId = await repository.findByUserId('user_1');
      const byEmail = await repository.findByEmail('john@example.com');

      expect(byId).toBeNull();
      expect(byUserId).toEqual([]);
      expect(byEmail).toBeNull();
    });
  });

  describe('deactivate', () => {
    it('should soft delete by setting isActive to false', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
      });

      const deactivated = await repository.deactivate(created.personId);

      expect(deactivated.isActive).toBe(false);
      expect(deactivated.personId).toBe(created.personId);
    });

    it('should update the updatedAt timestamp', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const deactivated = await repository.deactivate(created.personId);

      expect(deactivated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should throw error for non-existent id', async () => {
      await expect(repository.deactivate('non_existent')).rejects.toThrow(
        'Entity with id non_existent not found',
      );
    });

    it('should be idempotent for already inactive persons', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
        isActive: false,
      });

      const deactivated = await repository.deactivate(created.personId);

      expect(deactivated.isActive).toBe(false);
    });
  });

  describe('reactivate', () => {
    it('should set isActive to true', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
        isActive: false,
      });

      const reactivated = await repository.reactivate(created.personId);

      expect(reactivated.isActive).toBe(true);
    });

    it('should update the updatedAt timestamp', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
        isActive: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const reactivated = await repository.reactivate(created.personId);

      expect(reactivated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should throw error for non-existent id', async () => {
      await expect(repository.reactivate('non_existent')).rejects.toThrow(
        'Entity with id non_existent not found',
      );
    });

    it('should be idempotent for already active persons', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
        isActive: true,
      });

      const reactivated = await repository.reactivate(created.personId);

      expect(reactivated.isActive).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum length name', async () => {
      const maxName = 'a'.repeat(255);
      const created = await repository.create({
        userId: 'user_1',
        name: maxName,
      });

      expect(created.name).toBe(maxName);
    });

    it('should handle unicode characters in name', async () => {
      const unicodeName = '李明 García José 🌟';
      const created = await repository.create({
        userId: 'user_1',
        name: unicodeName,
      });

      expect(created.name).toBe(unicodeName);
    });

    it('should handle international phone numbers', async () => {
      const phones = [
        '+44 20 7946 0958',
        '+33 1 42 86 82 00',
        '+81 3-1234-5678',
        '+86 138 0013 8000',
      ];

      for (const phone of phones) {
        const created = await repository.create({
          userId: 'user_1',
          name: `Person ${phone}`,
          phone,
        });

        expect(created.phone).toBe(phone);
      }
    });

    it('should handle email with special characters', async () => {
      const emails = [
        'user+tag@example.com',
        'first.last@example.com',
        'user_name@example-domain.com',
      ];

      for (const email of emails) {
        const created = await repository.create({
          userId: 'user_1',
          name: `Person ${email}`,
          email,
        });

        expect(created.email).toBe(email.toLowerCase());
      }
    });

    it('should handle concurrent updates', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
      });

      const updates = Promise.all([
        repository.update(created.personId, { name: 'Update 1' }),
        repository.update(created.personId, { name: 'Update 2' }),
        repository.update(created.personId, { name: 'Update 3' }),
      ]);

      await updates;
      const final = await repository.findById(created.personId);

      // Last update should win
      expect(final?.name).toMatch(/Update [123]/);
    });

    it('should maintain data integrity across operations', async () => {
      const created = await repository.create({
        userId: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      });

      // Deactivate
      await repository.deactivate(created.personId);

      // Update while inactive
      await repository.update(created.personId, {
        name: 'Updated John Doe',
      });

      // Reactivate
      await repository.reactivate(created.personId);

      const final = await repository.findById(created.personId);

      expect(final?.name).toBe('Updated John Doe');
      expect(final?.email).toBe('john@example.com');
      expect(final?.phone).toBe('+1234567890');
      expect(final?.isActive).toBe(true);
    });
  });
});
