import { describe, it, expect, beforeEach } from 'vitest';
import { getUserName, setUserName, hasUserName, USER_NAME_KEY } from '../features/profile'

describe('userIdentity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no name is stored', () => {
    expect(getUserName()).toBeNull();
    expect(hasUserName()).toBe(false);
  });

  it('stores and retrieves a trimmed name', () => {
    setUserName('  Xander  ');
    expect(getUserName()).toBe('Xander');
    expect(hasUserName()).toBe(true);
    expect(localStorage.getItem(USER_NAME_KEY)).toBe('Xander');
  });

  it('treats an empty/whitespace-only name as not set', () => {
    setUserName('   ');
    expect(getUserName()).toBeNull();
    expect(hasUserName()).toBe(false);
  });
});
