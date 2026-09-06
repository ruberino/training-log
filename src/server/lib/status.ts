import type { Entry } from '../../shared/schemas.ts';

export type StatusSummary = {
  latest: Entry | null;
  previous: Entry | null;
  delta: number | null;
};

function metricValue(entry: Entry, metric: 'weight' | 'reps'): number | null {
  return metric === 'weight' ? entry.weightKg : entry.reps;
}

export function summarise(entries: Entry[], metric: 'weight' | 'reps'): StatusSummary {
  const sorted = [...entries].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? 1 : -1;
    }
    return b.id - a.id;
  });

  const latest = sorted[0] ?? null;
  const previous = sorted[1] ?? null;

  if (!latest || !previous) {
    return { latest, previous: null, delta: null };
  }

  const latestValue = metricValue(latest, metric);
  const previousValue = metricValue(previous, metric);
  if (latestValue === null || previousValue === null) {
    return { latest, previous, delta: null };
  }

  const delta = Math.round((latestValue - previousValue) * 100) / 100;
  return { latest, previous, delta };
}
