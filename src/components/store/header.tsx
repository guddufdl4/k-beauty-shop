import Link from "next/link";
import { getCart } from "@/lib/cart";
import { MobileNav } from "./mobile-nav";

export async function StoreHeader() {
  const cart = await getCart();

  return (
    <header className="sticky top-0 z-50 border-b border-rose-100/80 bg-white/95 backdrop-blur-sm">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3 sm:py-4">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-rose-700 sm:text-xl"
          >
            K-Beauty Shop
          </Link>
          <MobileNav cartCount={cart.itemCount} />
        </div>
      </div>
    </header>
  );
}
