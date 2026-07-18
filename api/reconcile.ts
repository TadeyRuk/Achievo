import { reconcileRoute } from './_server/composition/routes';
import { adaptVercelRoute } from './_server/http';

export default adaptVercelRoute(reconcileRoute);
