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
  const headlines = { ko: ["잠시 쉬어가는 시간.", "더 나은 HMT로 돌아옵니다."], en: ["A little pause.", "A better HMT."], ja: ["少しだけお休み。", "より良いHMTへ。"], zh: ["短暂休息。", "更好的 HMT。"] };
  const [pause, better] = headlines[locale];
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${copy.title} | HMT</title><link rel="icon" href="/icon.png"><style>
*{box-sizing:border-box}body{margin:0;color:#24173d;font-family:system-ui,-apple-system,sans-serif;background:radial-gradient(ellipse at 50% 34%,#e9dcff 0%,#f5efff 44%,#fbf9ff 80%);min-height:100dvh;display:flex;flex-direction:column}header{width:min(1120px,100%);margin:0 auto;padding:28px 32px;display:flex;align-items:center;gap:20px}.brand{font-family:Georgia,serif;font-size:38px;letter-spacing:1px;color:#26163f;font-weight:700}.tagline{font-size:9px;letter-spacing:2.2px;line-height:1.7;font-weight:600}main{width:min(760px,100%);margin:auto;text-align:center;padding:0 24px 32px}.art{display:block;width:min(370px,85%);height:246px;object-fit:contain;margin:0 auto 12px;filter:drop-shadow(0 12px 28px #8b5cf618)}h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(31px,5vw,49px);line-height:1.07;font-weight:500;letter-spacing:-1.3px;margin:8px 0 20px}h1 span{display:block;color:#6d28d9}.description{font-size:15px;line-height:1.8;color:#65537d;max-width:580px;margin:0 auto 24px;white-space:pre-wrap;overflow-wrap:anywhere}.pill{display:inline-block;background:#e7d9ff;border:1px solid #dcc8ff;border-radius:99px;padding:9px 22px;color:#5b21b6;font-size:11px;font-weight:650;letter-spacing:1.5px}.end{font-size:13px;color:#65537d;margin:16px 0 22px;line-height:1.7}.end strong{color:#4c2c74;font-weight:500}.primary{display:inline-flex;align-items:center;justify-content:center;min-width:230px;min-height:48px;padding:12px 30px;border-radius:99px;background:linear-gradient(115deg,#7c3aed,#5b21b6);color:white;font-weight:600;font-size:14px;text-decoration:none;box-shadow:0 7px 20px #6d28d929}.primary:hover{background:#5b21b6}.admin{display:block;width:max-content;margin:22px auto 0;padding:8px;font-size:11px;color:#79678f;text-decoration:underline;text-underline-offset:4px}footer{text-align:center;padding:12px 24px 24px;color:#8b79a3;font-size:9px;letter-spacing:2px}a:focus-visible{outline:3px solid #a78bfa;outline-offset:5px}@media(max-width:480px){header{padding:22px 24px}.brand{font-size:31px}.tagline{font-size:8px}.art{height:210px}main{padding:6px 20px 24px}h1{font-size:32px;letter-spacing:-.7px}.description{font-size:14px}}html[lang=ko] h1,html[lang=ja] h1,html[lang=zh] h1{font-family:system-ui,sans-serif;font-weight:650;font-size:clamp(27px,4vw,37px);line-height:1.35}
</style></head><body><header><div class="brand">HMT</div><div class="tagline">K-BEAUTY<br>WHOLESALE PARTNER</div></header><main><img class="art" src="/maintenance/boxes.webp" alt="" width="370" height="246"><h1>${pause}<span>${better}</span></h1><p class="description">${escape(settings.message || copy.description)}</p><div class="pill">${copy.title}</div><p class="end">${end ? `${copy.end}<br><strong>${escape(end)}</strong>` : ""}</p><a class="primary" href="/${locale}">${copy.refresh} &nbsp; →</a><a class="admin" href="/${locale}/login?next=%2Fadmin">${copy.login}</a></main><footer>KOREAN BEAUTY · A BRIGHTER TOMORROW TOGETHER</footer></body></html>`;
}
