import {spawnSync} from 'node:child_process';
import {mkdirSync,cpSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
function run(command,args,cwd=process.cwd()){const result=spawnSync(command,args,{stdio:'inherit',cwd,env:process.env});if(result.status!==0)process.exit(result.status||1)}
run(process.execPath,['node_modules/vite/bin/vite.js','build','--config','mobile/vite.config.ts']);
mkdirSync('android/app/src/main/assets',{recursive:true});cpSync('mobile/dist','android/app/src/main/assets',{recursive:true});
const gradle=process.env.JAG_GRADLE||resolve('android/gradlew');
const proxyArgs=[];const proxyValue=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
if(proxyValue){const proxy=new URL(proxyValue);for(const scheme of ['http','https'])proxyArgs.push('-D'+scheme+'.proxyHost='+proxy.hostname,'-D'+scheme+'.proxyPort='+(proxy.port||'8080'));}
run(gradle,['--no-daemon','assembleDebug',...proxyArgs,...(process.env.JAG_OFFLINE?['--offline']:[]),...(process.env.JAG_WRITE_LOCKS?['--write-locks']:[])],resolve('android'));
mkdirSync('outputs',{recursive:true});cpSync('android/app/build/outputs/apk/debug/app-debug.apk','outputs/Just-a-Guess-0.5.0-beta.apk');
