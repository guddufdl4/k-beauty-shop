import { getSessionProfile } from '@/lib/supabase/auth-helpers';
import { createServiceClient } from '@/lib/supabase/service';
import { canManageInquiries } from '@/lib/auth/member-access';
import { supportOwnedBy } from '@/lib/support-center';
export const runtime = 'nodejs';
export async function GET(request: Request) {
 const { user, profile } = await getSessionProfile();
 const headers = {'Cache-Control':'private, no-store'};
 if (!user) return new Response(null,{status:401,headers});
 const id = new URL(request.url).searchParams.get('id') || '';
 if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null,{status:400,headers});
 const db = createServiceClient(); if (!db) return new Response(null,{status:503,headers});
 const result = await db.from('support_inquiries').select('user_id,attachment_path,attachment_name').eq('id',id).is('deleted_at',null).maybeSingle();
 if (result.error) return new Response(null,{status:503,headers});
 if (!result.data || (!supportOwnedBy(result.data,user.id) && !canManageInquiries(profile)) || !result.data.attachment_path) return new Response(null,{status:404,headers});
 const signed = await db.storage.from('support-attachments').createSignedUrl(result.data.attachment_path,60,{download:result.data.attachment_name || 'attachment'});
 if (signed.error) return new Response(null,{status:503,headers});
 return new Response(null,{status:302,headers:{...headers,Location:signed.data.signedUrl}});
}
