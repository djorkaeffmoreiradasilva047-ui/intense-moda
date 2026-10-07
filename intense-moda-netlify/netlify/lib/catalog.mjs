import {randomUUID} from 'node:crypto';
import {authorized,json,sameOrigin} from './security.mjs';

const sizes=['P','M','G','GG','Extra','2','4','6','8','10','12','14','16'];
const categories=['Feminino','Masculino','Infantil'];
const stateKey='catalog-v1';
const initial=seed=>({draft:structuredClone(seed),published:structuredClone(seed),revision:0,draftRevision:0,publishedAt:null});
const compare=items=>JSON.stringify(items.map(p=>({...p})).sort((a,b)=>a.id.localeCompare(b.id)));
export const present=p=>({id:p.id,name:p.name,description:p.description||'',category:p.category,price:p.price,color:p.color,sizes:p.sizes,image:'/uploads/'+p.imageKey,alt:p.name,illustrative:false});
const view=s=>({products:s.draft.map(present),publishedCount:s.published.length,pending:s.revision===0||compare(s.draft)!==compare(s.published),revision:s.revision,draftRevision:s.draftRevision,publishedAt:s.publishedAt});
function photoOK(bytes,type){return type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:type==='image/webp'?Buffer.from(bytes.slice(0,4)).toString()==='RIFF'&&Buffer.from(bytes.slice(8,12)).toString()==='WEBP':false;}
function validProduct(item){return item&&typeof item.name==='string'&&item.name.trim()&&item.name.length<=100&&typeof item.description==='string'&&item.description.length<=2000&&categories.includes(item.category)&&Number.isInteger(item.price)&&item.price>0&&item.price<=100000000&&typeof item.color==='string'&&item.color.trim()&&item.color.length<=60&&Array.isArray(item.sizes)&&item.sizes.length&&item.sizes.every(s=>sizes.includes(s));}
export function createCatalogHandler({getStore,env,seed=[],panelHTML=''}) {
  const stores=()=>({catalog:getStore({name:'intense-catalog',consistency:'strong'}),images:getStore({name:'intense-images',consistency:'strong'})});
  async function read(store){const entry=await store.getWithMetadata(stateKey,{type:'json',consistency:'strong'});return {state:entry?.data||initial(seed),etag:entry?.etag};}
  async function write(store,state,etag){const result=await store.setJSON(stateKey,state,etag?{onlyIfMatch:etag}:{onlyIfNew:true});return result.modified;}
  return async function handle(request){
    const url=new URL(request.url),path=url.pathname;
    try {
      if(['/painel','/admin','/admin.html'].includes(path)){
        if(!authorized(request,env))return new Response(null,{status:302,headers:{location:'/entrar.html','cache-control':'no-store'}});
        return new Response(panelHTML,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','netlify-cdn-cache-control':'no-store','x-content-type-options':'nosniff'}});
      }
      if(path==='/api/products'&&request.method==='GET'){
        const {catalog}=stores(),{state}=await read(catalog);
        return json({products:state.published.map(present),published:true,revision:state.revision});
      }
      if(path.startsWith('/uploads/')&&request.method==='GET'){
        const imageKey=path.slice(9);if(!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(imageKey))return new Response('Não encontrado',{status:404});
        const {images}=stores(),entry=await images.getWithMetadata(imageKey,{type:'arrayBuffer',consistency:'strong'});
        if(!entry)return new Response('Não encontrado',{status:404});
        return new Response(entry.data,{headers:{'content-type':entry.metadata.type||'image/webp','cache-control':'public,max-age=86400','x-content-type-options':'nosniff'}});
      }
      if(!path.startsWith('/api/admin/'))return json({error:'Página não encontrada.'},404);
      if(!authorized(request,env))return json({error:'Entre no painel com a sua senha.'},401);
      if(request.method!=='GET'&&!sameOrigin(request))return json({error:'Origem inválida.'},403);
      if(path==='/api/admin/session'&&request.method==='GET')return json({allowed:true});
      const {catalog,images}=stores();
      if(path==='/api/admin/catalog'&&request.method==='GET')return json(view((await read(catalog)).state));
      if(path==='/api/admin/publish'&&request.method==='POST'){
        let input;try{input=await request.json();}catch{return json({error:'Atualize o painel antes de publicar.'},400);}
        const {state,etag}=await read(catalog);
        if(input.revision!==state.revision||input.draftRevision!==state.draftRevision)return json({error:'O catálogo mudou em outra janela. Atualize e confira antes de publicar.'},409);
        const next={...state,published:structuredClone(state.draft),revision:state.revision+1,publishedAt:Date.now()};
        if(!await write(catalog,next,etag))return json({error:'O catálogo mudou em outra janela. Atualize e confira antes de publicar.'},409);
        return json({ok:true,...view(next)});
      }
      const match=path.match(/^\/api\/admin\/products(?:\/([a-f0-9-]+))?$/);if(!match)return json({error:'Página não encontrada.'},404);
      const id=match[1],{state,etag}=await read(catalog),existing=id?state.draft.find(p=>p.id===id):null;
      if(request.method==='GET'&&!id)return json(state.draft.map(present));
      if(id&&!existing)return json({error:'Peça não encontrada.'},404);
      if(request.method==='DELETE'&&id){const next={...state,draft:state.draft.filter(p=>p.id!==id),draftRevision:state.draftRevision+1};if(!await write(catalog,next,etag))return json({error:'Outra janela alterou o catálogo. Atualize o painel.'},409);return json({ok:true});}
      if(!((request.method==='POST'&&!id)||(request.method==='PUT'&&id)))return json({error:'Método inválido.'},405);
      // Reading the bounded body also covers requests without Content-Length.
      const bytes=await request.arrayBuffer();if(bytes.byteLength>3.5*1024*1024)return json({error:'Use uma foto de até 3 MB.'},413);
      const data=await new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')||''},body:bytes}).formData();
      let item;try{item=JSON.parse(String(data.get('product')));}catch{return json({error:'Confira os dados da peça.'},400);}
      if(item&&item.description===undefined)item.description='';
      if(!validProduct(item))return json({error:'Informe nome, categoria, cor, preço e tamanhos. A descrição deve ter até 2.000 caracteres.'},400);
      const file=data.get('photo');let imageKey=existing?.imageKey,uploaded=false;
      if(file&&typeof file.arrayBuffer==='function'&&file.size){
        if(file.size>3*1024*1024)return json({error:'Use uma foto de até 3 MB.'},413);
        const contents=new Uint8Array(await file.arrayBuffer());if(!photoOK(contents,file.type))return json({error:'Use JPG, PNG ou WebP.'},400);
        imageKey=randomUUID()+({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[file.type]);
        await images.set(imageKey,contents,{metadata:{type:file.type}});uploaded=true;
      }
      if(!imageKey)return json({error:'Adicione uma foto da roupa.'},400);
      const product={id:id||randomUUID(),name:item.name.trim(),description:item.description.trim(),category:item.category,price:item.price,color:item.color.trim(),sizes:[...new Set(item.sizes)],imageKey,createdAt:existing?.createdAt||Date.now()};
      const next={...state,draft:existing?state.draft.map(p=>p.id===id?product:p):[product,...state.draft],draftRevision:state.draftRevision+1};
      try{if(!await write(catalog,next,etag)){if(uploaded)await images.delete(imageKey);return json({error:'Outra janela alterou o catálogo. Atualize o painel e salve novamente.'},409);}}catch(error){if(uploaded)await images.delete(imageKey);throw error;}
      // Keep older images: a concurrently published snapshot may still use them.
      return json({ok:true,id:product.id});
    }catch(error){console.error('Catalog request failed',error.message);return json({error:'Não foi possível acessar o catálogo. Tente novamente.'},503);}
  };
}
