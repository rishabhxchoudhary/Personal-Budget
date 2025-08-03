import { InMemoryRepository } from './in-memory-repository';

// Test entity type
interface TestEntity {
  id: string;
  name: string;
  value: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Test repository implementation
class TestRepository extends InMemoryRepository<TestEntity> {
  protected getEntityId(entity: TestEntity): string {
    return entity.id;
  }
}

describe('InMemoryRepository', () => {
  let repository: TestRepository;

  beforeEach(() => {
    repository = new TestRepository();
  });

  describe('create', () => {
    it('should create a new entity with timestamps', async () => {
      const input = {
        id: 'test-1',
        name: 'Test Entity',
        value: 100,
        isActive: true,
      };

      const result = await repository.create(input);

      expect(result.id).toBe('test-1');
      expect(result.name).toBe('Test Entity');
      expect(result.value).toBe(100);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.createdAt).toEqual(result.updatedAt);
    });

    it('should store multiple entities', async () => {
      const entity1 = await repository.create({
        id: 'test-1',
        name: 'Entity 1',
        value: 100,
        isActive: true,
      });

      const entity2 = await repository.create({
        id: 'test-2',
        name: 'Entity 2',
        value: 200,
        isActive: false,
      });

      const all = await repository.findAll();
      expect(all).toHaveLength(2);
      expect(all).toContainEqual(entity1);
      expect(all).toContainEqual(entity2);
    });

    it('should reject duplicate ids', async () => {
      await repository.create({
        id: 'test-1',
        name: 'Original',
        value: 100,
        isActive: true,
      });

      await expect(
        repository.create({
          id: 'test-1',
          name: 'Duplicate',
          value: 200,
          isActive: false,
        }),
      ).rejects.toThrow('Entity with id test-1 already exists');
    });

    it('should create a deep copy of the entity', async () => {
      const input = {
        id: 'test-1',
        name: 'Test Entity',
        value: 100,
        isActive: true,
      };

      await repository.create(input);

      // Modify the input object
      input.name = 'Modified Name';
      input.value = 999;

      // The stored entity should not be affected
      const found = await repository.findById('test-1');
      expect(found?.name).toBe('Test Entity');
      expect(found?.value).toBe(100);
    });
  });

  describe('findById', () => {
    it('should find entity by id', async () => {
      const created = await repository.create({
        id: 'test-1',
        name: 'Test Entity',
        value: 100,
        isActive: true,
      });

      const found = await repository.findById('test-1');

      expect(found).toBeDefined();
      expect(found).toEqual(created);
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non-existent');
      expect(found).toBeNull();
    });

    it('should return a copy of the entity', async () => {
      await repository.create({
        id: 'test-1',
        name: 'Test Entity',
        value: 100,
        isActive: true,
      });

      const found1 = await repository.findById('test-1');
      const found2 = await repository.findById('test-1');

      expect(found1).toEqual(found2);
      expect(found1).not.toBe(found2); // Different object references
    });
  });

  describe('findAll', () => {
    it('should return empty array when no entities exist', async () => {
      const all = await repository.findAll();
      expect(all).toEqual([]);
    });

    it('should return all entities', async () => {
      const entity1 = await repository.create({
        id: 'test-1',
        name: 'Entity 1',
        value: 100,
        isActive: true,
      });

      const entity2 = await repository.create({
        id: 'test-2',
        name: 'Entity 2',
        value: 200,
        isActive: false,
      });

      const entity3 = await repository.create({
        id: 'test-3',
        name: 'Entity 3',
        value: 300,
        isActive: true,
      });

      const all = await repository.findAll();

      expect(all).toHaveLength(3);
      expect(all).toContainEqual(entity1);
      expect(all).toContainEqual(entity2);
      expect(all).toContainEqual(entity3);
    });

    it('should return copies of entities', async () => {
      await repository.create({
        id: 'test-1',
        name: 'Entity 1',
        value: 100,
        isActive: true,
      });

      const all1 = await repository.findAll();
      const all2 = await repository.findAll();

      expect(all1).toEqual(all2);
      expect(all1[0]).not.toBe(all2[0]); // Different object references
    });

    it('should maintain order of creation', async () => {
      await repository.create({ id: 'c', name: 'C', value: 3, isActive: true });
      await repository.create({ id: 'a', name: 'A', value: 1, isActive: true });
      await repository.create({ id: 'b', name: 'B', value: 2, isActive: true });

      const all = await repository.findAll();

      expect(all[0].id).toBe('c');
      expect(all[1].id).toBe('a');
      expect(all[2].id).toBe('b');
    });
  });

  describe('update', () => {
    it('should update existing entity', async () => {
      const created = await repository.create({
        id: 'test-1',
        name: 'Original Name',
        value: 100,
        isActive: true,
      });

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1));

      const updated = await repository.update('test-1', {
        name: 'Updated Name',
        value: 200,
      });

      expect(updated.id).toBe('test-1');
      expect(updated.name).toBe('Updated Name');
      expect(updated.value).toBe(200);
      expect(updated.isActive).toBe(true); // Unchanged
      expect(updated.createdAt).toEqual(created.createdAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should allow partial updates', async () => {
      await repository.create({
        id: 'test-1',
        name: 'Original Name',
        value: 100,
        isActive: true,
      });

      const updated = await repository.update('test-1', {
        value: 200,
      });

      expect(updated.name).toBe('Original Name'); // Unchanged
      expect(updated.value).toBe(200); // Updated
      expect(updated.isActive).toBe(true); // Unchanged
    });

    it('should throw error for non-existent entity', async () => {
      await expect(repository.update('non-existent', { name: 'New Name' })).rejects.toThrow(
        'Entity with id non-existent not found',
      );
    });

    it('should not allow updating id', async () => {
      await repository.create({
        id: 'test-1',
        name: 'Test Entity',
        value: 100,
        isActive: true,
      });

      const updated = await repository.update('test-1', {
        id: 'new-id',
        name: 'Updated Name',
      });

      expect(updated.id).toBe('test-1'); // ID should remain unchanged
      expect(updated.name).toBe('Updated Name');
    });

    it('should not allow updating timestamps directly', async () => {
      const created = await repository.create({
        id: 'test-1',
        name: 'Test Entity',
        value: 100,
        isActive: true,
      });

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1));

      const fakeDate = new Date('2020-01-01');
      const updated = await repository.update('test-1', {
        createdAt: fakeDate,
        updatedAt: fakeDate,
        name: 'Updated Name',
      });

      expect(updated.createdAt).toEqual(created.createdAt); // Unchanged
      expect(updated.updatedAt).not.toEqual(fakeDate); // Auto-updated
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });
  });

  describe('delete', () => {
    it('should delete existing entity', async () => {
      await repository.create({
        id: 'test-1',
        name: 'Test Entity',
        value: 100,
        isActive: true,
      });

      await repository.delete('test-1');

      const found = await repository.findById('test-1');
      expect(found).toBeNull();

      const all = await repository.findAll();
      expect(all).toHaveLength(0);
    });

    it('should throw error for non-existent entity', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow(
        'Entity with id non-existent not found',
      );
    });

    it('should only delete the specified entity', async () => {
      await repository.create({
        id: 'test-1',
        name: 'Entity 1',
        value: 100,
        isActive: true,
      });

      const entity2 = await repository.create({
        id: 'test-2',
        name: 'Entity 2',
        value: 200,
        isActive: false,
      });

      await repository.delete('test-1');

      const all = await repository.findAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toEqual(entity2);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent creates safely', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        repository.create({
          id: `test-${i}`,
          name: `Entity ${i}`,
          value: i * 100,
          isActive: i % 2 === 0,
        }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      const all = await repository.findAll();
      expect(all).toHaveLength(10);
    });

    it('should handle mixed concurrent operations', async () => {
      // Create initial entities
      await repository.create({ id: 'test-1', name: 'Entity 1', value: 100, isActive: true });
      await repository.create({ id: 'test-2', name: 'Entity 2', value: 200, isActive: false });
      await repository.create({ id: 'test-3', name: 'Entity 3', value: 300, isActive: true });

      // Perform concurrent operations
      const operations = [
        repository.update('test-1', { value: 150 }),
        repository.delete('test-2'),
        repository.create({ id: 'test-4', name: 'Entity 4', value: 400, isActive: false }),
        repository.findById('test-3'),
        repository.findAll(),
      ];

      const results = await Promise.all(operations);
      expect(results).toBeDefined(); // Use results to avoid unused variable warning

      // Verify final state
      const finalAll = await repository.findAll();
      expect(finalAll).toHaveLength(3);
      expect(finalAll.find((e) => e.id === 'test-1')?.value).toBe(150);
      expect(finalAll.find((e) => e.id === 'test-2')).toBeUndefined();
      expect(finalAll.find((e) => e.id === 'test-4')).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty update object', async () => {
      const created = await repository.create({
        id: 'test-1',
        name: 'Test Entity',
        value: 100,
        isActive: true,
      });

      const updated = await repository.update('test-1', {});

      expect(updated).toEqual({
        ...created,
        updatedAt: updated.updatedAt,
      });
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should handle entities with null or undefined values', async () => {
      const entity = await repository.create({
        id: 'test-1',
        name: null as unknown as string,
        value: undefined as unknown as number,
        isActive: true,
      });

      expect(entity.name).toBeNull();
      expect(entity.value).toBeUndefined();

      const found = await repository.findById('test-1');
      expect(found?.name).toBeNull();
      expect(found?.value).toBeUndefined();
    });
  });
});
