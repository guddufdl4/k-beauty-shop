import { createServiceClient } from "@/lib/supabase/service";

export const VISITOR_COOKIE = "hmt_vid";

const BOT_UA =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|bytespider|gptbot|claudebot/i;

export type VisitDayStat = {
  date: string;
  visitors: number;
  views: number;
};

export type VisitChartPoint = {
  key: string;
  label: string;
  dateLabel: string | null;
  visitors: number;
  views: number;
};

export type StorefrontVisitStats = {
  todayVisitors: number;
  todayViews: number;
  yesterdayVisitors: number;
  last7Days: VisitDayStat[];
  last24Hours: VisitChartPoint[];
  last7DaysChart: VisitChartPoint[];
  available: boolean;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function seoulYmd(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function seoulDayStartIso(ymd: string): string {
  return `${ymd}T00:00:00+09:00`;
}

export function shiftSeoulYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day) + days * 24 * 60 * 60 * 1000;
  const shifted = new Date(utc);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

const SEOUL_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function seoulHourParts(date: Date): { ymd: string; hour: number; key: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const ymd = `${year}-${month}-${day}`;
  return { ymd, hour, key: `${ymd}T${pad(hour)}` };
}

export function formatVisitHourLabel(hour: number): string {
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${hour12}`;
}

export function formatVisitChartDate(ymd: string): string {
  const [, month, day] = ymd.split("-");
  return `${Number(month)}.${Number(day)}.`;
}

export function formatVisitDayLabel(ymd: string, today = seoulYmd()): string {
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) {
    return ymd;
  }
  const weekday = SEOUL_WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "";
  const readable = `${month}월 ${day}일 (${weekday})`;
  if (ymd === today) {
    return `오늘 · ${readable}`;
  }
  if (ymd === shiftSeoulYmd(today, -1)) {
    return `어제 · ${readable}`;
  }
  return `${year}년 ${readable}`;
}

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent && BOT_UA.test(userAgent));
}

export function normalizeVisitPath(raw: string | null | undefined): string | null {
  const path = String(raw ?? "").split("?")[0]?.trim() || "";
  if (!path.startsWith("/")) {
    return null;
  }
  if (
    path.startsWith("/admin") ||
    path.startsWith("/api") ||
    path.startsWith("/auth") ||
    path.includes("/_next")
  ) {
    return null;
  }
  return path.slice(0, 300);
}

function localeFromPath(path: string): string | null {
  const match = path.match(/^\/(en|ko|ja|zh)(?:\/|$)/);
  return match?.[1] ?? null;
}

export async function recordStorefrontVisit(input: {
  path: string;
  visitorKey: string;
}): Promise<boolean> {
  const path = normalizeVisitPath(input.path);
  const visitorKey = input.visitorKey.trim().slice(0, 80);
  if (!path || !visitorKey) {
    return false;
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return false;
  }

  const since = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("storefront_visits")
    .select("id")
    .eq("visitor_key", visitorKey)
    .eq("path", path)
    .gte("visited_at", since)
    .limit(1);

  if (recent?.length) {
    return true;
  }

  const { error } = await supabase.from("storefront_visits").insert({
    path,
    locale: localeFromPath(path),
    visitor_key: visitorKey,
  });

  if (error) {
    return false;
  }
  return true;
}

function emptyStats(available: boolean): StorefrontVisitStats {
  return {
    todayVisitors: 0,
    todayViews: 0,
    yesterdayVisitors: 0,
    last7Days: [],
    last24Hours: [],
    last7DaysChart: [],
    available,
  };
}

export async function getStorefrontVisitStats(): Promise<StorefrontVisitStats> {
  const supabase = createServiceClient();
  if (!supabase) {
    return emptyStats(false);
  }

  const today = seoulYmd();
  const start = shiftSeoulYmd(today, -6);
  const { data, error } = await supabase
    .from("storefront_visits")
    .select("visited_at, visitor_key")
    .gte("visited_at", seoulDayStartIso(start))
    .limit(20000);

  if (error) {
    return emptyStats(false);
  }

  const byDay = new Map<string, { visitors: Set<string>; views: number }>();
  for (let offset = 0; offset < 7; offset += 1) {
    const date = shiftSeoulYmd(start, offset);
    byDay.set(date, { visitors: new Set(), views: 0 });
  }

  for (const row of data ?? []) {
    const visitedAt = String((row as { visited_at?: string }).visited_at ?? "");
    const visitorKey = String((row as { visitor_key?: string }).visitor_key ?? "");
    if (!visitedAt || !visitorKey) {
      continue;
    }
    const date = seoulYmd(new Date(visitedAt));
    const bucket = byDay.get(date);
    if (!bucket) {
      continue;
    }
    bucket.views += 1;
    bucket.visitors.add(visitorKey);
  }

  const yesterday = shiftSeoulYmd(today, -1);
  const last7Days: VisitDayStat[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = shiftSeoulYmd(start, offset);
    const bucket = byDay.get(date)!;
    last7Days.push({
      date,
      visitors: bucket.visitors.size,
      views: bucket.views,
    });
  }

  const last7DaysChart: VisitChartPoint[] = [...last7Days].map((day) => ({
    key: day.date,
    label: day.date === today ? "오늘" : day.date === yesterday ? "어제" : formatVisitChartDate(day.date),
    dateLabel: formatVisitChartDate(day.date),
    visitors: day.visitors,
    views: day.views,
  }));

  last7Days.reverse();

  const byHour = new Map<string, { visitors: Set<string>; views: number; ymd: string; hour: number }>();
  const now = new Date();
  for (let offset = 23; offset >= 0; offset -= 1) {
    const parts = seoulHourParts(new Date(now.getTime() - offset * 60 * 60 * 1000));
    byHour.set(parts.key, { visitors: new Set(), views: 0, ymd: parts.ymd, hour: parts.hour });
  }

  for (const row of data ?? []) {
    const visitedAt = String((row as { visited_at?: string }).visited_at ?? "");
    const visitorKey = String((row as { visitor_key?: string }).visitor_key ?? "");
    if (!visitedAt || !visitorKey) {
      continue;
    }
    const parts = seoulHourParts(new Date(visitedAt));
    const bucket = byHour.get(parts.key);
    if (!bucket) {
      continue;
    }
    bucket.views += 1;
    bucket.visitors.add(visitorKey);
  }

  const last24Hours: VisitChartPoint[] = [];
  let previousYmd = "";
  for (const bucket of byHour.values()) {
    last24Hours.push({
      key: `${bucket.ymd}T${pad(bucket.hour)}`,
      label: formatVisitHourLabel(bucket.hour),
      dateLabel: previousYmd !== bucket.ymd ? formatVisitChartDate(bucket.ymd) : null,
      visitors: bucket.visitors.size,
      views: bucket.views,
    });
    previousYmd = bucket.ymd;
  }

  return {
    todayVisitors: byDay.get(today)?.visitors.size ?? 0,
    todayViews: byDay.get(today)?.views ?? 0,
    yesterdayVisitors: byDay.get(yesterday)?.visitors.size ?? 0,
    last7Days,
    last24Hours,
    last7DaysChart,
    available: true,
  };
}
