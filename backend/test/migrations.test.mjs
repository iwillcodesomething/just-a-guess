import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

test('quota migration preserves existing personal forecasts and backfills used edits',()=>{
 const directory=mkdtempSync(join(tmpdir(),'jag-migration-')),path=join(directory,'old.sqlite');
 try{
   const db=new DatabaseSync(path),files=readdirSync('backend/migrations').filter(f=>f.endsWith('.sql')).sort();
   db.exec('CREATE TABLE schema_migrations(name TEXT PRIMARY KEY NOT NULL,applied_at TEXT NOT NULL)');
   for(const name of files.slice(0,4)){db.exec(readFileSync('backend/migrations/'+name,'utf8'));db.prepare('INSERT INTO schema_migrations VALUES(?,?)').run(name,new Date().toISOString())}
   const now=new Date().toISOString();
   db.prepare('INSERT INTO users(id,name,code,created) VALUES(?,?,?,?)').run('old-player','Existing player','OLDUSER1',now);
   db.prepare('INSERT INTO explorations(user_id,id,day,slot,category,question,choice,confidence,created,close_at,resolve_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('old-player','saved-forecast','2026-11-01',2,'weather','{"title":"Saved forecast"}',1,80,now,'2026-11-02T00:00:00Z','2026-11-03T00:00:00Z');
   db.prepare('INSERT INTO ad_tickets(id,user_id,purpose,target,mode,created_at,expires_at,consumed_at) VALUES(?,?,?,?,?,?,?,?)').run('old-ticket','old-player','edit','personal/saved-forecast','test',now,now,now);db.close();
   const script=`const {sql}=await import(${JSON.stringify('file://'+resolve('backend/src/runtime.mjs'))});const row=sql.prepare('SELECT * FROM explorations').get();console.log(JSON.stringify({row,migrations:sql.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n}));sql.close()`;
   const result=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',env:{...process.env,DATABASE_PATH:path}});
   assert.equal(result.status,0,result.stderr);const output=JSON.parse(result.stdout.trim());
   assert.equal(output.row.id,'saved-forecast');assert.equal(output.row.slot,2);assert.equal(output.row.choice,1);assert.equal(output.row.edits,1);assert.equal(output.row.question,'{"title":"Saved forecast"}');assert.equal(output.migrations,6);
 }finally{rmSync(directory,{recursive:true,force:true})}
});
