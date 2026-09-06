import { useCallback, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { todayLocalIso } from '../../shared/dates.ts';
import type { ExerciseSummary } from '../../shared/schemas.ts';
import { ApiRequestError } from '../api/client.ts';
import { useCreateEntry, useExercises } from '../api/queries.ts';
import ExerciseSelect from '../components/ExerciseSelect.tsx';
import { useToast } from '../components/Toast.tsx';
import WeightInput from '../components/WeightInput.tsx';

function parseReps(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') {
    return null;
  }
  const value = Number(trimmed);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: exercises } = useExercises();
  const createEntry = useCreateEntry();

  const [selected, setSelected] = useState<ExerciseSummary | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [repsText, setRepsText] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => todayLocalIso());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reps = parseReps(repsText);

  const selectExercise = useCallback((exercise: ExerciseSummary) => {
    setSelected(exercise);
    setWeightKg(exercise.latest?.weightKg ?? null);
    setRepsText(exercise.latest?.reps != null ? String(exercise.latest.reps) : '');
  }, []);

  // Preselect from ?exerciseId= as soon as the exercise list loads, once,
  // without an effect: React's own recommended pattern for "adjust state
  // when a prop/query result changes" (see "You Might Not Need an Effect").
  const [preselectedFrom, setPreselectedFrom] = useState<ExerciseSummary[] | undefined>(undefined);
  if (exercises !== undefined && exercises !== preselectedFrom) {
    setPreselectedFrom(exercises);
    const exerciseId = searchParams.get('exerciseId');
    if (exerciseId !== null) {
      const match = exercises.find((exercise) => String(exercise.id) === exerciseId);
      if (match) {
        selectExercise(match);
      }
    }
  }

  const canSubmit =
    selected !== null &&
    (selected.metric === 'weight' ? weightKg !== null && weightKg > 0 : reps !== null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selected === null || !canSubmit) {
      return;
    }
    setErrorMessage(null);

    createEntry.mutate(
      {
        exerciseId: selected.id,
        date,
        weightKg,
        reps,
        note: note.trim() === '' ? null : note,
      },
      {
        onSuccess: () => {
          showToast('Lagret');
          navigate('/');
        },
        onError: (error) => {
          if (error instanceof ApiRequestError && error.code === 'VALIDATION_ERROR') {
            setErrorMessage(error.message);
          } else {
            setErrorMessage('Noe gikk galt');
          }
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">Registrer</h1>

      <ExerciseSelect exercises={exercises ?? []} onSelect={selectExercise} />

      {selected !== null && selected.metric === 'weight' && (
        <>
          <div>
            <label htmlFor="weight">Vekt</label>
            <WeightInput id="weight" value={weightKg} onChange={setWeightKg} />
          </div>
          <div>
            <label htmlFor="reps">Repetisjoner (valgfritt)</label>
            <input
              id="reps"
              type="text"
              inputMode="numeric"
              value={repsText}
              onChange={(event) => setRepsText(event.target.value)}
              className="min-h-11 w-24 rounded border border-gray-400 px-3 py-2"
            />
          </div>
        </>
      )}

      {selected !== null && selected.metric === 'reps' && (
        <>
          <div>
            <label htmlFor="reps">Repetisjoner</label>
            <input
              id="reps"
              type="text"
              inputMode="numeric"
              value={repsText}
              onChange={(event) => setRepsText(event.target.value)}
              className="min-h-11 w-24 rounded border border-gray-400 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="weight">Ekstra vekt (valgfritt)</label>
            <WeightInput id="weight" value={weightKg} onChange={setWeightKg} />
          </div>
        </>
      )}

      <div>
        <label htmlFor="date">Dato</label>
        <input
          id="date"
          type="date"
          value={date}
          max={todayLocalIso()}
          onChange={(event) => setDate(event.target.value)}
          className="min-h-11 rounded border border-gray-400 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="note">Notat (valgfritt)</label>
        <input
          id="note"
          type="text"
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-11 w-full rounded border border-gray-400 px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit || createEntry.isPending}
        className="min-h-11 rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Lagre
      </button>

      {errorMessage !== null && (
        <p role="alert" className="text-red-600">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
