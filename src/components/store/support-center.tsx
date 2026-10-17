'use client';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { supportCenterCopy } from '@/lib/support-center-copy';
import type { SupportThread } from '@/lib/support-center';
import { SupportInquiryForm } from './support-inquiry-form';
import { SupportReplyForm } from './support-reply-form';
function TopicIcon({index}:{index:number}) {
 const paths=['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M16 10l2 2 4-4','M20 13l-7 7a2 2 0 0 1-3 0l-8-8V3h9l9 7a2 2 0 0 1 0 3M7 7h.01','M6 3h12v18H6zM9 7h6M9 11h6M9 15h4','M1 4h14v13H1zM15 9h4l3 4v4h-7M7 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0M21 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0'];
 return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={paths[index]}/></svg>;
}
type Props={locale:string;name:string;email:string;company:string;loggedIn:boolean;approved:boolean;numberSaved:boolean;documentSubmitted:boolean;threads:SupportThread[];loadError:boolean;page:number;total:number;contactEmail:string;filter:string};
export function SupportCenter({locale,name,email,company,loggedIn,approved,numberSaved,documentSubmitted,threads,loadError,page,total,contactEmail,filter}:Props) {
 const t=supportCenterCopy(locale),[search,setSearch]=useState(''),[activeHelp,setActiveHelp]=useState<number|null>(null);
 const questions=t.questions.filter(row=>row.join(' ').toLowerCase().includes(search.trim().toLowerCase()));
 const help=approved?t.approved:documentSubmitted?t.review:numberSaved?t.saved:t.missing;
 const date=(value:string)=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(value));
 const pageHref=(value:number)=>'/contact?status='+filter+'&page='+value+'#my-inquiries';
 return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
 <div className="mb-5 text-xs text-zinc-500"><Link href="/">HMT KOREA</Link><span className="mx-2">/</span>{t.support}</div>
 <section className="rounded-3xl border border-pink-100 bg-gradient-to-br from-rose-50 via-pink-50/70 to-white px-6 py-9 sm:px-10 sm:py-12">
  <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Customer support</p><h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">{t.intro}</p>
  <label className="mt-7 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"><span aria-hidden className="text-xl text-zinc-400">⌕</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} aria-label={t.search} placeholder={t.search} className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>
  {search.trim()?<a href="#help-articles" className="mt-3 inline-block text-xs font-semibold text-accent">{t.faq}: {questions.length} →</a>:null}
 </section>
 <section className="my-5 flex flex-wrap items-center gap-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
  <div className="min-w-0 flex-1"><h2 className="font-bold">{approved?t.approved:t.verification}</h2><p className="mt-2 text-xs leading-6 text-zinc-600">{loggedIn?(loadError?t.loadError:help):t.guest}</p></div>
  <ol className="flex w-full flex-col gap-3 text-xs sm:w-auto sm:flex-row sm:gap-5">{t.steps.map((step,i)=>{const complete=loggedIn&&(i===0||(i===1&&(documentSubmitted||approved))||(i===2&&approved));return <li key={step} className={'flex items-center gap-2 '+(complete?'text-emerald-700':loggedIn&&i===1?'text-accent':'text-zinc-500')}><span className={'flex h-6 w-6 shrink-0 items-center justify-center rounded-full '+(complete?'bg-emerald-100':loggedIn&&i===1?'bg-pink-100':'bg-zinc-100')}>{complete?'✓':i+1}</span>{step}</li>;})}</ol>
  <Link href={loggedIn?'/account#business-verification':'/login?next=/contact'} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white">{loggedIn?(approved?t.account:t.upload):t.login}</Link>
 </section>
 <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{t.topics.map((topic,i)=><a key={topic} href={i===0?'#verification-help':i===1?'#pricing-help':i===2?'#inquiry':'#shipping-help'} onClick={()=>{setSearch('');setActiveHelp([0,2,-1,5][i]);}} className="group flex min-w-0 items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-pink-300 hover:shadow-sm sm:p-5"><span className="shrink-0 text-accent"><TopicIcon index={i}/></span><span className="min-w-0"><span className="block text-sm font-bold">{topic}</span><span className="mt-2 hidden text-xs leading-5 text-zinc-500 sm:block">{t.topicHelp[i]}</span></span></a>)}</div>
 <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]"><SupportInquiryForm name={name} email={email} company={company}/><div className="contents lg:block lg:space-y-6">
 <section id="my-inquiries" className="order-1 scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 lg:order-none"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">{t.my}</h2>{loggedIn?<span className="text-xs text-zinc-500">{total}</span>:null}</div>
 {!loggedIn?<div className="mt-5 rounded-xl bg-rose-50 p-5"><p className="text-sm leading-6 text-zinc-600">{t.guest}</p><Link href="/login?next=/contact" className="mt-3 inline-block text-sm font-semibold text-accent underline">{t.login} →</Link></div>:<>
  <div className="my-5 flex flex-wrap gap-2">{[['all',t.all],['awaiting',t.awaiting],['answered',t.answered]].map(([value,label])=><Link key={value} href={'/contact?status='+value+'#my-inquiries'} aria-current={filter===value?'page':undefined} className={'min-h-10 rounded-full border px-4 py-2 text-xs font-semibold '+(filter===value?'border-accent bg-accent text-white':'border-zinc-200 text-zinc-600')}>{label}</Link>)}</div>
  {loadError?<p role="alert" className="text-sm text-red-700">{t.loadError}</p>:threads.length===0?<p className="rounded-xl bg-zinc-50 p-5 text-sm text-zinc-500">{t.empty}</p>:<div className="space-y-3">{threads.map(row=><details key={row.id} className="rounded-xl border border-zinc-200 p-4">
   <summary className="cursor-pointer list-none"><div className="flex flex-wrap items-start justify-between gap-2"><span className="min-w-0 break-words text-sm font-semibold">{row.subject}</span><span className={'rounded-full px-2 py-1 text-[10px] font-semibold '+(row.replies.at(-1)?.from_staff?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800')}>{row.resolved_at?t.closed:row.replies.at(-1)?.from_staff?t.answered:t.awaiting}</span></div><p className="mt-3 text-[11px] text-zinc-500">{date(row.created_at)} · {row.id.slice(0,8)}</p><span className="mt-3 block text-xs font-semibold text-accent">{t.view} →</span></summary>
   <p className="mt-4 break-all font-mono text-xs text-zinc-500">{row.id}</p><p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-zinc-50 p-4 text-sm leading-6">{row.message}</p>
   {row.attachment_name?<a className="mt-3 inline-block break-all text-xs text-accent underline" href={'/api/support-inquiry/attachment?id='+row.id}>{t.attachment}: {row.attachment_name}</a>:null}
   {row.replies.length>=50?<p className="mt-3 text-xs text-zinc-500">{t.history}</p>:null}
   {row.replies.map(reply=><div key={reply.id} className={'mt-3 rounded-xl p-4 '+(reply.from_staff?'bg-pink-50':'bg-zinc-50')}><p className="text-xs font-bold">{reply.from_staff?t.team:t.you} · {date(reply.created_at)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{reply.body}</p></div>)}<SupportReplyForm id={row.id} locale={locale}/>
  </details>)}</div>}
  <nav className="mt-5 flex justify-between text-xs font-semibold text-accent">{page>1?<Link href={pageHref(page-1)}>{t.previous} ←</Link>:<span/>}{total>page*10?<Link href={pageHref(page+1)}>{t.next} →</Link>:null}</nav>
 </>}
 </section>
 <section className="order-3 rounded-2xl border border-pink-100 bg-pink-50/60 p-5 sm:p-7"><h2 className="font-bold">✉ {t.email}</h2><a href={'mailto:'+contactEmail} className="mt-3 block break-all text-lg font-semibold text-accent">{contactEmail}</a><p className="mt-2 text-xs leading-6 text-zinc-500">{t.emailHelp}</p></section>
 <section id="help-articles" className="order-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7"><h2 className="text-xl font-bold">{t.faq}</h2><div aria-live="polite" className="mt-5 space-y-3">{questions.length?questions.map(([q,a])=>{const index=t.questions.findIndex(row=>row[0]===q);return <details key={q} id={index===0?'verification-help':index===2?'pricing-help':index===5?'shipping-help':undefined} open={search.trim()||activeHelp===index?true:undefined} className="scroll-mt-24 rounded-xl border border-zinc-200 px-4 py-3"><summary className="cursor-pointer text-sm font-medium leading-6">{q}</summary><p className="mt-3 text-sm leading-7 text-zinc-600">{a}</p></details>;}):<p className="text-sm text-zinc-500">{t.noResults}</p>}</div></section>
 </div></div></main>;
}
