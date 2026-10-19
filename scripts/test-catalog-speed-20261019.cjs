const fs = require('fs'), vm = require('vm'), ts = require('typescript'), assert = require('node:assert/strict');
const source = fs.readFileSync('src/lib/supabase/products.ts', 'utf8');
const tree = ts.createSourceFile('products.ts', source, ts.ScriptTarget.Latest, true);
function install(name, context) {
  const fn = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  vm.createContext(context);
  vm.runInContext(ts.transpileModule(fn.getText(tree).replace(/^export /, '') + `\nglobalThis.run = ${name};`, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.run;
}
const overlay = {exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/lib/store/home-price-overlay.ts','utf8'),{compilerOptions:{module:1,target:9}}).outputText)(()=>{throw Error('unexpected import')},overlay,overlay.exports);
(async () => {
  let price = 200, signedReads = 0, cacheFills = 0, sessionAvailable = true, priceError = false;
  const selection = {products:[{id:'one',name:'Cream',moq:40},{id:'archived',name:'Old'}],totalCount:2,meta:{source:'database',configured:true}};
  const cached = new Map(), filters = [];
  const sessionDb = {from(table){assert.equal(table,'products');const q={select(columns){assert(!columns.includes('source_row'));return q},in(k,v){filters.push([k,v]);return q},eq(k,v){filters.push([k,v]);return q},is(k,v){filters.push([k,v]);return q},then(resolve){signedReads++;return Promise.resolve({data:[{id:'one',price,wholesale_price:price,compare_at_price:300,stock:0,moq:40,sold_out:false}],error:priceError?{message:'policy unavailable'}:null}).then(resolve)}};return q}};
  const context = {Promise,Map,Math,Number,String,Boolean,console,
    isSupabaseConfigured:()=>true,resolveStorefrontAudience:async()=> 'guest',resolveProductSelect:()=>({select:'safe',includePriceColumns:true}),
    curatedBestSellers:{skus:['one'],checked:'today'},STOREFRONT_PRODUCTS_CACHE_TAG:'catalog',CACHE_REVALIDATE_SECONDS:900,
    canViewProductPrices:x=>x==='member'||x==='admin',createSafeClient:async()=>sessionAvailable?sessionDb:null,
    isSoftDeleteColumnAvailable:()=>true,attachHomePrices:overlay.exports.attachHomePrices,
    unstable_cache(_fn,key){return async()=>{const k=JSON.stringify(key);if(!cached.has(k)){cacheFills++;cached.set(k,selection)}return cached.get(k)}},
    createServiceClient:()=>{throw Error('DIRECT_FALLBACK')},
  };
  const run=install('getProducts',context);
  const options={limit:48,page:1,requireRealImage:true};
  const guest=await run(options);assert.equal(signedReads,0);assert(!('price' in guest.products[0]));
  const first=await run({...options,audience:'member'});assert.equal(first.products.length,1);assert.equal(first.products[0].price,200);assert.equal(first.products[0].moq,40);assert.equal(first.products[0].stock,0);
  price=240;const second=await run({...options,audience:'admin'});assert.equal(second.products[0].price,240);assert.equal(cacheFills,1);assert.equal(signedReads,2);assert(!('price' in selection.products[0]));
  assert(filters.some(([k,v])=>k==='status'&&v==='active'));assert(filters.some(([k,v])=>k==='deleted_at'&&v===null));
  await run({...options,audience:'guest',importBatchId:'other-batch'});assert.equal(cacheFills,2);
  priceError=true;await assert.rejects(run({...options,audience:'member'}),/DIRECT_FALLBACK/);priceError=false;
  sessionAvailable=false;await assert.rejects(run({...options,audience:'member'}),/DIRECT_FALLBACK/);sessionAvailable=true;
  await assert.rejects(run({...options,audience:'member',sort:'sale'}),/DIRECT_FALLBACK/);
  await assert.rejects(run({...options,audience:'admin',privileged:true}),/DIRECT_FALLBACK/);
  let active=0,max=0,calls=0;
  const db={from(){return{select(){return this},async in(_key,ids){calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return{data:ids.map(id=>({id,source_row:{English:id}})),error:null}}}}};
  const hydrate=install('hydrateProductLocaleNames',{Promise,Map,Math,createServiceClient:()=>db,withLocalizedNameFields:p=>({...p,name_en:p.source_row?.English})});
  const products=Array.from({length:500},(_,i)=>({id:String(i),source_row:null}));const result=await hydrate(db,products);assert.equal(calls,7);assert.equal(max,3);assert.equal(result.length,500);assert.equal(result[499].name_en,'499');assert.equal(products[0].source_row,null);
  console.log('PASS cached public selection reused; guest has no prices; signed prices stay fresh; archived rows removed; sale/admin and failures fall back; 500 name rows loaded with at most 3 concurrent reads.');
})().catch(e=>{console.error(e);process.exitCode=1});
