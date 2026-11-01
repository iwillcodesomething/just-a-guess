import assert from 'node:assert/strict';
const base=process.env.JAG_TEST_API||'https://lzqdnjrherdjfpuzhkgl.supabase.co/functions/v1/just-a-guess';
let account;
async function call(path,body,expected=200){
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-region':'eu-west-1',...(account?{Authorization:'Bearer '+account.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});
 const d=await r.json();assert.equal(r.status,expected,d.error||path);return d;
}
async function ad(purpose,target){const p=await call('/v1/ads',{action:'prepare',purpose,target});assert(p.test,'This QA script only simulates test ads');await call('/v1/ads',{action:'complete-test',ticketId:p.ticketId});return p.ticketId}
try{
 account=await call('/v1/auth/guest',{},201);
 await call('/v1/game',{action:'profile',name:'Cloud Rewards QA',preferences:{visible:false}});
 const questions=[];
 const preview=threshold=>call('/v1/explore',{kind:'preview',category:'weather',country:'TR',region:745042,city:745044,metric:'precipitation_sum',threshold,days:1});
 const save=(q,choice=0,adTicket,expected=200)=>call('/v1/game',{action:'explore-predict',id:q.id,choice,confidence:80,adTicket},expected);
 for(let threshold=1;threshold<=3;threshold++){const q=await preview(threshold);questions.push(q);await save(q)}
 await save(await preview(4),0,undefined,409);console.log('PASS live Postgres: three free, fourth blocked');
 let p=await call('/v1/ads',{action:'progress'}),ads=0;
 const originalGoal=p.goal;assert(originalGoal>=1&&originalGoal<=3);assert.equal((await call('/v1/ads',{action:'progress'})).goal,originalGoal);
 while(p.bonus<3){const ticketId=await ad('extra',p.day);p=await call('/v1/ads',{action:'extra',ticketId});ads++;const retry=await call('/v1/ads',{action:'extra',ticketId});assert.equal(retry.bonus,p.bonus);assert.equal(retry.progress,p.progress);assert(ads<=9)}
 assert(ads>=3);await call('/v1/ads',{action:'prepare',purpose:'extra',target:p.day},409);
 for(let threshold=4;threshold<=6;threshold++)await save(await preview(threshold));
 await save(await preview(7),0,undefined,409);
 const state=await call('/v1/game');assert.equal(state.explore.limit,6);assert.equal(state.explore.used,6);console.log(`PASS live Postgres: ${ads} simulated test ads, three bonuses, six total, no seventh`);
 const ticket=await ad('edit','personal/'+questions[0].id);await save(questions[0],1,ticket);await call('/v1/ads',{action:'prepare',purpose:'edit',target:'personal/'+questions[0].id},409);
 const edited=(await call('/v1/game')).explore.history.find(q=>q.id===questions[0].id);assert.equal(edited.prediction.editsUsed,1);console.log('PASS live Postgres: one edit per personal prediction');
}finally{if(account){await call('/v1/game',{action:'delete-account',confirm:'SİL'});console.log('PASS temporary QA account removed')}}
