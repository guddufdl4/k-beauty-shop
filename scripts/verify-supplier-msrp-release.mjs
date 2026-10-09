import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
for(const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)process.env[m[1]]??=m[2].replace(/^['"]|['"]$/g,'');}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const root='../../outputs/brand-homepages-20261009/';
const plan=JSON.parse(fs.readFileSync(root+'msrp-restoration-plan.json','utf8'));
const {data,error}=await db.from('products').select('id,compare_at_price').in('id',plan.changes.map(c=>c.id));
if(error)throw error;
for(const c of plan.changes)if(Number(data.find(p=>p.id===c.id)?.compare_at_price)!==c.after)throw Error('MSRP mismatch '+c.code);
console.log({verifiedMSRP:plan.changes.length});
if(process.argv.includes('--release')){
 const bucket=db.storage.from('site-config');const r=await bucket.download('maintenance.json');if(r.error)throw r.error;
 const raw=await r.data.text();const previous=JSON.parse(raw);
 const backup=root+'maintenance-before-supplier-msrp-release.json';if(!fs.existsSync(backup))fs.writeFileSync(backup,raw);
 if(previous.enabled){const up=await bucket.upload('maintenance.json',JSON.stringify({...previous,enabled:false,expectedEnd:null}),{upsert:true,contentType:'application/json',cacheControl:'0'});if(up.error)throw up.error;}
 const verify=await bucket.download('maintenance.json');if(verify.error||JSON.parse(await verify.data.text()).enabled)throw Error('Maintenance release failed');
 const refresh=await fetch('https://www.hmtkorea.com/api/admin/storefront/revalidate',{method:'POST',headers:{Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY}});
 if(!refresh.ok)throw Error('Revalidation HTTP '+refresh.status);
 console.log({maintenance:false,catalogRevalidated:true});
}
