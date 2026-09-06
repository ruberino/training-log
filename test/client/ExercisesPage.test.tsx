/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../src/client/api/client.ts';
import { ToastProvider } from '../../src/client/components/Toast.tsx';
import ExercisesPage from '../../src/client/pages/ExercisesPage.tsx';
import type { Entry, ExerciseSummary } from '../../src/shared/schemas.ts';

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

function renderExercisesPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ExercisesPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ExercisesPage', () => {
  beforeEach(() => {
    vi.mocked(fetchJson).mockReset();
  });

  it('renders active exercises and a collapsed archived section with a count', async () => {
    vi.mocked(fetchJson).mockResolvedValue([
      exercise({ id: 1, name: 'Benkpress' }),
      exercise({ id: 2, name: 'Gammel øvelse', archivedAt: '2026-01-01T00:00:00.000Z' }),
    ]);

    renderExercisesPage();

    expect(await screen.findByText('Benkpress')).toBeInTheDocument();
    expect(screen.getByText('Arkiverte (1)')).toBeInTheDocument();

    const details = screen.getByText('Arkiverte (1)').closest('details');
    expect(details).not.toHaveAttribute('open');
  });

  it('adds an exercise with metric reps and clears the form on success', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/exercises?includeArchived=true') {
        return Promise.resolve([]);
      }
      if (path === '/api/exercises' && init?.method === 'POST') {
        return Promise.resolve(exercise({ id: 3, name: 'Pull-ups', metric: 'reps' }));
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderExercisesPage();

    await user.type(await screen.findByLabelText('Navn'), 'Pull-ups');
    await user.click(screen.getByRole('button', { name: 'Repetisjoner' }));
    await user.click(screen.getByRole('button', { name: 'Legg til' }));

    expect(fetchJson).toHaveBeenCalledWith('/api/exercises', {
      method: 'POST',
      body: JSON.stringify({ metric: 'reps', name: 'Pull-ups' }),
    });
    expect(await screen.findByLabelText('Navn')).toHaveValue('');
  });

  it('shows the conflict message and keeps the name when adding a duplicate', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/exercises?includeArchived=true') {
        return Promise.resolve([]);
      }
      if (path === '/api/exercises' && init?.method === 'POST') {
        return Promise.reject(
          new ApiRequestError(409, {
            code: 'CONFLICT',
            message: 'Øvelsen finnes allerede',
            requestId: 'req-1',
          }),
        );
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderExercisesPage();

    await user.type(await screen.findByLabelText('Navn'), 'Benkpress');
    await user.click(screen.getByRole('button', { name: 'Legg til' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Øvelsen finnes allerede');
    expect(screen.getByLabelText('Navn')).toHaveValue('Benkpress');
  });

  it('locks the metric badge once an exercise has entries', async () => {
    vi.mocked(fetchJson).mockResolvedValue([
      exercise({
        id: 1,
        name: 'Benkpress',
        latest: entry({ id: 1, date: '2026-01-01', weightKg: 80 }),
      }),
    ]);

    renderExercisesPage();

    const row = (await screen.findByText('Benkpress')).closest('li')!;
    expect(within(row).getByText('Vekt')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Repetisjoner' })).not.toBeInTheDocument();
  });

  it('offers an editable metric choice while an exercise has no entries', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/exercises?includeArchived=true') {
        return Promise.resolve([exercise({ id: 1, name: 'Benkpress' })]);
      }
      if (path === '/api/exercises/1' && init?.method === 'PATCH') {
        return Promise.resolve(exercise({ id: 1, name: 'Benkpress', metric: 'reps' }));
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderExercisesPage();

    const row = (await screen.findByText('Benkpress')).closest('li')!;
    await user.click(within(row).getByRole('button', { name: 'Repetisjoner' }));

    expect(fetchJson).toHaveBeenCalledWith('/api/exercises/1', {
      method: 'PATCH',
      body: JSON.stringify({ metric: 'reps' }),
    });
  });

  it('archives an active exercise', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/exercises?includeArchived=true') {
        return Promise.resolve([exercise({ id: 1, name: 'Benkpress' })]);
      }
      if (path === '/api/exercises/1' && init?.method === 'PATCH') {
        return Promise.resolve(
          exercise({ id: 1, name: 'Benkpress', archivedAt: '2026-01-01T00:00:00.000Z' }),
        );
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderExercisesPage();

    await user.click(await screen.findByRole('button', { name: 'Arkiver' }));

    expect(fetchJson).toHaveBeenCalledWith('/api/exercises/1', {
      method: 'PATCH',
      body: JSON.stringify({ archived: true }),
    });
  });

  it('restores an archived exercise', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/exercises?includeArchived=true') {
        return Promise.resolve([
          exercise({ id: 1, name: 'Benkpress', archivedAt: '2026-01-01T00:00:00.000Z' }),
        ]);
      }
      if (path === '/api/exercises/1' && init?.method === 'PATCH') {
        return Promise.resolve(exercise({ id: 1, name: 'Benkpress', archivedAt: null }));
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderExercisesPage();

    await user.click(await screen.findByText('Arkiverte (1)'));
    await user.click(await screen.findByRole('button', { name: 'Gjenopprett' }));

    expect(fetchJson).toHaveBeenCalledWith('/api/exercises/1', {
      method: 'PATCH',
      body: JSON.stringify({ archived: false }),
    });
  });
});
