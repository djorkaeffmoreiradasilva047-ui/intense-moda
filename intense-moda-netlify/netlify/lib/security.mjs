import {createHmac, randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';

const cookieName = '__Host-intense_session';
const ttl = 8 * 60 * 60;
let cachedPassword, cachedKey;

function key(env) {
  const password = env.ADMIN_PASSWORD;
  if (typeof password !== 'string' || password.length < 16 || password.length > 256) return null;
  if (password !== cachedPassword) {
    cachedKey = scryptSync(password, 'intense-moda-netlify-session-v1', 32);
    cachedPassword = password;
  }
  return cachedKey;
}
function sign(value, secret) { return createHmac('sha256', secret).update(value).digest('base64url'); }
function equal(a, b) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export const configured = env => !!key(env);
export function verifyPassword(password, env) {
  const secret = key(env);
  if (!secret || typeof password !== 'string' || password.length > 256) return false;
  return equal(sign(password, secret), sign(env.ADMIN_PASSWORD, secret));
}
export function sessionCookie(request, env) {
  const secret = key(env);
  if (!secret) throw new Error('Password not configured');
  const body = Buffer.from(JSON.stringify({aud: new URL(request.url).host, exp: Math.floor(Date.now()/1000)+ttl, nonce:randomBytes(16).toString('hex')})).toString('base64url');
  return `${cookieName}=${body}.${sign(body, secret)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ttl}`;
}
export const expiredCookie = () => `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export function authorized(request, env) {
  const secret = key(env); if (!secret) return false;
  const cookie = (request.headers.get('cookie') || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='));
  if (!cookie || cookie.length > 1000) return false;
  const [body, signature, extra] = cookie.slice(cookieName.length+1).split('.');
  if (!body || !signature || extra || !equal(signature, sign(body, secret))) return false;
  try {const claim=JSON.parse(Buffer.from(body,'base64url').toString());return claim.aud===new URL(request.url).host&&Number.isInteger(claim.exp)&&claim.exp>Math.floor(Date.now()/1000);} catch {return false;}
}
export function sameOrigin(request) { return request.headers.get('origin') === new URL(request.url).origin; }
export function json(body, status=200, headers={}) {
  return new Response(JSON.stringify(body), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','netlify-cdn-cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
}
export async function authenticate(request, env) {
  if (request.method!=='POST') return json({error:'Método inválido.'},405);
  if (!sameOrigin(request)) return json({error:'Origem inválida.'},403);
  const path=new URL(request.url).pathname;
  if (path==='/api/auth/logout') return json({ok:true},200,{'set-cookie':expiredCookie()});
  if (path!=='/api/auth/login') return json({error:'Página não encontrada.'},404);
  if (!configured(env)) return json({error:'Configure ADMIN_PASSWORD com pelo menos 16 caracteres nas variáveis da Netlify e publique novamente para ativar o painel.'},503);
  const text=await request.text();if(text.length>1500)return json({error:'Confira a senha.'},400);
  let input;try{input=JSON.parse(text);}catch{return json({error:'Confira a senha.'},400);}
  if(!verifyPassword(input.password,env))return json({error:'Senha incorreta.'},401);
  return json({ok:true},200,{'set-cookie':sessionCookie(request,env)});
}
