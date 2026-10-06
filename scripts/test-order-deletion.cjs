const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
function load(file,imports){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(n)=>imports[n]??{},Date,console,FormData});return exports;}
let response={data:[],error:null},calls=[],actor,revalidated=[];
const chain={update(p){calls.push(['update',p]);return this},eq(k,v){calls.push(['eq',k,v]);return this},is(k,v){calls.push(['is',k,v]);return this},not(k,op,v){calls.push(['not',k,op,v]);return this},select(){return Promise.resolve(response)}};
const orders=load('src/lib/admin/orders.ts',{'@/lib/supabase/config':{isSupabaseConfigured:()=>true},'@/lib/supabase/service':{createServiceClient:()=>({from:()=>chain})}});
const actions=load('src/app/actions/orders.ts',{'@/lib/admin/orders':orders,'@/lib/supabase/auth-helpers':{getSessionProfile:async()=>actor},'next/cache':{revalidatePath:(p)=>revalidated.push(p)}});
const form=new FormData();form.set('order_number','QT-20261005-0001');
(async()=>{
 for(const profile of [null,{role:'customer'},{role:'wholesale'},{role:'customer',staff_scope:'members'}]){actor={configured:true,user:profile?{id:'u'}:null,profile};calls=[];assert((await actions.deleteAdminOrderAction(form)).error);assert((await actions.restoreAdminOrderAction(form)).error);assert.equal(calls.length,0);}
 actor={configured:true,user:{id:'a'},profile:{role:'admin'}};
 response={data:null,error:{message:'missing deleted_at'}};revalidated=[];assert.equal((await actions.deleteAdminOrderAction(form)).error,'missing deleted_at');assert.equal(revalidated.length,0);
 response={data:[],error:null};assert((await actions.deleteAdminOrderAction(form)).error);assert((await actions.restoreAdminOrderAction(form)).error);
 response={data:[{order_number:'QT-20261005-0001'}],error:null};calls=[];assert((await actions.deleteAdminOrderAction(form)).success);assert(calls.some(c=>c[0]==='is'&&c[1]==='deleted_at'&&c[2]===null));assert.equal(calls[0][1].deleted_at.length,24);assert(revalidated.includes('/admin/orders'));
 calls=[];assert((await actions.restoreAdminOrderAction(form)).success);assert.equal(calls[0][1].deleted_at,null);assert(calls.some(c=>c[0]==='not'&&c[1]==='deleted_at'));
 calls=[];const invalid=new FormData();invalid.set('order_number','!');assert((await actions.deleteAdminOrderAction(invalid)).error);assert.equal(calls.length,0);
 console.log('PASS: admin-only delete/restore, database error propagation, zero-row denial, soft-delete filter, restore filter, revalidation on success, invalid order rejection');
})().catch(e=>{console.error(e);process.exitCode=1});
