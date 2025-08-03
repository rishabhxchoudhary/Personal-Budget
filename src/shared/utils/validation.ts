// Validation utilities for the Personal Budget Manager

export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Additional validation rules
  if (!emailRegex.test(email)) {
    return false;
  }

  // Check for invalid characters
  const invalidChars = /[<>()[\];]/;
  if (invalidChars.test(email)) {
    return false;
  }

  // Check for double @ symbols
  if (email.split('@').length !== 2) {
    return false;
  }

  // Check that domain has at least one dot after @
  const [, domain] = email.split('@');
  if (!domain || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }

  return true;
}

export function validateCurrency(currency: string): boolean {
  if (typeof currency !== 'string') {
    return false;
  }

  // List of supported currencies (matching the ones in money.ts)
  const supportedCurrencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR',
    'KWD', 'BHD', 'OMR', 'TND'
  ];

  return supportedCurrencies.includes(currency);
}

export function validatePercentage(value: number): boolean {
  if (typeof value !== 'number') {
    return false;
  }

  if (isNaN(value) || !isFinite(value)) {
    return false;
  }

  return value >= 0 && value <= 100;
}

export function validateMonthStartDay(day: number): boolean {
  if (typeof day !== 'number') {
    return false;
  }

  if (!Number.isInteger(day)) {
    return false;
  }

  if (isNaN(day) || !isFinite(day)) {
    return false;
  }

  return day >= 1 && day <= 31;
}

export function validatePositiveInteger(value: number): boolean {
  if (typeof value !== 'number') {
    return false;
  }

  if (!Number.isInteger(value)) {
    return false;
  }

  if (isNaN(value) || !isFinite(value)) {
    return false;
  }

  return value > 0;
}

export function validateNonEmptyString(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  return value.trim().length > 0;
}

export function validateDateString(dateStr: string): boolean {
  if (typeof dateStr !== 'string') {
    return false;
  }

  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }

  // Parse components
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Validate month
  if (month < 1 || month > 12) {
    return false;
  }

  // Validate day
  if (day < 1) {
    return false;
  }

  // Check days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) {
    return false;
  }

  return true;
}

export function validatePhoneNumber(phone: string): boolean {
  if (typeof phone !== 'string') {
    return false;
  }

  if (phone.length === 0) {
    return false;
  }

  // Remove spaces, dashes, and parentheses for validation
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Check for valid characters (digits and optional + at start)
  const validCharsRegex = /^\+?\d+$/;
  if (!validCharsRegex.test(cleaned)) {
    return false;
  }

  // Check for double + signs
  if (phone.split('+').length > 2) {
    return false;
  }

  // Minimum length (accounting for country codes)
  if (cleaned.replace(/^\+/, '').length < 7) {
    return false;
  }

  // Maximum length
  if (cleaned.length > 17) {
    return false;
  }

  return true;
}
