import {
  createGeneralFeedbackRoute,
  createTransactionFeedbackRoute,
} from '../features/feedback/routes';
import type { FeedbackPorts } from '../features/feedback/ports';
import {
  GoogleFormsConfigError,
  GoogleFormsSubmitError,
  submitFeedbackForm,
} from '../infrastructure/notifications';
import {
  claimOnce,
  releaseClaim,
  StoreUnavailableError,
} from '../infrastructure/store';

const feedbackPorts: FeedbackPorts = {
  claimOnce,
  releaseClaim,
  submitTransaction(payload) {
    return submitFeedbackForm({ type: 'transaction', comment: null, ...payload });
  },
  submitGeneral(payload) {
    return submitFeedbackForm({ type: 'general', comment: null, ...payload });
  },
  mapError(cause) {
    if (cause instanceof StoreUnavailableError || cause instanceof GoogleFormsConfigError) {
      return { status: 503, message: cause.message };
    }
    if (cause instanceof GoogleFormsSubmitError) {
      return { status: 502, message: cause.message };
    }
    return null;
  },
};

export const transactionFeedbackRoute = createTransactionFeedbackRoute(feedbackPorts);
export const generalFeedbackRoute = createGeneralFeedbackRoute(feedbackPorts);
