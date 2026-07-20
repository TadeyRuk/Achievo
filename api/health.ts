import { healthRoute } from './_server/composition/health.js';
import { adaptVercelRoute } from './_server/http/index.js';

export default adaptVercelRoute(healthRoute);
