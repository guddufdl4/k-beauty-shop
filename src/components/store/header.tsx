import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCart } from "@/lib/cart";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { MobileNav } from "./mobile-nav";

export async function StoreHeader() {
  const [cart, { user, profile }, tNav] = await Promise.all([
    getCart(),
    getSessionProfile(),
    getTranslations("nav"),
  ]);

  return (
    <header className="sticky top-0 z-50 border-b border-rose-100/80 bg-white/95 backdrop-blur-sm">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3 sm:py-4">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-rose-700 sm:text-xl"
          >
            {tNav("brand")}
          </Link>
          <MobileNav
            cartCount={cart.itemCount}
            isLoggedIn={Boolean(user)}
            profileRole={profile?.role ?? null}
            profileFullName={profile?.full_name ?? null}
            labels={{
              categories: tNav("categories"),
              products: tNav("products"),
              cart: tNav("cart"),
              login: tNav("login"),
              signup: tNav("signup"),
              logout: tNav("logout"),
              account: tNav("account"),
              admin: tNav("admin"),
              menu: tNav("menu"),
            }}
          />
        </div>
      </div>
    </header>
  );
}
