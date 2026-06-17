"use client";

import { useState } from "react";
import { signOut } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

type Props = {
  cartCount: number;
  isLoggedIn: boolean;
  profileRole?: "customer" | "admin" | "wholesale" | null;
  profileFullName?: string | null;
  labels: {
    categories: string;
    products: string;
    cart: string;
    login: string;
    signup: string;
    logout: string;
    account: string;
    admin: string;
    menu: string;
  };
};

function accountLabel(
  role: Props["profileRole"],
  fullName: Props["profileFullName"],
  labels: Props["labels"],
) {
  if (role === "admin") return labels.admin;
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed;
  return labels.account;
}

export function MobileNav({
  cartCount,
  isLoggedIn,
  profileRole,
  profileFullName,
  labels,
}: Props) {
  const [open, setOpen] = useState(false);
  const label = accountLabel(profileRole, profileFullName, labels);

  const baseLinks = [
    { href: "/categories", label: labels.categories },
    { href: "/products", label: labels.products },
    { href: "/cart", label: labels.cart },
  ];

  const guestLinks = [
    { href: "/login", label: labels.login },
    { href: "/signup", label: labels.signup },
  ];

  const linkClass = "transition-colors hover:text-rose-600";
  const mobileLinkClass = "text-zinc-700 hover:text-rose-600";

  return (
    <>
      <nav className="hidden items-center gap-5 text-sm font-medium text-zinc-700 md:flex">
        {baseLinks.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass}>
            {link.label}
            {link.href === "/cart" && cartCount > 0 ? (
              <span className="ml-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-xs text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
        ))}
        {isLoggedIn ? (
          <>
            <Link href="/account" className={linkClass}>
              {label}
            </Link>
            <form action={signOut}>
              <button type="submit" className={`${linkClass} cursor-pointer`}>
                {labels.logout}
              </button>
            </form>
          </>
        ) : (
          guestLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))
        )}
        <LocaleSwitcher />
      </nav>

      <button
        type="button"
        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm md:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={labels.menu}
      >
        {labels.menu}
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full border-b border-rose-100 bg-white px-4 py-4 shadow-md md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium">
            <div className="pb-2">
              <LocaleSwitcher className="inline-flex" />
            </div>
            {baseLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={mobileLinkClass}
                onClick={() => setOpen(false)}
              >
                {link.label}
                {link.href === "/cart" && cartCount > 0 ? ` (${cartCount})` : ""}
              </Link>
            ))}
            {isLoggedIn ? (
              <>
                <Link
                  href="/account"
                  className={mobileLinkClass}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className={`${mobileLinkClass} text-left`}
                    onClick={() => setOpen(false)}
                  >
                    {labels.logout}
                  </button>
                </form>
              </>
            ) : (
              guestLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={mobileLinkClass}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))
            )}
            {profileRole === "admin" ? (
              <a href="/admin" className={mobileLinkClass} onClick={() => setOpen(false)}>
                {labels.admin}
              </a>
            ) : null}
          </nav>
        </div>
      ) : null}
    </>
  );
}
