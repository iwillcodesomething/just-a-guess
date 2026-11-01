import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('SQLite records survive independent backend process restarts',()=>{const directory=mkdtempSync(join(tmpdir(),'jag-test-'));const env={...process.env,DATABASE_PATH:join(directory,'game.sqlite')};try{const one=spawnSync(process.execPath,['--input-type=module','-e',`import {sql} from './backend/src/runtime.mjs';sql.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run('retained','persist_test',null,new Date().toISOString());`],{cwd:process.cwd(),env,encoding:'utf8'});assert.equal(one.status,0,one.stderr);const two=spawnSync(process.execPath,['--input-type=module','-e',`import {sql} from './backend/src/runtime.mjs';console.log(sql.prepare('SELECT username FROM accounts WHERE user_id=?').get('retained').username)`],{cwd:process.cwd(),env,encoding:'utf8'});assert.equal(two.status,0,two.stderr);assert.equal(two.stdout.trim(),'persist_test')}finally{rmSync(directory,{recursive:true,force:true})}});
