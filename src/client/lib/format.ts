import { diffDays } from '../../shared/dates.ts';

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

export function formatRelativeDate(iso: string, today: string): string {
  const days = diffDays(iso, today);

  if (days === 0) {
    return 'i dag';
  }
  if (days === 1) {
    return 'i går';
  }
  if (days >= 2 && days <= 30) {
    return `${days} dager siden`;
  }
  return shortDateFormatter.format(new Date(`${iso}T00:00:00Z`));
}
