import { describe, it, expect } from 'vitest'

// Trivial smoke test to verify the Vitest runner, jsdom environment,
// and jest-dom setup are wired up correctly before feature tests are written.
describe('test runner smoke test', () => {
  it('executes a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('has access to the jsdom environment', () => {
    const el = document.createElement('div')
    el.textContent = 'achievo'
    expect(el.textContent).toBe('achievo')
  })
})
