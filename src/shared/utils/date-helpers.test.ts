import {
  getMonthString,
  getMonthRange,
  isValidMonth,
  addMonths,
  subtractMonths,
  getMonthStartDate,
  getMonthEndDate,
  isDateInMonth,
  formatDateForDisplay,
  parseMonthString,
} from './date-helpers';

describe('Date Helpers', () => {
  describe('getMonthString', () => {
    it('should format date to YYYY-MM string', () => {
      expect(getMonthString(new Date('2024-01-15'))).toBe('2024-01');
      expect(getMonthString(new Date('2024-12-31'))).toBe('2024-12');
      expect(getMonthString(new Date('2024-06-01'))).toBe('2024-06');
    });

    it('should handle different date formats', () => {
      expect(getMonthString(new Date(2024, 0, 1))).toBe('2024-01'); // January
      expect(getMonthString(new Date(2024, 11, 31))).toBe('2024-12'); // December
    });

    it('should pad single digit months with zero', () => {
      expect(getMonthString(new Date('2024-01-01'))).toBe('2024-01');
      expect(getMonthString(new Date('2024-09-15'))).toBe('2024-09');
      expect(getMonthString(new Date('2024-10-01'))).toBe('2024-10');
    });

    it('should handle leap years', () => {
      expect(getMonthString(new Date('2024-02-29'))).toBe('2024-02');
      expect(getMonthString(new Date('2020-02-29'))).toBe('2020-02');
    });

    it('should throw error for invalid date', () => {
      expect(() => getMonthString(new Date('invalid'))).toThrow('Invalid date provided');
      expect(() => getMonthString(null as unknown as Date)).toThrow('Invalid date provided');
      expect(() => getMonthString(undefined as unknown as Date)).toThrow('Invalid date provided');
    });
  });

  describe('getMonthRange', () => {
    it('should return correct date range for a month', () => {
      const range = getMonthRange('2024-01');
      expect(range.start).toEqual(new Date(2024, 0, 1, 0, 0, 0, 0));
      expect(range.end).toEqual(new Date(2024, 0, 31, 23, 59, 59, 999));
    });

    it('should handle different months correctly', () => {
      // February (non-leap year)
      const feb2023 = getMonthRange('2023-02');
      expect(feb2023.start).toEqual(new Date(2023, 1, 1, 0, 0, 0, 0));
      expect(feb2023.end).toEqual(new Date(2023, 1, 28, 23, 59, 59, 999));

      // February (leap year)
      const feb2024 = getMonthRange('2024-02');
      expect(feb2024.start).toEqual(new Date(2024, 1, 1, 0, 0, 0, 0));
      expect(feb2024.end).toEqual(new Date(2024, 1, 29, 23, 59, 59, 999));

      // April (30 days)
      const apr2024 = getMonthRange('2024-04');
      expect(apr2024.start).toEqual(new Date(2024, 3, 1, 0, 0, 0, 0));
      expect(apr2024.end).toEqual(new Date(2024, 3, 30, 23, 59, 59, 999));

      // December (31 days)
      const dec2024 = getMonthRange('2024-12');
      expect(dec2024.start).toEqual(new Date(2024, 11, 1, 0, 0, 0, 0));
      expect(dec2024.end).toEqual(new Date(2024, 11, 31, 23, 59, 59, 999));
    });

    it('should handle year boundaries', () => {
      const jan2025 = getMonthRange('2025-01');
      expect(jan2025.start.getFullYear()).toBe(2025);
      expect(jan2025.end.getFullYear()).toBe(2025);
    });

    it('should throw error for invalid month format', () => {
      expect(() => getMonthRange('2024-13')).toThrow('Invalid month string: 2024-13');
      expect(() => getMonthRange('2024-00')).toThrow('Invalid month string: 2024-00');
      expect(() => getMonthRange('2024/01')).toThrow('Invalid month string: 2024/01');
      expect(() => getMonthRange('24-01')).toThrow('Invalid month string: 24-01');
      expect(() => getMonthRange('2024-1')).toThrow('Invalid month string: 2024-1');
      expect(() => getMonthRange('')).toThrow('Invalid month string: ');
    });
  });

  describe('isValidMonth', () => {
    it('should return true for valid month strings', () => {
      expect(isValidMonth('2024-01')).toBe(true);
      expect(isValidMonth('2024-12')).toBe(true);
      expect(isValidMonth('2000-01')).toBe(true);
      expect(isValidMonth('2999-12')).toBe(true);
    });

    it('should return false for invalid month strings', () => {
      expect(isValidMonth('2024-13')).toBe(false);
      expect(isValidMonth('2024-00')).toBe(false);
      expect(isValidMonth('2024/01')).toBe(false);
      expect(isValidMonth('24-01')).toBe(false);
      expect(isValidMonth('2024-1')).toBe(false);
      expect(isValidMonth('2024-001')).toBe(false);
      expect(isValidMonth('')).toBe(false);
      expect(isValidMonth('2024')).toBe(false);
      expect(isValidMonth('01-2024')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(isValidMonth(null as unknown as string)).toBe(false);
      expect(isValidMonth(undefined as unknown as string)).toBe(false);
      expect(isValidMonth(123 as unknown as string)).toBe(false);
      expect(isValidMonth({} as unknown as string)).toBe(false);
    });
  });

  describe('addMonths', () => {
    it('should add months to a month string', () => {
      expect(addMonths('2024-01', 1)).toBe('2024-02');
      expect(addMonths('2024-01', 11)).toBe('2024-12');
      expect(addMonths('2024-12', 1)).toBe('2025-01');
      expect(addMonths('2024-06', 6)).toBe('2024-12');
    });

    it('should handle negative values', () => {
      expect(addMonths('2024-01', -1)).toBe('2023-12');
      expect(addMonths('2024-06', -6)).toBe('2023-12');
      expect(addMonths('2024-01', -12)).toBe('2023-01');
    });

    it('should handle zero months', () => {
      expect(addMonths('2024-01', 0)).toBe('2024-01');
    });

    it('should handle large month additions', () => {
      expect(addMonths('2024-01', 24)).toBe('2026-01');
      expect(addMonths('2024-01', 100)).toBe('2032-05');
    });

    it('should throw error for invalid month string', () => {
      expect(() => addMonths('invalid', 1)).toThrow('Invalid month string');
    });
  });

  describe('subtractMonths', () => {
    it('should subtract months from a month string', () => {
      expect(subtractMonths('2024-12', 1)).toBe('2024-11');
      expect(subtractMonths('2024-01', 1)).toBe('2023-12');
      expect(subtractMonths('2024-06', 6)).toBe('2023-12');
    });

    it('should handle zero months', () => {
      expect(subtractMonths('2024-01', 0)).toBe('2024-01');
    });

    it('should handle large month subtractions', () => {
      expect(subtractMonths('2024-01', 24)).toBe('2022-01');
      expect(subtractMonths('2024-01', 100)).toBe('2015-09');
    });
  });

  describe('getMonthStartDate', () => {
    it('should return first day of month at midnight', () => {
      const start = getMonthStartDate('2024-01');
      expect(start.getDate()).toBe(1);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });

    it('should handle different months', () => {
      expect(getMonthStartDate('2024-06').getMonth()).toBe(5); // June (0-indexed)
      expect(getMonthStartDate('2024-12').getMonth()).toBe(11); // December
    });
  });

  describe('getMonthEndDate', () => {
    it('should return last day of month at end of day', () => {
      const end = getMonthEndDate('2024-01');
      expect(end.getDate()).toBe(31);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });

    it('should handle months with different days', () => {
      expect(getMonthEndDate('2024-02').getDate()).toBe(29); // Leap year
      expect(getMonthEndDate('2023-02').getDate()).toBe(28); // Non-leap year
      expect(getMonthEndDate('2024-04').getDate()).toBe(30); // April
      expect(getMonthEndDate('2024-12').getDate()).toBe(31); // December
    });
  });

  describe('isDateInMonth', () => {
    it('should return true for dates within the month', () => {
      expect(isDateInMonth(new Date('2024-01-01'), '2024-01')).toBe(true);
      expect(isDateInMonth(new Date('2024-01-15'), '2024-01')).toBe(true);
      expect(isDateInMonth(new Date('2024-01-31'), '2024-01')).toBe(true);
    });

    it('should return false for dates outside the month', () => {
      expect(isDateInMonth(new Date('2023-12-31'), '2024-01')).toBe(false);
      expect(isDateInMonth(new Date('2024-02-01'), '2024-01')).toBe(false);
      expect(isDateInMonth(new Date('2024-01-15'), '2024-02')).toBe(false);
    });

    it('should handle edge cases at month boundaries', () => {
      // Use local dates to avoid timezone issues
      expect(isDateInMonth(new Date(2024, 0, 31, 23, 59, 59, 999), '2024-01')).toBe(true);
      expect(isDateInMonth(new Date(2024, 1, 1, 0, 0, 0, 0), '2024-01')).toBe(false);
    });
  });

  describe('formatDateForDisplay', () => {
    it('should format date in default format', () => {
      expect(formatDateForDisplay(new Date('2024-01-15'))).toBe('Jan 15, 2024');
      expect(formatDateForDisplay(new Date('2024-12-31'))).toBe('Dec 31, 2024');
    });

    it('should support different format options', () => {
      const date = new Date('2024-01-15');
      expect(formatDateForDisplay(date, 'short')).toBe('1/15/24');
      expect(formatDateForDisplay(date, 'long')).toBe('January 15, 2024');
      expect(formatDateForDisplay(date, 'iso')).toBe('2024-01-15');
    });

    it('should handle locale-specific formatting', () => {
      const date = new Date('2024-01-15');
      expect(formatDateForDisplay(date, 'medium', 'en-US')).toBe('Jan 15, 2024');
      expect(formatDateForDisplay(date, 'medium', 'en-GB')).toBe('15 Jan 2024');
    });
  });

  describe('parseMonthString', () => {
    it('should parse valid month strings', () => {
      const result = parseMonthString('2024-01');
      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
    });

    it('should handle different valid month strings', () => {
      expect(parseMonthString('2024-12')).toEqual({ year: 2024, month: 12 });
      expect(parseMonthString('2000-01')).toEqual({ year: 2000, month: 1 });
    });

    it('should throw error for invalid month strings', () => {
      expect(() => parseMonthString('2024-13')).toThrow('Invalid month string');
      expect(() => parseMonthString('invalid')).toThrow('Invalid month string');
    });
  });
});
