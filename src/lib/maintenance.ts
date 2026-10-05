import { getPublicSupabaseConfig } from "@/lib/supabase/config";

export type MaintenanceSettings = { enabled: boolean; message: string; expectedEnd: string | null };
export const DEFAULT_MAINTENANCE: MaintenanceSettings = { enabled: false, message: "", expectedEnd: null };
export const MAINTENANCE_PATH = "maintenance.json";
export const MAINTENANCE_BUCKET = "site-config";

export function parseMaintenanceSettings(value: unknown): MaintenanceSettings | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.enabled !== "boolean" || typeof data.message !== "string" || data.message.length > 2000) return null;
  if (data.expectedEnd !== null && (typeof data.expectedEnd !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(data.expectedEnd) || !Number.isFinite(Date.parse(data.expectedEnd)))) return null;
  return { enabled: data.enabled, message: data.message.trim(), expectedEnd: data.expectedEnd === null ? null : new Date(data.expectedEnd as string).toISOString() };
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  const config = getPublicSupabaseConfig();
  if (!config) return DEFAULT_MAINTENANCE;
  try {
    // Bypass both Next's data cache and the storage CDN so OFF takes effect immediately.
    const response = await fetch(`${config.url}/storage/v1/object/public/${MAINTENANCE_BUCKET}/${MAINTENANCE_PATH}?v=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (response.status === 404 || response.status === 400) return DEFAULT_MAINTENANCE;
    if (!response.ok) throw new Error("Maintenance settings unavailable");
    const settings = parseMaintenanceSettings(await response.json());
    if (!settings) throw new Error("Invalid maintenance settings");
    return settings;
  } catch {
    // Do not accidentally close the store if the configuration service is unavailable.
    return DEFAULT_MAINTENANCE;
  }
}

export const MAINTENANCE_COPY = {
  ko: { title: "사이트 점검 중입니다", description: "더 나은 서비스를 위해 시스템을 점검하고 있습니다. 잠시 후 다시 방문해 주세요.", end: "예상 종료", login: "관리자 로그인", refresh: "다시 확인" },
  en: { title: "We’re undergoing maintenance", description: "We’re updating our systems to serve you better. Please check back shortly.", end: "Expected completion", login: "Administrator sign in", refresh: "Check again" },
  ja: { title: "ただいまメンテナンス中です", description: "サービス改善のためシステムを点検しています。しばらくしてから再度お越しください。", end: "終了予定", login: "管理者ログイン", refresh: "再確認" },
  zh: { title: "网站维护中", description: "我们正在进行系统维护，以提供更好的服务。请稍后再访问。", end: "预计结束时间", login: "管理员登录", refresh: "重新检查" },
};
export type MaintenanceLocale = keyof typeof MAINTENANCE_COPY;
export function maintenanceLocale(path: string): MaintenanceLocale {
  const locale = path.split("/")[1];
  return Object.hasOwn(MAINTENANCE_COPY, locale) ? locale as MaintenanceLocale : "en";
}
export function maintenanceExempt(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/admin/")
    || path === "/auth" || path.startsWith("/auth/") || path === "/api/stripe/webhook"
    || /^\/(?:en|ko|ja|zh)\/login\/?$/.test(path) || path === "/login";
}
function escape(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!)); }
export function maintenanceHtml(settings: MaintenanceSettings, locale: MaintenanceLocale): string {
  const copy = MAINTENANCE_COPY[locale];
  const end = settings.expectedEnd ? new Intl.DateTimeFormat(locale, { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(settings.expectedEnd)) + " (KST, UTC+9)" : "";
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${copy.title} | HMT</title><style>body{margin:0;background:#f7f7fb;color:#18181b;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}main{box-sizing:border-box;margin:24px;padding:48px 32px;max-width:620px;text-align:center;background:white;border:1px solid #e4e4e7;border-radius:24px;box-shadow:0 12px 40px #18181b08}h1{font-size:clamp(24px,5vw,34px)}p{line-height:1.8;color:#52525b;white-space:pre-wrap;overflow-wrap:anywhere}.brand{font-size:26px;font-weight:800;color:#6d28d9;letter-spacing:4px}.end{padding:12px;background:#f5f3ff;border-radius:12px}nav{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin-top:32px}a{color:#6d28d9;text-decoration:none;padding:10px 16px;border:1px solid #ddd6fe;border-radius:10px}</style></head><body><main><div class="brand">HMT</div><h1>${copy.title}</h1><p>${escape(settings.message || copy.description)}</p>${end ? `<p class="end">${copy.end}<br>${escape(end)}</p>` : ""}<nav><a href="/${locale}">${copy.refresh}</a><a href="/${locale}/login?next=%2Fadmin">${copy.login}</a></nav></main></body></html>`;
}
