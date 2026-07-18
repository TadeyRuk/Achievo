import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Dialog } from '../shared/ui/Dialog';

describe('Dialog', () => {
  it('exposes dialog semantics and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} aria-label="Test dialog">
        <button type="button">Inside</button>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Test dialog' });
    expect(dialog).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
