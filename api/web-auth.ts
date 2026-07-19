import { webAuthRoute } from './_server/composition/webauth';
import { adaptVercelRoute } from './_server/http';

export default adaptVercelRoute(webAuthRoute);
