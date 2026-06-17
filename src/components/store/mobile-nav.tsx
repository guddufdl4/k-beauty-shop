"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/actions/auth";
import { LocaleSwitcher } from "./locale-switcher";

type Props = {
  cartCount: number;
  isLoggedIn: boolean;
  profileRole?: "customer" | "admin" | "wholesale" | null;
  profileFullName?: string | null;
};

function accountLabel(
  t: (key: "admin" | "account") => string,
  role?: "customer" | "admin" | "wholesale" | null,
  fullName?: string | null,
) {
  if (role === "admin") return t("admin");
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed;
  return t("account");
}

export function MobileNav({
  cartCount,
  isLoggedIn,
  profileRole,
  profileFullName,
}: Props) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const label = accountLabel(t, profileRole, profileFullName);
  const baseLinks = [
    { href: "/categories", label: t("categories") },
    { href: "/products", label: t("products") },
    { href: "/cart", label: t("cart") },
  ] as const;
  const guestLinks = [
    { href: "/login", label: t("login") },
    { href: "/signup", label: t("signup") },
  ] as const;

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
                {t("logout")}
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
      </nav>

      <button
        type="button"
        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm md:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t("menu")}
      >
        {t("menu")}
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full border-b border-rose-100 bg-white px-4 py-4 shadow-md md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium">
            {baseLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={mobileLinkClass}
                onClick={() => setOpen(false)}
              >
                {link.label}
                {link.href === "/cart" && cartCount > 0
                  ? ` (${cartCount})`
                  : ""}
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
                    {t("logout")}
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
            <LocaleSwitcher />
          </nav>
        </div>
      ) : null}
    </>
  );
}
