import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found | HMT KOREA",
  robots: { index: false, follow: true },
};

export default function LocaleNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Page not found</h1>
      <p className="mt-3 text-zinc-600">
        The page you requested is not available. Return to the HMT KOREA wholesale catalog.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex w-fit rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
      >
        Go to homepage
      </Link>
    </main>
  );
}
