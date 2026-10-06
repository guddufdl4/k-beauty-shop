import {getSessionProfile} from "@/lib/supabase/auth-helpers";
import {redirect} from "next/navigation";
import {NotificationInbox} from "@/components/store/notification-inbox";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;
 const {user}=await getSessionProfile();
 if(!user)redirect(`/${locale}/login?next=/account/notifications`);
 return <NotificationInbox locale={locale}/>;
}
