import {sql,dbPath} from './runtime.mjs';
import {resolve,dirname} from 'node:path';
import {mkdirSync} from 'node:fs';
const destination=resolve(process.argv[2]||dirname(dbPath)+'/backups/game-'+new Date().toISOString().replaceAll(':','-')+'.sqlite');
mkdirSync(dirname(destination),{recursive:true,mode:0o700});
sql.prepare('VACUUM INTO ?').run(destination);
console.log('Consistent SQLite backup created: '+destination);
