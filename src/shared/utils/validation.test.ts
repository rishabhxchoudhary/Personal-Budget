import {
  validateEmail,
  validateCurrency,
  validatePercentage,
  validateMonthStartDay,
  validatePositiveInteger,
  validateNonEmptyString,
  validateDateString,
  validatePhoneNumber,
} from './validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@example.com')).toBe(true);
      expect(validateEmail('test+filter@example.com')).toBe(true);
      expect(validateEmail('user123@example.co.uk')).toBe(true);
      expect(validateEmail('user_name@example-domain.com')).toBe(true);
      expect(validateEmail('a@b.c')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
      expect(validateEmail('user@example')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('user@exam ple.com')).toBe(false);
      expect(validateEmail('user@@example.com')).toBe(false);
      expect(validateEmail('user.example.com')).toBe(false);
    });

    it('should reject emails with invalid characters', () => {
      expect(validateEmail('user<>@example.com')).toBe(false);
      expect(validateEmail('user()@example.com')).toBe(false);
      expect(validateEmail('user[at]example.com')).toBe(false);
      expect(validateEmail('user;@example.com')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(validateEmail(null as unknown as string)).toBe(false);
      expect(validateEmail(undefined as unknown as string)).toBe(false);
      expect(validateEmail(123 as unknown as string)).toBe(false);
      expect(validateEmail({} as unknown as string)).toBe(false);
    });
  });

  describe('validateCurrency', () => {
    it('should validate supported currency codes', () => {
      expect(validateCurrency('USD')).toBe(true);
      expect(validateCurrency('EUR')).toBe(true);
      expect(validateCurrency('GBP')).toBe(true);
      expect(validateCurrency('JPY')).toBe(true);
      expect(validateCurrency('CAD')).toBe(true);
      expect(validateCurrency('AUD')).toBe(true);
      expect(validateCurrency('CHF')).toBe(true);
      expect(validateCurrency('CNY')).toBe(true);
      expect(validateCurrency('INR')).toBe(true);
    });

    it('should reject invalid currency codes', () => {
      expect(validateCurrency('')).toBe(false);
      expect(validateCurrency('INVALID')).toBe(false);
      expect(validateCurrency('US')).toBe(false);
      expect(validateCurrency('USDD')).toBe(false);
      expect(validateCurrency('123')).toBe(false);
      expect(validateCurrency('usd')).toBe(false); // Case sensitive
      expect(validateCurrency('Usd')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(validateCurrency(null as unknown as string)).toBe(false);
      expect(validateCurrency(undefined as unknown as string)).toBe(false);
      expect(validateCurrency(123 as unknown as string)).toBe(false);
      expect(validateCurrency({} as unknown as string)).toBe(false);
    });
  });

  describe('validatePercentage', () => {
    it('should validate percentages between 0 and 100', () => {
      expect(validatePercentage(0)).toBe(true);
      expect(validatePercentage(50)).toBe(true);
      expect(validatePercentage(100)).toBe(true);
      expect(validatePercentage(0.5)).toBe(true);
      expect(validatePercentage(99.99)).toBe(true);
      expect(validatePercentage(1)).toBe(true);
    });

    it('should reject invalid percentages', () => {
      expect(validatePercentage(-1)).toBe(false);
      expect(validatePercentage(-0.01)).toBe(false);
      expect(validatePercentage(100.01)).toBe(false);
      expect(validatePercentage(101)).toBe(false);
      expect(validatePercentage(1000)).toBe(false);
    });

    it('should handle non-numeric inputs', () => {
      expect(validatePercentage(NaN)).toBe(false);
      expect(validatePercentage(Infinity)).toBe(false);
      expect(validatePercentage(-Infinity)).toBe(false);
      expect(validatePercentage('50' as unknown as number)).toBe(false);
      expect(validatePercentage(null as unknown as number)).toBe(false);
      expect(validatePercentage(undefined as unknown as number)).toBe(false);
    });

    it('should handle decimal precision', () => {
      expect(validatePercentage(33.33)).toBe(true);
      expect(validatePercentage(66.666)).toBe(true);
      expect(validatePercentage(0.0001)).toBe(true);
    });
  });

  describe('validateMonthStartDay', () => {
    it('should validate days 1-31', () => {
      expect(validateMonthStartDay(1)).toBe(true);
      expect(validateMonthStartDay(15)).toBe(true);
      expect(validateMonthStartDay(28)).toBe(true);
      expect(validateMonthStartDay(31)).toBe(true);
    });

    it('should reject invalid days', () => {
      expect(validateMonthStartDay(0)).toBe(false);
      expect(validateMonthStartDay(32)).toBe(false);
      expect(validateMonthStartDay(-1)).toBe(false);
      expect(validateMonthStartDay(100)).toBe(false);
    });

    it('should reject non-integer values', () => {
      expect(validateMonthStartDay(1.5)).toBe(false);
      expect(validateMonthStartDay(15.99)).toBe(false);
      expect(validateMonthStartDay(NaN)).toBe(false);
      expect(validateMonthStartDay(Infinity)).toBe(false);
    });

    it('should handle non-numeric inputs', () => {
      expect(validateMonthStartDay('15' as unknown as number)).toBe(false);
      expect(validateMonthStartDay(null as unknown as number)).toBe(false);
      expect(validateMonthStartDay(undefined as unknown as number)).toBe(false);
    });
  });

  describe('validatePositiveInteger', () => {
    it('should validate positive integers', () => {
      expect(validatePositiveInteger(1)).toBe(true);
      expect(validatePositiveInteger(100)).toBe(true);
      expect(validatePositiveInteger(999999)).toBe(true);
      expect(validatePositiveInteger(Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    it('should reject zero and negative numbers', () => {
      expect(validatePositiveInteger(0)).toBe(false);
      expect(validatePositiveInteger(-1)).toBe(false);
      expect(validatePositiveInteger(-100)).toBe(false);
    });

    it('should reject non-integer values', () => {
      expect(validatePositiveInteger(1.5)).toBe(false);
      expect(validatePositiveInteger(99.99)).toBe(false);
      expect(validatePositiveInteger(Math.PI)).toBe(false);
    });

    it('should handle invalid numeric values', () => {
      expect(validatePositiveInteger(NaN)).toBe(false);
      expect(validatePositiveInteger(Infinity)).toBe(false);
      expect(validatePositiveInteger(-Infinity)).toBe(false);
    });

    it('should handle non-numeric inputs', () => {
      expect(validatePositiveInteger('123' as unknown as number)).toBe(false);
      expect(validatePositiveInteger(null as unknown as number)).toBe(false);
      expect(validatePositiveInteger(undefined as unknown as number)).toBe(false);
    });
  });

  describe('validateNonEmptyString', () => {
    it('should validate non-empty strings', () => {
      expect(validateNonEmptyString('hello')).toBe(true);
      expect(validateNonEmptyString('a')).toBe(true);
      expect(validateNonEmptyString('multiple words')).toBe(true);
      expect(validateNonEmptyString('  trimmed  ')).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(validateNonEmptyString('')).toBe(false);
      expect(validateNonEmptyString('   ')).toBe(false);
      expect(validateNonEmptyString('\t')).toBe(false);
      expect(validateNonEmptyString('\n')).toBe(false);
      expect(validateNonEmptyString('\r\n')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(validateNonEmptyString(null as unknown as string)).toBe(false);
      expect(validateNonEmptyString(undefined as unknown as string)).toBe(false);
      expect(validateNonEmptyString(123 as unknown as string)).toBe(false);
      expect(validateNonEmptyString({} as unknown as string)).toBe(false);
      expect(validateNonEmptyString([] as unknown as string)).toBe(false);
    });

    it('should handle strings with special characters', () => {
      expect(validateNonEmptyString('!@#$%')).toBe(true);
      expect(validateNonEmptyString('🎉')).toBe(true);
      expect(validateNonEmptyString('line\nbreak')).toBe(true);
    });
  });

  describe('validateDateString', () => {
    it('should validate ISO date strings', () => {
      expect(validateDateString('2024-01-15')).toBe(true);
      expect(validateDateString('2024-12-31')).toBe(true);
      expect(validateDateString('2020-02-29')).toBe(true); // Leap year
      expect(validateDateString('2000-01-01')).toBe(true);
    });

    it('should reject invalid date formats', () => {
      expect(validateDateString('2024/01/15')).toBe(false);
      expect(validateDateString('15-01-2024')).toBe(false);
      expect(validateDateString('2024-1-15')).toBe(false);
      expect(validateDateString('2024-01-5')).toBe(false);
      expect(validateDateString('24-01-15')).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(validateDateString('2024-13-01')).toBe(false); // Invalid month
      expect(validateDateString('2024-00-15')).toBe(false); // Invalid month
      expect(validateDateString('2024-01-32')).toBe(false); // Invalid day
      expect(validateDateString('2024-01-00')).toBe(false); // Invalid day
      expect(validateDateString('2023-02-29')).toBe(false); // Not a leap year
      expect(validateDateString('2024-04-31')).toBe(false); // April has 30 days
    });

    it('should handle non-string inputs', () => {
      expect(validateDateString(null as unknown as string)).toBe(false);
      expect(validateDateString(undefined as unknown as string)).toBe(false);
      expect(validateDateString(123 as unknown as string)).toBe(false);
      expect(validateDateString(new Date() as unknown as string)).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate common phone number formats', () => {
      expect(validatePhoneNumber('+1234567890')).toBe(true);
      expect(validatePhoneNumber('+12345678901')).toBe(true);
      expect(validatePhoneNumber('+441234567890')).toBe(true);
      expect(validatePhoneNumber('+8612345678901')).toBe(true);
    });

    it('should validate phone numbers with spaces and dashes', () => {
      expect(validatePhoneNumber('+1 234 567 8901')).toBe(true);
      expect(validatePhoneNumber('+1-234-567-8901')).toBe(true);
      expect(validatePhoneNumber('+44 20 1234 5678')).toBe(true);
    });

    it('should validate phone numbers with parentheses', () => {
      expect(validatePhoneNumber('+1 (234) 567-8901')).toBe(true);
      expect(validatePhoneNumber('(234) 567-8901')).toBe(true);
    });

    it('should validate local formats without country code', () => {
      expect(validatePhoneNumber('1234567890')).toBe(true);
      expect(validatePhoneNumber('123-456-7890')).toBe(true);
      expect(validatePhoneNumber('(123) 456-7890')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber('123')).toBe(false); // Too short
      expect(validatePhoneNumber('abc-def-ghij')).toBe(false);
      expect(validatePhoneNumber('++1234567890')).toBe(false);
      expect(validatePhoneNumber('+1234567890123456789')).toBe(false); // Too long
    });

    it('should handle non-string inputs', () => {
      expect(validatePhoneNumber(null as unknown as string)).toBe(false);
      expect(validatePhoneNumber(undefined as unknown as string)).toBe(false);
      expect(validatePhoneNumber(1234567890 as unknown as string)).toBe(false);
      expect(validatePhoneNumber({} as unknown as string)).toBe(false);
    });
  });
});
