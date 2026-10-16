export function localRead(key:string):string[] {
 try { const ids=JSON.parse(localStorage.getItem(key)||"[]"); return Array.isArray(ids)?ids.filter((id:unknown):id is string=>typeof id==="string"):[]; } catch { return []; }
}
export async function saveRead(scope:"admin"|"account",owner:string,ids:string[]) {
 for(let offset=0;offset<ids.length;offset+=1000){
  const response=await fetch(`/api/${scope}/notifications`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids:ids.slice(offset,offset+1000)}),keepalive:true});
  if (!response.ok) throw new Error("Unable to save read status");
 }
 const key=`hmt-${scope==="admin"?"admin":"customer"}-notifications:${owner}`;
 const next=[...new Set([...localRead(key),...ids])];
 try { localStorage.setItem(key,JSON.stringify(next)); } catch { /* Server remains authoritative. */ }
 window.dispatchEvent(new Event("hmt-notifications-read"));
 return next;
}
export async function mergeRead(scope:"admin"|"account",owner:string,items:{id:string;readAt?:string|null}[]) {
 const key=`hmt-${scope==="admin"?"admin":"customer"}-notifications:${owner}`;
 const saved=localRead(key);
 const legacy=items.filter(item=>!item.readAt && saved.includes(item.id)).map(item=>item.id);
 if (legacy.length) await saveRead(scope,owner,legacy);
 const merged=[...new Set([...saved,...items.filter(item=>item.readAt).map(item=>item.id)])];
 try { localStorage.setItem(key,JSON.stringify(merged)); } catch {}
 return merged;
}
