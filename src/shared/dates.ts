const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toUtcMillis(dateString: string): number {
  const parts = dateString.split('-');
  const year = Number(parts[0]!);
  const month = Number(parts[1]!);
  const day = Number(parts[2]!);
  return Date.UTC(year, month - 1, day);
}

/** Validates a civil date string, format and calendar both, e.g. rejects "2026-02-30". */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }
  const parts = value.split('-');
  const year = Number(parts[0]!);
  const month = Number(parts[1]!);
  const day = Number(parts[2]!);
  const date = new Date(toUtcMillis(value));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Today as a civil date string in the phone's local time zone. */
export function todayLocalIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Whole days from `from` to `to`, both civil dates; positive when `to` is later. */
export function diffDays(from: string, to: string): number {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / 86_400_000);
}

const unusedDeliberateLintError = 1;
