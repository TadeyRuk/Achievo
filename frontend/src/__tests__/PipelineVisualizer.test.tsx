import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PipelineVisualizer, type PipelineStep } from '../features/earn/PipelineVisualizer'

const steps: PipelineStep[] = [
  { name: 'Activity Agent', desc: 'Parsing…', status: 'done', detail: 'tutoring' },
  { name: 'Verification Agent', desc: 'Checking…', status: 'done' },
  { name: 'Reward Agent', desc: 'Calculating…', status: 'running', detail: 'up to 10 XLM' },
  { name: 'Kouri Agent', desc: 'Settling…', status: 'idle' },
  { name: 'Feedback Agent', desc: 'Formatting…', status: 'error', detail: 'Rate limit: try tomorrow' },
]

describe('PipelineVisualizer', () => {
  it('renders step details and error reason', () => {
    render(<PipelineVisualizer steps={steps} logs={['log line']} />)
    expect(screen.getByText('Activity Agent')).toBeInTheDocument()
    expect(screen.getByText('tutoring')).toBeInTheDocument()
    expect(screen.getByText('up to 10 XLM')).toBeInTheDocument()
    expect(screen.getByText('Rate limit: try tomorrow')).toBeInTheDocument()
    expect(screen.getAllByText('Error').length).toBeGreaterThan(0)
    expect(screen.getByText('log line')).toBeInTheDocument()
  })
})
