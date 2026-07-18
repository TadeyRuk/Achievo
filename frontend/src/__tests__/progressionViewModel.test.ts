import { describe, expect, it } from 'vitest';
import { buildProgressionViewModel, ProgressionAgent } from '../shared/lib';

describe('buildProgressionViewModel', () => {
  it('mirrors ProgressionAgent.state for screens', () => {
    const now = new Date('2026-07-18T12:00:00Z');
    const history = [
      { activity: 'tutoring', reward: 5, timestamp: now.getTime() },
    ];
    const stored = { freezes: 1 };
    const vm = buildProgressionViewModel(history, stored, now);

    expect(vm.stored).toEqual(stored);
    expect(vm.state).toEqual(ProgressionAgent.state(history, stored, now));
    expect(vm.getNextWin(1, now)).toEqual(
      ProgressionAgent.getNextWin(history, stored, now, 1),
    );
  });
});
