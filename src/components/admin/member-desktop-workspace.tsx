"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
const PanelContext = createContext<{selected:string; select:(id:string)=>void}>({selected:'',select:()=>{}});
export function MemberDesktopWorkspace({panels,children}:{panels:{id:string;content:ReactNode}[];children:ReactNode}) {
  const [selected,setSelected] = useState(panels[0]?.id || '');
  const current = panels.find(panel=>panel.id === selected) || panels[0];
  return <PanelContext.Provider value={{selected:current?.id || '',select:setSelected}}><div className="hidden min-w-0 gap-5 md:grid xl:grid-cols-[minmax(0,1fr)_280px]">
    <div className="min-w-0">{children}</div>
    {current ? <aside className="self-start rounded-2xl border border-zinc-200 bg-white p-5 xl:sticky xl:top-5" aria-label="회원 상세 패널"><h2 className="mb-5 border-b border-zinc-100 pb-4 text-lg font-bold">회원 상세</h2><div className="space-y-5">{current.content}</div></aside> : null}
  </div></PanelContext.Provider>;
}
export function MemberPanelButton({memberId,name}:{memberId:string;name:string}) {
  const panel = useContext(PanelContext);
  return <button type="button" aria-label={`${name} 회원 상세`} aria-pressed={panel.selected === memberId} onClick={()=>panel.select(memberId)} className={`min-h-11 whitespace-nowrap rounded-xl border px-3 text-xs font-semibold ${panel.selected === memberId ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-zinc-200 bg-white text-zinc-600'}`}>상세 보기</button>;
}
