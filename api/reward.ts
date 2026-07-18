import { rewardRoute } from './_server/composition/reward';
import { adaptVercelRoute } from './_server/http';

export default adaptVercelRoute(rewardRoute);
