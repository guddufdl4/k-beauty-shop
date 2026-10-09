const fs = require('fs'), vm = require('vm'), ts = require('typescript'), assert = require('assert/strict');
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: n => imports[n] ?? {}, Date, Intl, Map, Set, URL, URLSearchParams, console });
  return exports;
}
const policy = load('src/lib/admin/order-workflow-policy.ts');
const valid = { stage: 'reviewing', assignee_id: null, internal_note: 'Private memo', updated_at: null };
assert(policy.validateWorkflow(valid).value);
for (const input of [null, {}, { ...valid, stage: '__proto__' }, { ...valid, stage: 'paid' }, { ...valid, internal_note: 'x'.repeat(5001) }, { ...valid, updated_at: 'bad' }, { ...valid, assignee_id: 'bad' }]) assert(policy.validateWorkflow(input).error);
assert.equal(policy.normalizeOrderFilters({country:'mo'}).country, 'MO');
const rows = Array.from({length: 30}, (_, i) => ({order_number:`QT-${i}`,company_name:i === 29 ? 'Little Tokyo' : 'Other',email:'buyer@example.com',contact_name:'Buyer',country_code:'MO',reviewed_at:null,workflow:{...valid,stage:'new',assignee_id:'admin'}}));
assert.equal(rows.filter(o => policy.matchesOrderFilters(o,{q:'little',country:'MO'})).length,1);
assert(policy.matchesOrderFilters(rows[0],{focus:'mine'},'admin'));
assert(!policy.matchesOrderFilters(rows[0],{focus:'mine'},'other'));
assert(policy.matchesOrderFilters(rows[0],{focus:'unread'}));
assert(!policy.matchesOrderFilters({...rows[0],reviewed_at:'2026-10-09'},{focus:'unread'}));
assert(!policy.matchesOrderFilters({...rows[0],workflow:{...valid,stage:'waiting'}},{focus:'unanswered'}));

let actor = {user:null,profile:null}, calls = [], result = { data: {...valid, updated_at:'2026-10-09T00:00:00Z'}, error:null }, exists = true;
const db = { from(table) {
  calls.push(['from',table]);
  const chain = {select(){return chain},eq(key,value){calls.push(['eq',key,value]);return chain},is(){return chain},
    update(value){calls.push(['update',value]);return chain},insert(value){calls.push(['insert',value]);return chain},
    async maybeSingle(){ return table === 'orders' ? {data:exists?{id:'order-id'}:null,error:null} : table === 'profiles' ? {data:null,error:null} : result; },
    async single(){return result}
  }; return chain;
}};
const route = load('src/app/api/admin/order-workflow/route.ts', {
  'next/server':{NextResponse:{json:(data,options)=>({data,...options})}}, 'next/cache':{revalidatePath(){}},
  '@/lib/supabase/auth-helpers':{getSessionProfile:async()=>actor}, '@/lib/supabase/service':{createServiceClient:()=>db},
  '@/lib/admin/order-workflow-policy':policy,
});
const request = (workflow = valid, origin = 'https://www.hmtkorea.com') => ({url:'https://www.hmtkorea.com/api/admin/order-workflow',headers:{get:()=>origin},json:async()=>({orderNumber:'QT-20261009-0001',workflow})});
(async()=>{
  for (const profile of [null,{role:'customer'},{role:'wholesale'},{role:'customer',staff_scope:'members'}]) {
    actor={user:profile?{id:'user'}:null,profile};calls=[];
    assert.equal((await route.POST(request())).status,403);
    assert.equal((await route.GET({url:'https://www.hmtkorea.com/api/admin/order-workflow?order=QT-20261009-0001'})).status,403);
    assert.equal(calls.length,0);
  }
  actor={user:{id:'admin'},profile:{role:'admin'}};
  assert.equal((await route.POST(request(valid,'https://evil.example'))).status,403);
  assert.equal((await route.POST(request({...valid,stage:'paid'}))).status,400);
  assert.equal((await route.POST(request({...valid,assignee_id:'11111111-1111-1111-1111-111111111111'}))).status,400);
  exists=false;assert.equal((await route.POST(request())).status,404);exists=true;
  calls=[];assert.equal((await route.POST(request())).status,200);assert(calls.some(c=>c[0]==='insert'));
  result={data:null,error:{code:'23505'}};assert.equal((await route.POST(request())).status,409);
  result={data:null,error:null};calls=[];assert.equal((await route.POST(request({...valid,updated_at:'2026-10-09T00:00:00Z'}))).status,409);
  assert(calls.some(c=>c[0]==='eq'&&c[1]==='updated_at'));
  result={data:null,error:{code:'unavailable'}};assert.equal((await route.POST(request())).status,503);
  assert(!calls.some(c=>c[0]==='update'&&('shipping_address' in c[1] || 'status' in c[1])));
  const sql=fs.readFileSync('supabase/migrations/20261009071554_order_admin_workflow.sql','utf8');
  assert.match(sql,/enable row level security/);assert.match(sql,/revoke all.*public, anon, authenticated/);
  console.log('PASS workflow validation; global customer filters; admin/staff/customer authorization; origin guard; assignee checks; missing orders; insert race and stale-version conflicts; DB failure; notes isolated from customer snapshots and payment state.');
})().catch(e=>{console.error(e);process.exitCode=1;});
