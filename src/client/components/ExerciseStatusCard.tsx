import { Link } from 'react-router';
import type { ExerciseSummary } from '../../shared/schemas.ts';
import { formatDelta, formatKg, formatRelativeDate, formatReps } from '../lib/format.ts';

type ExerciseStatusCardProps = {
  exercise: ExerciseSummary;
  today: string;
};

export default function ExerciseStatusCard({ exercise, today }: ExerciseStatusCardProps) {
  const { id, name, metric, latest, delta } = exercise;

  const headline =
    latest === null
      ? 'Ingen registreringer'
      : metric === 'weight'
        ? formatKg(latest.weightKg!)
        : formatReps(latest.reps!);

  const deltaClassName =
    delta === null || delta === 0 ? 'text-gray-500' : delta > 0 ? 'text-green-600' : 'text-red-600';

  return (
    <Link to={`/exercises/${id}`} className="block rounded border border-gray-200 p-4">
      <p className="font-medium">{name}</p>
      <p className="text-2xl font-bold">{headline}</p>
      {latest !== null && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{formatRelativeDate(latest.date, today)}</span>
          <span className={deltaClassName}>{formatDelta(delta, metric)}</span>
        </div>
      )}
    </Link>
  );
}
