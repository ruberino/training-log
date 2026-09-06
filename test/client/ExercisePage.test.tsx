/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../src/client/api/client.ts';
import { ToastProvider } from '../../src/client/components/Toast.tsx';
import ExercisePage from '../../src/client/pages/ExercisePage.tsx';
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

function renderExercisePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/exercises/1']}>
          <Routes>
            <Route path="/exercises/:id" element={<ExercisePage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ExercisePage', () => {
  beforeEach(() => {
    vi.mocked(fetchJson).mockReset();
  });

  it('shows the server message in a toast when a rename is rejected with 409', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/exercises/1' && init?.method === undefined) {
        return Promise.resolve({ ...exercise({ id: 1, name: 'Benkpress' }), entries: [] });
      }
      if (path === '/api/exercises/1' && init?.method === 'PATCH') {
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

    renderExercisePage();

    await user.click(await screen.findByRole('button', { name: 'Gi nytt navn' }));
    const nameInput = screen.getByLabelText('Navn');
    await user.clear(nameInput);
    await user.type(nameInput, 'Knebøy');
    await user.click(screen.getByRole('button', { name: 'Lagre' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Øvelsen finnes allerede');
    // the rename field is still open, since the mutation did not succeed
    expect(screen.getByLabelText('Navn')).toBeInTheDocument();
  });

  it('shows the server message and keeps the row in edit mode when an entry update is rejected', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/exercises/1' && init?.method === undefined) {
        return Promise.resolve({
          ...exercise({ id: 1, name: 'Benkpress' }),
          entries: [entry({ id: 5, date: '2026-01-01', weightKg: 80 })],
        });
      }
      if (path === '/api/entries/5' && init?.method === 'PATCH') {
        return Promise.reject(
          new ApiRequestError(400, {
            code: 'VALIDATION_ERROR',
            message: 'Vekt må være større enn 0 for denne øvelsen',
            requestId: 'req-2',
          }),
        );
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderExercisePage();

    await user.click(await screen.findByText('80 kg'));
    const weightInput = screen.getByLabelText('Vekt');
    await user.clear(weightInput);
    await user.type(weightInput, '50');
    await user.click(screen.getByRole('button', { name: 'Lagre' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Vekt må være større enn 0 for denne øvelsen',
    );
    expect(screen.getByLabelText('Vekt')).toBeInTheDocument();
  });
});
