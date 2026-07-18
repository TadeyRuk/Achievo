import { payoutsRoute } from './_server/composition/rewards';
import { adaptVercelRoute } from './_server/http';

export default adaptVercelRoute(payoutsRoute);
