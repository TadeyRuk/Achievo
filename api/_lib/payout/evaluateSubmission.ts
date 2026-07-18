import { ScoringAgent, type Evaluation } from '../../_agents/scoring';
import { HeuristicScoringAgent } from '../../_agents/heuristic';

export type ScoringMode = 'groq' | 'heuristic';

export async function evaluateSubmission(
  activityText: string,
): Promise<{ evaluation: Evaluation; scoringMode: ScoringMode }> {
  try {
    const evaluation = await ScoringAgent.evaluate(activityText);
    return { evaluation, scoringMode: 'groq' };
  } catch {
    return {
      evaluation: HeuristicScoringAgent.evaluate(activityText),
      scoringMode: 'heuristic',
    };
  }
}
