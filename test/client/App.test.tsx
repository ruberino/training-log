/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/client/App.tsx';

vi.mock('../../src/client/api/client.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/api/client.ts')>();
  return {
    ...actual,
    fetchJson: vi.fn(),
  };
});

const { fetchJson, ApiRequestError } = await import('../../src/client/api/client.ts');

function renderApp(initialEntry: string) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(fetchJson).mockReset();
  });

  it('shows the login page when unauthenticated', async () => {
    vi.mocked(fetchJson).mockRejectedValue(
      new ApiRequestError(401, { code: 'UNAUTHORIZED', message: 'Ikke innlogget', requestId: 'x' }),
    );

    renderApp('/');

    await waitFor(() => {
      expect(screen.getByLabelText('Passord')).toBeInTheDocument();
    });
  });

  it('shows the guarded shell with three tabs when authenticated', async () => {
    vi.mocked(fetchJson).mockImplementation((path: string) =>
      path === '/api/exercises' ? Promise.resolve([]) : Promise.resolve({ authenticated: true }),
    );

    renderApp('/');

    const nav = await screen.findByRole('navigation');
    expect(within(nav).getByRole('link', { name: 'Status' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Registrer' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Øvelser' })).toBeInTheDocument();
  });
});
