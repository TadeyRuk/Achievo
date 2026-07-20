import { transactionFeedbackRoute } from './_server/composition/feedback.js';
import { adaptVercelRoute } from './_server/http/index.js';

export default adaptVercelRoute(transactionFeedbackRoute);
