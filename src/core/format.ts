const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Formats a byte count as a short, human-readable German string, e.g. "1,5 MB".
 * Uses decimal units (1 KB = 1000 B) like iPadOS does in its storage settings.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '–';
  }
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < UNITS.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 || value >= 100 ? 0 : 1;
  const formatted = new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
  return `${formatted} ${UNITS[unitIndex]}`;
}

const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const MONEY_FORMAT = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** "2007-10-05" → "05.10.2007"; "2026-08" → "08/2026" (calendar dates, no time zone). */
export function formatCalendarDate(value: string): string {
  if (/^\d{4}-\d{2}$/.test(value)) return `${value.slice(5)}/${value.slice(0, 4)}`;
  const [y = 1970, m = 1, d = 1] = value.split('-').map(Number);
  return DATE_FORMAT.format(new Date(Date.UTC(y, m - 1, d)));
}

/** ISO timestamp → local "02.10.2026, 09:15". */
export function formatDateTime(timestamp: string): string {
  return DATE_TIME_FORMAT.format(new Date(timestamp));
}

/** 1200 → "1.200 €". */
export function formatMoney(amount: number): string {
  return MONEY_FORMAT.format(amount);
}
