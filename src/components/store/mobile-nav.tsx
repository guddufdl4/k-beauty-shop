"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/categories", label: "카테고리" },
  { href: "/products", label: "상품" },
  { href: "/cart", label: "장바구니" },
  { href: "/account", label: "마이페이지" },
  { href: "/login", label: "로그인" },
  { href: "/signup", label: "회원가입" },
];

type Props = {
  cartCount: number;
};

export function MobileNav({ cartCount }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-5 text-sm font-medium text-zinc-700 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="transition-colors hover:text-rose-600"
          >
            {link.label}
            {link.href === "/cart" && cartCount > 0 ? (
              <span className="ml-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-xs text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
        ))}
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
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-zinc-700 hover:text-rose-600"
                onClick={() => setOpen(false)}
              >
                {link.label}
                {link.href === "/cart" && cartCount > 0
                  ? ` (${cartCount})`
                  : ""}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </>
  );
}
