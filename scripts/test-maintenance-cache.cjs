const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
let now=10000,calls=0,payload={enabled:false,message:'',expectedEnd:null},fail=false;
class Clock extends Date {static now(){return now;}}
const exportsModule={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/maintenance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsModule,require:()=>({getPublicSupabaseConfig:()=>({url:'https://test.invalid'})}),Date:Clock,AbortSignal,Intl,Object,fetch:async()=>{calls++;if(fail)throw Error('offline');await Promise.resolve();return {status:200,ok:true,json:async()=>({...payload})}}});
(async()=>{const m=exportsModule;
await Promise.all([m.getMaintenanceSettings(),m.getMaintenanceSettings(),m.getMaintenanceSettings()]);assert.equal(calls,1);
await m.getMaintenanceSettings();assert.equal(calls,1);
now+=5001;payload.enabled=true;assert.equal((await m.getMaintenanceSettings()).enabled,true);assert.equal(calls,2);
await m.getMaintenanceSettings({fresh:true});assert.equal(calls,3);
m.invalidateMaintenanceCache();await m.getMaintenanceSettings();assert.equal(calls,4);
m.invalidateMaintenanceCache();fail=true;assert.equal((await m.getMaintenanceSettings()).enabled,false);fail=false;await m.getMaintenanceSettings();assert.equal(calls,6);
console.log('PASS concurrent deduplication, five-second TTL, fresh admin reads, invalidation, failure retry without cached failure');
})().catch(e=>{console.error(e);process.exitCode=1});
