import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const base=process.env.JAG_TEST_API||'https://lzqdnjrherdjfpuzhkgl.supabase.co/functions/v1/just-a-guess';
const accounts=[];let passed=0;
async function call(path,method='GET',data,token,expected=200){
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json','x-region':'eu-west-1',...(token?{Authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(40000)});
 const body=await response.json();assert.equal(response.status,expected,`${method} ${path}: ${response.status} ${body.error||''}`);return body;
}
function ok(name){passed++;console.log('PASS '+name)}
try{
 assert.equal((await call('/health')).database,'postgres');ok('live Postgres health');
 await call('/v1/game','GET',undefined,undefined,401);ok('unauthenticated access denied');
 await call('/maintenance','POST',{},undefined,401);ok('maintenance requires private credential');
 const guest=await call('/v1/auth/guest','POST',{},undefined,201);accounts.push(guest);assert.equal(guest.guest,true);
 const state=await call('/v1/game','GET',undefined,guest.token);assert.equal(state.board.length,3);assert.equal(typeof state.stats.total,'number');assert.equal(state.user.isAdmin,false);ok('guest and three shared daily questions');
 await call('/v1/game','POST',{action:'profile',name:'Cloud QA',preferences:{visible:false,sound:false,haptics:false}},guest.token);
 const fresh=await call('/v1/game','GET',undefined,guest.token);assert.equal(fresh.user.preferences.visible,false);assert.equal(fresh.stats.xp,20);ok('profile persists between requests');
 await call('/v1/game','POST',{action:'practice',id:state.training[0].id,choice:0,confidence:80},guest.token);
 const practice=await call('/v1/game','GET',undefined,guest.token);assert.equal(practice.practice.length,1);assert.equal(practice.practice[0].score,96);assert.equal(practice.stats.xp,20);ok('training score without ranked XP');
 const username='qa_'+randomBytes(6).toString('hex'),password=randomBytes(20).toString('hex');
 const registered=await call('/v1/auth/register','POST',{username,password},guest.token,201);assert.equal(registered.userId,guest.userId);accounts[0]=registered;ok('guest upgrade keeps identity');
 await call('/v1/auth/login','POST',{username,password:password+'x'},undefined,401);
 const login=await call('/v1/auth/login','POST',{username,password});assert.equal(login.userId,guest.userId);ok('password verification and login');
 await call('/v1/game','POST',{action:'admin-create',day:state.today},login.token,403);ok('regular account cannot publish questions');
 const now=new Date(state.serverTime),trHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul',hour:'2-digit',hourCycle:'h23'}).format(now));
 const question=state.board.find(q=>Date.parse(q.close_at)>now.getTime());
 if(trHour>=10&&trHour<22&&question){
   await call('/v1/game','POST',{action:'predict',id:question.id,choice:0,confidence:80},login.token);
   const ticket=await call('/v1/ads','POST',{action:'prepare',purpose:'edit',target:'daily/'+question.id},login.token);assert(ticket.test,'Live QA edits require test ad mode');
   await call('/v1/ads','POST',{action:'complete-test',ticketId:ticket.ticketId},login.token);
   await call('/v1/game','POST',{action:'predict',id:question.id,choice:1,confidence:65,adTicket:ticket.ticketId},login.token);
   await call('/v1/ads','POST',{action:'prepare',purpose:'edit',target:'daily/'+question.id},login.token,409);
   const predicted=await call('/v1/game','GET',undefined,login.token);assert.equal(predicted.stats.total,1);assert.equal(predicted.board.find(q=>q.id===question.id).prediction.choice,1);ok('prediction saved and editable without duplicate');
   await call('/v1/game','POST',{action:'predict',id:question.id,choice:99,confidence:65},login.token,400);ok('invalid selection rejected');
 }else console.log('SKIP daily prediction: outside real question window');
 const other=await call('/v1/auth/guest','POST',{},undefined,201);accounts.push(other);
 await call('/v1/game','POST',{action:'profile',name:'Cloud QA Friend',preferences:{visible:false}},other.token);
 const otherState=await call('/v1/game','GET',undefined,other.token);
 await call('/v1/game','POST',{action:'friend',code:otherState.user.code},login.token);
 await call('/v1/game','POST',{action:'friend',code:state.user.code},other.token);
 const friends=await call('/v1/game','GET',undefined,login.token);assert.equal(friends.friends[0].status,'accepted');ok('reciprocal friend invitation');
 const exported=await call('/v1/export','GET',undefined,login.token);assert.equal(exported.practice.length,1);assert.equal(exported.user.name,'Cloud QA');assert.equal('token'in exported,false);ok('private data export');
 await call('/v1/auth/logout','POST',{},login.token);await call('/v1/auth/me','GET',undefined,login.token,401);ok('logout invalidates token');
}finally{
 for(const account of accounts){
   await call('/v1/game','POST',{action:'delete-account',confirm:'SİL'},account.token);
   await call('/v1/auth/me','GET',undefined,account.token,401);
 }
 if(accounts.length)ok('test account deletion revokes sessions and cleans data');
}
console.log(`${passed} live checks passed`);
