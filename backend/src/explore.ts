import {env} from './runtime.mjs';
import {dayOf,shiftDay,safeJSON,confidenceSteps,scoreFor} from './game.ts';
import {fail,all,first,run,source,country,region,SPORTS,METRICS,CURRENCIES,language,topics,products,onlineProducts,articleViews,utcDay,providerTime} from './catalog.ts';

function finite(value:any,min:number,max:number) {const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)fail(`Değer ${min}–${max} arasında olmalı.`);return Math.round(n*10)/10}
function localDay(zone:string) {return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function localMidnight(day:string,zone:string) {
 const desired=Date.parse(day+'T00:00:00Z');let guess=desired;
 for(let i=0;i<3;i++) {
   const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)).map(p=>[p.type,p.value]));
   const actual=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);guess+=desired-actual;
 }
 return guess;
}
async function questionId(value:any) {const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return 'explore:'+Array.from(new Uint8Array(hash)).slice(0,16).map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function preview(userId:string,body:any) {
 const now=Date.now(),kind=String(body.category),today=dayOf();let q:any;
 if(kind==='weather') {
   const code=String(body.country),r=region(code,body.region);country(code);
   const cityId=String(body.city);if(!/^\d{1,10}$/.test(cityId))fail('Bir şehir seç.');
   const loc=await source('place:'+cityId,'https://geocoding-api.open-meteo.com/v1/get?id='+cityId,86400000);
   const city=loc.data;if(city.country_code!==code||(r&&city.admin1_id!==r.id))fail('Şehir, seçtiğin ülke veya bölgeyle eşleşmiyor.');
   const metric=METRICS.find(m=>m.id===body.metric);if(!metric)fail('Bir hava ölçümü seç.');
   const threshold=finite(body.threshold,metric.min,metric.max),offset=Number(body.days||1);if(!Number.isInteger(offset)||offset<1||offset>7)fail('Önümüzdeki 7 gün içinden bir gün seç.');
   const zone=String(city.timezone||'UTC'),target=shiftDay(localDay(zone),offset);
   const current=await source('weather-current:'+cityId,`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=${encodeURIComponent(zone)}`,120000);
   q={category:kind,title:`${target} tarihinde ${city.name}: ${metric.name.toLocaleLowerCase('tr-TR')} en az ${threshold} ${metric.unit} olur mu?`,context:[city.name,city.admin1,code,zone].filter(Boolean).join(' · '),options:['Evet','Hayır'],close_at:new Date(localMidnight(target,zone)-300000).toISOString(),resolve_at:new Date(localMidnight(shiftDay(target,1),zone)+6*3600000).toISOString(),source:'Open-Meteo',source_url:'https://open-meteo.com/en/docs',rule:{type:'weather-custom',latitude:city.latitude,longitude:city.longitude,timezone:zone,date:target,metric:metric.id,threshold,unit:metric.unit,description:`${city.name} (${city.latitude}, ${city.longitude}); ${target}, ${zone}. Gün bittikten sonra alınan ilk geçerli Open-Meteo günlük model kaydında ${metric.id} >= ${threshold} ${metric.unit}. İstasyon gözlemi değildir. Kaynak 72 saat içinde doğrulanamazsa iptal.`},snapshot:{updatedAt:current.updatedAt,providerTime:current.data.current?.time,values:[{label:'Şu an sıcaklık',value:current.data.current?.temperature_2m,unit:'°C'},{label:'Nem',value:current.data.current?.relative_humidity_2m,unit:'%'},{label:'Rüzgâr',value:current.data.current?.wind_speed_10m,unit:'km/sa'}],refreshSeconds:120}};
 } else if(kind==='sport') {
   const eventId=String(body.match);if(!/^\d{3,10}$/.test(eventId))fail('Bir maç seç.');
   const lookup=await source('event:'+eventId,'https://www.thesportsdb.com/api/v1/json/123/lookupevent.php?id='+eventId,45000);
   const event=lookup.data.events?.[0];if(!event||!SPORTS.some(s=>s.id===event.strSport)||!event.strHomeTeam||!event.strAwayTeam||!event.strTimestamp)fail('Bu karşılaşmanın verileri tahmin için yeterli değil.',503);
   const start=providerTime(event.strTimestamp);if(!Number.isFinite(start)||start<now+10*60000)fail('Maç başlamış veya tahmin penceresi kapanmış.');
   const market=String(body.market||'winner');if(!['winner','total','both'].includes(market)||(market==='both'&&event.strSport!=='Soccer'))fail('Bu tahmin türü seçilen branşta desteklenmiyor.');
   const threshold=market==='total'?finite(body.threshold,0.5,500.5):0;if(market==='total'&&threshold%1!==0.5)fail('Toplam eşiği 0,5 ile bitmeli. Örn. 2,5 veya 160,5.');
   const name=event.strHomeTeam+' – '+event.strAwayTeam;
   q={category:kind,title:market==='winner'?`${name}: kim kazanır?`:market==='both'?`${name}: iki takım da gol atar mı?`:`${name}: toplam skor ${threshold} üstü olur mu?`,context:event.strLeague+' · '+new Date(start).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' (Türkiye saati)',options:market==='winner'?[event.strHomeTeam,'Beraberlik',event.strAwayTeam]:['Evet','Hayır'],close_at:new Date(start-300000).toISOString(),resolve_at:new Date(start+(event.strSport==='Baseball'?6:4)*3600000).toISOString(),source:'TheSportsDB',source_url:'https://www.thesportsdb.com/event/'+eventId,rule:{type:'sport-custom',eventId,sport:event.strSport,market,threshold,start,description:`TheSportsDB'nin tamamlanmış karşılaşma kaydındaki sayısal ev/deplasman skoru esas alınır. ${market==='winner'?'Yüksek final skoru kazanır; eşitse beraberlik.':market==='both'?'Her iki final skoru da en az 1 olmalı.':`Final skorları toplamı > ${threshold}.`} Branşın final skoru kullanılır; futbol için normal süre, diğer branşlarda sağlayıcının final kaydı. Ertelenen/iptal edilen veya süre kapsamı belirsiz maçlar iptal edilir. Başlangıç daha erkene alınırsa tahmin iptal edilir.`},snapshot:{updatedAt:lookup.updatedAt,values:[{label:'Branş',value:SPORTS.find(s=>s.id===event.strSport)?.name},{label:'Lig',value:event.strLeague}],refreshSeconds:90}};
 } else if(kind==='crypto') {
   const list=await products(),product=onlineProducts(list.data).find(p=>p.id===body.coin);if(!product)fail('İşlem gören bir USD paritesi seç.');
   const hours=Number(body.hours||1);if(![1,4,24].includes(hours))fail('1, 4 veya 24 saat seç.');
   const market=String(body.market||'up');if(!['up','move'].includes(market))fail('Bir fiyat hareketi seç.');const threshold=market==='move'?finite(body.threshold,0.1,25):0;
   const ticker=await source('ticker:'+product.id,'https://api.exchange.coinbase.com/products/'+product.id+'/ticker',20000);
   const baseline=Number(ticker.data.price),published=Date.parse(ticker.data.time);if(!Number.isFinite(baseline)||baseline<=0||!Number.isFinite(published)||Math.abs(now-published)>120000)fail('Fiyat verisi yeterince güncel değil. Tekrar dene.',503);
   const target=Math.ceil((now+hours*3600000)/3600000)*3600000;
   q={category:kind,title:`${product.base_currency}: ${new Date(target).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} sonundaki fiyat ${market==='up'?'başlangıç fiyatından yüksek olur mu?':`başlangıca göre en az %${threshold} değişmiş olur mu?`}`,context:product.display_name+' · Başlangıç '+baseline.toLocaleString('tr-TR',{maximumFractionDigits:6})+' USD',options:['Evet','Hayır'],close_at:new Date(now+10*60000).toISOString(),resolve_at:new Date(target+5*60000).toISOString(),source:'Coinbase Exchange',source_url:'https://www.coinbase.com/price/'+encodeURIComponent(product.base_currency.toLowerCase()),rule:{type:'crypto',product:product.id,baseline,baselineTime:ticker.data.time,target:new Date(target).toISOString(),market,threshold,description:`Başlangıç: ${baseline} USD (${ticker.data.time}). Hedef: ${new Date(target).toISOString()} başlayan 1 dakikalık Coinbase mumunun kapanış fiyatı. ${market==='up'?'Kapanış > başlangıç. Eşitlik Hayır.':`Mutlak yüzde değişim >= %${threshold}.`} İşlem yapılmaz, puanların parasal değeri yoktur. Bu bir yatırım önerisi değildir.`},snapshot:{updatedAt:ticker.updatedAt,providerTime:ticker.data.time,values:[{label:'Başlangıç fiyatı',value:baseline,unit:'USD'},{label:'24 saat hacim',value:Number(ticker.data.volume),unit:product.base_currency}],refreshSeconds:20}};
 } else if(kind==='fx') {
   const base=String(body.base||'USD'),quote=String(body.quote||'TRY');if(!CURRENCIES.includes(base)||!CURRENCIES.includes(quote)||base===quote)fail('Farklı iki para birimi seç.');
   const result=await source('fx:'+base+':'+quote,`https://api.frankfurter.dev/v2/providers/ecb/rate/${base}/${quote}`,15*60000);
   const baseline=Number(result.data.rate);if(!Number.isFinite(baseline)||baseline<=0||!/^\d{4}-\d{2}-\d{2}$/.test(result.data.date)||result.data.date<shiftDay(utcDay(),-7))fail('Bu paritede güncel ECB kaydı alınamadı.',503);
   let target=shiftDay(utcDay(),1);while([0,6].includes(new Date(target+'T12:00:00Z').getUTCDay()))target=shiftDay(target,1);
   q={category:kind,title:`${target} ECB kaydında ${base}/${quote}, ${baseline} seviyesinin üstüne çıkar mı?`,context:`1 ${base} = ${baseline} ${quote} · Referans ${result.data.date}`,options:['Evet','Hayır'],close_at:target+'T09:00:00.000Z',resolve_at:target+'T18:00:00.000Z',source:'Frankfurter / ECB',source_url:'https://frankfurter.dev/',rule:{type:'fx',base,quote,baseline,date:target,description:`${result.data.date} başlangıç referansı: 1 ${base} = ${baseline} ${quote}. ${target} tarihine ait ECB günlük referans kuru > ${baseline} ise Evet; eşitlik Hayır. Günlük veridir, anlık işlem fiyatı değildir. Tatil nedeniyle hedef güne ait kayıt yayımlanmazsa 72 saatin sonunda iptal.`},snapshot:{updatedAt:result.updatedAt,providerTime:result.data.date,values:[{label:'Günlük referans',value:baseline,unit:quote}],refreshSeconds:900}};
 } else if(kind==='culture') {
   const lang=language(body.language),branch=String(body.branch||'trending'),list=await topics(lang,branch),article=list.items.find(a=>a.id===body.article);if(!article)fail('Listeden bir Wikipedia konusu seç.');
   const past=shiftDay(utcDay(),-2),views=await articleViews(lang,article.id,past),value=views.data.items?.[0]?.views;if(!Number.isFinite(value))fail('Bu başlığın görüntülenme verisi henüz yok.',503);
   const threshold=finite(body.threshold,50,1_000_000_000),target=shiftDay(utcDay(),1);
   q={category:kind,title:`${article.name}: ${target} günü en az ${threshold.toLocaleString('tr-TR')} kez okunur mu?`,context:lang+'.wikipedia.org · Günlük sayfa görüntülenmesi',options:['Evet','Hayır'],close_at:new Date(Date.parse(target+'T00:00:00Z')-300000).toISOString(),resolve_at:shiftDay(target,2)+'T12:00:00.000Z',source:'Wikimedia Analytics',source_url:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(article.id)}`,rule:{type:'wiki',language:lang,article:article.id,date:target,threshold,description:`${lang}.wikipedia.org / ${article.id}, ${target} UTC günü. Wikimedia all-access/user günlük sayfa görüntülenmesi >= ${threshold}. Tekil kişi sayısı veya sosyal medya trendi değildir. Yayın gecikmesi için 36 saat beklenir; sonrasında kaynak kontrolü başlar. 72 saatte veri doğrulanamazsa iptal.`},snapshot:{updatedAt:views.updatedAt,providerTime:past,values:[{label:past+' görüntülenmesi',value,unit:'okunma'}],refreshSeconds:3600}};
 } else if(kind==='events') {
   const original=await first("SELECT * FROM questions WHERE id=? AND category='culture' AND status='open' AND close_at>?",String(body.event),new Date().toISOString());if(!original)fail('Bu editör sorusu şu anda açık değil.');
   q={...original,options:safeJSON(original.options,[]),rule:{type:'editorial',questionId:original.id,description:safeJSON(original.rule).description},snapshot:{updatedAt:new Date().toISOString(),values:[],refreshSeconds:60}};
 } else fail('Bir kategori seç.');
 if(Date.parse(q.close_at)<=now)fail('Bu sorunun tahmin penceresi kapandı.');
 const id=await questionId([kind,q.rule,q.close_at]);q={...q,id,day:today,scope:'explore',status:'open',prediction:null};
 const existing=await first('SELECT * FROM explorations WHERE user_id=? AND id=?',userId,id);
 if(existing)return publicEntry(existing);
 await run('INSERT INTO source_cache(key,value,expires) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires=excluded.expires','explore:draft:'+userId,JSON.stringify(q),now+10*60000);
 return {...q,draftId:id};
}
export function publicEntry(row:any) {return {...safeJSON(row.question),id:row.id,day:row.day,scope:'explore',status:row.status,outcome:row.outcome,evidence:row.evidence,resolved_at:row.resolved_at,prediction:{choice:row.choice,confidence:row.confidence,score:row.score,created:row.created,seen:!!row.seen}}}
export async function explorationState(id:string) {
 const history=(await all('SELECT * FROM explorations WHERE user_id=? ORDER BY created DESC LIMIT 100',id)).map(publicEntry);
 const today=await first('SELECT COUNT(*) AS n FROM explorations WHERE user_id=? AND day=?',id,dayOf());
 return {history,used:Number(today.n),limit:2,remaining:Math.max(0,2-Number(today.n))};
}
export async function saveExploration(id:string,body:any) {
 const existing=await first('SELECT * FROM explorations WHERE user_id=? AND id=?',id,String(body.id));
 let q:any;
 if(existing)q=safeJSON(existing.question);
 else {
   const draft=await first('SELECT * FROM source_cache WHERE key=?','explore:draft:'+id);
   if(!draft||draft.expires<Date.now())fail('Önizlemenin süresi doldu. Konuyu yeniden aç.');q=safeJSON(draft.value);
   if(q.id!==body.id)fail('Önizleme güncellendi. Konuyu yeniden aç.');
 }
 if((existing&&existing.status!=='open')||Date.parse(q.close_at)<=Date.now())fail('Bu tahminin süresi doldu.');
 if(!Number.isInteger(body.choice)||body.choice<0||body.choice>=q.options.length||!confidenceSteps.includes(body.confidence))fail('Seçimini ve güvenini kontrol et.');
 if(existing) {
   const updated=await run("UPDATE explorations SET choice=?,confidence=? WHERE user_id=? AND id=? AND status='open' AND close_at>?",body.choice,body.confidence,id,q.id,new Date().toISOString());if(!Number(updated.meta.changes))fail("Tahminin artık düzenlenemiyor. Sonucu yenile.",409);
 } else {
   // Two unique slots enforce the daily limit even under concurrent requests.
   const today=dayOf();if(q.day!==today)fail('Gün değişti. Önizlemeyi yeniden aç.');let saved=false;
   for(const slot of [1,2]) {
     await run('INSERT INTO explorations(user_id,id,day,slot,category,question,choice,confidence,created,close_at,resolve_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',id,q.id,today,slot,q.category,JSON.stringify(q),body.choice,body.confidence,new Date().toISOString(),q.close_at,q.resolve_at);
     if(await first('SELECT id FROM explorations WHERE user_id=? AND id=?',id,q.id)){saved=true;break}
   }
   if(!saved)fail('Bugünkü 2 kişisel tahminini kullandın. Yarın yeni konular seçebilirsin.',409);
 }
 return {message:'Kişisel tahminin kaydedildi. Genel sıralaman etkilenmedi.'};
}
export async function resolveRule(q:any):Promise<any> {
 const rule=q.rule;
 if(rule.type==='weather-custom') {
   const result=await source(`weather-result:${rule.latitude}:${rule.longitude}:${rule.metric}:${rule.timezone}`,`https://api.open-meteo.com/v1/forecast?latitude=${rule.latitude}&longitude=${rule.longitude}&daily=${rule.metric}&timezone=${encodeURIComponent(rule.timezone)}&past_days=7&forecast_days=1`,900000);
   const index=result.data.daily?.time?.indexOf(rule.date),value=index>=0?result.data.daily?.[rule.metric]?.[index]:null;
   if(typeof value!=='number'||!Number.isFinite(value))return null;
   return {outcome:value>=rule.threshold?0:1,evidence:`${rule.date} · ${value} ${rule.unit}. Open-Meteo günlük model kaydı. Kontrol: ${result.updatedAt}.`};
 }
 if(rule.type==='sport-custom') {
   const result=await source('event:'+rule.eventId,'https://www.thesportsdb.com/api/v1/json/123/lookupevent.php?id='+rule.eventId,90000),e=result.data.events?.[0];if(!e)return null;
   const status=String(e.strStatus||'');if(/postponed|cancelled|abandoned/i.test(status))return {outcome:null,evidence:'Karşılaşma ertelendi veya tamamlanmadı.'};
   if(!/^(match finished|ft|finished|full time)$/i.test(status))return null;
   const start=providerTime(e.strTimestamp||'');if(!Number.isFinite(start)||start<rule.start-60000)return {outcome:null,evidence:'Başlangıç zamanı değişti; adil tahmin penceresi doğrulanamadı.'};
   if(e.strSport!==rule.sport)return {outcome:null,evidence:'Sağlayıcı branş bilgisi değişti.'};
   if(rule.sport==='Soccer'&&((Number(e.intHomeScoreExtra)||0)+(Number(e.intAwayScoreExtra)||0)>0||/extra|penalt/i.test(String(e.strResult||''))))return {outcome:null,evidence:'Uzatma veya penaltı kapsamı belirsiz final skoru.'};
   if(!/^\d+(\.\d+)?$/.test(String(e.intHomeScore))||!/^\d+(\.\d+)?$/.test(String(e.intAwayScore)))return null;
   const h=Number(e.intHomeScore),a=Number(e.intAwayScore),outcome=rule.market==='winner'?(h>a?0:h===a?1:2):rule.market==='both'?(h>=1&&a>=1?0:1):(h+a>rule.threshold?0:1);
   return {outcome,evidence:`${e.strHomeTeam} ${h} – ${a} ${e.strAwayTeam}. TheSportsDB final kaydı (${status}).`};
 }
 if(rule.type==='crypto') {
   const target=Date.parse(rule.target),end=new Date(target+60000).toISOString();
   const result=await source('candle:'+rule.product+':'+rule.target,`https://api.exchange.coinbase.com/products/${rule.product}/candles?granularity=60&start=${encodeURIComponent(rule.target)}&end=${encodeURIComponent(end)}`,900000);
   const candle=Array.isArray(result.data)?result.data.find(c=>c[0]===target/1000):null,value=Number(candle?.[4]);if(!candle||!Number.isFinite(value)||value<=0)return null;
   const change=(value/rule.baseline-1)*100,yes=rule.market==='up'?value>rule.baseline:Math.abs(change)>=rule.threshold;
   return {outcome:yes?0:1,evidence:`Coinbase ${rule.product}; ${rule.target} 1 dakikalık mum kapanışı ${value} USD. Başlangıç ${rule.baseline} USD. Değişim %${change.toFixed(4)}.`};
 }
 if(rule.type==='fx') {
   const result=await source('fx-result:'+rule.base+':'+rule.quote+':'+rule.date,`https://api.frankfurter.dev/v2/providers/ecb/rate/${rule.base}/${rule.quote}?date=${rule.date}`,900000),value=Number(result.data.rate);
   if(result.data.date!==rule.date||!Number.isFinite(value))return null;
   return {outcome:value>rule.baseline?0:1,evidence:`${rule.date} ECB kaydı: 1 ${rule.base} = ${value} ${rule.quote}. Başlangıç: ${rule.baseline}. Kaynak: Frankfurter / ECB.`};
 }
 if(rule.type==='wiki') {
   const result=await articleViews(rule.language,rule.article,rule.date),value=result.data.items?.[0]?.views;
   if(!Number.isFinite(value))return null;
   return {outcome:value>=rule.threshold?0:1,evidence:`${rule.date} UTC · ${rule.language}.wikipedia.org/${rule.article}: ${value} sayfa görüntülenmesi. Wikimedia all-access/user.`};
 }
 if(rule.type==='editorial') {
   const row=await first('SELECT * FROM questions WHERE id=?',rule.questionId);if(!row||row.status==='open')return null;
   return {outcome:row.outcome,evidence:row.evidence||'Editör sorusu iptal edildi.'};
 }
 return null;
}
export async function settleExplorations() {
 const now=Date.now(),due=await all("SELECT * FROM explorations WHERE status='open' AND resolve_at<? AND (checked_at IS NULL OR checked_at<?) ORDER BY resolve_at LIMIT 15",new Date(now).toISOString(),new Date(now-15*60000).toISOString());
 await Promise.allSettled(due.map(async row=>{
   await run('UPDATE explorations SET checked_at=? WHERE user_id=? AND id=?',new Date(now).toISOString(),row.user_id,row.id);
   const q=safeJSON(row.question);let result:any=null;
   if(now-Date.parse(row.resolve_at)>72*3600000)result={outcome:null,evidence:'72 saat içinde doğrulanabilir sonuç alınamadı; tahmin iptal edildi.'};
   else try{result=await resolveRule(q)}catch{return}
   if(!result)return;
   await run("UPDATE explorations SET status=?,outcome=?,evidence=?,score=NULL,resolved_at=? WHERE user_id=? AND id=? AND status='open'",result.outcome===null?'void':'resolved',result.outcome,result.evidence,new Date().toISOString(),row.user_id,row.id);
 }));
 // Use the latest saved confidence after the terminal status locks editing.
 const unscored=await all("SELECT * FROM explorations WHERE status='resolved' AND score IS NULL LIMIT 300");
 if(unscored.length)await env.DB.batch(unscored.map(row=>env.DB.prepare('UPDATE explorations SET score=? WHERE user_id=? AND id=? AND score IS NULL').bind(scoreFor(row.choice,row.confidence,row.outcome,safeJSON(row.question).options.length),row.user_id,row.id)));
}
