import {Buffer} from 'node:buffer';
import {createPublicKey,verify} from 'node:crypto';
import {env} from './runtime.mjs';
import {first,run,source,fail} from './catalog.ts';
import {safeJSON,dayOf,shiftDay} from './game.ts';

function randomGoal(){let n=255;while(n>=252)n=crypto.getRandomValues(new Uint8Array(1))[0];return n%3+1}
export async function dailyRewardState(userId:string) {
 const day=dayOf();
 await run('INSERT INTO daily_ad_progress(user_id,day,goal) VALUES(?,?,?) ON CONFLICT(user_id,day) DO NOTHING',userId,day,randomGoal());
 const row=await first('SELECT * FROM daily_ad_progress WHERE user_id=? AND day=?',userId,day);
 return {day,bonus:Number(row.bonuses),maxBonus:3,progress:Number(row.progress),goal:Number(row.goal),adsRemaining:row.bonuses>=3?0:Number(row.goal)-Number(row.progress),completed:Number(row.completed),capped:Number(row.bonuses)>=3};
}

export async function rewardConfig() {
 const mode=(await first("SELECT value FROM app_settings WHERE key='ads_mode'"))?.value||'test';if(!['test','production'].includes(mode))fail('Reklam yapılandırması geçersiz.',503);
 return {mode,test:mode==='test',placements:['edit','theme','extra'],theme:'aurora',themeHours:24};
}
async function targetDeadline(userId:string,purpose:string,target:string) {
 if(purpose==='theme'&&target==='aurora')return Date.now()+15*60000;
 if(purpose==='extra'){
   const state=await dailyRewardState(userId);
   if(target!==state.day)fail('Gün değişti. Tahmin haklarını yenile.',409);
   if(state.capped)fail('Bugünkü 3 ek tahmin hakkını aldın.',409);
   return Math.min(Date.now()+15*60000,Date.parse(shiftDay(state.day,1)+'T00:00:00+03:00'));
 }
 if(purpose!=='edit')fail('Bu reklam ödülü desteklenmiyor.');
 const personal=target.startsWith('personal/'),id=target.slice(target.indexOf('/')+1);
 if(!target.startsWith('personal/')&&!target.startsWith('daily/'))fail('Düzenlenecek tahmin seçilmedi.');
 const row=personal?await first("SELECT close_at,status,edits FROM explorations WHERE user_id=? AND id=?",userId,id):await first('SELECT q.close_at,q.status,p.edits FROM predictions p JOIN questions q ON q.id=p.question_id WHERE p.user_id=? AND p.question_id=?',userId,id);
 if(!row||row.status!=='open'||Date.parse(row.close_at)<=Date.now())fail('Bu tahmin artık düzenlenemiyor.');
 if(Number(row.edits)>=1)fail('Bu tahminin tek düzenleme hakkı kullanıldı.',409);
 return Math.min(Date.parse(row.close_at),Date.now()+15*60000);
}
export async function prepareReward(userId:string,body:any) {
 const purpose=String(body.purpose),target=String(body.target||''),deadline=await targetDeadline(userId,purpose,target),now=new Date().toISOString();
 const existing=await first('SELECT * FROM ad_tickets WHERE user_id=? AND purpose=? AND target=? AND consumed_at IS NULL AND expires_at>? AND verified_at IS NOT NULL ORDER BY created_at DESC LIMIT 1',userId,purpose,target,now);
 const config=await rewardConfig();if(existing)return {ticketId:existing.id,verified:true,...config};
 const count=await first('SELECT COUNT(*) AS n FROM ad_tickets WHERE user_id=? AND created_at>?',userId,new Date(Date.now()-3600000).toISOString());if(Number(count.n)>=20)fail('Bir saatte çok fazla reklam isteği oluşturuldu. Biraz sonra dene.',429);
 const id=crypto.randomUUID();
 await run('INSERT INTO ad_tickets(id,user_id,purpose,target,mode,created_at,expires_at) VALUES(?,?,?,?,?,?,?)',id,userId,purpose,target,config.mode,now,new Date(deadline).toISOString());
 return {ticketId:id,verified:false,...config};
}
export async function rewardStatus(userId:string,id:string) {
 const row=await first('SELECT * FROM ad_tickets WHERE user_id=? AND id=?',userId,id);if(!row)fail('Reklam kaydı bulunamadı.',404);
 return {ticketId:row.id,verified:!!row.verified_at,consumed:!!row.consumed_at,expired:row.expires_at<=new Date().toISOString(),purpose:row.purpose,target:row.target};
}
export async function completeTestReward(userId:string,id:string) {
 // Test units do not deliver SSV callbacks to a publisher's own server.
 // This route is deliberately disabled as soon as the backend enters production.
 if((await rewardConfig()).mode!=='test')fail('Test reklam doğrulaması kapalı.',403);
 await run("UPDATE ad_tickets SET verified_at=? WHERE id=? AND user_id=? AND mode='test' AND expires_at>? AND verified_at IS NULL",new Date().toISOString(),id,userId,new Date().toISOString());
 return rewardStatus(userId,id);
}
export async function rewardedEdit(userId:string,ticketId:any,target:string,statement:string,args:any[]) {
 const personal=target.startsWith('personal/'),predictionId=target.slice(target.indexOf('/')+1);
 const current=personal?await first('SELECT edits FROM explorations WHERE user_id=? AND id=?',userId,predictionId):await first('SELECT edits FROM predictions WHERE user_id=? AND question_id=?',userId,predictionId);
 if(Number(current?.edits)>=1)fail('Her tahmin yalnızca bir kez düzenlenebilir.',409);
 const id=String(ticketId||''),now=new Date().toISOString(),operation=crypto.randomUUID();
 const statements=[
   env.DB.prepare("UPDATE ad_tickets SET consumed_at=?,consumption=? WHERE id=? AND user_id=? AND purpose='edit' AND target=? AND verified_at IS NOT NULL AND consumed_at IS NULL AND expires_at>?").bind(now,operation,id,userId,target,now),
   env.DB.prepare(statement+' AND EXISTS(SELECT 1 FROM ad_tickets WHERE id=? AND consumption=?)').bind(...args,id,operation),
 ];
 const result=await env.DB.batch(statements);const changed=Number(result[1]?.meta?.changes??result[1]?.count??0);
 if(!changed){
   const row=personal?await first('SELECT edits FROM explorations WHERE user_id=? AND id=?',userId,predictionId):await first('SELECT edits FROM predictions WHERE user_id=? AND question_id=?',userId,predictionId);
   if(Number(row?.edits)>=1)fail('Her tahmin yalnızca bir kez düzenlenebilir.',409);
   fail('Tahminini düzenlemek için ödüllü reklamı tamamlamalısın. Süre dolduysa düzenleme yapılamaz.',402);
 }
}
export async function redeemExtra(userId:string,id:string) {
 const state=await dailyRewardState(userId),ticket=await first('SELECT * FROM ad_tickets WHERE id=? AND user_id=?',id,userId);
 if(!ticket||ticket.purpose!=='extra'||ticket.target!==state.day)fail('Geçerli bir ek hak reklamı bulunamadı.',400);
 if(ticket.consumed_at)return {...state,message:'Bu reklam zaten ilerlemene eklendi.'};
 if(state.capped)fail('Bugünkü 3 ek tahmin hakkını aldın.',409);
 const operation=crypto.randomUUID(),now=new Date().toISOString();
 const result=await env.DB.batch([
   env.DB.prepare("UPDATE ad_tickets SET consumed_at=?,consumption=? WHERE id=? AND user_id=? AND purpose='extra' AND target=? AND verified_at IS NOT NULL AND consumed_at IS NULL AND expires_at>?").bind(now,operation,id,userId,state.day,now),
   env.DB.prepare('UPDATE daily_ad_progress SET bonuses=bonuses+CASE WHEN progress+1>=goal THEN 1 ELSE 0 END,progress=CASE WHEN progress+1>=goal THEN 0 ELSE progress+1 END,goal=CASE WHEN progress+1>=goal THEN ? ELSE goal END,completed=completed+1 WHERE user_id=? AND day=? AND bonuses<3 AND EXISTS(SELECT 1 FROM ad_tickets WHERE id=? AND consumption=?)').bind(randomGoal(),userId,state.day,id,operation),
 ]);
 const changed=Number(result[1]?.meta?.changes??result[1]?.count??0),updated=await dailyRewardState(userId);
 if(!changed){const saved=await first('SELECT consumed_at FROM ad_tickets WHERE id=? AND user_id=?',id,userId);if(!saved?.consumed_at)fail('Ödüllü reklam henüz doğrulanmadı veya süresi doldu.',402);return {...updated,message:'Bu reklam zaten ilerlemene eklendi.'}}
 return {...updated,message:updated.progress===0?'Bir ek kişisel tahmin hakkı kazandın.':`Reklam tamamlandı. Ek hak için ${updated.adsRemaining} reklam kaldı.`};
}
export async function redeemTheme(userId:string,id:string) {
 const row=await first('SELECT * FROM users WHERE id=?',userId);if(!row)fail('Profil bulunamadı.',404);
 const operation=crypto.randomUUID(),now=new Date().toISOString(),prefs={...safeJSON(row.preferences),accent:'aurora',themeUntil:new Date(Date.now()+24*3600000).toISOString()};
 const result=await env.DB.batch([
   env.DB.prepare("UPDATE ad_tickets SET consumed_at=?,consumption=? WHERE id=? AND user_id=? AND purpose='theme' AND target='aurora' AND consumed_at IS NULL AND verified_at IS NOT NULL AND expires_at>?").bind(now,operation,id,userId,now),
   env.DB.prepare('UPDATE users SET preferences=? WHERE id=? AND EXISTS(SELECT 1 FROM ad_tickets WHERE id=? AND consumption=?)').bind(JSON.stringify(prefs),userId,id,operation),
 ]);
 if(!Number(result[1]?.meta?.changes??result[1]?.count??0))fail('Tema için ödüllü reklamı tamamlamalısın.',402);
 return {message:'Aurora profil teman 24 saatliğine açıldı.'};
}
export async function adsRequest(userId:string,body:any) {
 if(body.action==='prepare')return prepareReward(userId,body);
 if(body.action==='status')return rewardStatus(userId,String(body.ticketId));
 if(body.action==='complete-test')return completeTestReward(userId,String(body.ticketId));
 if(body.action==='theme')return redeemTheme(userId,String(body.ticketId));
 if(body.action==='extra')return redeemExtra(userId,String(body.ticketId));
 if(body.action==='progress')return dailyRewardState(userId);
 return rewardConfig();
}
export async function verifyGoogleCallback(url:URL,keys:any) {
 const raw=url.search.slice(1),parts=raw.split('&'),seen=new Set<string>();
 for(const part of parts){const name=part.split('=')[0];if(seen.has(name))fail('Tekrarlanan callback parametresi.',400);seen.add(name)}
 const signatureIndex=raw.indexOf('&signature=');
 if(signatureIndex<0||!/^signature=[A-Za-z0-9_%-]+&key_id=\d+$/.test(raw.slice(signatureIndex+1)))fail('Geçersiz reklam imzası.',403);
 const params=url.searchParams,key=keys.keys?.find((k:any)=>String(k.keyId)===params.get('key_id'));if(!key)fail('Reklam doğrulama anahtarı bulunamadı.',403);
 const timestamp=Number(params.get('timestamp'));if(!Number.isFinite(timestamp)||Math.abs(Date.now()-timestamp)>24*3600000)fail('Reklam callback zamanı geçersiz.',403);
 const pem=key.pem||'-----BEGIN PUBLIC KEY-----\n'+key.base64+'\n-----END PUBLIC KEY-----';
 let valid=false;try{valid=verify('SHA256',Buffer.from(raw.slice(0,signatureIndex)),createPublicKey(pem),Buffer.from(params.get('signature')||'','base64url'))}catch{}
 if(!valid)fail('Reklam imzası doğrulanamadı.',403);
 return params;
}
export async function googleCallback(url:URL) {
 const config=await rewardConfig();if(config.mode!=='production')fail('Canlı reklam doğrulaması bu ortamda kapalı.',403);
 const keys=await source('admob-keys','https://www.gstatic.com/admob/reward/verifier-keys.json',3600000);
 const p=await verifyGoogleCallback(url,keys.data),ticket=p.get('custom_data')||'',transaction=p.get('transaction_id')||'',unit=p.get('ad_unit')||'';
 const expected=(await first("SELECT value FROM app_settings WHERE key='ads_rewarded_unit'"))?.value||'';
 if(!expected||unit!==expected.split('/').pop()||!transaction||transaction.length>200||Number(p.get('reward_amount'))<=0)fail('Reklam callback bilgileri eşleşmiyor.',403);
 const row=await first('SELECT * FROM ad_tickets WHERE id=?',ticket);if(!row||row.mode!=='production')fail('Ödül isteği bulunamadı.',404);
 if(row.transaction_id===transaction&&row.verified_at)return {ok:true};
 if(row.expires_at<new Date().toISOString())fail('Ödül isteğinin süresi doldu.',410);
 try{await run("UPDATE ad_tickets SET verified_at=?,transaction_id=? WHERE id=? AND mode='production' AND verified_at IS NULL",new Date().toISOString(),transaction,ticket)}catch(e){if(e.code==='23505'||String(e.message).includes('UNIQUE'))fail('Reklam işlemi daha önce kullanıldı.',409);throw e}
 return {ok:true};
}
