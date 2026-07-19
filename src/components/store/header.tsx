import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { getCart } from "@/lib/cart";

import { getCategories } from "@/lib/supabase/products";
import { localizeCategories } from "@/lib/store/localized-category";

import { getSessionProfile } from "@/lib/supabase/auth-helpers";

import { getUsdKrwRate } from "@/lib/currency";
import { formatLocaleProductPrice } from "@/lib/utils";

import { LocaleSwitcher } from "./locale-switcher";

import { CategoryMegaMenu } from "./category-mega-menu";
import { MobileNavActions, MobileNavPanels, MobileNavRoot, ShopNavDropdown } from "./mobile-nav";

import { StoreSearchBar } from "./store-search-bar";



type Props = {

  storeName?: string;

};



function IconLink({

  href,

  label,

  children,

}: {

  href: string;

  label: string;

  children: React.ReactNode;

}) {

  return (

    <Link href={href} className="group flex flex-col items-center gap-1 text-zinc-600 hover:text-accent">

      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 transition-colors group-hover:border-accent-soft group-hover:bg-accent-soft">

        {children}

      </span>

      <span className="hidden text-[10px] font-medium uppercase tracking-wide xl:block">{label}</span>

    </Link>

  );

}



export async function StoreHeader({ storeName }: Props) {

  const [cart, { user, profile }, tNav, locale, { categories }, usdKrwRate] = await Promise.all([

    getCart(),

    getSessionProfile(),

    getTranslations("nav"),

    getLocale(),

    getCategories(),

    getUsdKrwRate(),

  ]);



  const brandLabel = storeName?.trim() || tNav("brand");
  const localizedCategories = localizeCategories(categories, locale);

  const shopItems = [
    { sort: "sale" as const, label: tNav("shopSale") },
    { sort: "trending" as const, label: tNav("shopTrending") },
    { sort: "latest" as const, label: tNav("shopLatest") },
  ];

  const accountHref = user ? "/account" : "/login";

  const accountLabel = user ? tNav("account") : tNav("login");



  return (

    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white shadow-sm">

      <div className="hidden border-b border-zinc-100 bg-surface-muted lg:block">

        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-2 text-xs text-zinc-500 sm:px-6">

          <div className="flex items-center gap-3">

            <span className="sr-only">{tNav("followUs")}</span>

            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent" aria-label="Instagram">

              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">

                <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.3 1.1.4 2.3.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.3-2.3.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.2-2.3-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.3-1.1-.4-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.9.4-2.3.2-.6.5-1  .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.3 2.3-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1 .0-1.6.2-2 .3-.5.2-.8.4-1.1.7-.3.3-.5.6-.7 1.1-.1.4-.3 1-.3 2-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.0 1 .2 1.6.3 2 .2.5.4.8.7 1.1.3.3.6.5 1.1.7.4.1 1 .3 2 .3 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1 0 1.6-.2 2-.3.5-.2.8-.4 1.1-.7.3-.3.5-.6.7-1.1.1-.4.3-1 .3-2 .1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c0-1-.2-1.6-.3-2-.2-.5-.4-.8-.7-1.1-.3-.3-.6-.5-1.1-.7-.4-.1-1-.3-2-.3-1.2-.1-1.6-.1-4.7-.1z" />

                <path d="M12 7.3a4.7 4.7 0 100 9.4 4.7 4.7 0 000-9.4zm0 7.7a3 3 0 110-6 3 3 0 010 6zm5.8-9.2a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2z" />

              </svg>

            </a>

            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent" aria-label="Facebook">

              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">

                <path d="M13.5 22v-8.3h2.8l.4-3.2h-3.2V8.9c0-.9.3-1.6 1.7-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.8v3.2h2.4V22h3.3z" />

              </svg>

            </a>

          </div>

          <LocaleSwitcher className="inline-flex items-center" />

        </div>

      </div>



      <MobileNavRoot
        cartCount={cart.itemCount}
        isLoggedIn={Boolean(user)}
        profileRole={profile?.role ?? null}
        profileFullName={profile?.full_name ?? null}
        categories={localizedCategories}
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
          shop: tNav("shop"),
          brands: tNav("brands"),
          shopSale: tNav("shopSale"),
          shopTrending: tNav("shopTrending"),
          shopLatest: tNav("shopLatest"),
          about: tNav("about"),
          searchPlaceholder: tNav("searchPlaceholder"),
          searchButton: tNav("searchButton"),
        }}
      >
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-3 py-3 sm:gap-4 sm:py-4 lg:gap-8">

          <Link href="/" locale={locale} className="flex shrink-0 items-center gap-2">

            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-lg font-bold text-white">

              {brandLabel.charAt(0).toUpperCase()}

            </span>

            <span className="hidden text-lg font-bold tracking-tight text-zinc-900 sm:block">

              {brandLabel.split(" ").map((part, index) =>

                index === 0 ? (

                  <span key={part}>

                    <span className="text-accent">{part.charAt(0)}</span>

                    {part.slice(1)}

                  </span>

                ) : (

                  <span key={part}> {part}</span>

                ),

              )}

            </span>

          </Link>



          <div className="hidden flex-1 lg:block">

            <StoreSearchBar className="mx-auto max-w-xl" />

          </div>



          <div className="ml-auto flex items-center gap-2 sm:gap-4">

            <div className="hidden items-center gap-3 md:flex">

              <IconLink href={accountHref} label={accountLabel}>

                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">

                  <circle cx="12" cy="8" r="4" />

                  <path d="M5 20c0-4 3.1-7 7-7s7 3 7 7" strokeLinecap="round" />

                </svg>

              </IconLink>

              <Link href="/cart" className="group relative flex flex-col items-center gap-1 text-zinc-600 hover:text-accent">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 transition-colors group-hover:border-accent-soft group-hover:bg-accent-soft">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
                    <circle cx="9" cy="20" r="1.5" />
                    <circle cx="18" cy="20" r="1.5" />
                    <path d="M6 6L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {cart.itemCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                      {cart.itemCount}
                    </span>
                  ) : null}
                </span>
                <span className="hidden text-[10px] font-medium uppercase tracking-wide xl:block">{tNav("cart")}</span>
              </Link>

            </div>

            <MobileNavActions />

          </div>

        </div>

        <MobileNavPanels />

        <nav className="hidden items-stretch justify-between border-t border-zinc-100 py-0 lg:flex">

          <div className="flex items-stretch">

            <CategoryMegaMenu categories={localizedCategories} />

            <div className="flex items-center gap-6 py-3 pl-6 text-xs font-bold uppercase tracking-wider text-zinc-800">

              <ShopNavDropdown label={tNav("shop")} items={shopItems} />

              <Link href="/brands" className="transition-colors hover:text-accent">

                {tNav("brands")}

              </Link>

            </div>

          </div>

          <div className="flex items-center gap-6 py-3">

            <Link href="/about" className="text-xs font-bold uppercase tracking-wider text-zinc-800 transition-colors hover:text-accent">

              {tNav("about")}

            </Link>

            <Link href="/cart" className="flex items-center gap-2 text-xs text-zinc-600 transition-colors hover:text-accent">

              <span className="font-medium">

                {tNav("cartSummary", {

                  count: cart.itemCount,

                  total: formatLocaleProductPrice(cart.subtotal, locale, usdKrwRate),

                })}

              </span>

              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white">

                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">

                  <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />

                  <circle cx="9" cy="20" r="1.5" />

                  <circle cx="18" cy="20" r="1.5" />

                </svg>

              </span>

            </Link>

          </div>

        </nav>

        </div>
      </MobileNavRoot>

    </header>

  );

}


