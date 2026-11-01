import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readdirSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const dbPath=process.env.DATABASE_PATH||resolve('backend/data/game.sqlite');
if(dbPath!==':memory:')mkdirSync(dirname(dbPath),{recursive:true,mode:0o700});
export const sql=new DatabaseSync(dbPath);
sql.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
sql.exec('CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY NOT NULL,applied_at TEXT NOT NULL);');
const migrations=fileURLToPath(new URL('../migrations/',import.meta.url));
for(const name of readdirSync(migrations).filter(n=>n.endsWith('.sql')).sort()){
 if(sql.prepare('SELECT name FROM schema_migrations WHERE name=?').get(name))continue;
 sql.exec('BEGIN IMMEDIATE');try{sql.exec(readFileSync(resolve(migrations,name),'utf8'));sql.prepare('INSERT INTO schema_migrations VALUES(?,?)').run(name,new Date().toISOString());sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}
}
function prepared(query,args=[]){return {bind(...values){return prepared(query,values)},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},runSync(){return {meta:sql.prepare(query).run(...args)}},async run(){return this.runSync()}}}
export const env={DB:{prepare:query=>prepared(query),async batch(items){sql.exec('BEGIN IMMEDIATE');try{const result=items.map(s=>s.runSync());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}}};
