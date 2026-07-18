/** Client helper for the always-available general feedback channel. */
import { ApiError } from '@achievo/sdk';
import { achievoClient } from '../../shared/api';

export type GeneralFeedbackPayload = {
  rating: number;
  comment?: string;
  name?: string;
};

export async function submitGeneralFeedback(
  payload: GeneralFeedbackPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await achievoClient.submitGeneralFeedback(payload);
    return { ok: true };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return {
      ok: false,
      error: error.body === undefined ? `Feedback API error ${error.status}` : error.message,
    };
  }
}
