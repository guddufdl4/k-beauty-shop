"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { buildCategoryTree } from "@/lib/store/category-tree";
import { buildProductsHref } from "@/lib/store/products-url";
import type { Category } from "@/lib/supabase/products";
import { LocaleSwitcher } from "./locale-switcher";
import { StoreSearchBar } from "./store-search-bar";

type MobileNavLabels = {
  categories: string;
  products: string;
  cart: string;
  login: string;
  signup: string;
  logout: string;
  account: string;
  admin: string;
  menu: string;
  shop: string;
  brands: string;
  shopSale: string;
  shopTrending: string;
  shopLatest: string;
  about: string;
  searchPlaceholder: string;
  searchButton: string;
};

type MobileNavContextValue = {
  cartCount: number;
  isLoggedIn: boolean;
  profileRole?: "customer" | "admin" | "wholesale" | null;
  profileFullName?: string | null;
  categories: Category[];
  labels: MobileNavLabels;
  menuOpen: boolean;
  searchOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  toggleMenu: () => void;
  toggleSearch: () => void;
  closeAll: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("MobileNav components must be used within MobileNavRoot");
  }
  return ctx;
}

type RootProps = {
  cartCount: number;
  isLoggedIn: boolean;
  profileRole?: "customer" | "admin" | "wholesale" | null;
  profileFullName?: string | null;
  categories: Category[];
  labels: MobileNavLabels;
  children: ReactNode;
};

function accountLabel(
  role: RootProps["profileRole"],
  fullName: RootProps["profileFullName"],
  labels: MobileNavLabels,
) {
  if (role === "admin") return labels.admin;
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed;
  return labels.account;
}

export function MobileNavRoot({
  cartCount,
  isLoggedIn,
  profileRole,
  profileFullName,
  categories,
  labels,
  children,
}: RootProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  function closeAll() {
    setMenuOpen(false);
    setSearchOpen(false);
  }

  function toggleMenu() {
    setSearchOpen(false);
    setMenuOpen((value) => !value);
  }

  function toggleSearch() {
    setMenuOpen(false);
    setSearchOpen((value) => !value);
  }

  return (
    <MobileNavContext.Provider
      value={{
        cartCount,
        isLoggedIn,
        profileRole,
        profileFullName,
        categories,
        labels,
        menuOpen,
        searchOpen,
        setMenuOpen,
        setSearchOpen,
        toggleMenu,
        toggleSearch,
        closeAll,
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

const iconButtonClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 transition-colors hover:border-accent-soft hover:bg-accent-soft hover:text-accent";

export function MobileNavActions() {
  const { cartCount, labels, menuOpen, searchOpen, toggleMenu, toggleSearch } = useMobileNav();

  return (
    <div className="flex items-center gap-1 lg:hidden">
      <button
        type="button"
        className={`${iconButtonClass} ${searchOpen ? "border-accent bg-accent-soft text-accent" : ""}`}
        onClick={toggleSearch}
        aria-expanded={searchOpen}
        aria-label={labels.searchButton}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>

      <Link href="/cart" className={`${iconButtonClass} relative md:hidden`} aria-label={labels.cart}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
        </svg>
        {cartCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {cartCount}
          </span>
        ) : null}
      </Link>

      <button
        type="button"
        className={`${iconButtonClass} ${menuOpen ? "border-accent bg-accent-soft text-accent" : ""}`}
        onClick={toggleMenu}
        aria-expanded={menuOpen}
        aria-label={labels.menu}
      >
        {menuOpen ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function MobileNavPanels() {
  const {
    cartCount,
    isLoggedIn,
    profileRole,
    profileFullName,
    categories,
    labels,
    menuOpen,
    searchOpen,
    closeAll,
  } = useMobileNav();

  const tProducts = useTranslations("products");
  const [shopOpen, setShopOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);
  const label = accountLabel(profileRole, profileFullName, labels);

  const { columns } = useMemo(() => buildCategoryTree(categories), [categories]);

  const shopLinks = [
    { href: buildProductsHref({ sort: "sale" }), label: labels.shopSale },
    { href: buildProductsHref({ sort: "trending" }), label: labels.shopTrending },
    { href: buildProductsHref({ sort: "latest" }), label: labels.shopLatest },
  ];

  const baseLinks = [
    { href: "/brands", label: labels.brands },
    { href: "/cart", label: labels.cart },
    { href: "/about", label: labels.about },
  ];

  const guestLinks = [
    { href: "/login", label: labels.login },
    { href: "/signup", label: labels.signup },
  ];

  const mobileLinkClass =
    "flex min-h-11 w-full items-center justify-between px-1 py-3 text-[15px] font-medium text-zinc-800 transition-colors hover:text-accent";

  const mobileSubLinkClass =
    "block rounded-md py-2.5 pl-3 pr-1 text-sm font-medium text-zinc-800 transition-colors hover:bg-accent-soft hover:text-accent-hover";

  const mobileNestedLinkClass =
    "block rounded-md py-2 pl-6 pr-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-accent-soft hover:text-accent-hover";

  const accordionChevronClass = "h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200";

  if (!menuOpen && !searchOpen) {
    return null;
  }

  return (
    <div className="border-b border-zinc-200 bg-white lg:hidden">
      {searchOpen ? (
        <div className="px-0 py-3">
          <StoreSearchBar />
        </div>
      ) : null}

      {menuOpen ? (
        <div className="px-1 py-4">
          <div className="mb-5 border-b border-zinc-100 pb-4">
            <LocaleSwitcher className="inline-flex" />
          </div>
          <nav className="flex flex-col divide-y divide-zinc-100">
            <div className="py-1">
              <button
                type="button"
                className={mobileLinkClass}
                aria-expanded={shopOpen}
                onClick={() => setShopOpen((value) => !value)}
              >
                {labels.shop}
                <svg
                  viewBox="0 0 20 20"
                  className={`${accordionChevronClass} ${shopOpen ? "rotate-180" : ""}`}
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M5.3 7.7a1 1 0 011.4 0L10 10.9l3.3-3.2a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z" />
                </svg>
              </button>
              {shopOpen ? (
                <div className="mt-1 space-y-0.5 pb-3 pl-1">
                  {shopLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={mobileSubLinkClass}
                      onClick={closeAll}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            {columns.length > 0 ? (
              <div className="py-1">
                <button
                  type="button"
                  className={mobileLinkClass}
                  aria-expanded={categoriesOpen}
                  onClick={() => setCategoriesOpen((value) => !value)}
                >
                  {labels.categories}
                  <svg
                    viewBox="0 0 20 20"
                    className={`${accordionChevronClass} ${categoriesOpen ? "rotate-180" : ""}`}
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M5.3 7.7a1 1 0 011.4 0L10 10.9l3.3-3.2a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z" />
                  </svg>
                </button>
                {categoriesOpen ? (
                  <div className="mt-1 space-y-1 pb-3 pl-1">
                    {columns.map(({ parent, children }) =>
                      children.length > 0 ? (
                        <div key={parent.id} className="rounded-lg border-2 border-accent-hover bg-zinc-50/80">
                          <button
                            type="button"
                            className={`${mobileSubLinkClass} flex w-full items-center justify-between text-left font-semibold text-zinc-900`}
                            aria-expanded={expandedParentId === parent.id}
                            onClick={() =>
                              setExpandedParentId((current) =>
                                current === parent.id ? null : parent.id,
                              )
                            }
                          >
                            {parent.name}
                            <svg
                              viewBox="0 0 20 20"
                              className={`${accordionChevronClass} h-3.5 w-3.5 ${expandedParentId === parent.id ? "rotate-180" : ""}`}
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M5.3 7.7a1 1 0 011.4 0L10 10.9l3.3-3.2a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z" />
                            </svg>
                          </button>
                          {expandedParentId === parent.id ? (
                            <div className="space-y-0.5 border-t border-accent-hover/30 px-1 pb-2 pt-1">
                              <Link
                                href={buildProductsHref({ category: parent.slug })}
                                className={mobileNestedLinkClass}
                                onClick={closeAll}
                              >
                                {tProducts("allInCategory", { category: parent.name })}
                              </Link>
                              {children.map((child) => (
                                <Link
                                  key={child.id}
                                  href={buildProductsHref({ category: child.slug })}
                                  className={mobileNestedLinkClass}
                                  onClick={closeAll}
                                >
                                  {child.name}
                                </Link>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <Link
                          key={parent.id}
                          href={buildProductsHref({ category: parent.slug })}
                          className={mobileSubLinkClass}
                          onClick={closeAll}
                        >
                          {parent.name}
                        </Link>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
            {baseLinks.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className={`${mobileLinkClass} py-3`}
                onClick={closeAll}
              >
                <span>
                  {link.label}
                  {link.href === "/cart" && cartCount > 0 ? ` (${cartCount})` : ""}
                </span>
              </Link>
            ))}
            {isLoggedIn ? (
              <>
                <Link href="/account" className={`${mobileLinkClass} py-3`} onClick={closeAll}>
                  <span>{label}</span>
                </Link>
                <form action={signOut}>
                  <button type="submit" className={`${mobileLinkClass} py-3 text-left`} onClick={closeAll}>
                    <span>{labels.logout}</span>
                  </button>
                </form>
              </>
            ) : (
              guestLinks.map((link) => (
                <Link key={link.href} href={link.href} className={`${mobileLinkClass} py-3`} onClick={closeAll}>
                  <span>{link.label}</span>
                </Link>
              ))
            )}
            {profileRole === "admin" ? (
              <a href="/admin" className={`${mobileLinkClass} py-3`} onClick={closeAll}>
                <span>{labels.admin}</span>
              </a>
            ) : null}
          </nav>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use MobileNavRoot, MobileNavActions, MobileNavPanels instead */
export function MobileNav(props: Omit<RootProps, "children">) {
  return (
    <MobileNavRoot {...props}>
      <MobileNavActions />
      <MobileNavPanels />
    </MobileNavRoot>
  );
}

export type ShopNavItem = {
  sort: "sale" | "trending" | "latest";
  label: string;
};

export function ShopNavDropdown({
  label,
  items,
}: {
  label: string;
  items: ShopNavItem[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="group relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`flex items-center gap-1 transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${open ? "text-accent" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <svg
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5.3 7.7a1 1 0 011.4 0L10 10.9l3.3-3.2a1 1 0 111.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4z" />
        </svg>
      </button>

      <div
        className={`absolute left-0 top-full z-50 min-w-[11rem] pt-2 ${open ? "block" : "hidden group-hover:block"}`}
      >
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          {items.map((item) => (
            <Link
              key={item.sort}
              href={buildProductsHref({ sort: item.sort })}
              className="block px-4 py-2.5 text-sm font-medium normal-case tracking-normal text-zinc-700 transition-colors hover:bg-accent-soft/60 hover:text-accent"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
