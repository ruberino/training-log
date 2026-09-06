import { useEffect, useRef, useState, type ChangeEvent } from 'react';

function parseWeightInput(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function formatForInput(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',');
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

type WeightInputProps = {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
};

export default function WeightInput({ id, value, onChange }: WeightInputProps) {
  const [text, setText] = useState(() => formatForInput(value));
  const lastReported = useRef(value);

  useEffect(() => {
    if (value !== lastReported.current) {
      setText(formatForInput(value));
      lastReported.current = value;
    }
  }, [value]);

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setText(next);
    const parsed = parseWeightInput(next);
    lastReported.current = parsed;
    onChange(parsed);
  };

  const step = (delta: number) => {
    const next = Math.max(0, roundToTwoDecimals((value ?? 0) + delta));
    lastReported.current = next;
    setText(formatForInput(next));
    onChange(next);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => step(-2.5)}
        aria-label="Trekk fra 2,5"
        className="min-h-11 min-w-11 rounded border border-gray-400 px-3"
      >
        −2,5
      </button>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={handleTextChange}
        className="min-h-11 w-24 rounded border border-gray-400 px-3 py-2 text-center"
      />
      <button
        type="button"
        onClick={() => step(2.5)}
        aria-label="Legg til 2,5"
        className="min-h-11 min-w-11 rounded border border-gray-400 px-3"
      >
        +2,5
      </button>
    </div>
  );
}
