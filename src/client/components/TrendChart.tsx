import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { diffDays, todayLocalIso } from '../../shared/dates.ts';
import type { Entry } from '../../shared/schemas.ts';

type Range = '3m' | '1y' | 'all';

const RANGE_DAYS: Record<Exclude<Range, 'all'>, number> = { '3m': 90, '1y': 365 };

const RANGES: { value: Range; label: string }[] = [
  { value: '3m', label: '3 mnd' },
  { value: '1y', label: '1 år' },
  { value: 'all', label: 'Alt' },
];

type ChartPoint = { date: string; value: number };

type TrendChartProps = {
  entries: Entry[];
  metric: 'weight' | 'reps';
};

export default function TrendChart({ entries, metric }: TrendChartProps) {
  const [range, setRange] = useState<Range>('1y');
  const today = todayLocalIso();

  const points = useMemo<ChartPoint[]>(() => {
    const withValue = entries
      .map((entry) => ({
        date: entry.date,
        value: metric === 'weight' ? entry.weightKg : entry.reps,
      }))
      .filter((point): point is ChartPoint => point.value !== null);

    const inRange =
      range === 'all'
        ? withValue
        : withValue.filter((point) => diffDays(point.date, today) <= RANGE_DAYS[range]);

    return [...inRange].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [entries, metric, range, today]);

  const domain = useMemo<[number, number]>(() => {
    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.1, 1);
    return [Math.max(0, min - padding), max + padding];
  }, [points]);

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Tidsperiode" className="flex gap-2">
        {RANGES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setRange(value)}
            aria-pressed={range === value}
            className={`min-h-11 rounded border px-3 ${
              range === value ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {points.length < 2 ? (
        <p className="p-4 text-center text-gray-500">For få registreringer for graf</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={domain} allowDecimals={metric === 'weight'} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
              dot
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
