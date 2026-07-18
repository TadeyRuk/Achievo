import { payoutsRoute } from './_server/composition/payouts';
import { adaptVercelRoute } from './_server/http';

export default adaptVercelRoute(payoutsRoute);
