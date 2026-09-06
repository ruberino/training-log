/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../src/client/api/client.ts';
import BodyWeightPage from '../../src/client/pages/BodyWeightPage.tsx';
import { ToastProvider } from '../../src/client/components/Toast.tsx';
import { todayLocalIso } from '../../src/shared/dates.ts';
import type { BodyWeightEntry } from '../../src/shared/schemas.ts';

vi.mock('../../src/client/api/client.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/api/client.ts')>();
  return {
    ...actual,
    fetchJson: vi.fn(),
  };
});

const { fetchJson } = await import('../../src/client/api/client.ts');

function entry(
  overrides: Partial<BodyWeightEntry> & Pick<BodyWeightEntry, 'date'>,
): BodyWeightEntry {
  return {
    weightKg: 80,
    note: null,
    createdAt: `${overrides.date}T00:00:00.000Z`,
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BodyWeightPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('BodyWeightPage', () => {
  beforeEach(() => {
    vi.mocked(fetchJson).mockReset();
  });

  it('defaults the date to today and caps it there', async () => {
    vi.mocked(fetchJson).mockResolvedValue([]);
    renderPage();

    const dateInput = await screen.findByLabelText('Dato');
    expect(dateInput).toHaveValue(todayLocalIso());
    expect(dateInput).toHaveAttribute('max', todayLocalIso());
  });

  it('shows the empty state and chart placeholder with no entries', async () => {
    vi.mocked(fetchJson).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Ingen registreringer')).toBeInTheDocument();
    expect(screen.getByText('For få registreringer for graf')).toBeInTheDocument();
  });

  it('renders the chart once there are two or more entries', async () => {
    vi.mocked(fetchJson).mockResolvedValue([
      entry({ date: '2026-01-01', weightKg: 80 }),
      entry({ date: '2026-01-05', weightKg: 79.5 }),
    ]);
    renderPage();

    await screen.findByText('2026-01-05');
    expect(screen.queryByText('For få registreringer for graf')).not.toBeInTheDocument();
  });

  it('submits a new weight for today', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/body-weight' && init?.method === undefined) {
        return Promise.resolve([]);
      }
      if (path === `/api/body-weight/${todayLocalIso()}` && init?.method === 'PUT') {
        return Promise.resolve(entry({ date: todayLocalIso(), weightKg: 82.5 }));
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderPage();

    await user.type(await screen.findByLabelText('Vekt'), '82,5');
    await user.click(screen.getByRole('button', { name: 'Lagre' }));

    expect(fetchJson).toHaveBeenCalledWith(`/api/body-weight/${todayLocalIso()}`, {
      method: 'PUT',
      body: JSON.stringify({ weightKg: 82.5, note: null }),
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Lagret');
  });

  it('prefills weight and note when picking a date that already has an entry', async () => {
    vi.mocked(fetchJson).mockResolvedValue([
      entry({ date: '2026-01-01', weightKg: 80, note: 'morgen' }),
    ]);

    renderPage();

    await screen.findByText('2026-01-01');
    fireEvent.change(screen.getByLabelText('Dato'), {
      target: { value: '2026-01-01' },
    });

    expect(screen.getByLabelText('Vekt')).toHaveValue('80');
    expect(screen.getByLabelText('Notat (valgfritt)')).toHaveValue('morgen');
  });

  it('deletes an entry only after confirming', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/body-weight' && init?.method === undefined) {
        return Promise.resolve([entry({ date: '2026-01-01', weightKg: 80 })]);
      }
      if (path === '/api/body-weight/2026-01-01' && init?.method === 'DELETE') {
        return Promise.resolve(undefined);
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderPage();

    await screen.findByText('2026-01-01');
    await user.click(screen.getByRole('button', { name: 'Slett' }));
    expect(fetchJson).not.toHaveBeenCalledWith('/api/body-weight/2026-01-01', { method: 'DELETE' });

    await user.click(screen.getByRole('button', { name: 'Bekreft sletting' }));
    expect(fetchJson).toHaveBeenCalledWith('/api/body-weight/2026-01-01', { method: 'DELETE' });
  });

  it('shows the server message in a toast when saving is rejected', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchJson).mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/body-weight' && init?.method === undefined) {
        return Promise.resolve([]);
      }
      if (path === `/api/body-weight/${todayLocalIso()}` && init?.method === 'PUT') {
        return Promise.reject(
          new ApiRequestError(400, {
            code: 'VALIDATION_ERROR',
            message: 'Vekt kan ha maks to desimaler',
            requestId: 'req-1',
          }),
        );
      }
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    renderPage();

    await user.type(await screen.findByLabelText('Vekt'), '82,123');
    await user.click(screen.getByRole('button', { name: 'Lagre' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Vekt kan ha maks to desimaler');
  });
});
