/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExerciseSelect from '../../src/client/components/ExerciseSelect.tsx';
import type { ExerciseSummary } from '../../src/shared/schemas.ts';

vi.mock('../../src/client/api/client.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/api/client.ts')>();
  return {
    ...actual,
    fetchJson: vi.fn(),
  };
});

const { fetchJson } = await import('../../src/client/api/client.ts');

function exercise(
  overrides: Partial<ExerciseSummary> & Pick<ExerciseSummary, 'id' | 'name'>,
): ExerciseSummary {
  return {
    metric: 'weight',
    archivedAt: null,
    latest: null,
    previous: null,
    delta: null,
    ...overrides,
  };
}

function renderSelect(exercises: ExerciseSummary[]) {
  const queryClient = new QueryClient();
  const onSelect = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <ExerciseSelect exercises={exercises} onSelect={onSelect} />
    </QueryClientProvider>,
  );
  return { onSelect };
}

describe('ExerciseSelect', () => {
  beforeEach(() => {
    vi.mocked(fetchJson).mockReset();
  });

  it('filters the list as you type', async () => {
    const user = userEvent.setup();
    renderSelect([exercise({ id: 1, name: 'Benkpress' }), exercise({ id: 2, name: 'Knebøy' })]);

    await user.type(screen.getByLabelText('Øvelse'), 'ben');

    expect(screen.getByText('Benkpress')).toBeInTheDocument();
    expect(screen.queryByText('Knebøy')).not.toBeInTheDocument();
  });

  it('calls onSelect with the chosen exercise', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderSelect([exercise({ id: 1, name: 'Benkpress' })]);

    await user.click(screen.getByText('Benkpress'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Benkpress' }));
  });

  it('offers to create a new exercise when there is no exact match', async () => {
    const user = userEvent.setup();
    renderSelect([exercise({ id: 1, name: 'Benkpress' })]);

    await user.type(screen.getByLabelText('Øvelse'), 'Markløft');

    expect(screen.getByText('Opprett «Markløft»')).toBeInTheDocument();
  });

  it('does not offer to create when there is an exact normalised match', async () => {
    const user = userEvent.setup();
    renderSelect([exercise({ id: 1, name: 'Benkpress' })]);

    await user.type(screen.getByLabelText('Øvelse'), 'benkpress ');

    expect(screen.queryByText(/Opprett/)).not.toBeInTheDocument();
  });

  it('creates the exercise with metric weight and selects the result', async () => {
    const user = userEvent.setup();
    const created = exercise({ id: 5, name: 'Markløft' });
    vi.mocked(fetchJson).mockResolvedValue(created);
    const { onSelect } = renderSelect([]);

    await user.type(screen.getByLabelText('Øvelse'), 'Markløft');
    await user.click(screen.getByText('Opprett «Markløft»'));

    expect(fetchJson).toHaveBeenCalledWith('/api/exercises', {
      method: 'POST',
      body: JSON.stringify({ metric: 'weight', name: 'Markløft' }),
    });
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(created);
    });
  });
});
