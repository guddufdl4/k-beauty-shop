"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";

type AccountMenuLabels = {
  accountMenu: string;
  myAccount: string;
  orders: string;
  signOut: string;
  login: string;
};

type Props = {
  isLoggedIn: boolean;
  labels: AccountMenuLabels;
};

const iconButtonClass =
  "group flex flex-col items-center gap-1 text-zinc-600 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

const menuItemClass =
  "block w-full px-4 py-2.5 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-accent-soft/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset";

export function AccountMenu({ isLoggedIn, labels }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const closeMenu = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeMenu]);

  if (!isLoggedIn) {
    return (
      <Link href="/login" aria-label={labels.login} className={iconButtonClass}>
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 transition-colors group-hover:border-accent-soft group-hover:bg-accent-soft">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M5 20c0-4 3.1-7 7-7s7 3 7 7" strokeLinecap="round" />
          </svg>
        </span>
        <span className="hidden text-[10px] font-medium uppercase tracking-wide xl:block">{labels.login}</span>
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={`${iconButtonClass} ${open ? "text-accent-hover" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={labels.accountMenu}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors group-hover:border-accent-soft group-hover:bg-accent-soft ${open ? "border-accent-soft bg-accent-soft" : "border-zinc-200"}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M5 20c0-4 3.1-7 7-7s7 3 7 7" strokeLinecap="round" />
          </svg>
        </span>
        <span className="hidden text-[10px] font-medium uppercase tracking-wide xl:block">{labels.accountMenu}</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={labels.accountMenu}
          className="absolute right-0 top-full z-[60] min-w-[12rem] pt-2"
        >
          <div className="overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <Link href="/account" role="menuitem" className={menuItemClass} onClick={() => closeMenu(false)}>
              {labels.myAccount}
            </Link>
            <Link href="/account/orders" role="menuitem" className={menuItemClass} onClick={() => closeMenu(false)}>
              {labels.orders}
            </Link>
            <form action={signOut}>
              <button type="submit" role="menuitem" className={menuItemClass}>
                {labels.signOut}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
