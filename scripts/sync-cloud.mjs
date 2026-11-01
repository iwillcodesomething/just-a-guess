import {readFileSync,writeFileSync} from 'node:fs';
const check=process.argv.includes('--check');
for(const name of ['engine.ts','game.ts','catalog.ts','explore.ts']) {
 const text=readFileSync('backend/src/'+name,'utf8').replaceAll('./runtime.mjs','./runtime.ts').replaceAll('../data-assets/geography.json','./geography.json');
 const target='supabase/functions/just-a-guess/'+name;
 if(check){if(readFileSync(target,'utf8')!==text)throw new Error(target+' is outdated; run node scripts/sync-cloud.mjs');}
 else writeFileSync(target,text);
}
const text=readFileSync('backend/data-assets/geography.json','utf8'),target='supabase/functions/just-a-guess/geography.json';
if(check){if(readFileSync(target,'utf8')!==text)throw new Error('Cloud geography is outdated');}
else writeFileSync(target,text);
console.log(check?'Cloud and standalone rules match.':'Cloud rules synchronized.');
