import {getSessionProfile} from "@/lib/supabase/auth-helpers";
export const runtime="nodejs";
export const maxDuration=30;
export async function POST(request:Request){
 const headers={"Cache-Control":"private, no-store"};
 if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"Forbidden"},{status:403,headers});
 const {user,profile}=await getSessionProfile();
 if(!user||profile?.role!=="admin")return Response.json({error:"Forbidden"},{status:403,headers});
 const key=process.env.OPENAI_API_KEY;
 if(!key)return Response.json({error:"OPENAI_API_KEY 설정이 필요합니다."},{status:503,headers});
 try{
  const result=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(20000),body:JSON.stringify({model:process.env.OPENAI_BUSINESS_REVIEW_MODEL||"gpt-4.1-mini",store:false,input:"Connection test. Reply with OK only.",max_output_tokens:16})});
  if(!result.ok)return Response.json({error:result.status===429?"API 사용 한도 또는 결제 잔액을 확인해 주세요.":"API 키와 모델 사용 권한을 확인해 주세요."},{status:502,headers});
  const data=await result.json();
  if(data.status!=="completed")throw new Error("incomplete");
  return Response.json({ok:true},{headers});
 }catch{return Response.json({error:"AI 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."},{status:502,headers});}
}
