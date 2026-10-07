import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getStore} from '@netlify/blobs';
import {BlobsServer} from '@netlify/blobs/server';
import {createCatalogHandler} from '../netlify/lib/catalog.mjs';
import {authenticate} from '../netlify/lib/security.mjs';

test('private panel, durable photo/description, publication, edits, conflicts, session protection',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'intense-blobs-'));
  const server=new BlobsServer({directory:dir,token:'test-token',logger:()=>{}});
  const address=await server.start();
  try {
    const env={ADMIN_PASSWORD:'Private-test-password-2026'};
    const store=options=>{
      const client=getStore({...options,apiURL:`http://127.0.0.1:${address.port}`,siteID:'00000000-0000-0000-0000-000000000001',token:'test-token'});
      const get=client.getWithMetadata.bind(client);
      // The official local server omits the GET ETag. LIST supplies the same
      // filesystem ETag used for its conditional writes. Production includes it.
      client.getWithMetadata=async(key,opts)=>{const entry=await get(key,opts);if(entry&&!entry.etag){const {blobs}=await client.list({prefix:key});entry.etag=blobs.find(b=>b.key===key)?.etag;}return entry;};
      return client;
    };
    const handler=createCatalogHandler({getStore:store,env,panelHTML:'<h1>Painel protegido</h1>'});
    let cookie='';
    const req=(path,method='GET',body,headers={})=>new Request('https://loja.test'+path,{method,body,headers:{...(cookie?{cookie}:{}),origin:'https://loja.test',...headers}});
    assert.equal((await handler(req('/painel'))).status,302);
    assert.equal((await handler(req('/api/admin/catalog'))).status,401);
    assert.equal((await authenticate(req('/api/auth/login','POST',JSON.stringify({password:'wrong'})),env)).status,401);
    const login=await authenticate(req('/api/auth/login','POST',JSON.stringify({password:env.ADMIN_PASSWORD})),env);
    assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
    cookie=login.headers.get('set-cookie').split(';')[0];
    assert.equal((await handler(req('/painel'))).status,200);
    assert.equal((await handler(req('/api/admin/catalog','GET',undefined,{cookie:cookie+'tampered'}))).status,401);
    const form=new FormData();form.set('product',JSON.stringify({name:'Vestido preto',description:'Tecido leve\nCaimento confortável',category:'Feminino',price:9990,color:'Preto',sizes:['M','G']}));
    form.set('photo',new Blob([await readFile('public/assets/hero-luxury.webp')],{type:'image/webp'}),'photo.webp');
    const created=await handler(req('/api/admin/products','POST',form));assert.equal(created.status,200);const {id}=await created.json();
    assert.equal((await (await handler(req('/api/products'))).json()).products.length,0);
    const draft=await (await handler(req('/api/admin/catalog'))).json();assert.equal(draft.products.length,1);assert.equal(draft.products[0].description,'Tecido leve\nCaimento confortável');
    const publish=await handler(req('/api/admin/publish','POST',JSON.stringify({revision:draft.revision,draftRevision:draft.draftRevision})));assert.equal(publish.status,200);
    let publicCatalog=await (await handler(req('/api/products'))).json();assert.equal(publicCatalog.products[0].price,9990);
    assert.equal((await handler(req('/api/admin/publish','POST',JSON.stringify({revision:0,draftRevision:0})))).status,409);
    const edit=new FormData();edit.set('product',JSON.stringify({name:'Vestido preto',description:'Descrição atualizada',category:'Feminino',price:10990,color:'Preto',sizes:['M']}));
    assert.equal((await handler(req('/api/admin/products/'+id,'PUT',edit))).status,200);
    assert.equal((await (await handler(req('/api/products'))).json()).products[0].price,9990);
    const otherOrigin=await handler(req('/api/admin/products/'+id,'DELETE',undefined,{origin:'https://evil.test'}));assert.equal(otherOrigin.status,403);
    const photoURL=publicCatalog.products[0].image;
    assert.equal((await handler(req('/api/admin/products/'+id,'DELETE'))).status,200);
    assert.equal((await handler(req(photoURL))).status,200);
    const emptyDraft=await (await handler(req('/api/admin/catalog'))).json();
    assert.equal((await handler(req('/api/admin/publish','POST',JSON.stringify({revision:emptyDraft.revision,draftRevision:emptyDraft.draftRevision})))).status,200);
    publicCatalog=await (await handler(req('/api/products'))).json();assert.equal(publicCatalog.products.length,0);assert.equal(publicCatalog.published,true);
    const secondHandler=createCatalogHandler({getStore:store,env});assert.equal((await (await secondHandler(req('/api/products'))).json()).revision,2);
    assert.equal((await secondHandler(new Request('https://other.test/api/admin/catalog',{headers:{cookie}}))).status,401);
    assert.equal((await createCatalogHandler({getStore:store,env:{ADMIN_PASSWORD:'Another-private-password'}})(req('/api/admin/catalog'))).status,401);
  }finally{await server.stop();await rm(dir,{recursive:true,force:true});}
});
