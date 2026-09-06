import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useDeleteEntry, useExercise, useUpdateEntry, useUpdateExercise } from '../api/queries.ts';
import EntryList from '../components/EntryList.tsx';
import TrendChart from '../components/TrendChart.tsx';
import { formatKg, formatReps } from '../lib/format.ts';

export default function ExercisePage() {
  const params = useParams();
  const id = Number(params.id);

  const { data, isPending, isError } = useExercise(id);
  const updateExercise = useUpdateExercise(id);
  const updateEntry = useUpdateEntry(id);
  const deleteEntry = useDeleteEntry(id);

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');

  if (isPending) {
    return <p className="p-4">Laster …</p>;
  }

  if (isError || !data) {
    return <p className="p-4 text-red-600">Klarte ikke å hente øvelsen.</p>;
  }

  const startRename = () => {
    setName(data.name);
    setRenaming(true);
  };

  const saveRename = () => {
    const trimmed = name.trim();
    if (trimmed === '') {
      return;
    }
    updateExercise.mutate({ name: trimmed }, { onSuccess: () => setRenaming(false) });
  };

  const toggleArchive = () => {
    updateExercise.mutate({ archived: data.archivedAt === null });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        {renaming ? (
          <div className="flex items-center gap-2">
            <label htmlFor="exercise-name" className="sr-only">
              Navn
            </label>
            <input
              id="exercise-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-11 rounded border border-gray-400 px-3 py-2"
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
          <h1 className="text-xl font-bold">{data.name}</h1>
        )}
        <p className="text-2xl font-bold">
          {data.latest === null
            ? 'Ingen registreringer'
            : data.metric === 'weight'
              ? formatKg(data.latest.weightKg!)
              : formatReps(data.latest.reps!)}
        </p>
      </div>

      <div className="flex gap-2">
        {!renaming && (
          <button
            type="button"
            onClick={startRename}
            className="min-h-11 rounded border border-gray-400 px-3"
          >
            Gi nytt navn
          </button>
        )}
        <button
          type="button"
          onClick={toggleArchive}
          className="min-h-11 rounded border border-gray-400 px-3"
        >
          {data.archivedAt === null ? 'Arkiver' : 'Gjenopprett'}
        </button>
      </div>

      <TrendChart entries={data.entries} metric={data.metric} />

      <EntryList
        entries={data.entries}
        metric={data.metric}
        onUpdate={(entryId, patch) => updateEntry.mutate({ id: entryId, ...patch })}
        onDelete={(entryId) => deleteEntry.mutate(entryId)}
      />

      <Link
        to={`/register?exerciseId=${data.id}`}
        className="fixed bottom-20 right-4 rounded-full bg-blue-600 px-6 py-3 font-medium text-white shadow-lg"
      >
        Registrer
      </Link>
    </div>
  );
}
