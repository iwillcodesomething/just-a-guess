import {api,showRewarded} from './api';
async function ads(body:any){const r=await api('/v1/ads',{method:'POST',body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.error||'Reklam işlemi tamamlanamadı.');return d}
export async function earnReward(purpose:'edit'|'theme'|'extra',target:string,status:(text:string)=>void){
 status('Reklam hazırlanıyor…');
 const prepared=await ads({action:'prepare',purpose,target});
 if(prepared.verified)return prepared.ticketId;
 status(prepared.test?'Google test reklamı yükleniyor…':'Reklam yükleniyor…');
 const response=await showRewarded(prepared.ticketId),result=await response.json();
 if(!response.ok)throw new Error(result.error||'Reklam açılamadı.');
 if(!result.earned)throw new Error('Reklam tamamlanmadı. Tahminin aynı kaldı; ödül verilmedi.');
 status('Ödül doğrulanıyor…');
 if(prepared.test)await ads({action:'complete-test',ticketId:prepared.ticketId});
 for(let i=0;i<15;i++){
   const state=await ads({action:'status',ticketId:prepared.ticketId});
   if(state.expired)throw new Error('Tahmin süresi veya ödül isteğinin süresi doldu.');
   if(state.verified&&!state.consumed)return prepared.ticketId;
   await new Promise(resolve=>setTimeout(resolve,1000));
 }
 throw new Error('Ödül doğrulaması gecikti. Biraz sonra yeniden dene; doğrulanan ödülün korunur.');
}
export async function redeemTheme(ticketId:string){return ads({action:'theme',ticketId})}
export async function redeemExtra(ticketId:string){return ads({action:'extra',ticketId})}
