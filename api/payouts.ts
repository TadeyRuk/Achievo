import { payoutsRoute } from './_server/composition/payouts.js';
import { adaptVercelRoute } from './_server/http/index.js';

export default adaptVercelRoute(payoutsRoute);
