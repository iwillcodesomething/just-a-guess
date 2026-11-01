import {spawnSync} from 'node:child_process';
import {mkdirSync,cpSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
function run(command,args,cwd=process.cwd()){const result=spawnSync(command,args,{stdio:'inherit',cwd,env:process.env});if(result.status!==0)process.exit(result.status||1)}
run(process.execPath,['node_modules/vite/bin/vite.js','build','--config','mobile/vite.config.ts']);
mkdirSync('android/app/src/main/assets',{recursive:true});cpSync('mobile/dist','android/app/src/main/assets',{recursive:true});
const gradle=process.env.JAG_GRADLE||resolve('android/gradlew');run(gradle,['--no-daemon','assembleDebug',...(process.env.JAG_OFFLINE?['--offline']:[])],resolve('android'));
mkdirSync('outputs',{recursive:true});cpSync('android/app/build/outputs/apk/debug/app-debug.apk','outputs/Just-a-Guess-0.3.0-beta.apk');
