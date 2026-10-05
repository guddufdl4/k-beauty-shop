import type { Metadata } from "next";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { getPublicSiteContact, getSiteSettings } from "@/lib/site-settings";
import { SupportCards, SupportPageShell } from "@/components/store/support-page-shell";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "about" });
  return buildStorefrontMetadata({ locale, path: "/about", title: t("title"), description: `${t("companyName")}${t("introSuffix")}` });
}

export default async function AboutPage() {
  const [t, design, settings] = await Promise.all([getTranslations("about"), getTranslations("supportDesign"), getSiteSettings()]);
  const contact = getPublicSiteContact(settings);
  const companyName = contact.store_name || t("companyName");
  const gallery = [
    { src: "warehouse-aisle", label: "storage", alt: "photoAltStorage" },
    { src: "warehouse-handling", label: "handling", alt: "photoAltHandling" },
    { src: "warehouse-inventory", label: "storage", alt: "photoAltStorage" },
  ];
  return (
    <SupportPageShell activeHref="/about" title={t("title")} subtitle={design("aboutIntro")}>
      <div className="grid gap-5 sm:grid-cols-[1.15fr_1fr]">
        <figure className="relative min-h-80 overflow-hidden rounded-2xl bg-zinc-100 sm:min-h-[430px]">
          <Image src="/company/hmt-facility.webp" alt={design("photoAltFacility")} fill sizes="(max-width: 640px) 100vw, 450px" className="object-cover object-[50%_68%]" />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-5 pt-16 text-sm font-medium text-white">{design("facility")}</figcaption>
        </figure>
        <div className="flex flex-col justify-center rounded-2xl bg-violet-50/60 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">HANMI TRADING COMPANY</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{companyName}</h2>
          <p className="mt-4 text-sm text-zinc-600"><strong className="font-medium text-zinc-900">{companyName}</strong>{t("introSuffix")}</p>
          <p className="mt-4 text-sm text-zinc-600">{t("shopDescription")}</p>
          <Link href="/products" className="mt-6 inline-flex min-h-11 items-center self-start rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">{t("viewProducts")}<span aria-hidden className="ml-3">↗</span></Link>
        </div>
      </div>
      <div className="mt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">{design("operationsEyebrow")}</p>
        <h2 className="mt-3">{design("operationsTitle")}</h2>
        <p className="mt-3 max-w-2xl text-sm text-zinc-600">{design("operationsBody")}</p>
        <figure className="relative mt-6 aspect-[16/10] overflow-hidden rounded-2xl bg-zinc-100 sm:aspect-[16/8]">
          <Image src="/company/shipment-loading.webp" alt={design("photoAltDispatch")} fill sizes="(max-width: 1024px) 100vw, 850px" className="object-cover" />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-5 pb-5 pt-14 text-sm font-medium text-white">{design("dispatch")}</figcaption>
        </figure>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {gallery.map(photo => <figure key={photo.src} className="overflow-hidden rounded-2xl border border-zinc-100">
            <div className="relative aspect-[4/5]"><Image src={`/company/${photo.src}.webp`} alt={design(photo.alt)} fill sizes="(max-width: 640px) 100vw, 280px" className="object-cover" /></div>
            <figcaption className="px-4 py-3 text-xs font-medium text-zinc-600">{design(photo.label)}</figcaption>
          </figure>)}
        </div>
      </div>
      <section className="mt-12 bg-gradient-to-br from-amber-50/80 to-white">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">2025 · 62nd Trade Day</p>
        <h2 className="mt-3">{design("awardTitle")}</h2>
        <p className="mt-3 text-sm text-zinc-600">{design("awardBody")}</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <figure><Image src="/company/trade-day.webp" alt={design("photoAltTrade")} width={1050} height={1400} sizes="(max-width: 640px) 100vw, 400px" className="h-auto w-full rounded-xl" /><figcaption className="mt-2 text-xs text-zinc-500">{design("tradeEvent")}</figcaption></figure>
          <figure><a href="/company/export-award.webp" target="_blank" rel="noopener noreferrer" aria-label={design("awardCertificate")}><Image src="/company/export-award.webp" alt={design("awardCertificate")} width={1080} height={1528} sizes="(max-width: 640px) 100vw, 400px" className="h-auto w-full rounded-xl border border-zinc-100 bg-white" /></a><figcaption className="mt-2 text-xs text-zinc-500">{design("awardCertificate")}</figcaption></figure>
        </div>
      </section>
      <SupportCards items={[1, 2, 3].map(index => ({ title: design(`about${index}Title`), body: design(`about${index}Body`) }))} />
      {contact.company_address || contact.public_email || contact.public_phone || contact.public_whatsapp ? <section className="mt-8 bg-zinc-50/60">
        <h2>{companyName}</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600">
          {contact.company_address ? <li>{contact.company_address}</li> : null}
          {contact.public_email ? <li><a href={`mailto:${contact.public_email}`} className="text-accent hover:underline">{contact.public_email}</a></li> : null}
          {contact.public_phone ? <li>{contact.public_phone}</li> : null}
          {contact.public_whatsapp ? <li>WhatsApp {contact.public_whatsapp}</li> : null}
        </ul>
      </section> : null}
    </SupportPageShell>
  );
}
