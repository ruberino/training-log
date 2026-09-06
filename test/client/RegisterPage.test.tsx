/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../src/client/api/client.ts';
import { ToastProvider } from '../../src/client/components/Toast.tsx';
import RegisterPage from '../../src/client/pages/RegisterPage.tsx';
import { todayLocalIso } from '../../src/shared/dates.ts';
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

function renderRegisterPage(initialEntry = '/register') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<p>Status-siden</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.mocked(fetchJson).mockReset();
  });

  it('defaults the date to today and caps it there', async () => {
    vi.mocked(fetchJson).mockResolvedValue([]);
    renderRegisterPage();

    const dateInput = await screen.findByLabelText('Dato');
    expect(dateInput).toHaveValue(todayLocalIso());
    expect(dateInput).toHaveAttribute('max', todayLocalIso());
  });

  it('prefills the weight from the latest entry when an exercise is chosen', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockResolvedValue([
      exercise({
        id: 1,
        name: 'Benkpress',
        latest: entry({ id: 1, date: '2026-01-01', weightKg: 82.5 }),
      }),
    ]);

    renderRegisterPage();

    await user.type(await screen.findByLabelText('Øvelse'), 'Benkpress');
    await user.click(screen.getByText('Benkpress'));

    expect(screen.getByLabelText('Vekt')).toHaveValue('82,5');
  });

  it('submits weightKg: 82.5 when the user types 82,5', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string) => {
      if (path === '/api/exercises') {
        return Promise.resolve([exercise({ id: 1, name: 'Benkpress' })]);
      }
      if (path === '/api/entries') {
        return Promise.resolve(entry({ id: 9, date: todayLocalIso(), weightKg: 82.5 }));
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderRegisterPage();

    await user.type(await screen.findByLabelText('Øvelse'), 'Benkpress');
    await user.click(screen.getByText('Benkpress'));
    await user.type(screen.getByLabelText('Vekt'), '82,5');
    await user.click(screen.getByRole('button', { name: 'Lagre' }));

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith('/api/entries', {
        method: 'POST',
        body: JSON.stringify({
          exerciseId: 1,
          date: todayLocalIso(),
          weightKg: 82.5,
          reps: null,
          note: null,
        }),
      });
    });
    expect(await screen.findByText('Status-siden')).toBeInTheDocument();
  });

  it('prefills reps for a reps exercise and sends weightKg: null when left empty', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string) => {
      if (path === '/api/exercises') {
        return Promise.resolve([
          exercise({
            id: 2,
            name: 'Pull-ups',
            metric: 'reps',
            latest: entry({ id: 1, date: '2026-01-01', reps: 10 }),
          }),
        ]);
      }
      if (path === '/api/entries') {
        return Promise.resolve(entry({ id: 9, date: todayLocalIso(), reps: 10 }));
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderRegisterPage();

    await user.type(await screen.findByLabelText('Øvelse'), 'Pull-ups');
    await user.click(screen.getByText('Pull-ups'));

    expect(screen.getByLabelText('Repetisjoner')).toHaveValue('10');

    await user.click(screen.getByRole('button', { name: 'Lagre' }));

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith('/api/entries', {
        method: 'POST',
        body: JSON.stringify({
          exerciseId: 2,
          date: todayLocalIso(),
          weightKg: null,
          reps: 10,
          note: null,
        }),
      });
    });
  });

  it('preselects the exercise named in ?exerciseId=', async () => {
    vi.mocked(fetchJson).mockResolvedValue([exercise({ id: 7, name: 'Knebøy' })]);

    renderRegisterPage('/register?exerciseId=7');

    expect(await screen.findByLabelText('Vekt')).toBeInTheDocument();
  });

  it('disables Lagre until a weight exercise has a weight above zero', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockResolvedValue([exercise({ id: 1, name: 'Benkpress' })]);

    renderRegisterPage();

    await user.type(await screen.findByLabelText('Øvelse'), 'Benkpress');
    await user.click(screen.getByText('Benkpress'));

    const submit = screen.getByRole('button', { name: 'Lagre' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Vekt'), '0');
    expect(submit).toBeDisabled();

    await user.clear(screen.getByLabelText('Vekt'));
    await user.type(screen.getByLabelText('Vekt'), '82,5');
    expect(submit).toBeEnabled();
  });

  it('disables Lagre until a reps exercise has reps entered', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockResolvedValue([exercise({ id: 2, name: 'Pull-ups', metric: 'reps' })]);

    renderRegisterPage();

    await user.type(await screen.findByLabelText('Øvelse'), 'Pull-ups');
    await user.click(screen.getByText('Pull-ups'));

    const submit = screen.getByRole('button', { name: 'Lagre' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Repetisjoner'), '10');
    expect(submit).toBeEnabled();
  });

  it('shows the server message under the form on a 400', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string) => {
      if (path === '/api/exercises') {
        return Promise.resolve([exercise({ id: 1, name: 'Benkpress' })]);
      }
      if (path === '/api/entries') {
        return Promise.reject(
          new ApiRequestError(400, {
            code: 'VALIDATION_ERROR',
            message: 'Vekt må være større enn 0 for denne øvelsen',
            requestId: 'req-1',
          }),
        );
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderRegisterPage();

    await user.type(await screen.findByLabelText('Øvelse'), 'Benkpress');
    await user.click(screen.getByText('Benkpress'));
    await user.type(screen.getByLabelText('Vekt'), '82,5');
    await user.click(screen.getByRole('button', { name: 'Lagre' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Vekt må være større enn 0 for denne øvelsen',
    );
  });
});
