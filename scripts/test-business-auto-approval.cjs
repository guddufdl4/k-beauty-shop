const fs=require('node:fs');
const assert=require('node:assert/strict');
const ts=require('typescript');
function load(path,dependencies){
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(name=>{if(!(name in dependencies))throw Error(`Missing mock ${name}`);return dependencies[name];},module,module.exports);
 return module.exports;
}
const number=load('src/lib/auth/business-number.ts',{});
let role='customer',saved;
const service={from:()=>({update:values=>{saved=values;return {eq(){return this},select:async()=>({data:[{id:'test'}],error:null})}}})};
const route=load('src/app/api/account/business-document/route.ts',{
 '@/lib/auth/business-number':number,
 '@/lib/supabase/auth-helpers':{getSessionProfile:async()=>({user:{id:'test'},profile:{role}})},
 '@/lib/auth/member-access':{canManageMembers:()=>false},
 '@/lib/supabase/service':{createServiceClient:()=>service},
 'next/cache':{revalidatePath:()=>{}},
});
async function request(value,origin='https://hmt.test'){
 return route.POST(new Request('https://hmt.test/api/account/business-document',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({stage:'number',business_number:value})}));
}
(async()=>{
 assert.equal((await request('')).status,400);
 assert.equal((await request('dddd')).status,400);
 assert.equal((await request('123-45-67890','https://other.test')).status,403);
 assert.equal((await request('123-45-67890')).status,200);
 assert.ok(!('role' in saved), 'number alone must never approve prices');
 for(role of ['admin','wholesale']){assert.equal((await request('AB-12345')).status,200);assert.ok(!('role' in saved));}
 let profileSaved;
 const authService={from:()=>({upsert:async values=>{profileSaved=values;return {error:null}}}),auth:{admin:{generateLink:async()=>({data:{user:{id:'new-test'},properties:{hashed_token:'test-only',verification_type:'signup'}},error:null})}}};
 const auth=load('src/app/actions/auth.ts',{
 '@/lib/asia-copy':{asianCopy:()=>null},'@/lib/auth/business-number':number,
 '@/lib/maintenance-server':{maintenanceActionError:async()=>null},'next/headers':{cookies:async()=>({})},'next/cache':{revalidatePath:()=>{}},
 'next-intl':{hasLocale:()=>true},'next-intl/server':{getLocale:async()=>'en',getTranslations:async()=>key=>key},
 '@/i18n/navigation':{redirect:()=>{}},'@/i18n/routing':{routing:{locales:['en'],defaultLocale:'en'}},
 '@/lib/auth/consent':{PRIVACY_POLICY_VERSION:'test',TERMS_POLICY_VERSION:'test'},'@/lib/auth/confirm-email':{buildSignupConfirmEmail:()=>({subject:'test',html:'',text:''})},
 '@/lib/auth/signup-fields':{looksLikeEmail:()=>true,parseSignupForm:()=>({email:'test@example.invalid',fullName:'Test',companyName:'Test',countryCode:'KR',preferredCurrency:'USD',password:'test-only',phoneNumber:'+821012345678'})},
 '@/lib/auth/return-to':{safeStorefrontReturnTo:()=>'/account'},'@/lib/email':{sendCustomerEmail:async()=>({ok:true})},'@/lib/site-url':{resolveAuthEmailBaseUrl:()=>'https://hmt.test'},
 '@/lib/supabase/server':{createClient:async()=>({})},'@/lib/supabase/service':{createServiceClient:()=>authService},
 });
 for(const value of ['', 'dddd']){
  const form=new FormData();form.set('business_number',value);
  assert.ok((await auth.signUp({},form)).error);assert.equal(profileSaved,undefined);
 }
 const form=new FormData();form.set('business_number','123-45-67890');
 assert.ok((await auth.signUp({},form)).success);assert.equal(profileSaved.role,'customer');assert.equal(profileSaved.business_number,'123-45-67890');
 console.log('PASS required signup number, number-only pricing denied, invalid values/origin, existing roles preserved');
})().catch(error=>{console.error(error);process.exit(1)});
