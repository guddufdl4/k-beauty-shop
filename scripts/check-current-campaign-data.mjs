import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
for(const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)process.env[m[1]]??=m[2].replace(/^['"]|['"]$/g,'');}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const {data,error}=await db.from('products').select('id,product_code,sku,barcode,name,price,wholesale_price,compare_at_price,moq,source_row,image_url').in('product_code',['HMT-001678','HMT-001680','HMT-003606','HMT-003610','HMT-000737','HMT-000780','HMT-012625','HMT-012595']);
if(error)throw error;
fs.writeFileSync('../../outputs/brand-homepages-20261009/current-campaign-data.json',JSON.stringify(data,null,2));
console.log(JSON.stringify(data.map(({source_row,image_url,...p})=>({...p,source:source_row})),null,2));
