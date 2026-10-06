import {getSessionProfile} from "@/lib/supabase/auth-helpers";
import {createServiceClient} from "@/lib/supabase/service";
export const dynamic="force-dynamic";
export async function GET(){
 const {user,profile}=await getSessionProfile();if(!user)return new Response(null,{status:401});
 const client=createServiceClient();if(!client)return new Response(null,{status:503});
 const [documents,orders]=await Promise.all([
  client.from("business_documents").select("submitted_at").eq("user_id",user.id).maybeSingle(),
  client.from("orders").select("order_number,status,created_at,shipping_address").eq("user_id",user.id).is("deleted_at",null).order("created_at",{ascending:false}).limit(50)
 ]);
 if(documents.error||orders.error)return new Response(null,{status:503});
 const notifications=[];
 if(documents.data?.submitted_at)notifications.push({id:`business:${documents.data.submitted_at}:${profile?.role}`,kind:profile?.role==="wholesale"?"approved":"review",detail:"",href:"/account"});
 else if(profile?.role==="wholesale")notifications.push({id:"business:manual:approved",kind:"approved",detail:"",href:"/account"});
 for(const order of orders.data??[]){
  notifications.push({id:`order:${order.order_number}:${order.status}`,kind:"order",detail:order.order_number,status:order.status,href:`/orders/${encodeURIComponent(order.order_number)}`});
  if(order.shipping_address?.quote_reviewed_at)notifications.push({id:`review:${order.order_number}`,kind:"quoteRead",detail:order.order_number,href:`/orders/${encodeURIComponent(order.order_number)}`});
 }
 return Response.json({userId:user.id,notifications},{headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
}
