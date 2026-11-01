export const TZ="Europe/Istanbul";
export const confidenceSteps=[50,65,80,95];
export function dayOf(date=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(date)}
export function shiftDay(day:string,delta:number){const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10)}
export function weekOf(day:string){const d=new Date(day+"T12:00:00Z");return shiftDay(day,-((d.getUTCDay()+6)%7))}
export function seasonOf(day:string){const n=Math.floor((new Date(day+"T00:00:00Z").getTime()-Date.UTC(2026,0,5))/86400000/28);return new Date(Date.UTC(2026,0,5)+n*28*86400000).toISOString().slice(0,10)}
export function scoreFor(choice:number,confidence:number,outcome:number,count=2){const p=Array.from({length:count},(_,i)=>i===choice?confidence/100:(1-confidence/100)/(count-1));return Math.round(100*(1-.5*p.reduce((s,v,i)=>s+(v-(i===outcome?1:0))**2,0))*100)/100}
export function participationStreak(days:string[],today:string){const set=new Set(days);let cursor=set.has(today)?today:shiftDay(today,-1),length=0,played=0,pauses=0;const restWeeks=new Set<string>();while(length<1000){if(set.has(cursor)){length++;played++}else if(!restWeeks.has(weekOf(cursor))&&set.has(shiftDay(cursor,-1))){length++;pauses++;restWeeks.add(weekOf(cursor))}else break;cursor=shiftDay(cursor,-1)}return {length,played,pauses}}
export const TRAINING=[
{id:"training-football",category:"sport",title:"2–1 biten bir maçta 2,5 gol üstü gerçekleşmiş midir?",context:"Hızlı antrenman · Sonucu belli bir örnek, gerçek maç tahmini değil.",options:["Evet, üst","Hayır, alt"],outcome:0,explanation:"2 + 1 = 3 gol. 2,5 üstü, en az 3 gol demektir. Uzatma ve penaltılar bu örneğe dahil değildir."},
{id:"training-weather",category:"weather",title:"Toplam yağış 0,8 mm ise 1 mm yağış eşiği aşılır mı?",context:"Hızlı antrenman · Ölçüm kuralını birlikte deneyelim.",options:["Evet, aşılır","Hayır, aşılmaz"],outcome:1,explanation:"0,8 mm, 1 mm'den küçüktür. Gerçek sorularda da kaynak, tarih ve eşik önceden sabitlenir."},
];
export function safeJSON(value:string|undefined|null,fallback:any={}){try{return JSON.parse(value||"")}catch{return fallback}}
