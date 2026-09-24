import { Link } from "@/i18n/navigation";

type SeoLink = {
  href: string;
  label: string;
};

type Props = {
  heading?: string;
  headingLevel?: "h1" | "h2";
  paragraphs: string[];
  links?: SeoLink[];
};

export function CatalogSeoCopy({ heading, headingLevel = "h2", paragraphs, links }: Props) {
  const HeadingTag = headingLevel;
  const visibleParagraphs = paragraphs.map((text) => text.trim()).filter(Boolean);
  if (visibleParagraphs.length === 0 && !heading && (!links || links.length === 0)) {
    return null;
  }

  return (
    <section className="border-t border-zinc-100 bg-white py-10 sm:py-12">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        {heading ? (
          <HeadingTag className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {heading}
          </HeadingTag>
        ) : null}
        <div className={heading ? "mt-4 space-y-4" : "space-y-4"}>
          {visibleParagraphs.map((text) => (
            <p key={text.slice(0, 48)} className="text-sm leading-relaxed text-zinc-600 sm:text-base">
              {text}
            </p>
          ))}
        </div>
        {links && links.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-accent hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
