import {
  toMinorUnits,
  toMajorUnits,
  formatMoney,
  addMoney,
  subtractMoney,
  isValidCurrency,
  getCurrencyDecimals,
} from './money';

describe('Money Utilities', () => {
  describe('toMinorUnits', () => {
    it('should convert USD major units to minor units', () => {
      expect(toMinorUnits(10.5, 'USD')).toBe(1050);
      expect(toMinorUnits(100, 'USD')).toBe(10000);
      expect(toMinorUnits(0.01, 'USD')).toBe(1);
      expect(toMinorUnits(0, 'USD')).toBe(0);
    });

    it('should handle negative amounts', () => {
      expect(toMinorUnits(-10.5, 'USD')).toBe(-1050);
      expect(toMinorUnits(-0.01, 'USD')).toBe(-1);
    });

    it('should handle currencies with different decimal places', () => {
      expect(toMinorUnits(1000, 'JPY')).toBe(1000); // No decimals
      expect(toMinorUnits(10.123, 'KWD')).toBe(10123); // 3 decimals
    });

    it('should round to nearest minor unit', () => {
      expect(toMinorUnits(10.999, 'USD')).toBe(1100);
      expect(toMinorUnits(10.994, 'USD')).toBe(1099);
      expect(toMinorUnits(10.995, 'USD')).toBe(1100);
    });

    it('should throw error for invalid currency', () => {
      expect(() => toMinorUnits(10, 'INVALID')).toThrow('Invalid currency code: INVALID');
    });

    it('should throw error for non-numeric amounts', () => {
      expect(() => toMinorUnits(NaN, 'USD')).toThrow('Invalid amount: must be a number');
      expect(() => toMinorUnits(Infinity, 'USD')).toThrow('Invalid amount: must be finite');
    });
  });

  describe('toMajorUnits', () => {
    it('should convert USD minor units to major units', () => {
      expect(toMajorUnits(1050, 'USD')).toBe(10.5);
      expect(toMajorUnits(10000, 'USD')).toBe(100);
      expect(toMajorUnits(1, 'USD')).toBe(0.01);
      expect(toMajorUnits(0, 'USD')).toBe(0);
    });

    it('should handle negative amounts', () => {
      expect(toMajorUnits(-1050, 'USD')).toBe(-10.5);
      expect(toMajorUnits(-1, 'USD')).toBe(-0.01);
    });

    it('should handle currencies with different decimal places', () => {
      expect(toMajorUnits(1000, 'JPY')).toBe(1000); // No decimals
      expect(toMajorUnits(10123, 'KWD')).toBe(10.123); // 3 decimals
    });

    it('should throw error for invalid currency', () => {
      expect(() => toMajorUnits(1000, 'INVALID')).toThrow('Invalid currency code: INVALID');
    });

    it('should throw error for non-integer minor units', () => {
      expect(() => toMajorUnits(10.5, 'USD')).toThrow('Minor units must be an integer');
    });
  });

  describe('formatMoney', () => {
    it('should format USD amounts correctly', () => {
      expect(formatMoney(1050, 'USD')).toBe('$10.50');
      expect(formatMoney(10000, 'USD')).toBe('$100.00');
      expect(formatMoney(0, 'USD')).toBe('$0.00');
      expect(formatMoney(1, 'USD')).toBe('$0.01');
    });

    it('should format negative amounts with minus sign', () => {
      expect(formatMoney(-1050, 'USD')).toBe('-$10.50');
      expect(formatMoney(-1, 'USD')).toBe('-$0.01');
    });

    it('should format different currencies correctly', () => {
      expect(formatMoney(1000, 'EUR')).toBe('€10.00');
      expect(formatMoney(1000, 'GBP')).toBe('£10.00');
      expect(formatMoney(1000, 'JPY')).toBe('¥1,000');
      expect(formatMoney(123456789, 'USD')).toBe('$1,234,567.89');
    });

    it('should use locale-specific formatting when provided', () => {
      expect(formatMoney(1050, 'USD', 'en-US')).toBe('$10.50');
      // Note: Intl.NumberFormat may use non-breaking spaces in some locales
      expect(formatMoney(1050, 'EUR', 'de-DE')).toMatch(/10,50\s*€/);
      expect(formatMoney(1050, 'EUR', 'fr-FR')).toMatch(/10,50\s*€/);
    });

    it('should handle large numbers', () => {
      expect(formatMoney(999999999, 'USD')).toBe('$9,999,999.99');
    });

    it('should throw error for invalid currency', () => {
      expect(() => formatMoney(1000, 'INVALID')).toThrow('Invalid currency code: INVALID');
    });
  });

  describe('addMoney', () => {
    it('should add two money amounts', () => {
      expect(addMoney(1050, 500)).toBe(1550);
      expect(addMoney(0, 1000)).toBe(1000);
      expect(addMoney(-500, 1000)).toBe(500);
    });

    it('should handle negative results', () => {
      expect(addMoney(-1000, 500)).toBe(-500);
      expect(addMoney(-1000, -500)).toBe(-1500);
    });

    it('should handle zero amounts', () => {
      expect(addMoney(0, 0)).toBe(0);
      expect(addMoney(1000, 0)).toBe(1000);
    });
  });

  describe('subtractMoney', () => {
    it('should subtract two money amounts', () => {
      expect(subtractMoney(1050, 500)).toBe(550);
      expect(subtractMoney(1000, 0)).toBe(1000);
      expect(subtractMoney(500, 1000)).toBe(-500);
    });

    it('should handle negative amounts', () => {
      expect(subtractMoney(-1000, 500)).toBe(-1500);
      expect(subtractMoney(-1000, -500)).toBe(-500);
      expect(subtractMoney(1000, -500)).toBe(1500);
    });

    it('should handle zero amounts', () => {
      expect(subtractMoney(0, 0)).toBe(0);
      expect(subtractMoney(0, 1000)).toBe(-1000);
    });
  });

  describe('isValidCurrency', () => {
    it('should validate common currency codes', () => {
      expect(isValidCurrency('USD')).toBe(true);
      expect(isValidCurrency('EUR')).toBe(true);
      expect(isValidCurrency('GBP')).toBe(true);
      expect(isValidCurrency('JPY')).toBe(true);
      expect(isValidCurrency('CAD')).toBe(true);
      expect(isValidCurrency('AUD')).toBe(true);
    });

    it('should reject invalid currency codes', () => {
      expect(isValidCurrency('INVALID')).toBe(false);
      expect(isValidCurrency('US')).toBe(false);
      expect(isValidCurrency('USDD')).toBe(false);
      expect(isValidCurrency('')).toBe(false);
      expect(isValidCurrency('123')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isValidCurrency('usd')).toBe(false);
      expect(isValidCurrency('Usd')).toBe(false);
    });
  });

  describe('getCurrencyDecimals', () => {
    it('should return correct decimal places for currencies', () => {
      expect(getCurrencyDecimals('USD')).toBe(2);
      expect(getCurrencyDecimals('EUR')).toBe(2);
      expect(getCurrencyDecimals('JPY')).toBe(0);
      expect(getCurrencyDecimals('KWD')).toBe(3);
    });

    it('should throw error for invalid currency', () => {
      expect(() => getCurrencyDecimals('INVALID')).toThrow('Invalid currency code: INVALID');
    });
  });
});
