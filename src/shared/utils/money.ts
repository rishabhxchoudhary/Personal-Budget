// Currency configuration
const CURRENCY_DECIMALS: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  CAD: 2,
  AUD: 2,
  CHF: 2,
  CNY: 2,
  INR: 2,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  TND: 3,
};

export function isValidCurrency(currency: string): boolean {
  return currency in CURRENCY_DECIMALS;
}

export function getCurrencyDecimals(currency: string): number {
  if (!isValidCurrency(currency)) {
    throw new Error(`Invalid currency code: ${currency}`);
  }
  return CURRENCY_DECIMALS[currency];
}

export function toMinorUnits(major: number, currency: string): number {
  if (!isValidCurrency(currency)) {
    throw new Error(`Invalid currency code: ${currency}`);
  }

  if (typeof major !== 'number' || isNaN(major)) {
    throw new Error('Invalid amount: must be a number');
  }

  if (!isFinite(major)) {
    throw new Error('Invalid amount: must be finite');
  }

  const decimals = getCurrencyDecimals(currency);
  const factor = Math.pow(10, decimals);
  return Math.round(major * factor);
}

export function toMajorUnits(minor: number, currency: string): number {
  if (!isValidCurrency(currency)) {
    throw new Error(`Invalid currency code: ${currency}`);
  }

  if (!Number.isInteger(minor)) {
    throw new Error('Minor units must be an integer');
  }

  const decimals = getCurrencyDecimals(currency);
  const factor = Math.pow(10, decimals);
  return minor / factor;
}

export function formatMoney(minorUnits: number, currency: string, locale?: string): string {
  if (!isValidCurrency(currency)) {
    throw new Error(`Invalid currency code: ${currency}`);
  }

  const majorUnits = toMajorUnits(minorUnits, currency);

  // Use Intl.NumberFormat for proper localization
  const formatter = new Intl.NumberFormat(locale || 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: getCurrencyDecimals(currency),
    maximumFractionDigits: getCurrencyDecimals(currency),
  });

  return formatter.format(majorUnits);
}

export function addMoney(a: number, b: number): number {
  return a + b;
}

export function subtractMoney(a: number, b: number): number {
  return a - b;
}
