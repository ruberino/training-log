/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EntryList from '../../src/client/components/EntryList.tsx';
import type { Entry } from '../../src/shared/schemas.ts';

function entry(overrides: Partial<Entry> & Pick<Entry, 'id' | 'date'>): Entry {
  return {
    exerciseId: 1,
    weightKg: null,
    reps: null,
    note: null,
    createdAt: `${overrides.date}T00:00:00.000Z`,
    ...overrides,
  };
}

describe('EntryList', () => {
  it('shows the empty state with no entries', () => {
    render(<EntryList entries={[]} metric="weight" onUpdate={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Ingen registreringer')).toBeInTheDocument();
  });

  it('edits a weight entry inline and calls onUpdate with the new value', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <EntryList
        entries={[entry({ id: 1, date: '2026-01-01', weightKg: 80, note: 'Første' })]}
        metric="weight"
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Første'));

    const weightInput = screen.getByLabelText('Vekt');
    await user.clear(weightInput);
    await user.type(weightInput, '82,5');
    await user.click(screen.getByRole('button', { name: 'Lagre' }));

    expect(onUpdate).toHaveBeenCalledWith(1, {
      date: '2026-01-01',
      weightKg: 82.5,
      reps: null,
      note: 'Første',
    });
  });

  it('edits a reps entry and disables Lagre once reps is cleared', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <EntryList
        entries={[entry({ id: 2, date: '2026-01-02', reps: 10 })]}
        metric="reps"
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByText('10 reps'));

    const repsInput = screen.getByLabelText('Repetisjoner');
    const save = screen.getByRole('button', { name: 'Lagre' });
    expect(save).toBeEnabled();

    await user.clear(repsInput);
    expect(save).toBeDisabled();

    await user.type(repsInput, '12');
    expect(save).toBeEnabled();
    await user.click(save);

    expect(onUpdate).toHaveBeenCalledWith(2, {
      date: '2026-01-02',
      weightKg: null,
      reps: 12,
      note: null,
    });
  });

  it('cancels editing without calling onUpdate', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <EntryList
        entries={[entry({ id: 1, date: '2026-01-01', weightKg: 80 })]}
        metric="weight"
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByText('80 kg'));
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));

    expect(screen.queryByLabelText('Vekt')).not.toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('deletes an entry only after confirming', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <EntryList
        entries={[entry({ id: 3, date: '2026-01-03', weightKg: 80 })]}
        metric="weight"
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Slett' }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Bekreft sletting' }));
    expect(onDelete).toHaveBeenCalledWith(3);
  });

  it('cancels a pending delete without calling onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <EntryList
        entries={[entry({ id: 4, date: '2026-01-04', weightKg: 80 })]}
        metric="weight"
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Slett' }));
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Slett' })).toBeInTheDocument();
  });
});
