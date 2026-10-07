import {authenticate} from '../lib/security.mjs';
export default request => authenticate(request,process.env);
export const config={path:'/api/auth/*',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:60,windowLimit:12}};
