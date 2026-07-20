import { reconcileRoute } from './_server/composition/reconcile.js';
import { adaptVercelRoute } from './_server/http/index.js';

export default adaptVercelRoute(reconcileRoute);
