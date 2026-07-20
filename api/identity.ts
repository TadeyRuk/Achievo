import { identityRoute } from './_server/composition/identity.js';
import { adaptVercelRoute } from './_server/http/index.js';

export default adaptVercelRoute(identityRoute);
