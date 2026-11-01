import {getState,mutate,runMaintenance,exploreRequest} from './engine.ts';
import {guest,register,login,resolveSession,logout,deleteAuth,prune,rateLimit,problem,digest} from './auth.ts';
import {query} from './runtime.ts';
function reply(status: number, data: any) {
  return new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
async function body(req: Request) {
  if(Number(req.headers.get('content-length'))>12000) problem('İstek boyutu çok büyük.',413);
  const reader = req.body?.getReader();
  if (!reader) return {};
  const chunks = []; let size = 0;
  while(true) {
    const {done,value} = await reader.read(); if(done)break;
    size += value.length; if(size>12000) { await reader.cancel(); problem('İstek boyutu çok büyük.',413); } chunks.push(value);
  }
  const buffer = new Uint8Array(size); let offset = 0;
  for(const chunk of chunks) { buffer.set(chunk,offset); offset+=chunk.length; }
  try { const data=JSON.parse(new TextDecoder().decode(buffer)||'{}'); if(!data||typeof data!=='object'||Array.isArray(data))problem('Geçersiz JSON.'); return data; }
  catch { problem('Geçersiz JSON.'); }
}
Deno.serve(async req => {
  try {
    const path = new URL(req.url).pathname.replace(/^\/(?:functions\/v1\/)?just-a-guess(?=\/|$)/,''), method=req.method;
    if(path==='/health'&&method==='GET') { await query('SELECT 1'); return reply(200,{ok:true,service:'just-a-guess-api',version:'0.4.0',database:'postgres'}); }
    if(method!=='GET'&&method!=='POST') return reply(405,{error:'Bu yöntem desteklenmiyor.'});
    if(path==='/maintenance'&&method==='POST') {
      const secret=req.headers.get('x-jag-cron')||'';
      const row=(await query("SELECT value FROM app_settings WHERE key='cron_hash'"))[0];
      if(!secret||!row||await digest(secret)!==row.value) problem('Yetkisiz işlem.',401);
      await prune(); await runMaintenance();
      await query("INSERT INTO app_settings(key,value) VALUES('maintenance_at',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[new Date().toISOString()]);
      return reply(200,{ok:true});
    }
    // Supabase gateway overwrites x-forwarded-for; never use a client user id header.
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    await rateLimit('api:'+ip,600,60000);
    const token=(req.headers.get('authorization')||'').replace(/^Bearer /,''), current=await resolveSession(token);
    if(path==='/v1/auth/guest'&&method==='POST') return reply(201,await guest(ip));
    if(path==='/v1/auth/register'&&method==='POST') return reply(201,await register(await body(req),current,ip));
    if(path==='/v1/auth/login'&&method==='POST') return reply(200,await login(await body(req),ip));
    if(!current) problem('Oturumun sona erdi. Yeniden giriş yap.',401);
    if(path==='/v1/auth/logout'&&method==='POST') { await logout(token); return reply(200,{message:'Çıkış yapıldı.'}); }
    if(path==='/v1/auth/me'&&method==='GET') return reply(200,{userId:current.user_id,username:current.username,guest:!current.username,expiresAt:current.expires_at});
    if(path==='/v1/explore'&&method==='POST') {await rateLimit('explore:'+current.user_id,60,60000);return reply(200,await exploreRequest(current.user_id,await body(req)));}
    if(path==='/v1/game'&&method==='GET') return reply(200,{...await getState(current.user_id),account:{guest:!current.username,username:current.username}});
    if(path==='/v1/game'&&method==='POST') { const result=await mutate(current.user_id,await body(req)); if(result.deleted)await deleteAuth(current.user_id); return reply(200,result); }
    if(path==='/v1/export'&&method==='GET') { const state=await getState(current.user_id); return reply(200,{exportedAt:new Date().toISOString(),user:state.user,stats:state.stats,history:state.history,practice:state.practice,friends:state.friends,explore:state.explore}); }
    return reply(404,{error:'API yolu bulunamadı.'});
  } catch(e) {
    if(!e.status) console.error(JSON.stringify({event:'request_error',code:e.code||'runtime',message:e.message}));
    return reply(e.status||500,{error:e.status?e.message:'Sunucu hatası. Lütfen yeniden dene.'});
  }
});
