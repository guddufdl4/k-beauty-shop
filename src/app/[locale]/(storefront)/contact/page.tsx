import { SupportCenter } from '@/components/store/support-center';
import { getSessionProfile } from '@/lib/supabase/auth-helpers';
import { createServiceClient } from '@/lib/supabase/service';
import { getLocale,getTranslations } from 'next-intl/server';
import { getSiteSettings,getPublicSiteContact } from '@/lib/site-settings';
import { buildStorefrontMetadata } from '@/lib/seo/metadata';
import { PUBLIC_CONTACT_EMAIL } from '@/lib/store/public-contact';
import type { SupportThread } from '@/lib/support-center';
export const dynamic='force-dynamic';
export async function generateMetadata(){const locale=await getLocale(),t=await getTranslations('supportPages');return buildStorefrontMetadata({locale,path:'/contact',title:t('contactTitle'),description:t('contactBody'),robots:{index:false,follow:true}});}
export default async function ContactPage({searchParams}:{searchParams:Promise<{page?:string;status?:string}>}) {
 const [session,locale,settings,params]=await Promise.all([getSessionProfile(),getLocale(),getSiteSettings(),searchParams]);
 const page=Math.max(1,Math.min(10000,parseInt(params.page||'1',10)||1));
 const filter=["awaiting","answered"].includes(params.status||"")?params.status!:"all";
 const db=createServiceClient(); let threads:SupportThread[]=[],total=0,loadError=false,numberSaved=false,documentSubmitted=false;
 if(session.user&&db){
   let query=db.from('support_inquiries').select('id,subject,message,created_at,resolved_at,attachment_name,replies:support_inquiry_replies(id,body,created_at,from_staff)',{count:'exact'}).eq('user_id',session.user.id).is('deleted_at',null).order('created_at',{ascending:false}).order('id').range((page-1)*10,page*10-1).order('created_at',{referencedTable:'support_inquiry_replies',ascending:false}).limit(50,{referencedTable:'support_inquiry_replies'});
   if(filter==='answered')query=query.eq('last_reply_from_staff',true);
   if(filter==='awaiting')query=query.or('last_reply_from_staff.is.null,last_reply_from_staff.eq.false');
   const [inquiries,profile,document]=await Promise.all([query,
    db.from('profiles').select('business_number').eq('id',session.user.id).maybeSingle(),
    db.from('business_documents').select('file_path').eq('user_id',session.user.id).maybeSingle()
   ]);
   loadError=Boolean(inquiries.error||profile.error||document.error);total=inquiries.count||0;
   threads=((inquiries.data||[]) as unknown as SupportThread[]).map(row=>({...row,replies:[...row.replies].sort((a,b)=>a.created_at.localeCompare(b.created_at))}));
   numberSaved=Boolean(profile.data?.business_number);documentSubmitted=Boolean(document.data?.file_path);
 } else if(session.user)loadError=true;
 return <SupportCenter locale={locale} name={session.profile?.full_name||''} email={session.user?.email||''} company={session.profile?.company_name||''} loggedIn={Boolean(session.user)} approved={['admin','wholesale'].includes(session.profile?.role||'')} numberSaved={numberSaved} documentSubmitted={documentSubmitted} threads={threads} loadError={loadError} page={page} total={total} filter={filter} contactEmail={getPublicSiteContact(settings).public_email||PUBLIC_CONTACT_EMAIL}/>;
}
