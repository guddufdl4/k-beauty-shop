import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MIN_ORDER_USD } from "@/lib/currency";

function ResourceIcon({ kind }: { kind: "approval" | "minimum" | "documents" }) {
  const paths = { approval: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3M8 12l3 3 5-6", minimum: "m3 7 9-4 9 4v10l-9 4-9-4V7m0 0 9 5 9-5m-9 5v9", documents: "M14 3H5v18h14V8l-5-5m0 0v5h5M8 12h8m-8 4h8" };
  return <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d={paths[kind]} /></svg>;
}

export async function SupportPageShell({ title, subtitle, activeHref, children, showResources = true }: {
  title: string; subtitle?: string; activeHref: string; children: ReactNode; showResources?: boolean;
}) {
  const [t, footer] = await Promise.all([getTranslations("supportDesign"), getTranslations("footer")]);
  const groups = [
    { title: footer("infoTitle"), links: [["/shipping", "shipping"], ["/cart", "quoteList"], ["/payment", "payment"], ["/returns", "returns"], ["/faq", "faq"], ["/wholesale-inquiry", "wholesale"], ["/import-inquiry", "importInquiry"]] },
    { title: footer("supportTitle"), links: [["/categories", "categories"], ["/products", "catalog"], ["/order-guide", "orderGuide"], ["/contact", "contact"]] },
    { title: footer("aboutTitle"), links: [["/about", "about"], ["/terms", "terms"], ["/privacy", "privacy"], ["/signup", "membership"], ["/sitemap", "sitemap"]] },
  ];
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label={t("breadcrumb")} className="mb-6 flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/" className="hover:text-accent">HMT</Link><span aria-hidden>/</span><span>{title}</span>
      </nav>
      <header className="relative isolate overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-rose-50 px-6 py-9 sm:px-10 sm:py-12">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[45px] border-violet-100/60" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-accent">{t("eyebrow")}</p>
        <h1 className="relative mt-3 max-w-3xl text-balance text-3xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">{title}</h1>
        {subtitle ? <p className="relative mt-4 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">{subtitle}</p> : null}
        {showResources ? <div className="relative mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-zinc-600">
          <span className="flex items-center gap-2"><ResourceIcon kind="approval" />{t("approval")}</span>
          <span className="flex items-center gap-2"><ResourceIcon kind="minimum" />{t("minimum", { amount: MIN_ORDER_USD })}</span>
          <span className="flex items-center gap-2"><ResourceIcon kind="documents" />{t("documents")}</span>
        </div> : null}
      </header>
      <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 lg:self-start">
          <details className="rounded-2xl border border-zinc-200 bg-white lg:hidden">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-zinc-800"><span>{footer("supportTitle")}</span><span className="text-accent">+</span></summary>
            <div className="grid max-h-[55dvh] gap-4 overflow-y-auto border-t border-zinc-100 p-4">{groups.map(group => <nav key={group.title} aria-label={group.title} className="min-w-[180px] lg:min-w-0">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{group.title}</p>
              <ul className="space-y-1">{group.links.map(([href, key]) => <li key={href}>
                <Link href={href} aria-current={activeHref === href ? "page" : undefined} className={`flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${activeHref === href ? "bg-violet-50 font-semibold text-accent" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"}`}>
                  {footer(key)}{activeHref === href ? <span aria-hidden>↗</span> : null}
                </Link>
              </li>)}</ul>
            </nav>)}</div>
          </details>
          <div className="hidden flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-5 lg:flex">{groups.map(group => <nav key={group.title} aria-label={group.title} className="min-w-[180px] lg:min-w-0">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{group.title}</p>
              <ul className="space-y-1">{group.links.map(([href, key]) => <li key={href}>
                <Link href={href} aria-current={activeHref === href ? "page" : undefined} className={`flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${activeHref === href ? "bg-violet-50 font-semibold text-accent" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"}`}>
                  {footer(key)}{activeHref === href ? <span aria-hidden>↗</span> : null}
                </Link>
              </li>)}</ul>
            </nav>)}</div>
        </aside>
        <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9 [&_h2]:scroll-mt-24 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-zinc-900 [&_p]:leading-7 [&_section]:rounded-xl [&_section]:border [&_section]:border-zinc-100 [&_section]:p-5">
          {children}
        </div>
      </div>
    </main>
  );
}

export function SupportCards({ items }: { items: { title: string; body: string }[] }) {
  return <div className="mt-8 grid gap-4 sm:grid-cols-2">{items.map((item, index) => <section key={item.title} className="bg-zinc-50/60">
    <span className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-accent">{String(index + 1).padStart(2, "0")}</span>
    <h2>{item.title}</h2><p className="mt-2 text-sm text-zinc-600">{item.body}</p>
  </section>)}</div>;
}
