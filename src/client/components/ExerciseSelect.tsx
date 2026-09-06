import { useState } from 'react';
import { normalizeName } from '../../shared/normalize.ts';
import type { ExerciseSummary } from '../../shared/schemas.ts';
import { useCreateExercise } from '../api/queries.ts';

type ExerciseSelectProps = {
  exercises: ExerciseSummary[];
  onSelect: (exercise: ExerciseSummary) => void;
};

export default function ExerciseSelect({ exercises, onSelect }: ExerciseSelectProps) {
  const [filter, setFilter] = useState('');
  const createExercise = useCreateExercise();

  const normalizedFilter = normalizeName(filter);
  const filtered =
    normalizedFilter === ''
      ? exercises
      : exercises.filter((exercise) => normalizeName(exercise.name).includes(normalizedFilter));

  const hasExactMatch = exercises.some(
    (exercise) => normalizeName(exercise.name) === normalizedFilter,
  );
  const showCreateOption = filter.trim() !== '' && !hasExactMatch;

  const handleCreate = () => {
    createExercise.mutate(
      { name: filter.trim() },
      {
        onSuccess: (created) => {
          setFilter('');
          onSelect(created);
        },
      },
    );
  };

  return (
    <div>
      <label htmlFor="exercise-filter">Øvelse</label>
      <input
        id="exercise-filter"
        type="text"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Søk etter øvelse"
        className="min-h-11 w-full rounded border border-gray-400 px-3 py-2"
      />
      <ul>
        {filtered.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => onSelect(exercise)}
              className="min-h-11 w-full py-2 text-left"
            >
              {exercise.name}
            </button>
          </li>
        ))}
        {showCreateOption && (
          <li>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createExercise.isPending}
              className="min-h-11 w-full py-2 text-left text-blue-600"
            >
              Opprett «{filter.trim()}»
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
