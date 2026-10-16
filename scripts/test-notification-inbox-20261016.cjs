const fs=require('fs'),ts=require('typescript'),vm=require('vm'),assert=require('node:assert/strict');
let session={user:{id:'owner-a'},profile:{role:'admin'}}, rows=[];
class Query {
 constructor(){this.filters=[];this.op='select';}
 upsert(values,options){assert.equal(options.ignoreDuplicates,true);for(const row of values)if(!rows.some(x=>x.user_id===row.user_id&&x.scope===row.scope&&x.notification_id===row.notification_id))rows.push({...row,received_at:'2026-10-16T01:00:00Z',read_at:null});return Promise.resolve({error:null});}
 select(){return this;} update(value){this.op='update';this.value=value;return this;}
 eq(key,value){this.filters.push(row=>row[key]===value);return this;}
 is(key,value){return this.eq(key,value);} in(key,value){this.filters.push(row=>value.includes(row[key]));return this;}
 order(){return this;}range(a,b){return Promise.resolve({data:rows.filter(row=>this.filters.every(f=>f(row))).slice(a,b+1),error:null});}
 then(resolve,reject){if(this.op==='update')for(const row of rows.filter(row=>this.filters.every(f=>f(row))))Object.assign(row,this.value);return Promise.resolve({error:null}).then(resolve,reject);}
}
const client={from:()=>new Query()};
const source=ts.transpileModule(fs.readFileSync('src/lib/notifications/server.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={exports:{},require:name=>name==='server-only'?{}:name.includes('auth-helpers')?{getSessionProfile:async()=>session}:{createServiceClient:()=>client},Response,Request,URL,Date};vm.runInNewContext(source,sandbox);const api=sandbox.exports;
function req(ids,origin='https://www.hmtkorea.com'){return new Request('https://www.hmtkorea.com/api/admin/notifications',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({ids})});}
(async()=>{
const event={id:'order:1',kind:'order',detail:'QT-1',href:'/en/orders/QT-1'};
await api.storeNotifications(client,'owner-a','admin',[event]);await api.storeNotifications(client,'owner-b','admin',[event]);
assert.equal((await api.markNotifications(req(['order:1']),'admin')).status,200);
assert.ok(rows[0].read_at);assert.equal(rows[1].read_at,null);
const firstRead=rows[0].read_at;await api.markNotifications(req(['order:1']),'admin');assert.equal(rows[0].read_at,firstRead);
const result=await api.storeNotifications(client,'owner-a','admin',[{...event,detail:'changed'}]);assert.equal(result[0].readAt,firstRead);assert.equal(result[0].detail,'QT-1');
assert.equal((await api.markNotifications(req(['order:1'],'https://evil.example'),'admin')).status,403);
assert.equal((await api.markNotifications(req([null]),'admin')).status,400);
session.profile.role='customer';assert.equal((await api.markNotifications(req(['order:1']),'admin')).status,403);
session.user=null;assert.equal((await api.markNotifications(req(['order:1']),'account')).status,403);
console.log('PASS: persistent snapshot, idempotent read, owner isolation, role, origin and payload validation');
})().catch(error=>{console.error(error);process.exitCode=1;});
