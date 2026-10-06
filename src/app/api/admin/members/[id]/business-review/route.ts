import {getSessionProfile} from "@/lib/supabase/auth-helpers";
import {createServiceClient} from "@/lib/supabase/service";
import {canManageMembers,canManageMemberTarget} from "@/lib/auth/member-access";
import {reviewBusinessDocument} from "@/lib/auth/business-ai-review";
export const runtime="nodejs";
export const maxDuration=60;
const reply=(status:number,message:string)=>Response.json({error:message},{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(request.headers.get("origin")!==new URL(request.url).origin)return reply(403,"요청 출처를 확인할 수 없습니다.");
 const session=await getSessionProfile();if(!session.user||!canManageMembers(session.profile))return reply(403,"회원 관리 권한이 필요합니다.");
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return reply(400,"회원을 확인해 주세요.");
 const client=createServiceClient();if(!client)return reply(503,"잠시 후 다시 시도해 주세요.");
 const [member,document]=await Promise.all([client.from("profiles").select("role,staff_scope").eq("id",id).maybeSingle(),client.from("business_documents").select("file_path,business_number,ai_consent_at,ai_result,ai_file_path").eq("user_id",id).maybeSingle()]);
 if(member.error||document.error)return reply(503,"증빙 정보를 읽지 못했습니다.");
 if(!member.data||!canManageMemberTarget(session.profile,member.data))return reply(403,"이 회원의 증빙을 분석할 권한이 없습니다.");
 const doc=document.data;if(!doc?.file_path)return reply(404,"제출된 증빙이 없습니다.");
 if(!doc.ai_consent_at)return reply(409,"회원이 AI 분석에 동의한 증빙만 분석할 수 있습니다. AI 분석 동의 후 다시 제출해 주세요.");
 if(doc.ai_result&&doc.ai_file_path===doc.file_path)return Response.json({review:doc.ai_result,cached:true},{headers:{"Cache-Control":"private, no-store"}});
 const key=process.env.OPENAI_API_KEY;if(!key)return reply(503,"AI 연결 설정이 필요합니다. Vercel 환경변수 OPENAI_API_KEY를 추가해 주세요.");
 const bucket=client.storage.from("business-documents"),info=await bucket.info(doc.file_path);
 if(info.error)return reply(503,"증빙 파일을 읽지 못했습니다.");
 const mime=info.data.contentType||info.data.metadata?.mimetype;
 if(!["application/pdf","image/jpeg","image/png"].includes(String(mime)))return reply(400,"AI 분석은 PDF, JPG, PNG를 지원합니다.");
 if((info.data.size||info.data.metadata?.size||0)>=50*1024*1024)return reply(413,"AI 분석용 자료는 50MB 미만으로 나누어 제출해 주세요.");
 const started=new Date().toISOString(),expired=new Date(Date.now()-120000).toISOString();
 const lock=await client.from("business_documents").update({ai_started_at:started}).eq("user_id",id).eq("file_path",doc.file_path).or(`ai_started_at.is.null,ai_started_at.lt.${expired}`).select("user_id");
 if(lock.error)return reply(503,"분석을 시작하지 못했습니다.");if(!lock.data?.length)return reply(409,"이미 분석 중이거나 증빙이 변경됐습니다. 잠시 후 다시 확인해 주세요.");
 try{
  const signed=await bucket.createSignedUrl(doc.file_path,120);if(signed.error)return reply(503,"증빙 파일을 열지 못했습니다.");
  const review=await reviewBusinessDocument({url:signed.data.signedUrl,mime:String(mime),businessNumber:doc.business_number,key});
  const saved=await client.from("business_documents").update({ai_result:review,ai_file_path:doc.file_path,ai_reviewed_at:new Date().toISOString()}).eq("user_id",id).eq("file_path",doc.file_path).eq("ai_started_at",started).select("user_id");
  if(saved.error)return reply(503,"분석 결과를 저장하지 못했습니다.");if(!saved.data?.length)return reply(409,"분석 중 증빙이 변경됐습니다. 새 증빙을 다시 분석해 주세요.");
  return Response.json({review},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return reply(502,"AI 분석을 완료하지 못했습니다. API 키·잔액·연결 상태를 확인한 뒤 다시 시도해 주세요.");}
 finally{await client.from("business_documents").update({ai_started_at:null}).eq("user_id",id).eq("ai_started_at",started);}
}
