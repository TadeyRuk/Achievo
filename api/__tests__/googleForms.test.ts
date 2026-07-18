import { describe, it, expect } from 'vitest';
import { normalizeEntryId } from '../_server/infrastructure/googleForms';

describe('normalizeEntryId', () => {
  it('prefixes bare numeric ids with entry.', () => {
    expect(normalizeEntryId('1234567890')).toBe('entry.1234567890');
  });

  it('leaves entry.* ids unchanged', () => {
    expect(normalizeEntryId('entry.1234567890')).toBe('entry.1234567890');
  });

  it('trims whitespace', () => {
    expect(normalizeEntryId('  entry.99  ')).toBe('entry.99');
  });
});
