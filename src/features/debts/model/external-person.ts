import { ExternalPerson } from '@/shared/types/common';

// Email validation regex - basic email format
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex - supports international formats
const PHONE_REGEX = /^[\+]?[0-9\s\-\(\)\.]{7,25}$/;

// Maximum name length
const MAX_NAME_LENGTH = 255;

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function validatePhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

export function validateName(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('Name cannot be empty');
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Name cannot exceed ${MAX_NAME_LENGTH} characters`);
  }

  return trimmed;
}

export function validateUserId(userId: string): void {
  if (!userId || !userId.trim()) {
    throw new Error('UserId is required');
  }
}

export function createExternalPersonId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `person_${timestamp}_${random}`;
}

export function validateExternalPerson(person: Partial<ExternalPerson>): void {
  if (!person.userId) {
    throw new Error('UserId is required');
  }

  if (!person.name) {
    throw new Error('Name is required');
  }

  validateUserId(person.userId);
  validateName(person.name);

  if (person.email && !validateEmail(person.email)) {
    throw new Error('Invalid email format');
  }

  if (person.phone && !validatePhone(person.phone)) {
    throw new Error('Invalid phone format');
  }
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function createDefaultExternalPerson(
  input: Omit<ExternalPerson, 'personId' | 'isActive' | 'createdAt' | 'updatedAt'>,
): Omit<ExternalPerson, 'createdAt' | 'updatedAt'> {
  return {
    personId: createExternalPersonId(),
    userId: input.userId,
    name: validateName(input.name),
    email: input.email ? normalizeEmail(input.email) : undefined,
    phone: input.phone,
    isActive: true,
  };
}
