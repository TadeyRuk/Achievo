export type StepStatus = 'idle' | 'running' | 'done' | 'error';

export interface PipelineStep {
  name: string;
  desc: string;
  status: StepStatus;
  detail?: string;
}
