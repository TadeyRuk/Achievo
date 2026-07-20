import { rewardRoute } from './_server/composition/reward.js';
import { adaptVercelRoute } from './_server/http/index.js';

export default adaptVercelRoute(rewardRoute);
