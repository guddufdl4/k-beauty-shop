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

  const links = [
    { href: "/", label: PUBLIC_STORE_NAME },
    { href: "/products", label: tFooter("catalog") },
    { href: "/categories", label: tFooter("categories") },
    { href: "/about", label: tFooter("about") },
    { href: "/contact", label: tFooter("contact") },
    { href: "/wholesale-inquiry", label: tFooter("wholesale") },
    { href: "/order-guide", label: tFooter("orderGuide") },
    { href: "/shipping", label: tFooter("shipping") },
    { href: "/payment", label: tFooter("payment") },
    { href: "/returns", label: tFooter("returns") },
    { href: "/faq", label: tFooter("faq") },
    { href: "/terms", label: tFooter("terms") },
    { href: "/privacy", label: tFooter("privacy") },
    { href: "/signup", label: tFooter("membership") },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{t("sitemapTitle")}</h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-600 sm:text-base">{t("sitemapIntro")}</p>
      <ul className="mt-8 space-y-2 text-sm text-zinc-700">
        {links.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="hover:text-accent hover:underline">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
