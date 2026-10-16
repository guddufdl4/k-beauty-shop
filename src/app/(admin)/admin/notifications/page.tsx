import {getSessionProfile} from "@/lib/supabase/auth-helpers";
import {redirect} from "next/navigation";
import {AdminNotificationInbox} from "@/components/admin/notification-inbox";
export const dynamic="force-dynamic";
export default async function Page(){const {user,profile}=await getSessionProfile();if(!user||profile?.role!=="admin")redirect("/en/login");return <AdminNotificationInbox/>;}
