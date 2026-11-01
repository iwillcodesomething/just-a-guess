// Real Chromium, real React screens and local HTTP API. No paid/browser SDK dependency.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer as createViteServer} from 'vite';
process.env.DATABASE_PATH=':memory:';
const realFetch=globalThis.fetch,RealDate=Date,clock='2026-11-01T12:00:00Z';
globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[clock]))}static now(){return new RealDate(clock).getTime()}};
globalThis.fetch=async(input,options)=>{
 const u=new URL(input);
 if(['127.0.0.1','localhost'].includes(u.hostname))return realFetch(input,options);
 if(u.hostname.includes('geocoding-api')){const c={id:745044,name:'İstanbul',country_code:'TR',admin1_id:745042,admin1:'Istanbul',latitude:41.01,longitude:28.94,timezone:'Europe/Istanbul',feature_code:'PPLA'};return Response.json(u.pathname.endsWith('/get')?c:{results:[c]})}
 if(u.hostname.includes('open-meteo'))return Response.json({current:{time:'2026-11-01T15:00',temperature_2m:18,relative_humidity_2m:55,wind_speed_10m:12}});
 if(u.hostname.includes('thesportsdb'))return Response.json(u.pathname.includes('search_all_leagues')?{countries:[{idLeague:'4339',strSport:'Soccer',strLeague:'Turkish Super Lig'}]}:{events:[{idEvent:'1234567',idLeague:'4339',strSport:'Soccer',strTimestamp:'2026-11-01T16:00:00',strLeague:'Turkish Super Lig',strHomeTeam:'Home',strAwayTeam:'Away',strStatus:'Not Started'}]});
 if(u.hostname.includes('coinbase'))return Response.json(u.pathname==='/products'?[{id:'BTC-USD',base_currency:'BTC',quote_currency:'USD',display_name:'BTC/USD',status:'online',trading_disabled:false}]:{price:'100',time:clock,volume:'10'});
 if(u.hostname.includes('frankfurter'))return Response.json({date:'2026-10-30',rate:49.9});
 if(u.hostname.includes('wikimedia'))return Response.json(u.pathname.includes('/top/')?{items:[{articles:[{article:'Taylor_Swift',views:1000}]}]}:{items:[{views:1100}]});
 throw new Error('Unexpected UI fixture URL: '+u);
};
const {makeServer}=await import('../backend/src/server.mjs');
const server=makeServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const apiBase='http://127.0.0.1:'+server.address().port;
const account=await(await realFetch(apiBase+'/v1/auth/guest',{method:'POST'})).json();
const vite=await createViteServer({configFile:'mobile/vite.config.ts',server:{host:'127.0.0.1',port:5174,strictPort:true}});await vite.listen();
const profile=mkdtempSync(join(tmpdir(),'jag-chrome-'));
const browser=spawn(process.env.CHROME_BIN||'google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--remote-debugging-port=9222','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let socket,seq=0;const requests=new Map();const exceptions=[];
async function pause(ms=100){return new Promise(r=>setTimeout(r,ms))}
async function targets(){for(let i=0;i<100;i++){try{return await(await realFetch('http://127.0.0.1:9222/json/list')).json()}catch{await pause()}}throw new Error('Chromium did not start')}
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;requests.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value}
async function wait(expression,label){for(let i=0;i<100;i++){if(await evaluate(expression))return;await pause()}throw new Error('UI timeout: '+label)}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`)}
async function select(label,value){await evaluate(`(()=>{const el=[...document.querySelectorAll('.explore-field')].find(e=>e.textContent.includes(${JSON.stringify(label)}))?.querySelector('select');if(!el)throw Error('Missing select');el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}))})()`)}
async function category(id){await click('.explore-category.'+id);await wait(`document.querySelector('.explore-builder h2')`,'builder')}
try{
 const target=(await targets()).find(t=>t.type==='page');assert(target);
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
 socket.onmessage=async event=>{
   const msg=JSON.parse(event.data);
   if(msg.id){const pending=requests.get(msg.id);if(pending){requests.delete(msg.id);msg.error?pending.reject(new Error(msg.error.message)):pending.resolve(msg.result)}return}
   if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params.exceptionDetails.text);
   if(msg.method==='Runtime.bindingCalled'&&msg.params.name==='__jagHost'){
     const {id,method,path,body}=JSON.parse(msg.params.payload);
     try{const response=await realFetch(apiBase+path,{method,headers:{Authorization:'Bearer '+account.token,'Content-Type':'application/json'},...(method==='POST'?{body:body||'{}'}:{})});const result={status:response.status,body:await response.json()};await evaluate(`window.__jagResponse(${JSON.stringify(id)},${JSON.stringify(result)})`)}catch(e){exceptions.push(e.message)}
   }
 };
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Runtime.addBinding',{name:'__jagHost'});
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`window.JustAGuess={hasSession:()=>true,isGuest:()=>true,request:(id,method,path,body)=>window.__jagHost(JSON.stringify({id,method,path,body})),feedback:()=>{},logout:()=>{},saveExport:()=>{},getBaseUrl:()=>'',configureServer:()=>{}};const RealDate=Date;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[${JSON.stringify(clock)}]))}static now(){return new RealDate(${JSON.stringify(clock)}).getTime()}};`});
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await cdp('Page.navigate',{url:'http://127.0.0.1:5174/'});
 await wait(`document.querySelector('.discover-banner')`,'home');await click('.discover-banner');
 await wait(`document.querySelectorAll('.explore-category').length===6`,'six categories');
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.mobile-nav')).gridTemplateColumns.split(' ').length`),5);
 assert(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth`));console.log('PASS phone layout and five navigation tabs');
 await category('weather');
 await wait(`[...document.querySelectorAll('.explore-field option')].some(o=>o.value==='745042')`,'provinces');
 await select('2 · İl','745042');
 await evaluate(`(()=>{const el=document.querySelector('.explore-field input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'Istanbul');el.dispatchEvent(new Event('input',{bubbles:true}))})()`);
 await wait(`[...document.querySelectorAll('.explore-field option')].some(o=>o.value==='745044')`,'city search');await select('Şehir /','745044');
 await click('.explore-preview-button');await wait(`document.querySelector('.explore-preview h3')`,'weather preview');
 await click('.explore-preview>.primary');await wait(`document.querySelector('.answer-options')`,'prediction modal');await click('.answer-options button');await click('.modal-submit');
 await wait(`document.querySelector('.success-view')`,'saved prediction');await click('.success-view>.primary');await wait(`document.querySelector('.personal-entry')`,'personal history');console.log('PASS country → province → city → real API prediction → history');
 await category('sport');await wait(`[...document.querySelectorAll('.explore-field option')].some(o=>o.value==='4339')`,'leagues');await select('3 · Lig','4339');await wait(`[...document.querySelectorAll('.explore-field option')].some(o=>o.value==='1234567')`,'matches');await select('4 · Yaklaşan','1234567');await click('.explore-preview-button');await wait(`document.querySelector('.explore-preview h3')?.textContent.includes('kim kazanır')`,'sports preview');console.log('PASS sport → country → league → match → question');
 for(const id of ['crypto','fx','culture']){
   await category(id);
   if(id==='culture'){await wait(`[...document.querySelectorAll('.explore-field option')].some(o=>o.value==='Taylor_Swift')`,'Wikipedia topics');await select('3 · Konu','Taylor_Swift')}
   await click('.explore-preview-button');await wait(`document.querySelector('.explore-preview h3')`,'preview '+id);console.log('PASS '+id+' interactive preview');
 }
 mkdirSync('outputs',{recursive:true});
 const image=await cdp('Page.captureScreenshot',{format:'png'});writeFileSync('outputs/ui-phone.png',Buffer.from(image.data,'base64'));
 await cdp('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:1,mobile:true});
 assert(await evaluate(`document.documentElement.scrollWidth<=window.innerWidth`));console.log('PASS tablet layout without horizontal overflow');
 assert.deepEqual(exceptions,[]);console.log('PASS no browser runtime exceptions');
}catch(error){
 console.error('UI failure:',error);
 console.error('Browser exceptions:',exceptions);
 try{console.error('UI snapshot:',await evaluate('document.body.innerText.slice(0,5000)'))}catch{}
 throw error;
}finally{
 if(socket)socket.close();
 const exited=new Promise(resolve=>browser.once('exit',resolve));browser.kill();await Promise.race([exited,pause(1500)]);
 await vite.close();await new Promise(resolve=>server.close(resolve));
 try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100})}catch{}
}
