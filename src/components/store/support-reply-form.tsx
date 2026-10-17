'use client';
import { useActionState,useRef } from 'react';
import { replySupportInquiry } from '@/app/actions/support-inquiries';
export function SupportReplyForm({id,staff=false,locale='en'}:{id:string;staff?:boolean;locale?:string}) {
 const request=useRef<{body:string;id:string}|null>(null);
 const ko=locale==='ko';
 const [state,action,pending]=useActionState(async (_: {error?:string;success?:string},form:FormData)=>{
   const body=String(form.get('body')||'');
   if(request.current?.body!==body)request.current={body,id:crypto.randomUUID()};
   form.set('reply_id',request.current.id);
   try{return await replySupportInquiry(form);}catch{return {error:ko?'전송하지 못했습니다. 다시 시도해 주세요.':'Unable to send. Please try again.'};}
 },{});
 return <form action={action} className="mt-4 space-y-3"><input type="hidden" name="id" value={id}/><label className="block text-sm font-semibold">{ko?(staff?'고객에게 답변':'추가 문의'):(staff?'Reply to customer':'Follow up')}<textarea name="body" required minLength={2} maxLength={5000} rows={3} disabled={pending} className="mt-2 block w-full rounded-xl border border-zinc-200 bg-white p-3 font-normal"/></label><button disabled={pending} className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending?(ko?'전송 중…':'Sending…'):(ko?'답변 보내기':'Send message')}</button>{state.error?<p role="alert" className="text-sm text-red-700">{state.error}</p>:null}{state.success?<p role="status" className="text-sm text-emerald-700">{state.success}</p>:null}</form>;
}
