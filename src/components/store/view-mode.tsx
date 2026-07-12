"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";

export type ViewMode = "auto" | "mobile" | "desktop";

const STORAGE_KEY = "storefront-view-mode";

type ViewModeContextValue = {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
};

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

function readStoredMode(): ViewMode {
  if (typeof window === "undefined") {
    return "auto";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "mobile" || stored === "desktop" || stored === "auto") {
    return stored;
  }

  return "auto";
}

function applyViewModeClass(mode: ViewMode) {
  const root = document.documentElement;
  root.classList.remove("view-mode-auto", "view-mode-mobile", "view-mode-desktop");
  root.classList.add(`view-mode-${mode}`);
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    throw new Error("useViewMode must be used within ViewModeProvider");
  }
  return ctx;
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>("auto");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredMode();
    setModeState(stored);
    applyViewModeClass(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, mode);
    applyViewModeClass(mode);
  }, [mode, ready]);

  function setMode(next: ViewMode) {
    setModeState(next);
  }

  return (
    <ViewModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function StorefrontViewShell({ children }: { children: ReactNode }) {
  const { mode } = useViewMode();

  if (mode === "mobile") {
    return (
      <div className="view-mode-shell min-h-screen bg-zinc-100 py-3 sm:py-4">
        <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg ring-1 ring-zinc-900/5">
          <div className="storefront-view-root">{children}</div>
        </div>
      </div>
    );
  }

  if (mode === "desktop") {
    return (
      <div className="view-mode-shell min-h-screen overflow-x-hidden bg-zinc-100">
        <div className="storefront-view-root mx-auto min-h-screen min-w-0 w-full max-w-7xl bg-white shadow-sm">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="view-mode-shell storefront-view-root mx-auto min-w-0 w-full max-w-full overflow-x-hidden">
      {children}
    </div>
  );
}

const toggleButtonBase =
  "min-h-9 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function ViewModeToggle() {
  const t = useTranslations("viewMode");
  const { mode, setMode } = useViewMode();

  const options: { value: ViewMode; label: string }[] = [
    { value: "auto", label: t("auto") },
    { value: "mobile", label: t("mobile") },
    { value: "desktop", label: t("desktop") },
  ];

  return (
    <div
      className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3"
      role="group"
      aria-label={t("label")}
    >
      <span className="text-xs font-medium text-zinc-600">{t("label")}</span>
      <div className="inline-flex rounded-full border border-zinc-200 bg-white p-0.5 shadow-sm">
        {options.map((option) => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`${toggleButtonBase} ${
                active
                  ? "bg-accent text-white shadow-sm hover:bg-accent-hover"
                  : "text-zinc-600 hover:bg-accent-soft hover:text-accent"
              }`}
              aria-pressed={active}
              onClick={() => setMode(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
