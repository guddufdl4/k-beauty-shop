const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>imports[n]??{},Date,Intl,Map,URLSearchParams,console});return exports;}
const visits=load('src/lib/admin/visits.ts');
const rows=Array.from({length:620},(_,i)=>({order_number:`QT-${String(620-i).padStart(8,'0')}`,status:'pending',total:100,payment_provider:'quote',created_at:new Date(Date.parse('2026-10-08T15:00:00Z')-i*86400000).toISOString(),shipping_address:{},deleted_at:null}));
let reads=0,failLater=false,legacy=false;
const service={from(){let columns;const q={select(s){columns=s;return q},order(){return q},async range(start,end){reads++;if(legacy&&columns.includes('deleted_at'))return {data:null,error:{message:'deleted_at missing'}};if(failLater&&start>0)return {data:null,error:{message:'unavailable'}};return {data:rows.slice(start,end+1).map(row=>legacy?Object.fromEntries(Object.entries(row).filter(([key])=>key!=='deleted_at')):row),error:null};}};return q;}};
const orders=load('src/lib/admin/orders.ts',{'@/lib/admin/visits':visits,'@/lib/supabase/config':{isSupabaseConfigured:()=>true},'@/lib/supabase/service':{createServiceClient:()=>service}});
(async()=>{
 assert.equal(orders.parseAdminOrderDate('2026-02-30'),undefined);
 assert.equal(orders.parseAdminOrderDate('2024-02-29'),'2024-02-29');
 const range=orders.normalizeAdminOrderDateRange({start:'2026-10-09',end:'2026-10-08'});assert.equal(range.start,'2026-10-08');assert.equal(range.end,'2026-10-09');
 const boundary=[{created_at:'2026-10-07T14:59:59Z'},{created_at:'2026-10-07T15:00:00Z'},{created_at:'2026-10-08T14:59:59Z'},{created_at:'2026-10-08T15:00:00Z'}];
 assert.equal(orders.filterAdminOrdersByDate(boundary,{start:'2026-10-08',end:'2026-10-08'}).length,2);
 assert.equal(orders.filterAdminOrdersByDate(boundary,{start:'2026-10-08'}).length,3);
 assert.equal(orders.filterAdminOrdersByDate(boundary,{end:'2026-10-08'}).length,3);
 assert.equal(orders.buildAdminOrdersHref(2,'deleted',range),'/admin/orders?view=deleted&page=2&start=2026-10-08&end=2026-10-09');
 const all=await orders.listAdminOrders(62);assert.equal(all.total,620);assert.equal(all.amountTotal,62000);assert.equal(all.periodTotals.byDate.length,620);assert.equal(reads,2);
 const oldDay=visits.seoulYmd(new Date(rows[619].created_at));const old=await orders.listAdminOrders(8,'active',{start:oldDay,end:oldDay});assert.equal(old.total,1);assert.equal(old.page,1);assert.equal(old.amountTotal,100);assert.equal(old.orders[0].order_number,rows[619].order_number);
 const empty=await orders.listAdminOrders(8,'active',{start:'2027-01-01'});assert.equal(empty.total,0);assert.equal(empty.page,1);assert.equal(empty.periodTotals.byDate.length,0);
 rows[619].deleted_at='2026-10-09T00:00:00Z';const deleted=await orders.listAdminOrders(1,'deleted',{start:oldDay,end:oldDay});assert.equal(deleted.total,1);assert.equal(deleted.deletedCount,1);
 legacy=true;assert.equal((await orders.listAdminOrders()).total,620);legacy=false;
 failLater=true;await assert.rejects(()=>orders.listAdminOrders());
 console.log('PASS KST inclusive ranges, invalid/reversed/one-sided dates, URL preservation, all history beyond 500 rows, filter-before-pagination/totals, deleted view, legacy schema and later-batch failure.');
})().catch(e=>{console.error(e);process.exitCode=1;});
