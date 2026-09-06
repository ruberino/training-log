/** @vitest-environment jsdom */
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WeightInput from '../../src/client/components/WeightInput.tsx';

function Controlled({
  initial,
  onChangeSpy,
}: {
  initial: number | null;
  onChangeSpy?: (value: number | null) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <WeightInput
      value={value}
      onChange={(next) => {
        setValue(next);
        onChangeSpy?.(next);
      }}
    />
  );
}

describe('WeightInput', () => {
  it('parses a comma as the decimal separator', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Controlled initial={null} onChangeSpy={onChangeSpy} />);

    await user.type(screen.getByRole('textbox'), '82,5');

    expect(onChangeSpy).toHaveBeenLastCalledWith(82.5);
  });

  it('parses a dot as the decimal separator', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Controlled initial={null} onChangeSpy={onChangeSpy} />);

    await user.type(screen.getByRole('textbox'), '82.5');

    expect(onChangeSpy).toHaveBeenLastCalledWith(82.5);
  });

  it('reports null for text that does not parse as a number', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Controlled initial={null} onChangeSpy={onChangeSpy} />);

    await user.type(screen.getByRole('textbox'), 'abc');

    expect(onChangeSpy).toHaveBeenLastCalledWith(null);
  });

  it('steps +2,5 twice from 80 to 85', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={80} />);

    await user.click(screen.getByRole('button', { name: 'Legg til 2,5' }));
    await user.click(screen.getByRole('button', { name: 'Legg til 2,5' }));

    expect(screen.getByRole('textbox')).toHaveValue('85');
  });

  it('never steps below zero', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={0} />);

    await user.click(screen.getByRole('button', { name: 'Trekk fra 2,5' }));

    expect(screen.getByRole('textbox')).toHaveValue('0');
  });
});
