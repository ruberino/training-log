/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StatusPage from '../../src/client/pages/StatusPage.tsx';
import type { ExerciseSummary } from '../../src/shared/schemas.ts';

vi.mock('../../src/client/api/client.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/api/client.ts')>();
  return {
    ...actual,
    fetchJson: vi.fn(),
  };
});

const { fetchJson } = await import('../../src/client/api/client.ts');

function renderStatusPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

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

describe('StatusPage', () => {
  beforeEach(() => {
    vi.mocked(fetchJson).mockReset();
  });

  it('shows three cards in the server order', async () => {
    vi.mocked(fetchJson).mockResolvedValue([
      exercise({ id: 1, name: 'Benkpress' }),
      exercise({ id: 2, name: 'Knebøy' }),
      exercise({ id: 3, name: 'Markløft' }),
    ]);

    renderStatusPage();

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Benkpress');
    expect(items[1]).toHaveTextContent('Knebøy');
    expect(items[2]).toHaveTextContent('Markløft');
  });

  it('shows the weight headline and a positive delta in green', async () => {
    vi.mocked(fetchJson).mockResolvedValue([
      exercise({
        id: 1,
        name: 'Benkpress',
        latest: {
          id: 2,
          exerciseId: 1,
          date: '2026-01-08',
          weightKg: 82.5,
          reps: null,
          note: null,
          createdAt: '2026-01-08T00:00:00.000Z',
        },
        previous: {
          id: 1,
          exerciseId: 1,
          date: '2026-01-01',
          weightKg: 80,
          reps: null,
          note: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        delta: 2.5,
      }),
    ]);

    renderStatusPage();

    expect(await screen.findByText('82,5 kg')).toBeInTheDocument();
    const delta = screen.getByText('+2,5');
    expect(delta).toHaveClass('text-green-600');
  });

  it('shows a reps exercise headline and delta', async () => {
    vi.mocked(fetchJson).mockResolvedValue([
      exercise({
        id: 1,
        name: 'Pull-ups',
        metric: 'reps',
        latest: {
          id: 2,
          exerciseId: 1,
          date: '2026-01-08',
          weightKg: null,
          reps: 12,
          note: null,
          createdAt: '2026-01-08T00:00:00.000Z',
        },
        previous: {
          id: 1,
          exerciseId: 1,
          date: '2026-01-01',
          weightKg: null,
          reps: 10,
          note: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        delta: 2,
      }),
    ]);

    renderStatusPage();

    expect(await screen.findByText('12 reps')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows the empty state when there are no active exercises', async () => {
    vi.mocked(fetchJson).mockResolvedValue([]);

    renderStatusPage();

    expect(await screen.findByText('Ingen øvelser ennå.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Legg til en øvelse' })).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    vi.mocked(fetchJson).mockRejectedValue(new Error('network down'));

    renderStatusPage();

    expect(await screen.findByText('Klarte ikke å hente øvelser.')).toBeInTheDocument();
  });
});
