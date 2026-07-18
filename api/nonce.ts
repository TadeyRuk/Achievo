import { nonceRoute } from './_server/composition/nonce';
import { adaptVercelRoute } from './_server/http';

export default adaptVercelRoute(nonceRoute);
