import assert from 'node:assert/strict';
const base='https://lzqdnjrherdjfpuzhkgl.supabase.co/functions/v1/just-a-guess';
let account,passed=0;
async function call(path,body,expected=200){
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-region':'eu-west-1',...(account?{Authorization:'Bearer '+account.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});
 const data=await r.json();assert.equal(r.status,expected,`${path}: ${r.status} ${data.error||''}`);return data;
}
function pass(name){console.log('PASS '+name);passed++}
async function catalog(body){return call('/v1/explore',body)}
async function predict(q){return call('/v1/game',{action:'explore-predict',id:q.id,choice:0,confidence:80})}
try{
 account=await call('/v1/auth/guest',{},201);
 await call('/v1/game',{action:'profile',name:'Cloud Explore QA',preferences:{visible:false}});
 const config=await catalog({kind:'categories'});assert.equal(config.categories.length,6);assert.equal(config.sports.length,8);pass('six categories and eight sports');
 const countries=await catalog({kind:'countries'});assert.equal(countries.items.length,250);
 const regions=await catalog({kind:'regions',country:'TR'});assert.equal(regions.items.length,81);pass('world countries and all 81 Turkish provinces');
 const cities=await catalog({kind:'cities',country:'TR',region:745042,search:'Istanbul'});assert(cities.items.some(c=>c.id===745044));pass('country → province → live city search');
 const weather=await catalog({kind:'preview',category:'weather',country:'TR',region:745042,city:745044,metric:'temperature_2m_max',threshold:20,days:1});assert.equal(weather.rule.latitude,41.01384);assert.equal(weather.scope,'explore');await predict(weather);pass('real weather snapshot and durable personal prediction');
 const coins=await catalog({kind:'coins'});assert(coins.items.some(c=>c.id==='BTC-USD'));pass('current Coinbase product list ('+coins.items.length+' USD pairs)');
 const crypto=await catalog({kind:'preview',category:'crypto',coin:'BTC-USD',market:'up',hours:1});assert(crypto.rule.baseline>0);await predict(crypto);pass('current crypto price and fixed future target');
 const fx=await catalog({kind:'preview',category:'fx',base:'USD',quote:'TRY'});assert(fx.rule.baseline>0);assert.equal(fx.source,'Frankfurter / ECB');pass('live ECB reference rate and exact target date');
 await call('/v1/game',{action:'explore-predict',id:fx.id,choice:0,confidence:80},409);pass('Postgres enforces two personal predictions per day');
 const wiki=await catalog({kind:'preview',category:'culture',language:'tr',branch:'music',article:'Taylor_Swift',threshold:1000});assert(wiki.snapshot.values[0].value>=0);pass('real Wikipedia daily pageview baseline');
 const leagues=await catalog({kind:'leagues',country:'TR',sport:'Soccer'});assert(leagues.items.length>0);pass('country → sport → actual leagues');
 const league=leagues.items.find(l=>l.id==='4339')||leagues.items[0];
 const matches=await catalog({kind:'matches',league:league.id});
 if(matches.items.length){const q=await catalog({kind:'preview',category:'sport',match:matches.items[0].id,market:'winner'});assert.equal(q.options.length,3);pass('league → actual upcoming match → three-way question')}
 else console.log('SKIP sport preview: provider has no upcoming match within the free coverage');
 const state=await call('/v1/game');assert.equal(state.explore.used,2);assert.equal(state.stats.total,0);assert.equal(state.ranks.week.find(r=>r.me).points,0);pass('personal results isolated from competitive table');
 const exported=await call('/v1/export');assert.equal(exported.explore.history.length,2);pass('personal predictions included in export');
}finally{
 if(account){await call('/v1/game',{action:'delete-account',confirm:'SİL'});pass('temporary QA account and predictions removed')}
}
console.log(passed+' live exploration checks passed');
