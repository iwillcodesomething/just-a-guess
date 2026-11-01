import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
mkdirSync('outputs/address-test',{recursive:true});
const steps=[['java',['-m','jdk.compiler/com.sun.tools.javac.Main','-d','outputs/address-test','android/app/src/main/java/app/justaguess/mobile/ServerAddress.java','android/tests/ServerAddressTest.java']],['java',['-cp','outputs/address-test','app.justaguess.mobile.ServerAddressTest']]];
for(const [command,args]of steps){const result=spawnSync(command,args,{stdio:'inherit'});if(result.error)console.error(result.error.message);if(result.status!==0)process.exit(result.status||1)}
