import {getStore} from '@netlify/blobs';
import {createCatalogHandler} from '../lib/catalog.mjs';
import {panelHTML} from '../lib/views.mjs';
import {seedProducts} from '../lib/seed.mjs';
export default async request => createCatalogHandler({getStore,env:process.env,seed:seedProducts,panelHTML})(request);
export const config={path:['/api/products','/api/admin/*','/uploads/*','/painel','/admin','/admin.html'],preferStatic:true};
