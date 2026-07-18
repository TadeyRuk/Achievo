import { identityRoute } from './_server/composition/identity';
import { adaptVercelRoute } from './_server/http';

export default adaptVercelRoute(identityRoute);
