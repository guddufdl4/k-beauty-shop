import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function StoreFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-xs text-zinc-500">
      <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/about" className="font-medium text-rose-600">
          {t("about")}
        </Link>
        <span aria-hidden="true" className="text-zinc-300">
          ·
        </span>
        <Link href="/terms" className="hover:text-rose-600 hover:underline">
          {t("terms")}
        </Link>
      </nav>
      <p>{t("copyright")}</p>
    </footer>
  );
}
