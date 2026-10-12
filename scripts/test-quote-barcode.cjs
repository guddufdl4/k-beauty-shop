const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
let email,inquiry;
const item={productCode:'HMT-009587',sku:'sku',barcode:'8801234567890',brand:'MEDICUBE',name:'Cream <50ml>',quantity:80,moq:40,unitPrice:1000,lineTotal:80000};
const imports={
 '@/lib/maintenance-server':{maintenanceActionError:async()=>null},
 '@/lib/auth/business-approval':{hasBusinessApproval:()=>false},
 '@/lib/auth/signup-fields':{SIGNUP_COUNTRIES:[{code:'KR',name:'South Korea'}]},
 'next/cache':{revalidatePath(){}},'next-intl/server':{getTranslations:async()=>k=>k,getLocale:async()=>'en'},
 '@/i18n/navigation':{redirect:()=>({redirect:true})},
 '@/lib/cart':{getCart:async()=>({}),revalidateQuoteCart:async()=>({items:[item],subtotal:80000}),createQuoteOrderFromCart:async()=>({orderNumber:'QT-TEST'}),clearCart:async()=>{}},
 '@/lib/email':{escapeHtml:s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),isQuoteMailConfigured:()=>true,sendQuoteInquiryEmail:async e=>{email=e;return{ok:true}}},
 '@/lib/supabase/service':{createServiceClient:()=>({from:()=>({insert:async x=>{inquiry=x;return{}}})})},
 '@/lib/supabase/auth-helpers':{getSessionProfile:async()=>({user:{email:'buyer@example.com'},profile:{}})},
 '@/lib/utils':{formatKRW:n=>String(n)},'@/lib/stripe':{},'@/lib/currency-rate':{getUsdKrwRate:async()=>1350},'@/lib/currency':{},
 '@/lib/store/moq-quantity':{getMoqStep:()=>40,isValidMoqQuantity:()=>true},'@/lib/store/quote-list':{QUOTE_CONFIRM_HREF:'/quote-confirm'},
};
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/actions/checkout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject,require:n=>imports[n],console});
(async()=>{const f=new FormData();for(const [k,v]of Object.entries({company_name:'Company',contact_name:'Buyer',email:'buyer@example.com',country:'KR'}))f.set(k,v);await exportsObject.submitQuoteRequest({},f);assert(email.html.includes('<th>Barcode</th>'));assert(email.html.includes(item.barcode));assert(email.text.includes(item.barcode));assert(inquiry.message.includes(item.barcode));assert(email.html.includes('Cream &lt;50ml&gt;'));item.barcode=null;await exportsObject.submitQuoteRequest({},f);assert(email.html.includes('Not provided'));assert(!email.text.includes('Barcode: sku'));console.log('PASS: barcode in HTML, plain text and saved inquiry; escaping and missing barcode fallback');})().catch(e=>{console.error(e);process.exitCode=1});
