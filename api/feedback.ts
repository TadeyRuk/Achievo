import { transactionFeedbackRoute } from './_server/composition/feedback';
import { adaptVercelRoute } from './_server/http';

export default adaptVercelRoute(transactionFeedbackRoute);
