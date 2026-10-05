import { SupportPageShell } from "@/components/store/support-page-shell";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PUBLIC_STORE_NAME } from "@/lib/site-url";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "supportPages" });
  return buildStorefrontMetadata({
    locale,
    path: "/sitemap",
    title: t("sitemapTitle"),
    description: t("sitemapIntro"),
  });
}

export default async function HtmlSitemapPage() {
  const [t, tFooter] = await Promise.all([
    getTranslations("supportPages"),
    getTranslations("footer"),
  ]);
  const tNav = await getTranslations("nav");

  const links = [
    { href: "/", label: PUBLIC_STORE_NAME },
    { href: "/products", label: tFooter("catalog") },
    { href: "/brands", label: tNav("brands") },
    { href: "/categories", label: tFooter("categories") },
    { href: "/about", label: tFooter("about") },
    { href: "/contact", label: tFooter("contact") },
    { href: "/wholesale-inquiry", label: tFooter("wholesale") },
    { href: "/import-inquiry", label: tFooter("importInquiry") },
    { href: "/order-guide", label: tFooter("orderGuide") },
    { href: "/cart", label: tFooter("quoteList") },
    { href: "/shipping", label: tFooter("shipping") },
    { href: "/payment", label: tFooter("payment") },
    { href: "/returns", label: tFooter("returns") },
    { href: "/faq", label: tFooter("faq") },
    { href: "/terms", label: tFooter("terms") },
    { href: "/privacy", label: tFooter("privacy") },
    { href: "/signup", label: tFooter("membership") },
  ];

  const design = await getTranslations("supportDesign");
  return (
    <SupportPageShell activeHref="/sitemap" title={t("sitemapTitle")} subtitle={design("sitemapIntro")}>

      <p className="mt-4 text-sm leading-relaxed text-zinc-600 sm:text-base">{t("sitemapIntro")}</p>
      <ul className="mt-8 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
        {links.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex min-h-14 items-center rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 font-medium hover:border-violet-200 hover:text-accent">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </SupportPageShell>
  );
}
