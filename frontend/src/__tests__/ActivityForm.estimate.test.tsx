import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { estimateMaxReward } from '@achievo/shared'
import { ActivityForm } from '../features/earn'

describe('ActivityForm estimates', () => {
  it('labels workshop estimate as up to base+maxBonus', () => {
    render(
      <ActivityForm
        text=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isWalletConnected
        isSubmitting={false}
      />,
    )
    const max = estimateMaxReward('workshop')
    expect(max).toBe(5)
    // Category chips show "up to +N XLM"
    expect(screen.getAllByText(`up to +${max} XLM`).length).toBeGreaterThan(0)
  })
})
