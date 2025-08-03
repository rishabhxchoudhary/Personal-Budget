// Date helper utilities for the Personal Budget Manager

export function getMonthString(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  return `${year}-${month.toString().padStart(2, '0')}`;
}

export function isValidMonth(month: string): boolean {
  if (typeof month !== 'string') {
    return false;
  }

  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(month)) {
    return false;
  }

  const [, monthStr] = month.split('-');
  const monthNum = parseInt(monthStr, 10);

  return monthNum >= 1 && monthNum <= 12;
}

export function parseMonthString(month: string): { year: number; month: number } {
  if (!isValidMonth(month)) {
    throw new Error('Invalid month string');
  }

  const [yearStr, monthStr] = month.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
  };
}

export function getMonthStartDate(month: string): Date {
  const { year, month: monthNum } = parseMonthString(month);
  // Create date in local timezone to match test expectations
  return new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
}

export function getMonthEndDate(month: string): Date {
  const { year, month: monthNum } = parseMonthString(month);
  // Get the last day of the month
  const lastDay = new Date(year, monthNum, 0);
  return new Date(year, monthNum - 1, lastDay.getDate(), 23, 59, 59, 999);
}

export function getMonthRange(month: string): { start: Date; end: Date } {
  if (!isValidMonth(month)) {
    throw new Error(`Invalid month string: ${month}`);
  }

  return {
    start: getMonthStartDate(month),
    end: getMonthEndDate(month),
  };
}

export function addMonths(month: string, months: number): string {
  if (!isValidMonth(month)) {
    throw new Error('Invalid month string');
  }

  const { year, month: monthNum } = parseMonthString(month);
  const date = new Date(year, monthNum - 1 + months, 1);

  return getMonthString(date);
}

export function subtractMonths(month: string, months: number): string {
  return addMonths(month, -months);
}

export function isDateInMonth(date: Date, month: string): boolean {
  const range = getMonthRange(month);
  const dateTime = date.getTime();

  return dateTime >= range.start.getTime() && dateTime <= range.end.getTime();
}

export function formatDateForDisplay(
  date: Date,
  format: 'short' | 'medium' | 'long' | 'iso' = 'medium',
  locale: string = 'en-US',
): string {
  switch (format) {
    case 'short':
      return new Intl.DateTimeFormat(locale, {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
      }).format(date);

    case 'medium':
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);

    case 'long':
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);

    case 'iso':
      return date.toISOString().split('T')[0];

    default:
      return formatDateForDisplay(date, 'medium', locale);
  }
}
