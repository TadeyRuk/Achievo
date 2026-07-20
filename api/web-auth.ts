import { webAuthRoute } from './_server/composition/webauth.js';
import { adaptVercelRoute } from './_server/http/index.js';

export default adaptVercelRoute(webAuthRoute);
