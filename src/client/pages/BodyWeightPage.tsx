import { useState, type FormEvent } from 'react';
import { todayLocalIso } from '../../shared/dates.ts';
import type { BodyWeightEntry } from '../../shared/schemas.ts';
import { useBodyWeight, useDeleteBodyWeight, usePutBodyWeight } from '../api/queries.ts';
import { useToast } from '../components/Toast.tsx';
import TrendChart, { type ChartPoint } from '../components/TrendChart.tsx';
import WeightInput from '../components/WeightInput.tsx';
import { apiErrorMessage } from '../lib/errorMessage.ts';
import { formatKg } from '../lib/format.ts';

function findByDate(entries: BodyWeightEntry[], date: string): BodyWeightEntry | undefined {
  return entries.find((entry) => entry.date === date);
}

type BodyWeightRowProps = {
  entry: BodyWeightEntry;
  onSelect: (entry: BodyWeightEntry) => void;
  onDelete: (date: string) => void;
};

function BodyWeightRow({ entry, onSelect, onDelete }: BodyWeightRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li className="rounded border border-gray-200 p-4">
      <button type="button" onClick={() => onSelect(entry)} className="block w-full text-left">
        <p className="text-sm text-gray-500">{entry.date}</p>
        <p className="font-medium">{formatKg(entry.weightKg)}</p>
        {entry.note !== null && entry.note !== '' && (
          <p className="text-sm text-gray-500">{entry.note}</p>
        )}
      </button>

      {confirmingDelete ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm">Slette registreringen?</span>
          <button
            type="button"
            onClick={() => onDelete(entry.date)}
            className="min-h-11 rounded bg-red-600 px-3 text-white"
          >
            Bekreft sletting
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="min-h-11 rounded border border-gray-400 px-3"
          >
            Avbryt
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="mt-2 min-h-11 rounded border border-red-400 px-3 text-red-600"
        >
          Slett
        </button>
      )}
    </li>
  );
}

export default function BodyWeightPage() {
  const { data, isPending, isError } = useBodyWeight();
  const putBodyWeight = usePutBodyWeight();
  const deleteBodyWeight = useDeleteBodyWeight();
  const { showToast } = useToast();

  const [date, setDate] = useState(() => todayLocalIso());
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const canSave = weightKg !== null && weightKg > 0;

  const selectDate = (nextDate: string) => {
    setDate(nextDate);
    const existing = data ? findByDate(data, nextDate) : undefined;
    setWeightKg(existing?.weightKg ?? null);
    setNote(existing?.note ?? '');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    putBodyWeight.mutate(
      { date, weightKg, note: note.trim() === '' ? null : note },
      {
        onSuccess: () => {
          showToast('Lagret');
          setDate(todayLocalIso());
          setWeightKg(null);
          setNote('');
        },
        onError: (error) => showToast(apiErrorMessage(error)),
      },
    );
  };

  const chartPoints: ChartPoint[] = (data ?? []).map((entry) => ({
    date: entry.date,
    value: entry.weightKg,
  }));

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold">Vekt</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded border border-gray-200 p-4"
      >
        <div>
          <label htmlFor="body-weight">Vekt</label>
          <WeightInput id="body-weight" value={weightKg} onChange={setWeightKg} />
        </div>
        <div>
          <label htmlFor="body-weight-date">Dato</label>
          <input
            id="body-weight-date"
            type="date"
            value={date}
            max={todayLocalIso()}
            onChange={(event) => selectDate(event.target.value)}
            className="min-h-11 rounded border border-gray-400 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="body-weight-note">Notat (valgfritt)</label>
          <input
            id="body-weight-note"
            type="text"
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-11 w-full rounded border border-gray-400 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={!canSave || putBodyWeight.isPending}
          className="min-h-11 rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Lagre
        </button>
      </form>

      {isPending && <p>Laster …</p>}
      {isError && <p className="text-red-600">Klarte ikke å hente vekt.</p>}

      {!isPending && !isError && (
        <>
          <TrendChart points={chartPoints} />

          {data.length === 0 ? (
            <p className="p-4 text-center text-gray-500">Ingen registreringer</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.map((entry) => (
                <BodyWeightRow
                  key={entry.date}
                  entry={entry}
                  onSelect={(selected) => selectDate(selected.date)}
                  onDelete={(deletedDate) =>
                    deleteBodyWeight.mutate(deletedDate, {
                      onError: (error) => showToast(apiErrorMessage(error)),
                    })
                  }
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
