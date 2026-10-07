import { BusinessDocumentForm } from "@/components/store/business-document-form";
import { createServiceClient } from "@/lib/supabase/service";
import { canManageMembers } from "@/lib/auth/member-access";
import { AccountSettingsForm } from "@/components/store/account-settings-form";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getSessionProfile } from "@/lib/supabase/auth-helpers";
import { getLocale, getTranslations } from "next-intl/server";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { NOINDEX_FOLLOW } from "@/lib/seo/constants";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "account" });
  return buildStorefrontMetadata({
    locale,
    path: "/account",
    title: t("title"),
    robots: NOINDEX_FOLLOW,
  });
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const [{ configured, user, profile }, t, { verified }] = await Promise.all([
    getSessionProfile(),
    getTranslations("account"),
    searchParams,
  ]);

  if (configured && !user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const service = createServiceClient();
  const evidence = user && service ? (await service.from("business_documents").select("file_name,submitted_at,business_number").eq("user_id",user.id).maybeSingle()).data : null;
  const contact = user ? (await (await createClient()).from("profiles").select("phone,country_code,business_number").eq("id", user.id).maybeSingle()).data : null;
  const email = user?.email ?? profile?.email ?? "";
  const accountSettings = await getTranslations("accountSettings");
  const memberStaff = canManageMembers(profile);
  const isAdmin = profile?.role === "admin";
  const authUser = user && !contact?.phone ? await getAuthUser() : null;
  const phone = contact?.phone || (typeof authUser?.user_metadata?.phone_number === "string" ? authUser.user_metadata.phone_number : "");
  const ui = await getTranslations("accountDesign");
  const approved = isAdmin || profile?.role === "wholesale";
  const name = profile?.full_name || profile?.company_name || t("title");

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-14">
      <section className="relative overflow-hidden rounded-3xl border border-pink-100 bg-gradient-to-br from-rose-50 via-white to-violet-50 p-6 sm:p-10">
        <div aria-hidden className="absolute -right-14 -top-20 h-72 w-72 rounded-full border-[45px] border-pink-100/50" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-accent shadow-sm">{Array.from(name)[0]?.toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">HMT KOREA</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1><p className="mt-2 break-words text-sm text-zinc-600">{ui("welcome", { name })}</p></div>
          <span className={"rounded-full border px-4 py-2 text-xs font-semibold " + (approved ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>{isAdmin ? ui("admin") : approved ? ui("approved") : ui("pending")}</span>
        </div>
        {verified ? <p role="status" className="relative mt-5 text-sm text-emerald-700">{t("emailConfirmed")}</p> : null}
      </section>
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-bold">{ui("details")}</h2>
          <dl className="mt-6 space-y-5 text-sm">{[[ui("email"),email],[ui("company"),profile?.company_name],[ui("phone"),phone],[ui("country"),contact?.country_code]].map(([label,value])=><div key={label}><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 break-words font-medium text-zinc-900">{value || "—"}</dd></div>)}</dl>
          <div className="mt-6 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">{approved ? ui("approvedHelp") : ui("pendingHelp")}</div>
        </section>
        <div className="space-y-6">
          <section className="account-shortcuts grid grid-cols-2 gap-3 sm:gap-4">{[
            {href:"/account/orders",title:ui("history"),description:ui("historyHelp"),icon:"↗"},
            {href:"/cart",title:ui("quotes"),description:ui("quotesHelp"),icon:"＋"},
            {href:"/products",title:ui("catalog"),description:ui("catalogHelp"),icon:"▦"},
            {href:memberStaff ? "/admin" : "/contact",title:memberStaff ? ui("dashboard") : ui("support"),description:memberStaff ? ui("dashboardHelp") : ui("supportHelp"),icon:"↗"},
          ].map((item)=>{ const ItemLink = item.href === "/admin" ? NextLink : Link; return <ItemLink key={item.href} href={item.href} className="group rounded-3xl border border-zinc-200 bg-white p-4 sm:p-6 transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-100/40"><span aria-hidden className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-xl text-accent">{item.icon}</span><h2 className="font-bold text-zinc-900">{item.title}</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{item.description}</p></ItemLink>; })}</section>

        </div>
      </div>
      <section className="mt-7 rounded-3xl border border-zinc-200 p-6 sm:p-8"><h2 className="text-lg font-bold">{accountSettings("policies")}</h2><div className="mt-4 flex flex-wrap gap-4"><Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">{accountSettings("terms")}</Link><Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">{accountSettings("privacy")}</Link></div></section>
      {user && !isAdmin ? <BusinessDocumentForm locale={locale} submitted={evidence?.file_name || null} businessNumber={contact?.business_number ?? evidence?.business_number ?? ""} /> : null}
      {user ? <AccountSettingsForm name={profile?.full_name} company={profile?.company_name} phone={phone} country={contact?.country_code} admin={isAdmin} /> : null}
    </main>
  );
}
