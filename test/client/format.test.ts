import { describe, expect, it } from 'vitest';
import {
  formatDelta,
  formatKg,
  formatRelativeDate,
  formatReps,
} from '../../src/client/lib/format.ts';

describe('formatKg', () => {
  it('formats with up to one decimal and a comma', () => {
    expect(formatKg(82.5)).toBe('82,5 kg');
    expect(formatKg(100)).toBe('100 kg');
  });
});

describe('formatReps', () => {
  it('formats as a whole number with the reps suffix', () => {
    expect(formatReps(12)).toBe('12 reps');
  });
});

describe('formatDelta', () => {
  it('formats a positive weight delta', () => {
    expect(formatDelta(2.5, 'weight')).toBe('+2,5');
  });

  it('formats a negative weight delta with the Unicode minus', () => {
    expect(formatDelta(-2.5, 'weight')).toBe('−2,5');
  });

  it('formats zero and null as ±0', () => {
    expect(formatDelta(0, 'weight')).toBe('±0');
    expect(formatDelta(null, 'weight')).toBe('±0');
  });

  it('formats reps deltas as whole numbers', () => {
    expect(formatDelta(2, 'reps')).toBe('+2');
    expect(formatDelta(-1, 'reps')).toBe('−1');
  });
});

describe('formatRelativeDate', () => {
  it('returns "i dag" for today', () => {
    expect(formatRelativeDate('2026-09-06', '2026-09-06')).toBe('i dag');
  });

  it('returns "i går" for yesterday', () => {
    expect(formatRelativeDate('2026-09-05', '2026-09-06')).toBe('i går');
  });

  it('returns "N dager siden" between 2 and 30 days', () => {
    expect(formatRelativeDate('2026-09-03', '2026-09-06')).toBe('3 dager siden');
    expect(formatRelativeDate('2026-08-07', '2026-09-06')).toBe('30 dager siden');
  });

  it('returns a short date beyond 30 days', () => {
    expect(formatRelativeDate('2026-08-06', '2026-09-06')).toBe('6. aug.');
  });
});
