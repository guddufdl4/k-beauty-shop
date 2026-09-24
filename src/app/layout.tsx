import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";

import { locales, type AppLocale } from "@/i18n/routing";
import { PUBLIC_STORE_NAME } from "@/lib/site-url";

import "./globals.css";

/** Set by next-intl middleware (`HEADER_LOCALE_NAME` in next-intl@4.13.0). */
const NEXT_INTL_LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

function resolveDocumentLang(headerValue: string | null | undefined): AppLocale {
  if (headerValue && (locales as readonly string[]).includes(headerValue)) {
    return headerValue as AppLocale;
  }

  return "en";
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const googleVerification =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  title: PUBLIC_STORE_NAME,
  description:
    "HMT KOREA supplies authentic Korean cosmetics and K-Beauty products to wholesale buyers worldwide.",
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const lang = resolveDocumentLang(headerStore.get(NEXT_INTL_LOCALE_HEADER));

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
