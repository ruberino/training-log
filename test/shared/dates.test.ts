import { describe, expect, it } from 'vitest';
import { isIsoDate, todayLocalIso } from '../../src/shared/dates.ts';

describe('isIsoDate', () => {
  it('accepts valid civil dates', () => {
    expect(isIsoDate('2026-09-05')).toBe(true);
    expect(isIsoDate('2024-02-29')).toBe(true);
    expect(isIsoDate('2000-01-01')).toBe(true);
  });

  it('rejects the wrong format', () => {
    expect(isIsoDate('2026-9-5')).toBe(false);
    expect(isIsoDate('05-09-2026')).toBe(false);
    expect(isIsoDate('2026/09/05')).toBe(false);
    expect(isIsoDate('not-a-date')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });

  it('rejects dates that do not exist on the calendar', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2023-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-00-10')).toBe(false);
    expect(isIsoDate('2026-04-31')).toBe(false);
  });
});

describe('todayLocalIso', () => {
  it('returns a valid civil date string', () => {
    const today = todayLocalIso();
    expect(isIsoDate(today)).toBe(true);
  });
});
