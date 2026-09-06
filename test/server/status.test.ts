import { describe, expect, it } from 'vitest';
import type { Entry } from '../../src/shared/schemas.ts';
import { summarise } from '../../src/server/lib/status.ts';

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: 1,
    exerciseId: 1,
    date: '2026-01-01',
    weightKg: null,
    reps: null,
    note: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('summarise', () => {
  it('returns nulls for an empty list', () => {
    expect(summarise([], 'weight')).toEqual({ latest: null, previous: null, delta: null });
  });

  it('returns delta null with a single entry', () => {
    const only = entry({ id: 1, date: '2026-01-01', weightKg: 80 });
    const result = summarise([only], 'weight');
    expect(result.latest).toEqual(only);
    expect(result.previous).toBeNull();
    expect(result.delta).toBeNull();
  });

  it('computes a positive delta for a weight exercise', () => {
    const first = entry({ id: 1, date: '2026-01-01', weightKg: 80 });
    const second = entry({ id: 2, date: '2026-01-08', weightKg: 82.5 });
    const result = summarise([first, second], 'weight');
    expect(result.latest).toEqual(second);
    expect(result.previous).toEqual(first);
    expect(result.delta).toBe(2.5);
  });

  it('computes a delta for a reps exercise', () => {
    const first = entry({ id: 1, date: '2026-01-01', reps: 8 });
    const second = entry({ id: 2, date: '2026-01-08', reps: 10 });
    const result = summarise([first, second], 'reps');
    expect(result.delta).toBe(2);
  });

  it('treats the entry created last as latest when dates tie', () => {
    const first = entry({ id: 1, date: '2026-01-01', weightKg: 80 });
    const second = entry({ id: 2, date: '2026-01-01', weightKg: 85 });
    const result = summarise([first, second], 'weight');
    expect(result.latest).toEqual(second);
    expect(result.previous).toEqual(first);
  });

  it('does not depend on input order', () => {
    const first = entry({ id: 1, date: '2026-01-01', weightKg: 80 });
    const second = entry({ id: 2, date: '2026-01-08', weightKg: 82.5 });
    const result = summarise([second, first], 'weight');
    expect(result.latest).toEqual(second);
    expect(result.previous).toEqual(first);
    expect(result.delta).toBe(2.5);
  });
});
