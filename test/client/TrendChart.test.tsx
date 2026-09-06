/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import TrendChart from '../../src/client/components/TrendChart.tsx';

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('TrendChart', () => {
  it('shows the placeholder text with fewer than two points', () => {
    render(<TrendChart points={[{ date: '2026-01-01', value: 80 }]} />);

    expect(screen.getByText('For få registreringer for graf')).toBeInTheDocument();
  });

  it('renders a chart with two or more points', () => {
    const { container } = render(
      <TrendChart
        points={[
          { date: '2026-01-01', value: 80 },
          { date: '2026-02-01', value: 82.5 },
        ]}
      />,
    );

    expect(screen.queryByText('For få registreringer for graf')).not.toBeInTheDocument();
    expect(container.querySelector('.recharts-line-curve')).toBeInTheDocument();
  });

  it('drops points outside 3 mnd, falling back to the placeholder', async () => {
    const user = userEvent.setup();

    render(
      <TrendChart
        points={[
          { date: isoDaysAgo(31), value: 80 },
          { date: isoDaysAgo(137), value: 78 },
        ]}
      />,
    );

    expect(screen.queryByText('For få registreringer for graf')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '3 mnd' }));

    expect(screen.getByText('For få registreringer for graf')).toBeInTheDocument();
  });
});
