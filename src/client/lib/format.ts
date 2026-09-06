type Metric = 'weight' | 'reps';

const kgFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
const repsFormatter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const weightDeltaFormatter = new Intl.NumberFormat('nb-NO', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});
const repsDeltaFormatter = new Intl.NumberFormat('nb-NO', {
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
});
const shortDateFormatter = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

export function formatKg(value: number): string {
  return `${kgFormatter.format(value)} kg`;
}

export function formatReps(value: number): string {
  return `${repsFormatter.format(value)} reps`;
}

export function formatDelta(value: number | null, metric: Metric): string {
  if (value === null || value === 0) {
    return '±0';
  }
  const formatter = metric === 'weight' ? weightDeltaFormatter : repsDeltaFormatter;
  return formatter.format(value);
}

function toUtcMillis(dateString: string): number {
  const parts = dateString.split('-');
  const year = Number(parts[0]!);
  const month = Number(parts[1]!);
  const day = Number(parts[2]!);
  return Date.UTC(year, month - 1, day);
}

function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / 86_400_000);
}

export function formatRelativeDate(iso: string, today: string): string {
  const diffDays = daysBetween(iso, today);

  if (diffDays === 0) {
    return 'i dag';
  }
  if (diffDays === 1) {
    return 'i går';
  }
  if (diffDays >= 2 && diffDays <= 30) {
    return `${diffDays} dager siden`;
  }
  return shortDateFormatter.format(new Date(`${iso}T00:00:00Z`));
}
