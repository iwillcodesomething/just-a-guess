import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_PATH=':memory:';
const RealDate=Date;let clock='2026-11-01T12:00:00Z',offline=false;
globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[clock]))}static now(){return new RealDate(clock).getTime()}};
const realFetch=globalThis.fetch;
globalThis.fetch=async input=>{
 const url=new URL(input);if(offline)throw new Error('offline');
 if(url.hostname.includes('geocoding-api'))return Response.json(url.pathname.endsWith('/get')?{id:745044,name:'İstanbul',country_code:'TR',admin1_id:745042,admin1:'Istanbul',latitude:41.01,longitude:28.94,timezone:'Europe/Istanbul'}:{results:[{id:745044,name:'İstanbul',country_code:'TR',admin1_id:745042,feature_code:'PPLA',timezone:'Europe/Istanbul'}]});
 if(url.hostname.includes('open-meteo'))return Response.json({current:{time:'2026-11-01T15:00',temperature_2m:18,relative_humidity_2m:55,wind_speed_10m:12},daily:{time:['2026-11-02'],precipitation_sum:[1.2],temperature_2m_max:[21]}});
 if(url.hostname.includes('thesportsdb')) {
   if(url.pathname.includes('search_all_leagues'))return Response.json({countries:[{idLeague:'4339',strSport:'Soccer',strLeague:'Turkish Super Lig'}]});
   const done=Date.now()>Date.parse('2026-11-01T18:00:00Z');
   return Response.json({events:[{idEvent:'1234567',idLeague:'4339',strSport:'Soccer',strTimestamp:'2026-11-01T16:00:00',strLeague:'Turkish Super Lig',strHomeTeam:'Home',strAwayTeam:'Away',strStatus:done?'Match Finished':'Not Started',intHomeScore:done?'2':null,intAwayScore:done?'1':null}]});
 }
 if(url.hostname.includes('coinbase')) {
   if(url.pathname==='/products')return Response.json([{id:'BTC-USD',base_currency:'BTC',quote_currency:'USD',display_name:'BTC/USD',status:'online',trading_disabled:false}]);
   if(url.pathname.endsWith('ticker'))return Response.json({price:'100',time:new Date().toISOString(),volume:'10'});
   if(url.pathname.endsWith('candles'))return Response.json([[Date.parse(url.searchParams.get('start'))/1000,99,103,100,102,10]]);
 }
 if(url.hostname.includes('frankfurter'))return Response.json({date:url.searchParams.get('date')||'2026-10-30',base:'USD',quote:'TRY',rate:url.searchParams.has('date')?50.5:49.9});
 if(url.hostname.includes('wikimedia'))return Response.json(url.pathname.includes('/top/')?{items:[{articles:[{article:'Taylor_Swift',views:1000},{article:'Anasayfa',views:5000}]}]}:{items:[{views:1100}]});
 throw new Error('Unexpected provider '+url);
};
const {makeServer,maintenance}=await import('../src/server.mjs');
const {sql}=await import('../src/runtime.mjs');
const {localMidnight}=await import('../src/explore.ts');
let server,base;
before(async()=>{server=makeServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port});
after(async()=>{await new Promise(r=>server.close(r))});
beforeEach(()=>{clock='2026-11-01T12:00:00Z';offline=false;for(const table of ['result_bonuses','daily_ad_progress','ad_tickets','explorations','users','predictions','practice','questions','friends','source_cache','app_settings','sessions','accounts','auth_limits'])sql.exec('DELETE FROM '+table)});
async function request(path,body,token){const r=await realFetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()}}
async function guest(){return (await request('/v1/auth/guest',{})).data}
const weather={kind:'preview',category:'weather',country:'TR',region:745042,city:745044,metric:'precipitation_sum',threshold:1,days:1};
async function preview(token,body=weather){const r=await request('/v1/explore',body,token);assert.equal(r.status,200,JSON.stringify(r.data));return r.data}
async function save(token,q,choice=0,confidence=80,adTicket){return request('/v1/game',{action:'explore-predict',id:q.id,choice,confidence,adTicket},token)}

const {participationStreak}=await import('../src/game.ts');
async function reward(token,purpose,target){const p=await request('/v1/ads',{action:'prepare',purpose,target},token);assert.equal(p.status,200,JSON.stringify(p.data));await request('/v1/ads',{action:'complete-test',ticketId:p.data.ticketId},token);return p.data.ticketId}
async function progress(token){return (await request('/v1/ads',{action:'progress'},token)).data}
async function extra(token){const p=await progress(token),id=await reward(token,'extra',p.day),r=await request('/v1/ads',{action:'extra',ticketId:id},token);assert.equal(r.status,200,JSON.stringify(r.data));return {...r.data,ticket:id}}
test('three free personal predictions and up to three ads guarantee one extra slot',async()=>{
 const a=await guest();for(const threshold of [1,2,3])assert.equal((await save(a.token,await preview(a.token,{...weather,threshold}))).status,200);
 const fourth=await preview(a.token,{...weather,threshold:4});assert.equal((await save(a.token,fourth)).status,409);
 const p=await progress(a.token);sql.prepare('UPDATE daily_ad_progress SET goal=3 WHERE user_id=? AND day=?').run(a.userId,p.day);
 for(let i=1;i<=2;i++){const r=await extra(a.token);assert.equal(r.bonus,0);assert.equal(r.progress,i);assert.equal(r.goal,3)}
 const third=await extra(a.token);assert.equal(third.bonus,1);assert.equal(third.progress,0);
 assert.equal((await save(a.token,fourth)).status,200);const state=(await request('/v1/game',undefined,a.token)).data;
 assert.equal(state.explore.baseLimit,3);assert.equal(state.explore.limit,4);assert.equal(state.explore.used,4);
});
test('each random goal is bounded and persists across reads and uncompleted ads',async()=>{
 const a=await guest(),initial=await progress(a.token);assert(initial.goal>=1&&initial.goal<=3);
 const ticket=(await request('/v1/ads',{action:'prepare',purpose:'extra',target:initial.day},a.token)).data.ticketId;
 assert.equal((await request('/v1/ads',{action:'extra',ticketId:ticket},a.token)).status,402);
 for(let i=0;i<8;i++)assert.deepEqual(await progress(a.token),initial);
});
test('at most nine completed ads earn exactly three bonus slots and cap personal entries at six',async()=>{
 const a=await guest();await progress(a.token);
 for(let bonus=1;bonus<=3;bonus++){
   sql.prepare('UPDATE daily_ad_progress SET goal=3 WHERE user_id=? AND progress=0').run(a.userId);
   let last;for(let i=0;i<3;i++)last=await extra(a.token);assert.equal(last.bonus,bonus);
 }
 const p=await progress(a.token);assert.equal(p.completed,9);assert.equal(p.capped,true);
 assert.equal((await request('/v1/ads',{action:'prepare',purpose:'extra',target:p.day},a.token)).status,409);
 for(let threshold=1;threshold<=6;threshold++)assert.equal((await save(a.token,await preview(a.token,{...weather,threshold}))).status,200);
 assert.equal((await save(a.token,await preview(a.token,{...weather,threshold:7}))).status,409);
 assert.equal((await request('/v1/game',undefined,a.token)).data.explore.limit,6);
});
test('duplicate and concurrent reward redemptions count each completed ad once',async()=>{
 const a=await guest(),p=await progress(a.token);sql.prepare('UPDATE daily_ad_progress SET goal=3 WHERE user_id=?').run(a.userId);
 const ticket=await reward(a.token,'extra',p.day);
 const responses=await Promise.all(Array.from({length:8},()=>request('/v1/ads',{action:'extra',ticketId:ticket},a.token)));
 assert(responses.every(r=>r.status===200));const r=await progress(a.token);assert.equal(r.completed,1);assert.equal(r.progress,1);assert.equal(r.bonus,0);
});
test('foreign tickets cannot grant extra slots and edit/theme ads do not silently count as extra ads',async()=>{
 const a=await guest(),b=await guest(),p=await progress(a.token),ticket=await reward(a.token,'extra',p.day);
 assert.equal((await request('/v1/ads',{action:'extra',ticketId:ticket},b.token)).status,400);
 const theme=await reward(a.token,'theme','aurora');assert.equal((await request('/v1/ads',{action:'extra',ticketId:theme},a.token)).status,400);assert.equal((await progress(a.token)).completed,0);
});
test('TR midnight resets quota and progress while old-day rewards do not carry over',async()=>{
 const a=await guest();clock='2026-11-01T20:59:00Z';const p=await progress(a.token),ticket=await reward(a.token,'extra',p.day);
 clock='2026-11-01T21:00:01Z';const next=await progress(a.token);assert.equal(next.day,'2026-11-02');assert.equal(next.bonus,0);assert.equal(next.progress,0);
 assert.equal((await request('/v1/ads',{action:'extra',ticketId:ticket},a.token)).status,400);
});
test('one lifetime edit per personal prediction is exposed to UI and cannot be bought again',async()=>{
 const a=await guest(),q=await preview(a.token);await save(a.token,q);const ticket=await reward(a.token,'edit','personal/'+q.id);
 assert.equal((await save(a.token,q,1,65,ticket)).status,200);
 const s=(await request('/v1/game',undefined,a.token)).data;assert.equal(s.explore.history[0].prediction.editsUsed,1);assert.equal(s.explore.history[0].prediction.editsRemaining,0);
 assert.equal((await request('/v1/ads',{action:'prepare',purpose:'edit',target:'personal/'+q.id},a.token)).status,409);
 assert.equal((await save(a.token,q,0,95,ticket)).status,409);
});
test('result XP is committed once, cannot be rerolled and never changes competitive scores',async()=>{
 const a=await guest(),q=await preview(a.token);await save(a.token,q);clock='2026-11-03T06:00:00Z';await maintenance();
 const body={action:'claim-result-bonus',scope:'personal',id:q.id},first=await request('/v1/game',body,a.token);assert.equal(first.status,200);
 assert([0,1,2,5,10].includes(first.data.multiplier));assert.equal(first.data.xp,first.data.multiplier*10);
 const attempts=await Promise.all(Array.from({length:12},()=>request('/v1/game',body,a.token)));
 assert(attempts.every(r=>r.status===200&&r.data.xp===first.data.xp&&r.data.fresh===false));
 const state=(await request('/v1/game',undefined,a.token)).data;assert.equal(state.stats.bonusXP,first.data.xp);assert.equal(state.ranks.week.find(r=>r.me).points,0);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM result_bonuses').get().n,1);
 const b=await guest();assert.equal((await request('/v1/game',body,b.token)).status,400);
});
test('wrong results retain actual measurements and never grant bonus XP',async()=>{
 const a=await guest(),q=await preview(a.token,{...weather,threshold:5});await save(a.token,q);clock='2026-11-03T06:00:00Z';await maintenance();
 const s=(await request('/v1/game',undefined,a.token)).data;assert.equal(s.explore.history[0].actual_value,1.2);assert.equal(s.explore.history[0].outcome,1);
 const result=await request('/v1/game',{action:'claim-result-bonus',scope:'personal',id:q.id},a.token);assert.equal(result.data.xp,0);assert.equal(result.data.multiplier,0);
});
test('strict streaks reset after a skipped full day without deleting past scores',()=>{
 assert.equal(participationStreak(['2026-11-01','2026-11-03'],'2026-11-03').length,1);
 assert.equal(participationStreak(['2026-11-01'],'2026-11-03').length,0);
 assert.equal(participationStreak(['2026-11-01','2026-11-02'],'2026-11-03').length,2);
 assert.equal(participationStreak(['2026-11-01','2026-11-03'],'2026-11-03').pauses,0);
});
