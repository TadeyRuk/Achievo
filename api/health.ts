import { healthRoute } from './_server/composition/health';
import { adaptVercelRoute } from './_server/http';

export default adaptVercelRoute(healthRoute);
