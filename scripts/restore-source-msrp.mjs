import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
for(const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)process.env[m[1]]??=m[2].replace(/^['"]|['"]$/g,'');}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const changes=[];let inspected=0;
for(let from=0;;from+=1000){const {data,error}=await db.from('products').select('id,product_code,barcode,sku,price,wholesale_price,compare_at_price,source_row').is('deleted_at',null).order('id').range(from,from+999);if(error)throw error;
for(const p of data){inspected++;if(!p.source_row)continue;
const entries=Object.entries(p.source_row);const barcodes=entries.filter(([k])=>/barcode/i.test(k)).map(([,v])=>String(v).replace(/\D/g,''));
if(!barcodes.some(v=>v===p.barcode||v===p.sku))continue;
const raw=entries.find(([k])=>k.trim().toUpperCase()==='MSRP')?.[1];
if(raw==null||/[$€£]|USD|EUR|JPY/i.test(String(raw)))continue;
const amount=Number(String(raw).replace(/[₩,\s]/g,''));
if(!Number.isFinite(amount)||amount<100||amount>10000000||!(p.wholesale_price>1))continue;
if(Number(p.compare_at_price)===amount)continue;
changes.push({id:p.id,code:p.product_code,before:p.compare_at_price,after:amount,source:'supplier source_row MSRP; exact barcode match'});}
if(data.length<1000)break;}
const path='../../outputs/brand-homepages-20261009/msrp-restoration-plan.json';
fs.writeFileSync(path,JSON.stringify({inspected,changes},null,2));
if(process.argv.includes('--apply')){for(const c of changes){
let query=db.from('products').update({compare_at_price:c.after}).eq('id',c.id);
query=c.before==null?query.is('compare_at_price',null):query.eq('compare_at_price',c.before);
const r=await query.select('id,compare_at_price');
if(r.error||r.data.length!==1||Number(r.data[0].compare_at_price)!==c.after)throw r.error??Error(c.code+' changed concurrently');
}}
console.log({inspected,restorable:changes.length,applied:process.argv.includes('--apply'),sample:changes.slice(0,8)});
