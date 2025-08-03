import { InMemoryRepository } from '@/shared/repositories/in-memory-repository';
import { User, UserRepository as IUserRepository } from '@/shared/types/common';
import { createUser, validateUser, UserValidationError, CreateUserInput } from './user';

export class UserRepository
  extends InMemoryRepository<User, CreateUserInput>
  implements IUserRepository
{
  private emailIndex: Map<string, string> = new Map(); // email -> userId

  protected getEntityId(entity: User): string {
    return entity.userId;
  }

  async create(item: CreateUserInput): Promise<User> {
    // Create user using the factory function
    const user = createUser(item);

    // Validate the user
    const validation = validateUser(user);
    if (!validation.isValid) {
      throw new UserValidationError(validation.errors);
    }

    // Check for duplicate email
    const normalizedEmail = user.email.toLowerCase();
    if (this.emailIndex.has(normalizedEmail)) {
      throw new Error(`User with email ${normalizedEmail} already exists`);
    }

    // Create the user
    const created = await super.create(user);

    // Update email index
    this.emailIndex.set(normalizedEmail, created.userId);

    return created;
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    // Get the existing user
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }

    // Normalize email if provided
    const normalizedUpdates = { ...updates };
    if (updates.email) {
      normalizedUpdates.email = updates.email.toLowerCase().trim();
    }

    // Create the updated user object for validation
    const updatedUser = { ...existing, ...normalizedUpdates };

    // Validate the updated user
    const validation = validateUser(updatedUser);
    if (!validation.isValid) {
      throw new UserValidationError(validation.errors);
    }

    // Check for duplicate email if email is being changed
    if (normalizedUpdates.email && normalizedUpdates.email !== existing.email) {
      const normalizedEmail = normalizedUpdates.email.toLowerCase();
      if (this.emailIndex.has(normalizedEmail)) {
        throw new Error(`User with email ${normalizedEmail} already exists`);
      }
    }

    // Update the user
    const updated = await super.update(id, normalizedUpdates);

    // Update email index if email changed
    if (normalizedUpdates.email && normalizedUpdates.email !== existing.email) {
      this.emailIndex.delete(existing.email.toLowerCase());
      this.emailIndex.set(normalizedUpdates.email.toLowerCase(), id);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    // Get the user to remove from email index
    const user = await this.findById(id);
    if (user) {
      this.emailIndex.delete(user.email.toLowerCase());
    }

    await super.delete(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase();
    const userId = this.emailIndex.get(normalizedEmail);

    if (!userId) {
      return null;
    }

    return this.findById(userId);
  }
}
