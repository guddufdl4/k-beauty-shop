const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
function load(file,imports){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>imports[n]??{},Date,console,Response,Request,URL,FormData});return exports;}
const validate=load('src/lib/support-inquiries.ts',{});
const valid={id:'00000000-0000-0000-0000-000000000001',contact_name:'Test buyer',email:'TEST@example.com',category:'general',subject:'Support question',message:'A sufficiently detailed message.',locale:'en',privacy_consent:true};
assert.equal(validate.validateSupportInquiry(valid).data.email,'test@example.com');
for(const value of [null,[],1,{}, {...valid,privacy_consent:false},{...valid,category:'invalid'},{...valid,email:'bad'},{...valid,message:'tiny'},{...valid,id:'invalid'},{...valid,order_number:'a!'}, {...valid,locale:'invalid'},{...valid,message:'x'.repeat(5001)}])assert.equal(validate.validateSupportInquiry(value),null);
let mode='normal',databaseCalls=0,emailCalls=0,saved,actor,updates=[];
const chain={select(){databaseCalls++;return this},eq(){return this},gte(){return this},is(){return this},maybeSingle(){return Promise.resolve(mode==='queryError'?{error:{}}:{data:mode==='duplicate'?{id:valid.id}:null,error:null})},insert(data){saved=data;return Promise.resolve({error:mode==='insertError'?{code:'XX'}:mode==='raceDuplicate'?{code:'23505'}:null})},then(resolve){resolve({count:mode==='limited'?3:0,error:null,data:[{id:valid.id}]})},update(data){updates.push(data);return this}};
const imports={'@/lib/supabase/service':{createServiceClient:()=>mode==='unavailable'?null:{from:()=>chain}},'@/lib/email':{escapeHtml:s=>s,sendQuoteInquiryEmail:async()=>{emailCalls++;if(mode==='mailError')throw Error('email unavailable');return{ok:true}}},'@/lib/support-inquiries':validate};
const api=load('src/app/api/support-inquiry/route.ts',imports);
function request(body=valid,origin='https://hmt.test'){return new Request('https://hmt.test/api/support-inquiry',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})}
(async()=>{
 let r=await api.POST(request(valid,'https://other.test'));assert.equal(r.status,403);assert.equal(databaseCalls,0);
 r=await api.POST(request(null));assert.equal(r.status,400);assert.equal(databaseCalls,0);
 r=await api.POST(request({...valid,spam_trap:'bot'}));assert.equal(r.status,200);assert.equal(databaseCalls,0);assert.equal(emailCalls,0);
 for(const [m,status] of [['unavailable',503],['queryError',503],['limited',429],['insertError',503],['duplicate',200],['raceDuplicate',200]]){mode=m;emailCalls=0;r=await api.POST(request());assert.equal(r.status,status);assert.equal(emailCalls,0);}
 for(const m of ['normal','mailError']){mode=m;emailCalls=0;r=await api.POST(request());assert.equal(r.status,200);assert.equal((await r.json()).reference,valid.id);assert.equal(saved.email,'test@example.com');assert.equal(emailCalls,1);}
 const actions=load('src/app/actions/support-inquiries.ts',{'@/lib/supabase/auth-helpers':{getSessionProfile:async()=>actor},'@/lib/supabase/service':imports['@/lib/supabase/service'],'next/cache':{revalidatePath(){}}});
 const form=new FormData();form.set('id',valid.id);form.set('decision','resolve');mode='normal';
 for(const role of ['customer','wholesale']){actor={user:{id:'u'},profile:{role,staff_scope:'members'}};updates=[];assert((await actions.updateSupportInquiry(form)).error);assert.equal(updates.length,0);}
 actor={user:{id:'a'},profile:{role:'admin'}};assert((await actions.updateSupportInquiry(form)).success);assert(updates[0].resolved_at);
 console.log('PASS: payload validation, consent, same-origin, honeypot, throttling, idempotency, DB failure handling, email failure persistence, admin-only status updates');
})().catch(e=>{console.error(e);process.exitCode=1});
