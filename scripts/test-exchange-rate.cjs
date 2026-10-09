const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, deps) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => name in deps ? deps[name] : require(name), module, module.exports);
  return module.exports;
}
const policy = load('src/lib/exchange-rate-policy.ts', {});
assert.equal(policy.applyExchangeRate(1320), 1350);
assert.equal(policy.applyExchangeRate(1350), 1350);
assert.equal(policy.applyExchangeRate(1400.23), 1400.23);
for (const bad of [NaN, Infinity, 0, -1]) assert.throws(() => policy.applyExchangeRate(bad));
const now = new Date('2026-10-09T00:00:00Z');
assert.equal(policy.parseMarketRate({base:'USD',quote:'KRW',rate:1341.11,date:'2026-10-08'}, now).rate, 1341.11);
for (const patch of [{base:'KRW'}, {rate:'1400'}, {rate:0}, {date:'2020-01-01'}, {date:'2026-12-01'}]) assert.throws(() => policy.parseMarketRate({base:'USD',quote:'KRW',rate:1400,date:'2026-10-08',...patch}, now));
assert.equal(policy.koreaDay('2026-10-08T16:00:00Z'), '2026-10-09');
let stored = { ...policy.INITIAL_EXCHANGE_RATE }, uploads = 0, invalidations = 0;
const storage = { download: async()=>({data:new Blob([JSON.stringify(stored)]),error:null}), upload: async(path, body)=>{ stored=JSON.parse(body); uploads++; return {error:null}; } };
const service = load('src/lib/exchange-rate.ts', {'server-only':{}, 'next/cache':{unstable_cache:fn=>fn,revalidateTag:()=>invalidations++}, '@/lib/supabase/service':{createServiceClient:()=>({storage:{from:()=>storage}})}, './exchange-rate-policy':policy});
const originalFetch=global.fetch;
(async()=>{
 const today = new Date().toISOString().slice(0,10);
 global.fetch=async()=>({ok:true,json:async()=>({base:'USD',quote:'KRW',rate:1400.23,date:today})});
 assert.equal((await service.refreshExchangeRate(true)).appliedRate,1400.23);
 await service.refreshExchangeRate(); assert.equal(uploads,1,'same KST day cron is idempotent');
 global.fetch=async()=>{throw Error('network');};
 const failed=await service.refreshExchangeRate(true); assert.equal(failed.appliedRate,1400.23); assert.ok(failed.error);
 global.fetch=async()=>({ok:true,json:async()=>({base:'USD',quote:'KRW',rate:1320,date:today})});
 const recovered=await service.refreshExchangeRate(true); assert.equal(recovered.appliedRate,1350); assert.equal(recovered.error,null);
 assert.equal(invalidations,3);
 const cron=load('src/app/api/cron/exchange-rate/route.ts',{'next/server':{NextResponse:{json:(data,init)=>({data,status:init?.status||200})}},'@/lib/exchange-rate':{refreshExchangeRate:()=>{throw Error('must not run');}}});
 const oldSecret=process.env.CRON_SECRET; delete process.env.CRON_SECRET;
 assert.equal((await cron.GET(new Request('https://test/api'))).status,401);
 process.env.CRON_SECRET='test-secret'; assert.equal((await cron.GET(new Request('https://test/api',{headers:{authorization:'Bearer wrong'}}))).status,401);
 if(oldSecret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=oldSecret;
 console.log('PASS: floor, market validation, KST day, daily deduplication, failure retention, recovery, cache invalidation, cron authentication');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>global.fetch=originalFetch);
