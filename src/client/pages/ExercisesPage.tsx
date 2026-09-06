import { useState, type FormEvent } from 'react';
import type { ExerciseSummary } from '../../shared/schemas.ts';
import { useCreateExercise, useExercises, useUpdateExercise } from '../api/queries.ts';
import { useToast } from '../components/Toast.tsx';
import { apiErrorMessage } from '../lib/errorMessage.ts';

const METRIC_LABEL: Record<'weight' | 'reps', string> = {
  weight: 'Vekt',
  reps: 'Repetisjoner',
};

function AddExerciseForm() {
  const [name, setName] = useState('');
  const [metric, setMetric] = useState<'weight' | 'reps'>('weight');
  const createExercise = useCreateExercise();
  const { showToast } = useToast();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '') {
      return;
    }
    createExercise.mutate(
      { name: trimmed, metric },
      {
        onSuccess: () => {
          setName('');
          setMetric('weight');
        },
        onError: (error) => showToast(apiErrorMessage(error)),
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded border border-gray-200 p-4"
    >
      <div>
        <label htmlFor="new-exercise-name">Navn</label>
        <input
          id="new-exercise-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="min-h-11 w-full rounded border border-gray-400 px-3 py-2"
        />
      </div>
      <div role="group" aria-label="Type" className="flex gap-2">
        {(['weight', 'reps'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMetric(option)}
            aria-pressed={metric === option}
            className={`min-h-11 rounded border px-3 ${
              metric === option ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-400'
            }`}
          >
            {METRIC_LABEL[option]}
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={createExercise.isPending}
        className="min-h-11 rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Legg til
      </button>
    </form>
  );
}

type ExerciseRowProps = {
  exercise: ExerciseSummary;
};

function ExerciseRow({ exercise }: ExerciseRowProps) {
  const updateExercise = useUpdateExercise(exercise.id);
  const { showToast } = useToast();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(exercise.name);

  const hasEntries = exercise.latest !== null;

  const startRename = () => {
    setName(exercise.name);
    setRenaming(true);
  };

  const saveRename = () => {
    const trimmed = name.trim();
    if (trimmed === '') {
      return;
    }
    updateExercise.mutate(
      { name: trimmed },
      {
        onSuccess: () => setRenaming(false),
        onError: (error) => showToast(apiErrorMessage(error)),
      },
    );
  };

  const toggleArchive = () => {
    updateExercise.mutate(
      { archived: exercise.archivedAt === null },
      { onError: (error) => showToast(apiErrorMessage(error)) },
    );
  };

  const setMetric = (metric: 'weight' | 'reps') => {
    if (metric === exercise.metric) {
      return;
    }
    updateExercise.mutate({ metric }, { onError: (error) => showToast(apiErrorMessage(error)) });
  };

  return (
    <li className="flex flex-col gap-2 rounded border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-2">
        {renaming ? (
          <div className="flex flex-1 items-center gap-2">
            <label htmlFor={`exercise-name-${exercise.id}`} className="sr-only">
              Navn
            </label>
            <input
              id={`exercise-name-${exercise.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-11 flex-1 rounded border border-gray-400 px-3 py-2"
            />
            <button
              type="button"
              onClick={saveRename}
              className="min-h-11 rounded bg-blue-600 px-3 font-medium text-white"
            >
              Lagre
            </button>
            <button
              type="button"
              onClick={() => setRenaming(false)}
              className="min-h-11 rounded border border-gray-400 px-3"
            >
              Avbryt
            </button>
          </div>
        ) : (
          <span className="font-medium">{exercise.name}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasEntries ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            {METRIC_LABEL[exercise.metric]}
          </span>
        ) : (
          <div role="group" aria-label="Type" className="flex gap-1">
            {(['weight', 'reps'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMetric(option)}
                aria-pressed={exercise.metric === option}
                className={`min-h-11 rounded border px-2 text-xs ${
                  exercise.metric === option
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-400'
                }`}
              >
                {METRIC_LABEL[option]}
              </button>
            ))}
          </div>
        )}

        {!renaming && (
          <button
            type="button"
            onClick={startRename}
            className="min-h-11 rounded border border-gray-400 px-3 text-sm"
          >
            Gi nytt navn
          </button>
        )}
        <button
          type="button"
          onClick={toggleArchive}
          className="min-h-11 rounded border border-gray-400 px-3 text-sm"
        >
          {exercise.archivedAt === null ? 'Arkiver' : 'Gjenopprett'}
        </button>
      </div>
    </li>
  );
}

export default function ExercisesPage() {
  const { data, isPending, isError } = useExercises(true);

  return (
    <div className="flex flex-col gap-4 p-4">
      <AddExerciseForm />

      {isPending && <p>Laster …</p>}
      {isError && <p className="text-red-600">Klarte ikke å hente øvelser.</p>}

      {!isPending && !isError && (
        <>
          <section>
            <h2 className="mb-2 font-medium">Aktive</h2>
            {data.filter((exercise) => exercise.archivedAt === null).length === 0 ? (
              <p className="text-sm text-gray-500">Ingen aktive øvelser.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data
                  .filter((exercise) => exercise.archivedAt === null)
                  .map((exercise) => (
                    <ExerciseRow key={exercise.id} exercise={exercise} />
                  ))}
              </ul>
            )}
          </section>

          <details>
            <summary className="cursor-pointer font-medium">
              Arkiverte ({data.filter((exercise) => exercise.archivedAt !== null).length})
            </summary>
            <ul className="mt-2 flex flex-col gap-3">
              {data
                .filter((exercise) => exercise.archivedAt !== null)
                .map((exercise) => (
                  <ExerciseRow key={exercise.id} exercise={exercise} />
                ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
