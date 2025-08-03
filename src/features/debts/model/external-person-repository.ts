import { ExternalPerson, ExternalPersonRepository } from '@/shared/types/common';
import { InMemoryRepository } from '@/shared/repositories/in-memory-repository';
import {
  validateExternalPerson,
  createExternalPersonId,
  normalizeEmail,
  validateName,
} from './external-person';

export class ExternalPersonRepositoryImpl
  extends InMemoryRepository<
    ExternalPerson,
    Omit<ExternalPerson, 'createdAt' | 'updatedAt' | 'personId' | 'isActive'> & {
      personId?: string;
      isActive?: boolean;
    }
  >
  implements ExternalPersonRepository
{
  protected getEntityId(entity: ExternalPerson): string {
    return entity.personId;
  }

  async create(
    item: Omit<ExternalPerson, 'createdAt' | 'updatedAt' | 'personId' | 'isActive'> & {
      personId?: string;
      isActive?: boolean;
    }
  ): Promise<ExternalPerson> {
    validateExternalPerson(item);

    const personId = item.personId || createExternalPersonId();
    const normalizedItem = {
      ...item,
      personId,
      name: validateName(item.name),
      email: item.email ? normalizeEmail(item.email) : undefined,
      isActive: item.isActive !== undefined ? item.isActive : true,
    };

    return super.create(normalizedItem);
  }

  async findByUserId(userId: string): Promise<ExternalPerson[]> {
    const all = await this.findAll();
    return all.filter((person) => person.userId === userId);
  }

  async findByEmail(email: string): Promise<ExternalPerson | null> {
    if (!email) return null;

    const normalized = normalizeEmail(email);
    const all = await this.findAll();

    return all.find((person) =>
      person.email && normalizeEmail(person.email) === normalized
    ) || null;
  }

  async findActiveByUserId(userId: string): Promise<ExternalPerson[]> {
    const userPersons = await this.findByUserId(userId);
    return userPersons.filter((person) => person.isActive);
  }

  async update(
    id: string,
    updates: Partial<ExternalPerson>
  ): Promise<ExternalPerson> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }

    // Validate updates
    if (updates.name !== undefined) {
      updates.name = validateName(updates.name);
    }

    if (updates.email !== undefined && updates.email !== null) {
      validateExternalPerson({ ...existing, email: updates.email });
      updates.email = normalizeEmail(updates.email);
    }

    if (updates.phone !== undefined && updates.phone !== null) {
      validateExternalPerson({ ...existing, phone: updates.phone });
    }

    return super.update(id, updates);
  }

  async deactivate(personId: string): Promise<ExternalPerson> {
    return this.update(personId, { isActive: false });
  }

  async reactivate(personId: string): Promise<ExternalPerson> {
    return this.update(personId, { isActive: true });
  }
}
