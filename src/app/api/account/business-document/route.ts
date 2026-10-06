import { validBusinessNumber } from "@/lib/auth/business-number";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { canManageMembers } from "@/lib/auth/member-access";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
export const runtime="nodejs";
const response=(status:number)=>Response.json({ok:status===200},{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(request:Request) {
 if(request.headers.get("origin")!==new URL(request.url).origin) return response(403);
 const {user}=await getSessionProfile(); if(!user) return response(401);
 if(request.headers.get("content-type")?.includes("application/json")) {
  if(Number(request.headers.get("content-length"))>8192)return response(413);
  let input;try{
   if(!request.body)return response(400);
   const reader=request.body.getReader(),decoder=new TextDecoder();let text="",size=0;
   while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>8192){await reader.cancel();return response(413);}text+=decoder.decode(part.value,{stream:true});}
   input=JSON.parse(text+decoder.decode());if(!input||typeof input!=="object")return response(400);
  }catch{return response(400);}
  if(typeof input.business_number!=="string"||!validBusinessNumber(input.business_number.trim()))return Response.json({error:"business_number"},{status:400});
  if(input.consent!==true)return Response.json({error:"consent"},{status:400});
  const website=String(input.website||"").trim();
  if(website){try{const url=new URL(website);if(!["https:","http:"].includes(url.protocol)||website.length>500||url.username||url.password)return Response.json({error:"website"},{status:400});}catch{return Response.json({error:"website"},{status:400});}}
  const service=createServiceClient();if(!service)return response(503);
  const bucket=service.storage.from("business-documents");
  if(input.stage==="prepare"){
   if(!["application/pdf","image/jpeg","image/png"].includes(input.mime))return Response.json({error:"file_type"},{status:400});
   const path=`${user.id}/${crypto.randomUUID()}`;
   const signed=await bucket.createSignedUploadUrl(path,{upsert:false});
   if(signed.error)return Response.json({error:"storage"},{status:503});
   return Response.json({path,url:signed.data.signedUrl},{headers:{"Cache-Control":"private, no-store"}});
  }
  if(input.stage!=="complete"||typeof input.path!=="string"||!new RegExp(`^${user.id}/[0-9a-f-]{36}$`).test(input.path))return response(400);
  const info=await bucket.info(input.path);if(info.error)return Response.json({error:"storage"},{status:503});
  const signed=await bucket.createSignedUrl(input.path,60);if(signed.error)return response(503);
  const head=await fetch(signed.data.signedUrl,{headers:{Range:"bytes=0-15"},cache:"no-store"});
  if(head.status!==206){await head.body?.cancel();return response(503);}
  const bytes=new Uint8Array(await head.arrayBuffer());
  const valid=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45||bytes[0]===255&&bytes[1]===216&&bytes[2]===255||[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  if(!valid){await bucket.remove([input.path]);return Response.json({error:"file_type"},{status:400});}
  const result=await service.from("business_documents").upsert({user_id:user.id,file_path:input.path,file_name:String(input.file_name||"document").replace(/[\/\r\n<>]/g,"_").slice(0,160),submitted_at:new Date().toISOString(),website:website||null,business_number:input.business_number.trim(),consent_at:new Date().toISOString(),ai_consent_at:input.ai_consent===true?new Date().toISOString():null,ai_result:null,ai_file_path:null,ai_reviewed_at:null,ai_started_at:null},{onConflict:"user_id"});
  if(result.error)return Response.json({error:"save"},{status:503});
  revalidatePath("/admin/members");revalidatePath("/","layout");return response(200);
 }
 if(Number(request.headers.get("content-length"))>11*1024*1024) return response(413);
 let form:FormData;
 try {
  if(request.body){
   const reader=request.body.getReader(), chunks:Uint8Array[]=[];let total=0;
   while(true){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>11*1024*1024){await reader.cancel();return response(413);}chunks.push(part.value);}
   const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   form=await new Response(bytes,{headers:{"Content-Type":request.headers.get("content-type")||""}}).formData();
  }else form=await request.formData();
 }catch{return response(400);}
 const file=form.get("document"),website=String(form.get("website")||"").trim();
 if(!(file instanceof File)||file.size<10||file.size>10*1024*1024||form.get("consent")!=="on") return response(400);
 const businessNumber=String(form.get("business_number")||"").trim();
 if(!validBusinessNumber(businessNumber)) return response(400);
 if(website){try{const url=new URL(website);if(!["https:","http:"].includes(url.protocol)||website.length>500||url.username||url.password)return response(400);}catch{return response(400);}}
 const bytes=new Uint8Array(await file.arrayBuffer());
 const mime=bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46&&bytes[4]===0x2d?"application/pdf":bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff?"image/jpeg":[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)?"image/png":null;
 if(!mime||file.type!==mime) return response(400);
 const service=createServiceClient();if(!service)return response(503);
 const path=`${user.id}/${crypto.randomUUID()}`;
 const uploaded=await service.storage.from("business-documents").upload(path,bytes,{contentType:mime,upsert:false});if(uploaded.error)return response(503);
 const fileName=file.name.replace(/[\/\r\n<>]/g,"_").slice(0,160);
 const result=await service.from("business_documents").upsert({user_id:user.id,file_path:path,file_name:fileName,submitted_at:new Date().toISOString(),website:website||null,business_number:businessNumber,consent_at:new Date().toISOString(),ai_consent_at:null,ai_result:null,ai_file_path:null,ai_reviewed_at:null,ai_started_at:null},{onConflict:"user_id"});
 if(result.error){await service.storage.from("business-documents").remove([path]);return response(503);}
 revalidatePath("/admin/members");revalidatePath("/","layout");return response(200);
}
export async function GET(request:Request){
 const {user,profile}=await getSessionProfile();if(!user)return response(401);
 const id=new URL(request.url).searchParams.get("user")||user.id;
 if(id!==user.id&&!canManageMembers(profile))return response(403);
 if(!/^[0-9a-f-]{36}$/i.test(id))return response(400);
 const service=createServiceClient();if(!service)return response(503);
 if(id!==user.id){
  const target=await service.from("profiles").select("role,staff_scope").eq("id",id).maybeSingle();
  if(target.error)return response(503);
  if(!target.data||target.data.role==="admin"||(profile?.role!=="admin"&&target.data.staff_scope==="members"))return response(403);
 }
 const {data,error}=await service.from("business_documents").select("file_path,file_name").eq("user_id",id).maybeSingle();
 if(error)return response(503);if(!data?.file_path)return response(404);
 const signed=await service.storage.from("business-documents").createSignedUrl(data.file_path,60,{download:data.file_name||"business-document"});
 if(signed.error)return response(503);
 return new Response(null,{status:302,headers:{Location:signed.data.signedUrl,"Cache-Control":"private, no-store"}});
}
