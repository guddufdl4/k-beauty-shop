import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
export type Notice = { id: string; kind: string; detail: string; href: string; title?: string; status?: string; createdAt?: string; readAt?: string | null };
export async function storeNotifications(client: SupabaseClient, userId: string, scope: string, incoming: Notice[]) {
  // Conflict-ignore preserves the first received snapshot and its read state.
  if (incoming.length) {
    const result = await client.from("notification_inbox").upsert(incoming.map(item => ({user_id:userId,scope,notification_id:item.id,payload:item})), {onConflict:"user_id,scope,notification_id",ignoreDuplicates:true});
    if (result.error) throw new Error("Notification storage unavailable");
  }
  const notifications: Notice[] = [];
  for (let offset=0;;offset+=1000) {
    const {data,error} = await client.from("notification_inbox").select("payload,read_at,received_at").eq("user_id",userId).eq("scope",scope).order("received_at",{ascending:false}).order("notification_id").range(offset,offset+999);
    if (error) throw new Error("Notification history unavailable");
    notifications.push(...(data ?? []).map(row => ({...row.payload,createdAt:row.payload.createdAt ?? row.received_at,readAt:row.read_at})));
    if (!data || data.length<1000) break;
  }
  return notifications;
}
export async function markNotifications(request: Request, scope: "admin" | "account") {
  const {user,profile}=await getSessionProfile();
  if (!user || (scope==="admin" && profile?.role!=="admin")) return new Response(null,{status:403});
  const origin=request.headers.get("origin");
  if (origin && origin!==new URL(request.url).origin) return new Response(null,{status:403});
  let body;
  try { body=await request.json(); } catch { return new Response(null,{status:400}); }
  if (!Array.isArray(body?.ids) || body.ids.length>2000 || !body.ids.every((id:unknown)=>typeof id==="string" && id.length>0 && id.length<=250)) return new Response(null,{status:400});
  const client=createServiceClient(); if (!client) return new Response(null,{status:503});
  if (body.ids.length) {
    const {error}=await client.from("notification_inbox").update({read_at:new Date().toISOString()}).eq("user_id",user.id).eq("scope",scope).is("read_at",null).in("notification_id",body.ids);
    if (error) return new Response(null,{status:503});
  }
  return Response.json({ok:true},{headers:{"Cache-Control":"private, no-store"}});
}
