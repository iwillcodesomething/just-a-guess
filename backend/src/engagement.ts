import {first,run,fail} from './catalog.ts';

// Bonus XP is separate from the deterministic competitive score.
export const BONUS_ODDS=[{multiplier:0,chance:40},{multiplier:1,chance:35},{multiplier:2,chance:15},{multiplier:5,chance:8},{multiplier:10,chance:2}];
function draw(){let n=255;while(n>=200)n=crypto.getRandomValues(new Uint8Array(1))[0];const value=n%100;let total=0;for(const option of BONUS_ODDS){total+=option.chance;if(value<total)return option.multiplier}return 0}
export async function claimResultBonus(userId:string,body:any){
 const scope=body.scope==='personal'?'personal':body.scope==='daily'?'daily':null;if(!scope)fail('Geçerli bir sonuç seç.');
 const id=String(body.id||''),row=scope==='personal'?await first('SELECT status,choice,outcome,score FROM explorations WHERE user_id=? AND id=?',userId,id):await first('SELECT q.status,q.outcome,p.choice,p.score FROM predictions p JOIN questions q ON q.id=p.question_id WHERE p.user_id=? AND p.question_id=?',userId,id);
 if(!row||row.status!=='resolved'||row.score===null)fail('Bu tahminin doğrulanmış sonucu henüz yok.');
 const multiplier=row.choice===row.outcome?draw():0,xp=10*multiplier;
 const inserted=await run('INSERT INTO result_bonuses(user_id,question_id,scope,multiplier,xp,claimed_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,question_id,scope) DO NOTHING',userId,id,scope,multiplier,xp,new Date().toISOString());
 const bonus=await first('SELECT multiplier,xp,claimed_at FROM result_bonuses WHERE user_id=? AND question_id=? AND scope=?',userId,id,scope);
 return {...bonus,fresh:Number(inserted.meta.changes)>0,baseXP:10,odds:BONUS_ODDS,message:Number(bonus.xp)>0?`Bonus +${bonus.xp} XP!`:'Bu sonuçta ek XP çıkmadı.'};
}
