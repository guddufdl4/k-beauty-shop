const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const id='12345678-1234-1234-1234-123456789abc';
let session={user:{id:'owner'},profile:{role:'customer'}},writes=[],ownerFilters=[];
const product={id,name:'Example',slug:'example',brand:'Example',sku:'SKU',price:9000,wholesale_price:7000,moq:10,stock:999,sold_out:false,status:'active'};
const client={from(table){let inserting=false;const q={select(){return q},eq(key,value){if(table==='cart_items'&&key==='user_id')ownerFilters.push(value);return q},is(){return q},like(){return q},order(){return q},limit(){return q},async maybeSingle(){return {data:table==='products'?product:null,error:null}},async single(){return {data:{id:'order-id'},error:null}},insert(value){writes.push({table,value});inserting=true;return q},then(resolve,reject){return Promise.resolve({data:table==='cart_items'&&!inserting?[{id:'cart',product_id:id,quantity:10,product}]:[],error:null}).then(resolve,reject)}};return q}};
const approval={hasBusinessApproval:p=>['admin','wholesale'].includes(p?.role)};
const mocks={
 '@/lib/auth/business-approval':approval,'@/lib/auth/signup-fields':{SIGNUP_COUNTRIES:[]},
 'next-intl/server':{getLocale:async()=> 'en'},'next/headers':{cookies:async()=>({get:()=>null,set(){}})},
 '@/lib/utils':{formatKRW:String},'@/lib/supabase/config':{isSupabaseConfigured:()=>true},
 '@/lib/supabase/auth-helpers':{getAuthUser:async()=>session.user,getSessionProfile:async()=>session},
 '@/lib/store/product-visibility':{buildMemberProductSelect:()=> 'id,price,wholesale_price'},
 '@/lib/supabase/safe-server':{createSafeClient:async()=>client},'@/lib/supabase/service':{createServiceClient:()=>client},
 '@/lib/supabase/soft-delete':{ensureSoftDeleteColumnProbed:async()=>{},isSoftDeleteColumnAvailable:()=>true},
 '@/lib/supabase/product-code':{ensureProductCodeColumnProbed:async()=>{},isProductCodeColumnAvailable:()=>false,isMissingProductCodeColumnError:()=>false},
 '@/lib/supabase/products':{FALLBACK_PRODUCTS:[]},'@/lib/product-images':{enrichProductImages:p=>p},
 '@/lib/store/products-url':{getEffectiveProductPrice:p=>p.wholesale_price||p.price},
 '@/lib/store/localized-product-name':{getLocalizedProductName:p=>p.name},
 '@/lib/currency':{getUsdKrwRate:async()=>1400,MIN_ORDER_USD:1000,cartMeetsMinOrderUsd:n=>n>=1400000},
 '@/lib/store/moq-quantity':{getMoqStep:n=>n,isValidMoqQuantity:(n,step)=>n%step===0},
};
const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/cart.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:out,require:name=>mocks[name],console});
(async()=>{
 assert.equal((await out.addToCart(id,10)).errorCode,undefined);
 assert.equal(writes[0].value.user_id,'owner');
 const pending=await out.getCart();assert.equal(pending.items.length,1);assert.equal(pending.items[0].unitPrice,0);assert.equal(pending.items[0].lineTotal,0);assert.equal(pending.subtotal,0);assert.ok(ownerFilters.every(value=>value==='owner'));
 const verified=await out.revalidateQuoteCart(pending);assert.equal(verified.subtotal,70000);
 assert.ok((await out.createQuoteOrderFromCart(verified,{country:'MO',contactName:'Buyer',companyName:'Company',email:'buyer@example.com'})).orderNumber);
 session.profile.role='wholesale';assert.equal((await out.getCart()).subtotal,70000);assert.equal((await out.createQuoteOrderFromCart(verified,{})).orderNumber,undefined);
 session.user=null;assert.equal((await out.addToCart(id,10)).errorCode,'auth_required');assert.equal((await out.getCart()).items.length,0);
 console.log('PASS pending member add, owner-scoped cart, hidden client prices, server repricing, price-free quote, approved minimum and guest denial');
})().catch(error=>{console.error(error);process.exitCode=1});
