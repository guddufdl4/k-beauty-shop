"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "@/app/actions/auth";

const baseLinks = [
  { href: "/categories", label: "카테고리" },
  { href: "/products", label: "상품" },
  { href: "/cart", label: "장바구니" },
];

const guestLinks = [
  { href: "/login", label: "로그인" },
  { href: "/signup", label: "회원가입" },
];

type Props = {
  cartCount: number;
  isLoggedIn: boolean;
  userEmail?: string | null;
  profileRole?: "customer" | "admin" | "wholesale" | null;
  profileFullName?: string | null;
};

function accountLabel({
  role,
  fullName,
  email,
}: {
  role?: "customer" | "admin" | "wholesale" | null;
  fullName?: string | null;
  email?: string | null;
}) {
  if (role === "admin") return "관리자";
  const nickname = fullName?.trim();
  if (nickname) return nickname;
  if (!email) return "마이페이지";
  return email.length > 24 ? `${email.slice(0, 24)}…` : email;
}

export function MobileNav({
  cartCount,
  isLoggedIn,
  userEmail,
  profileRole,
  profileFullName,
}: Props) {
  const label = accountLabel({
    role: profileRole,
    fullName: profileFullName,
    email: userEmail,
  });
  const [open, setOpen] = useState(false);

  const linkClass =
    "transition-colors hover:text-rose-600";
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
              {accountLabel(userEmail)}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className={`${linkClass} cursor-pointer`}
              >
                로그아웃
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
        aria-label="메뉴"
      >
        메뉴
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
                  {accountLabel(userEmail)}
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className={`${mobileLinkClass} text-left`}
                    onClick={() => setOpen(false)}
                  >
                    로그아웃
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
          </nav>
        </div>
      ) : null}
    </>
  );
}
