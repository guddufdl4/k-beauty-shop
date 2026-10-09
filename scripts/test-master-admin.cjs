const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>imports[n]??{},Buffer,FormData,console});return exports;}
const access=load('src/lib/auth/member-access.ts');
const secret=load('src/lib/auth/admin-designation.ts',{'node:crypto':require('node:crypto')});
assert(secret.verifyAdminDesignationPassword('1234'));assert(!secret.verifyAdminDesignationPassword(''));assert(!secret.verifyAdminDesignationPassword('4321'));
let actor,calls=[];
const query={update(p){calls.push(['update',p]);return this},in(k,v){calls.push(['in',k,v]);return this},neq(k,v){calls.push(['neq',k,v]);return this},eq(){return this},select(){return Promise.resolve({data:[{id:'target'}],error:null})}};
const actions=load('src/app/actions/members.ts',{'@/lib/auth/member-access':access,'@/lib/auth/admin-designation':secret,'@/lib/supabase/auth-helpers':{getSessionProfile:async()=>actor},'@/lib/supabase/service':{createServiceClient:()=>({from:()=>query})},'next/cache':{revalidatePath:()=>{}}});
const target='11111111-1111-4111-8111-111111111111';
function form(password='1234',id=target){const f=new FormData();f.set('member_id',id);f.set('decision','grade');f.set('grade','admin');f.set('admin_password',password);return f;}
(async()=>{
for(const profile of [{id:target,role:'admin'},{id:target,role:'customer',staff_scope:'members'}]){actor={user:{id:target},profile};calls=[];assert((await actions.setBusinessApproval(form())).error);assert.equal(calls.length,0);}
actor={user:{id:access.MASTER_ADMIN_ID},profile:{id:access.MASTER_ADMIN_ID,role:'admin'}};
assert.equal(access.memberGradeLabel(actor.profile),'마스터 관리자');
for(const f of [form('bad'),form(''),form('1234',access.MASTER_ADMIN_ID)]){calls=[];assert((await actions.setBusinessApproval(f)).error);assert.equal(calls.length,0);}
calls=[];assert.equal((await actions.setBusinessApproval(form())).updated,1);assert.equal(calls[0][1].role,'admin');assert(calls.some(c=>c[0]==='neq'&&c[1]==='role'&&c[2]==='admin'));
const normalize=load('src/lib/admin/member-form-data.ts');const mobile=form('');mobile.set('decision','mobile-grade');mobile.set('mobile_grade','admin');mobile.set('mobile_admin_password','1234');normalize.normalizeMemberDecision(mobile);assert.equal(mobile.get('admin_password'),'1234');assert.equal(mobile.get('grade'),'admin');
console.log('PASS master-only authorization, wrong/missing confirmation denial, self protection, server promotion patch, admin target exclusion, mobile normalization');
})().catch(e=>{console.error(e);process.exitCode=1});
