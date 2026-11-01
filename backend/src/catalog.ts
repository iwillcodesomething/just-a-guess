import geography from '../data-assets/geography.json' with {type:'json'};
import {env} from './runtime.mjs';
import {dayOf,shiftDay,safeJSON} from './game.ts';

export function fail(message:string,status=400):never {throw Object.assign(new Error(message),{status})}
export const SPORTS=[['Soccer','Futbol'],['Basketball','Basketbol'],['Volleyball','Voleybol'],['Ice Hockey','Buz hokeyi'],['Baseball','Beyzbol'],['American Football','Amerikan futbolu'],['Handball','Hentbol'],['Rugby','Ragbi']].map(([id,name])=>({id,name}));
export const METRICS=[
 {id:'precipitation_sum',name:'Toplam yağış',unit:'mm',min:0.1,max:500,default:1},
 {id:'temperature_2m_max',name:'En yüksek sıcaklık',unit:'°C',min:-90,max:60,default:20},
 {id:'temperature_2m_min',name:'En düşük sıcaklık',unit:'°C',min:-90,max:60,default:10},
 {id:'wind_speed_10m_max',name:'En yüksek rüzgâr',unit:'km/sa',min:1,max:400,default:25},
 {id:'wind_gusts_10m_max',name:'En güçlü rüzgâr hamlesi',unit:'km/sa',min:1,max:400,default:40},
 {id:'snowfall_sum',name:'Toplam kar yağışı',unit:'cm',min:0.1,max:200,default:1},
 {id:'precipitation_hours',name:'Yağışlı saat sayısı',unit:'saat',min:1,max:24,default:3},
 {id:'uv_index_max',name:'En yüksek UV indeksi',unit:'UV',min:1,max:20,default:5},
];
export const CURRENCIES=['EUR','USD','TRY','GBP','JPY','CHF','CAD','AUD','CNY','NZD','SEK','NOK','DKK','PLN','CZK','HUF','RON','BRL','MXN','INR','KRW','SGD','HKD','ZAR','IDR','ILS','ISK','MYR','PHP','THB'];
export const LANGUAGES=[{id:'tr',name:'Türkçe'},{id:'en',name:'English'},{id:'de',name:'Deutsch'},{id:'fr',name:'Français'},{id:'es',name:'Español'},{id:'it',name:'Italiano'},{id:'pt',name:'Português'},{id:'ja',name:'日本語'}];
export const HORIZONS={weather:[1,2,3,5,7,14,30],crypto:[1,4,24,72,168,336,720],fx:[1,3,7,14,30,90],culture:[1,3,7,14,30],events:[1,3,7,14,30]};
export const AUTO_EVENTS=[
 {id:'auto:global-quakes',name:'Dünya · M4,5+ deprem kaydı',detail:'USGS · günlük kayıt sayısı',type:'quake',magnitude:4.5,default:12},
 {id:'auto:regional-quakes',name:'Türkiye çevresi · M3,0+ deprem kaydı',detail:'USGS · 36–42°K, 26–45°D koordinat kutusu',type:'quake',magnitude:3,regional:true,default:3},
 {id:'auto:space-kp',name:'Uzay havası · jeomanyetik Kp indeksi',detail:'NOAA · günlük en yüksek 3 saatlik Kp',type:'kp',default:5},
];
export const TOPICS:any={
 music:{name:'Müzik',tr:['Taylor_Swift','Sezen_Aksu','Tarkan','Barış_Manço','Duman_(müzik_grubu)'],en:['Taylor_Swift','The_Beatles','Billie_Eilish','BTS','Coldplay']},
 film:{name:'Sinema & dizi',tr:['Interstellar','Harry_Potter','Yüzüklerin_Efendisi','Christopher_Nolan'],en:['Interstellar_(film)','Harry_Potter','The_Lord_of_the_Rings','Christopher_Nolan']},
 sport:{name:'Spor kültürü',tr:['Galatasaray_(futbol_takımı)','Fenerbahçe_(futbol_takımı)','Lionel_Messi','Cristiano_Ronaldo'],en:['Lionel_Messi','Cristiano_Ronaldo','NBA','Formula_One']},
 tech:{name:'Teknoloji',tr:['Yapay_zekâ','Bitcoin','YouTube','Apple'],en:['Artificial_intelligence','Bitcoin','YouTube','Apple_Inc.']},
 science:{name:'Bilim & uzay',tr:['Mars','Albert_Einstein','Güneş_Sistemi','Kara_delik'],en:['Mars','Albert_Einstein','Solar_System','Black_hole']},
 world:{name:'Dünya & tarih',tr:['Türkiye','İstanbul','Mustafa_Kemal_Atatürk','Cumhuriyet'],en:['Turkey','Istanbul','History','Earth']},
};
export async function all(sql:string,...args:any[]) {return (await env.DB.prepare(sql).bind(...args).all()).results as any[]}
export async function first(sql:string,...args:any[]) {return await env.DB.prepare(sql).bind(...args).first() as any}
export async function run(sql:string,...args:any[]) {return await env.DB.prepare(sql).bind(...args).run()}
const pending=new Map<string,Promise<any>>();
export async function source(key:string,url:string,ttl:number,allowStale=false):Promise<any> {
 const cacheKey='explore:'+key,old=await first('SELECT * FROM source_cache WHERE key=?',cacheKey);
 if(old&&old.expires>Date.now())return {...safeJSON(old.value),stale:false};
 if(pending.has(cacheKey)){const result=await pending.get(cacheKey);if(result.stale&&!allowStale)fail('Güncel kaynak verisi alınamadı. Tekrar dene.',503);return result}
 const task=(async()=>{try{
   const response=await fetch(url,{signal:AbortSignal.timeout(8500),headers:{Accept:'application/json','User-Agent':'JustAGuess/0.4.0 (https://github.com/iwillcodesomething/just-a-guess)'}});
   if(!response.ok)fail(response.status===429?'Veri kaynağı şu anda yoğun. Biraz sonra yeniden dene.':'Veri sağlayıcısına şu anda ulaşılamıyor.',503);
   const text=await response.text();if(text.length>4_000_000)fail('Veri kaynağının yanıtı çok büyük.',503);
   const result={data:JSON.parse(text),updatedAt:new Date().toISOString(),refreshSeconds:Math.ceil(ttl/1000)};
   await run('INSERT INTO source_cache(key,value,expires) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires=excluded.expires',cacheKey,JSON.stringify(result),Date.now()+ttl);
   return {...result,stale:false};
 }catch(e){if(allowStale&&old&&Date.now()-old.expires<86400000)return {...safeJSON(old.value),stale:true};if(e.status)throw e;fail('Kaynak verisi alınamadı. Biraz sonra tekrar dene.',503)}finally{pending.delete(cacheKey)}})();
 pending.set(cacheKey,task);return task;
}
export function country(code:string) {const c=geography.find(c=>c.code===code);if(!c)fail('Bir ülke seç.');return c}
export function region(code:string,id:any) {const c=country(code),r=c.regions.find(r=>r.id===Number(id));if(c.regions.length&&!r)fail('Bir il veya eyalet seç.');return r}
export function language(value:any) {const id=String(value||'tr');if(!LANGUAGES.some(l=>l.id===id))fail('Desteklenen bir dil seç.');return id}
export function utcDay(date=new Date()) {return date.toISOString().slice(0,10)}
export function providerTime(value:string) {return Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)?value:value+'Z')}
export function sportCountry(code:string) {if(code==='GB-ENG')return 'England';if(code==='GB-SCT')return 'Scotland';if(code==='GB-WLS')return 'Wales';return code==='TR'?'Turkey':code==='US'?'United States':country(code).name}
export async function products() {return source('coin-products','https://api.exchange.coinbase.com/products',3600000,true)}
export function onlineProducts(data:any) {return (Array.isArray(data)?data:[]).filter(p=>p.status==='online'&&!p.trading_disabled&&p.quote_currency==='USD'&&/^[A-Z0-9-]{2,24}$/.test(p.id))}
export async function articleViews(lang:string,title:string,date:string,allowStale=false) {
 const stamp=date.replaceAll('-','')+'00';
 return source('wiki-views:'+lang+':'+title+':'+date,`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia.org/all-access/user/${encodeURIComponent(title)}/daily/${stamp}/${stamp}`,3600000,allowStale);
}
const safeArticle=(a:any)=>a&&typeof a.article==='string'&&a.article.length<160&&!/[:]|^(Main_Page|Anasayfa|Hauptseite|Portada|Pagina_principale|Accueil_principal|メインページ)$|porn|sex|xnxx|xhamster|xvideos|onlyfans|youporn/i.test(a.article);
export function quakeURL(date:string,definition:any) {
 const start=date+'T00:00:00.000Z',end=new Date(Date.parse(shiftDay(date,1)+'T00:00:00Z')-1).toISOString();
 return `https://earthquake.usgs.gov/fdsnws/event/1/count?format=geojson&starttime=${start}&endtime=${end}&minmagnitude=${definition.magnitude}&eventtype=earthquake${definition.regional?'&minlatitude=36&maxlatitude=42&minlongitude=26&maxlongitude=45':''}`;
}
export async function leagueMatches(id:string) {
 if(!/^\d{3,8}$/.test(id))fail('Bir lig seç.');
 const base='https://www.thesportsdb.com/api/v1/json/123/';
 const [next,metadata]=await Promise.all([
   source('matches:'+id,base+'eventsnextleague.php?id='+id,90000,true),
   source('league:'+id,base+'lookupleague.php?id='+id,86400000,true).catch(()=>null),
 ]);
 let seeds=next.data.events||[];
 if(!seeds.length){try{seeds=(await source('past:'+id,base+'eventspastleague.php?id='+id,900000,true)).data.events||[]}catch{}}
 const league=metadata?.data.leagues?.[0],season=String(seeds[0]?.strSeason||league?.strCurrentSeason||''),round=Number(seeds[0]?.intRound);
 const rows=[...seeds];let partial=false;
 if(Number.isInteger(round)&&round>0&&round<100&&/^[\d-]{4,9}$/.test(season)){
   const results=await Promise.allSettled(Array.from({length:4},(_,i)=>source(`round:${id}:${season}:${round+i}`,`${base}eventsround.php?id=${id}&r=${round+i}&s=${encodeURIComponent(season)}`,900000,true)));
   for(const result of results){if(result.status==='fulfilled')rows.push(...(result.value.data.events||[]));else partial=true}
 }
 const byId=new Map(rows.filter((e:any)=>String(e.idLeague)===id&&e.strTimestamp&&Number.isFinite(providerTime(e.strTimestamp))&&providerTime(e.strTimestamp)>Date.now()+10*60000&&!/cancelled|postponed|abandoned|finished/i.test(e.strStatus||'')).map((e:any)=>[e.idEvent,e]));
 return {...next,data:undefined,items:[...byId.values()].sort((a:any,b:any)=>providerTime(a.strTimestamp)-providerTime(b.strTimestamp)).slice(0,60).map((e:any)=>({id:e.idEvent,name:e.strHomeTeam+' – '+e.strAwayTeam,detail:e.strLeague+(e.intRound?' · '+e.intRound+'. hafta':''),date:new Date(providerTime(e.strTimestamp)).toISOString()})),source:'TheSportsDB',partial,note:partial?'Fikstürün bir kısmı alınamadı; doğrulanan maçlar gösteriliyor.':'Yaklaşan maçlar ve dört haftalık fikstür taranır. Başlamış maçlar listelenmez; sağlayıcı kapsamı geçerlidir.'};
}
export async function topics(lang:string,branch:string) {
 if(branch!=='trending') {
   const topic=TOPICS[branch];if(!topic)fail('Bir kültür dalı seç.');
   return {items:(topic[lang]||topic.en).map((id:string)=>({id,name:id.replaceAll('_',' ')})),source:'Wikipedia',updatedAt:null,refreshSeconds:3600};
 }
 const date=shiftDay(utcDay(),-2),[y,m,d]=date.split('-');
 const result=await source('wiki-top:'+lang+':'+date,`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${lang}.wikipedia.org/all-access/${y}/${m}/${d}`,3600000,true);
 return {...result,data:undefined,items:(result.data.items?.[0]?.articles||[]).filter(safeArticle).slice(0,50).map((a:any)=>({id:a.article,name:a.article.replaceAll('_',' '),views:a.views})),source:'Wikimedia · '+date,note:'En çok görüntülenen sayfalar; güncel arama veya sosyal medya trendi değildir.'};
}
export async function catalog(body:any) {
 const kind=String(body.kind||'categories');
 if(kind==='categories')return {categories:[{id:'weather',name:'Hava durumu',description:'Ülke → il/eyalet → şehir → ölçüm',count:METRICS.length+' ölçüm · '+geography.length+' ülke'},{id:'sport',name:'Spor',description:'Branş → ülke → lig → maç',count:SPORTS.length+' branş'},{id:'crypto',name:'Kripto',description:'Coin → süre → fiyat hareketi',count:'Coinbase USD pariteleri'},{id:'fx',name:'Döviz',description:'Para birimleri → günlük referans kur',count:CURRENCIES.length+' para birimi'},{id:'culture',name:'Gündem & kültür',description:'Dil → ilgi alanı → Wikipedia konusu',count:LANGUAGES.length+' dil · 7 dal'},{id:'events',name:'Günlük olaylar',description:'Kaynağı belli editör soruları',count:'USGS · NOAA · editörler'}],horizons:HORIZONS,sports:SPORTS,metrics:METRICS,languages:LANGUAGES,topics:[{id:'trending',name:'En çok okunanlar'},...Object.entries(TOPICS).map(([id,t]:any)=>({id,name:t.name}))],currencies:CURRENCIES};
 if(kind==='countries')return {items:[...geography.map(c=>({id:c.code,name:new Intl.DisplayNames(['tr'],{type:'region'}).of(c.code)||c.name})),...(body.sport?[{id:'GB-ENG',name:'İngiltere'},{id:'GB-SCT',name:'İskoçya'},{id:'GB-WLS',name:'Galler'}]:[])].sort((a,b)=>a.name.localeCompare(b.name,'tr')),source:'GeoNames · CC BY 4.0',updatedAt:null,refreshSeconds:0};
 if(kind==='regions')return {items:country(String(body.country)).regions.map(r=>({id:r.id,name:r.name})),source:'GeoNames · CC BY 4.0',updatedAt:null,refreshSeconds:0};
 if(kind==='cities') {
   const code=String(body.country),r=region(code,body.region),term=String(body.search||'').trim();if(term.length<2||term.length>70)fail('Şehir için 2–70 karakter yaz.');
   const result=await source('geo:'+code+':'+(r?.id||'')+':'+term.toLowerCase(),`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term+(r?', '+r.name:''))}&countryCode=${code}&count=100&language=en`,86400000,true);
   return {...result,data:undefined,items:(result.data.results||[]).filter((c:any)=>c.country_code===code&&(!r||c.admin1_id===r.id)&&/^(PPL|ADM1)/.test(c.feature_code)).slice(0,40).map((c:any)=>({id:c.id,name:c.name,detail:[c.admin2,c.admin1,c.timezone].filter(Boolean).join(' · ')})),source:'Open-Meteo Geocoding / GeoNames'};
 }
 if(kind==='leagues') {
   const sport=String(body.sport);if(!SPORTS.some(s=>s.id===sport))fail('Bir spor branşı seç.');const c=sportCountry(String(body.country));
   const result=await source('leagues:'+c+':'+sport,`https://www.thesportsdb.com/api/v1/json/123/search_all_leagues.php?c=${encodeURIComponent(c)}&s=${encodeURIComponent(sport)}`,86400000,true).catch(error=>{if(c==='Turkey'&&sport==='Soccer')return {data:{countries:[]},updatedAt:null,stale:true,refreshSeconds:86400};throw error});
   const known=c==='Turkey'&&sport==='Soccer'?[{id:'4339',name:'Süper Lig',detail:'Türkiye · en üst lig'},{id:'4676',name:'TFF 1. Lig',detail:'Türkiye · 1. Lig'}]:[];
   const rows=(result.data.countries||[]).filter((l:any)=>l.strSport===sport).map((l:any)=>({id:l.idLeague,name:l.strLeague,detail:l.strCurrentSeason}));
   return {...result,data:undefined,items:[...known,...rows.filter((l:any)=>!known.some(k=>k.id===l.id))],source:'TheSportsDB',note:'Türkiye için Süper Lig ve TFF 1. Lig ayrıca dahil edilir; diğer liglerde sağlayıcının ücretsiz kapsamı geçerlidir.'};
 }
 if(kind==='matches')return leagueMatches(String(body.league));
 if(kind==='coins') {
   const result=await products();const priority=['BTC','ETH','SOL','XRP','ADA','DOGE','AVAX','LINK','LTC'];
   return {...result,data:undefined,items:onlineProducts(result.data).map(p=>({id:p.id,name:p.base_currency,detail:p.display_name})).sort((a,b)=>(priority.indexOf(a.name)<0?999:priority.indexOf(a.name))-(priority.indexOf(b.name)<0?999:priority.indexOf(b.name))||a.name.localeCompare(b.name)),source:'Coinbase Exchange'};
 }
 if(kind==='articles')return topics(language(body.language),String(body.branch||'trending'));
 if(kind==='quote') {
   if(body.category==='crypto') {
     const id=String(body.coin),list=await products();if(!onlineProducts(list.data).some(p=>p.id===id))fail('Bir coin seç.');
     const result=await source('ticker:'+id,'https://api.exchange.coinbase.com/products/'+id+'/ticker',20000,true);
     return {...result,data:undefined,source:'Coinbase Exchange',providerTime:result.data.time,values:[{label:id,value:Number(result.data.price),unit:'USD'},{label:'24 saat hacim',value:Number(result.data.volume),unit:id.split('-')[0]}]};
   }
   if(body.category==='fx') {
     const base=String(body.base),quote=String(body.quote);if(!CURRENCIES.includes(base)||!CURRENCIES.includes(quote)||base===quote)fail('Farklı iki para birimi seç.');
     const result=await source('fx:'+base+':'+quote,`https://api.frankfurter.dev/v2/providers/ecb/rate/${base}/${quote}`,900000,true);
     return {...result,data:undefined,source:'Frankfurter / ECB · günlük',providerTime:result.data.date,values:[{label:'1 '+base,value:result.data.rate,unit:quote}]};
   }
   if(body.category==='weather') {
     const id=String(body.city);if(!/^\d{1,10}$/.test(id))fail('Bir şehir seç.');
     const loc=await source('place:'+id,'https://geocoding-api.open-meteo.com/v1/get?id='+id,86400000,true),c=loc.data;
     const result=await source('weather-current:'+id,`https://api.open-meteo.com/v1/forecast?latitude=${c.latitude}&longitude=${c.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=${encodeURIComponent(c.timezone||'UTC')}`,120000,true);
     return {...result,data:undefined,source:'Open-Meteo · güncel model',providerTime:result.data.current?.time,timezone:c.timezone,values:[{label:'Sıcaklık',value:result.data.current?.temperature_2m,unit:'°C'},{label:'Nem',value:result.data.current?.relative_humidity_2m,unit:'%'},{label:'Rüzgâr',value:result.data.current?.wind_speed_10m,unit:'km/sa'}]};
   }
   fail('Bu kategoride canlı gösterge yok.');
 }
 if(kind==='events')return {items:[...AUTO_EVENTS,...(await all("SELECT * FROM questions WHERE category='culture' AND status='open' AND close_at>? ORDER BY close_at LIMIT 30",new Date().toISOString())).map(q=>({id:q.id,name:q.title,detail:q.context}))],source:'USGS · NOAA · Just a Guess editörleri',updatedAt:new Date().toISOString(),refreshSeconds:60,note:'Doğa ve uzay soruları otomatik oluşturulur; editör soruları ayrıca eklenir. Deprem tahminleri afet uyarısı değildir.'};
 fail('Bu veri seçimi desteklenmiyor.');
}
