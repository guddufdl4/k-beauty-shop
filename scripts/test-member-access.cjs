const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
function moduleAt(file, imports){ const exports={}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name)=>imports[name],console,FormData,Set}); return exports; }
const access=moduleAt('src/lib/auth/member-access.ts',{});
for(const role of ['customer','wholesale']) assert.equal(access.canManageMembers({role}),false);
assert.equal(access.canManageMembers({role:'customer',staff_scope:'members'}),true);
assert.equal(access.canManageMemberTarget({role:'customer',staff_scope:'members'},{role:'admin'}),false);
assert.equal(access.canManageMemberTarget({role:'customer',staff_scope:'members'},{role:'customer',staff_scope:'members'}),false);
assert.equal(access.canManageMemberTarget({role:'admin'},{role:'wholesale',staff_scope:'members'}),true);
let actor, calls=[];
const chain={update(patch){calls.push(['update',patch]);return this;},in(k,v){calls.push(['in',k,v]);return this;},neq(k,v){calls.push(['neq',k,v]);return this;},eq(k,v){calls.push(['eq',k,v]);return this;},select(){return Promise.resolve({data:[{id:'x'}],error:null});}};
const actions=moduleAt('src/app/actions/members.ts',{'next/cache':{revalidatePath(){}},'@/lib/auth/member-access':access,'@/lib/supabase/auth-helpers':{getSessionProfile:async()=>actor},'@/lib/supabase/service':{createServiceClient:()=>({from:(table)=>table==="business_documents"?{select:()=>({in:async()=>({data:[{user_id:"00000000-0000-0000-0000-000000000001",file_path:"proof",business_number:"MO-12345"}],error:null})})}:{...chain,select:()=>({in:async()=>({data:[{id:"00000000-0000-0000-0000-000000000001",business_number:"MO-12345"}],error:null})})}})}});
function form(decision,grade){const f=new FormData();f.append('member_id','00000000-0000-0000-0000-000000000001');f.append('decision',decision);if(grade)f.append('grade',grade);return f;}
(async()=>{
 for(const profile of [null,{role:'customer'},{role:'wholesale'}]){actor={user:{id:'a'},profile};calls=[];await assert.rejects(actions.setBusinessApproval(form('approve')));assert.equal(calls.length,0);}
 actor={user:{id:'a'},profile:{role:'customer',staff_scope:'members'}};
 calls=[];await assert.rejects(actions.setBusinessApproval(form('grade','members')));assert.equal(calls.length,0);
 for(const decision of ['approve','revoke','grade']){calls=[];await actions.setBusinessApproval(form(decision,'vip'));assert(calls.some(c=>c[0]==='eq'&&c[1]==='staff_scope'&&c[2]==='none'));assert(calls.some(c=>c[0]==='neq'&&c[1]==='role'&&c[2]==='admin'));if(decision==='grade')assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])),{member_grade:'vip'});}
 actor={user:{id:'a'},profile:{role:'admin'}};calls=[];await actions.setBusinessApproval(form('grade','members'));assert.equal(calls[0][1].staff_scope,'members');assert(!calls.some(c=>c[0]==='eq'));
 calls=[];await actions.setBusinessApproval(form('grade','normal'));assert.equal(calls[0][1].staff_scope,'none');
 const approval=moduleAt('src/lib/auth/business-approval.ts',{});assert.equal(approval.hasBusinessApproval({role:'customer',member_grade:'vip'}),false);assert.equal(approval.hasBusinessApproval({role:'customer',staff_scope:'members'}),false);
 for(const folder of ['orders','products','settings','inquiries']) assert(fs.readFileSync(`src/app/(admin)/admin/${folder}/layout.tsx`,'utf8').includes('await requireAdminSession()'));
 console.log('PASS: guest/customer/VIP denial, staff target protection, staff assignment denial, admin assignment/revoke, approval independence, restricted subtree gates');
})().catch(e=>{console.error(e);process.exitCode=1;});
