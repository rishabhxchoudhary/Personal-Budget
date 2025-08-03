import { Repository } from '@/shared/types/common';

export abstract class InMemoryRepository<
  T extends { createdAt: Date; updatedAt: Date },
  TCreateInput = Omit<T, 'createdAt' | 'updatedAt'>,
> implements Repository<T, TCreateInput>
{
  private store: Map<string, T> = new Map();
  private insertionOrder: string[] = [];

  protected abstract getEntityId(entity: T): string;

  async create(item: TCreateInput): Promise<T> {
    const now = new Date();
    const entity = {
      ...this.deepCopy(item),
      createdAt: now,
      updatedAt: now,
    } as unknown as T;

    const id = this.getEntityId(entity);

    if (this.store.has(id)) {
      throw new Error(`Entity with id ${id} already exists`);
    }

    this.store.set(id, entity);
    this.insertionOrder.push(id);

    return this.deepCopy(entity);
  }

  async findById(id: string): Promise<T | null> {
    const entity = this.store.get(id);
    return entity ? this.deepCopy(entity) : null;
  }

  async findAll(): Promise<T[]> {
    const result: T[] = [];

    for (const id of this.insertionOrder) {
      const entity = this.store.get(id);
      if (entity) {
        result.push(this.deepCopy(entity));
      }
    }

    return result;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }

    // Filter out id, createdAt, and updatedAt from updates
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      id: _id,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdAt: _createdAt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updatedAt: _updatedAt,
      ...safeUpdates
    } = updates as Partial<T> & { id?: string; createdAt?: Date; updatedAt?: Date };

    const updated = {
      ...existing,
      ...safeUpdates,
      updatedAt: new Date(),
    };

    this.store.set(id, updated);

    return this.deepCopy(updated);
  }

  async delete(id: string): Promise<void> {
    if (!this.store.has(id)) {
      throw new Error(`Entity with id ${id} not found`);
    }

    this.store.delete(id);
    const index = this.insertionOrder.indexOf(id);
    if (index > -1) {
      this.insertionOrder.splice(index, 1);
    }
  }

  private deepCopy<U>(obj: U): U {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as U;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepCopy(item)) as unknown as U;
    }

    const cloned = {} as U;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepCopy(obj[key]);
      }
    }

    return cloned;
  }
}
