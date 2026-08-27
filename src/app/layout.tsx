import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";

import { locales, type AppLocale } from "@/i18n/routing";

import "./globals.css";

/** Set by next-intl middleware (`HEADER_LOCALE_NAME` in next-intl@4.13.0). */
const NEXT_INTL_LOCALE_HEADER = "X-NEXT-INTL-LOCALE";

function resolveDocumentLang(headerValue: string | null | undefined): AppLocale | "ko" {
  if (headerValue && (locales as readonly string[]).includes(headerValue)) {
    return headerValue as AppLocale;
  }

  return "ko";
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "K-Beauty Shop",
  description: "K-뷰티 수출 이커머스 — 스킨케어·메이크업 B2B·B2C",
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
