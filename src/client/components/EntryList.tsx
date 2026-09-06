import { useState } from 'react';
import { todayLocalIso } from '../../shared/dates.ts';
import type { Entry } from '../../shared/schemas.ts';
import { formatKg, formatReps } from '../lib/format.ts';
import WeightInput from './WeightInput.tsx';

type Metric = 'weight' | 'reps';

export type EntryPatch = {
  date: string;
  weightKg: number | null;
  reps: number | null;
  note: string | null;
};

type EntryListProps = {
  entries: Entry[];
  metric: Metric;
  onUpdate: (id: number, patch: EntryPatch, onSaved: () => void) => void;
  onDelete: (id: number) => void;
};

function parseReps(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') {
    return null;
  }
  const value = Number(trimmed);
  return Number.isInteger(value) && value > 0 ? value : null;
}

type EntryRowProps = {
  entry: Entry;
  metric: Metric;
  onUpdate: (id: number, patch: EntryPatch, onSaved: () => void) => void;
  onDelete: (id: number) => void;
};

function EntryRow({ entry, metric, onUpdate, onDelete }: EntryRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [date, setDate] = useState(entry.date);
  const [weightKg, setWeightKg] = useState<number | null>(entry.weightKg);
  const [repsText, setRepsText] = useState(entry.reps !== null ? String(entry.reps) : '');
  const [note, setNote] = useState(entry.note ?? '');

  const reps = parseReps(repsText);
  const canSave = metric === 'weight' ? weightKg !== null && weightKg > 0 : reps !== null;

  const startEditing = () => {
    setDate(entry.date);
    setWeightKg(entry.weightKg);
    setRepsText(entry.reps !== null ? String(entry.reps) : '');
    setNote(entry.note ?? '');
    setConfirmingDelete(false);
    setEditing(true);
  };

  const save = () => {
    if (!canSave) {
      return;
    }
    onUpdate(entry.id, { date, weightKg, reps, note: note.trim() === '' ? null : note }, () =>
      setEditing(false),
    );
  };

  if (editing) {
    return (
      <li className="rounded border border-gray-200 p-4">
        <div className="flex flex-col gap-3">
          {metric === 'weight' ? (
            <>
              <div>
                <label htmlFor={`weight-${entry.id}`}>Vekt</label>
                <WeightInput id={`weight-${entry.id}`} value={weightKg} onChange={setWeightKg} />
              </div>
              <div>
                <label htmlFor={`reps-${entry.id}`}>Repetisjoner (valgfritt)</label>
                <input
                  id={`reps-${entry.id}`}
                  type="text"
                  inputMode="numeric"
                  value={repsText}
                  onChange={(event) => setRepsText(event.target.value)}
                  className="min-h-11 w-24 rounded border border-gray-400 px-3 py-2"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor={`reps-${entry.id}`}>Repetisjoner</label>
                <input
                  id={`reps-${entry.id}`}
                  type="text"
                  inputMode="numeric"
                  value={repsText}
                  onChange={(event) => setRepsText(event.target.value)}
                  className="min-h-11 w-24 rounded border border-gray-400 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor={`weight-${entry.id}`}>Ekstra vekt (valgfritt)</label>
                <WeightInput id={`weight-${entry.id}`} value={weightKg} onChange={setWeightKg} />
              </div>
            </>
          )}
          <div>
            <label htmlFor={`date-${entry.id}`}>Dato</label>
            <input
              id={`date-${entry.id}`}
              type="date"
              value={date}
              max={todayLocalIso()}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-11 rounded border border-gray-400 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor={`note-${entry.id}`}>Notat (valgfritt)</label>
            <input
              id={`note-${entry.id}`}
              type="text"
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-11 w-full rounded border border-gray-400 px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="min-h-11 rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              Lagre
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-11 rounded border border-gray-400 px-4 py-2"
            >
              Avbryt
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded border border-gray-200 p-4">
      <button type="button" onClick={startEditing} className="block w-full text-left">
        <p className="text-sm text-gray-500">{entry.date}</p>
        <p className="font-medium">
          {entry.weightKg !== null && formatKg(entry.weightKg)}
          {entry.weightKg !== null && entry.reps !== null && ' · '}
          {entry.reps !== null && formatReps(entry.reps)}
        </p>
        {entry.note !== null && entry.note !== '' && (
          <p className="text-sm text-gray-500">{entry.note}</p>
        )}
      </button>

      {confirmingDelete ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm">Slette registreringen?</span>
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
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

export default function EntryList({ entries, metric, onUpdate, onDelete }: EntryListProps) {
  if (entries.length === 0) {
    return <p className="p-4 text-center text-gray-500">Ingen registreringer</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          metric={metric}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
