import {getStore} from '@netlify/blobs';
import {createCatalogHandler} from '../lib/catalog.mjs';
import {panelHTML} from '../lib/views.mjs';
import {seedProducts} from '../lib/seed.mjs';

const legacyExamples=new Set(['Blusa canelada','Camisa casual','Blazer de alfaiataria']);
const handler=createCatalogHandler({getStore,env:process.env,seed:seedProducts,panelHTML});

export default async request=>{
  const response=await handler(request);
  const path=new URL(request.url).pathname;
  if(request.method==='GET'&&response.ok&&(path==='/api/products'||path==='/api/admin/catalog')){
    try{
      const data=await response.clone().json();
      if(Array.isArray(data.products))data.products=data.products.filter(product=>!legacyExamples.has(product.name));
      return new Response(JSON.stringify(data),{status:response.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
    }catch{}
  }
  return response;
};

export const config={path:['/api/products','/api/admin/*','/uploads/*','/painel','/admin','/admin.html'],preferStatic:true};
