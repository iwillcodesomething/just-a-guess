import {useState} from 'react';
import {Sparkles,LoaderCircle,ArrowRight,Target} from 'lucide-react';
import {api} from './api';

export default function ResultBonus({question,prefs,onClaim}:{question:any;prefs:any;onClaim:()=>Promise<any>}){
 const [busy,setBusy]=useState(false),[bonus,setBonus]=useState<any>(null),[error,setError]=useState('');
 if(question.status!=='resolved'||question.prediction?.choice!==question.outcome)return null;
 async function reveal(){setBusy(true);setError('');try{
   const response=await api('/v1/game',{method:'POST',body:JSON.stringify({action:'claim-result-bonus',scope:question.scope==='explore'?'personal':'daily',id:question.id})}),result=await response.json();
   if(!response.ok)throw new Error(result.error||'Bonus açılamadı.');
   await new Promise(resolve=>setTimeout(resolve,650));setBonus(result);
   if(result.fresh&&result.xp>0){if(window.JustAGuess?.celebrate)window.JustAGuess.celebrate(result.multiplier>=5?3:1,!!prefs.sound,!!prefs.haptics);else window.JustAGuess?.feedback(!!prefs.sound,!!prefs.haptics)}
   await onClaim();
 }catch(e:any){setError(e.message)}finally{setBusy(false)}}
 return <section className={'result-bonus '+(bonus?.multiplier>=5?'jackpot':'')}><span className="eyebrow">DOĞRU TAHMİN · AYRI BONUS XP</span>{!bonus?<><h3>Bir küçük sürpriz daha.</h3><p>Rekabet puanın sabit kalır. Bu sonuç için bir kez 0–100 bonus XP açabilirsin.</p><button className="primary" disabled={busy} onClick={reveal}>{busy?<><LoaderCircle className="spin" size={18}/>Bonus açılıyor…</>:<><Sparkles size={18}/>Bonus XP’yi aç <ArrowRight size={17}/></>}</button></>:<><div className="bonus-multiplier">x{bonus.multiplier}</div><h3>{bonus.xp?`+${bonus.xp} XP`:'Bu tur ek XP çıkmadı.'}</h3><p>10 XP × {bonus.multiplier}. Sonucun kaydedildi; tekrar açmak ödülü değiştirmez.</p>{bonus.multiplier>=5&&<div className="bonus-confetti" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{'--i':i} as any}/>)}</div>}</>}<details><summary>Bonus olasılıkları ve puan farkı</summary><p>Doğru tahminlerde x0: %40, x1: %35, x2: %15, x5: %8, x10: %2. Bonus yalnızca profil XP’sini artırır; doğruluk puanına ve liderlik sırasına eklenmez. Nakit veya hediye değeri yoktur.</p></details>{error&&<p role="alert">{error}</p>}</section>;
}
export function ThresholdDistance({question}:{question:any}){
 const rule=question.rule||{},value=question.actual_value;
 if(question.status!=='resolved'||question.prediction?.choice===question.outcome||typeof value!=='number'||!Number.isFinite(value))return null;
 const threshold=rule.type==='crypto'||rule.type==='fx'?rule.baseline:typeof rule.threshold==='number'?rule.threshold:null;
 if(rule.type==='sport-custom'&&rule.market!=='total'||rule.type==='crypto'&&rule.market!=='up')return null;
 if(typeof threshold!=='number'||!Number.isFinite(threshold))return null;
 const difference=Math.abs(value-threshold),unit=rule.unit||(rule.type==='fx'?rule.quote:rule.type==='crypto'?'USD':String(rule.type||'').includes('sport')?'gol / skor':rule.type==='wiki'?'görüntülenme':rule.type==='event-quake'?'kayıt':rule.type==='event-kp'?'Kp':'');
 const format=(n:number)=>n!==0&&Math.abs(n)<0.000001?n.toExponential(2):n.toLocaleString('tr-TR',{maximumFractionDigits:8});
 return <div className="threshold-distance"><Target size={21}/><div><strong>Gerçek eşik farkı: {format(difference)} {unit}</strong><p>Kaynak değeri {format(value)} · eşik {format(threshold)}. Tahminin yanlış sonuçlandı; bu gösterge sonucu veya puanını değiştirmez.</p></div></div>;
}
