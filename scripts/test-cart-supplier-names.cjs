const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>imports[n]??(n.startsWith('@/')?load('src/'+n.slice(2)+'.ts'):{}),console});return exports;}
const localizer=load('src/lib/store/localized-product-name.ts');let product,selected;
const chain={select(s){selected=s;return this},eq(){return this},is(){return this},maybeSingle:async()=>({data:product})};
const cart=load('src/lib/cart.ts',{
 '@/lib/auth/business-approval':{},'@/lib/auth/signup-fields':{},'next-intl/server':{getLocale:async()=>'en'},'next/headers':{},'@/lib/utils':{},
 '@/lib/supabase/config':{isSupabaseConfigured:()=>true},'@/lib/supabase/auth-helpers':{getAuthUser:async()=>({id:'buyer'})},
 '@/lib/store/product-visibility':{buildMemberProductSelect:()=>'*'},'@/lib/supabase/safe-server':{},'@/lib/supabase/service':{createServiceClient:()=>({from:()=>chain})},
 '@/lib/supabase/soft-delete':{ensureSoftDeleteColumnProbed:async()=>{},isSoftDeleteColumnAvailable:()=>true},'@/lib/supabase/product-code':{},'@/lib/supabase/products':{FALLBACK_PRODUCTS:[]},
 '@/lib/product-images':{enrichProductImages:p=>p},'@/lib/store/products-url':{getEffectiveProductPrice:p=>p.wholesale_price},'@/lib/store/localized-product-name':localizer,
 '@/lib/currency-rate':{},'@/lib/currency':{},'@/lib/store/moq-quantity':{getMoqStep:()=>1,isValidMoqQuantity:()=>true},
});
(async()=>{const data=JSON.parse(fs.readFileSync('../../outputs/supplier-update-20261012/before.json'));const codes=['HMT-011747','HMT-011741','HMT-011739','HMT-011735','HMT-011733','HMT-011710'];for(const code of codes){product=data.find(p=>p.product_code===code);assert(product);const expected=product.source_row['Product Name (EN)'].replace(/\s+/g,' ').trim().replace(/^PURITO\s+/i,'');const r=await cart.revalidateQuoteCart({items:[{productId:product.id,quantity:1}],source:'database'});assert.equal(r.items[0].name,expected);assert(!r.items[0].name.includes('Pyu Ri'));assert(!('source_row' in r.items[0]));}console.log('PASS: all six PURITO quote names retain supplier English; source pricing data stays out of cart DTO');})().catch(e=>{console.error(e);process.exitCode=1});

