import { reconcileRoute } from './_server/composition/reconcile';
import { adaptVercelRoute } from './_server/http';

export default adaptVercelRoute(reconcileRoute);
