import {sql} from './runtime.mjs';
const [command,username]=process.argv.slice(2);
if(command!=='set-owner'||!username){console.error('Usage: node backend/src/admin.mjs set-owner USERNAME');process.exit(1)}
const account=sql.prepare('SELECT user_id FROM accounts WHERE username=?').get(username);
if(!account){console.error('Account not found. Register from the APK first.');process.exit(1)}
sql.prepare("INSERT INTO app_settings(key,value) VALUES('owner',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(account.user_id);
console.log('Content owner assigned to the specified account.');
