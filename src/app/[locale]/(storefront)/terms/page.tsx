import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms | K-Beauty Shop",
  description: "K-Beauty Shop terms of service",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-rose-500">Legal</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">Terms of Service</h1>
      <p className="mt-3 text-sm text-zinc-500">Effective date: 2026-06-18</p>

      <div className="prose prose-zinc mt-10 max-w-none text-sm leading-relaxed text-zinc-700">
        <p>
          These terms govern your use of K-Beauty Shop export commerce services,
          including browsing, ordering, and buyer inquiries.
        </p>
        <h2 className="mt-8 text-base font-semibold text-zinc-900">1. Scope</h2>
        <p>
          This agreement defines rights and responsibilities between the company and users.
        </p>
        <h2 className="mt-8 text-base font-semibold text-zinc-900">2. Services</h2>
        <p>
          Product details, pricing, and inventory can change without prior notice.
        </p>
        <h2 className="mt-8 text-base font-semibold text-zinc-900">3. Accounts</h2>
        <p>
          Users are responsible for accurate registration details and account security.
        </p>
        <h2 className="mt-8 text-base font-semibold text-zinc-900">4. Orders and shipping</h2>
        <p>
          Orders are confirmed after review and inventory checks. International shipping and
          customs fees may apply separately.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <Link href="/about" className="text-sm font-semibold text-rose-600 hover:underline">
          About →
        </Link>
        <Link href="/" className="text-sm font-semibold text-zinc-600 hover:underline">
          Home
        </Link>
      </div>
    </main>
  );
}