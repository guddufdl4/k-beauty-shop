"use client";
import { useState } from "react";
import type { MaintenanceSettings } from "@/lib/maintenance";
function kstInput(value: string | null) { return value ? new Date(Date.parse(value) + 9 * 60 * 60 * 1000).toISOString().slice(0, 16) : ""; }
export function MaintenanceSettingsForm({ initialSettings }: { initialSettings: MaintenanceSettings }) {
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [message, setMessage] = useState(initialSettings.message);
  const [end, setEnd] = useState(kstInput(initialSettings.expectedEnd));
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setStatus(""); setError("");
    try {
      const response = await fetch("/api/admin/maintenance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, message, expectedEnd: end ? new Date(`${end}:00+09:00`).toISOString() : null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "점검 설정을 저장하지 못했습니다.");
      setStatus(enabled ? "점검 모드가 켜졌습니다. 고객에게 점검 화면이 표시됩니다." : "점검 모드가 꺼졌습니다. 사이트가 정상 운영됩니다.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "저장에 실패했습니다."); }
    finally { setPending(false); }
  }
  return <form onSubmit={save} className="mb-8 space-y-4 rounded-2xl border border-violet-200 bg-white p-6 shadow-sm">
    <div><h2 className="text-lg font-semibold">사이트 점검 모드</h2><p className="mt-1 text-sm text-zinc-500">ON이면 고객 화면과 회원가입·견적 제출이 중지됩니다. 관리자는 로그인해 점검할 수 있습니다.</p></div>
    <fieldset disabled={pending} className="space-y-4">
      <label className="flex items-center gap-3 font-medium"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} className="size-5 accent-violet-700" />점검 모드 {enabled ? "ON" : "OFF"}</label>
      <div><label htmlFor="maintenance-mode-message" className="block text-sm font-medium">고객 안내 문구 (선택)</label><textarea id="maintenance-mode-message" value={message} onChange={event => setMessage(event.target.value)} maxLength={2000} rows={3} placeholder="비워 두면 고객 언어에 맞는 기본 점검 안내를 표시합니다." className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></div>
      <div><label htmlFor="maintenance-mode-end" className="block text-sm font-medium">예상 종료 시간 (한국 시간, 선택)</label><input id="maintenance-mode-end" type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} className="mt-1 rounded-lg border px-3 py-2 text-sm" /><p className="mt-1 text-xs text-zinc-500">시간은 안내용입니다. 점검 완료 후 OFF로 바꾸고 저장해 주세요.</p></div>
      <button className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white">{pending ? "저장 중…" : "점검 설정 저장"}</button>
    </fieldset>
    {status ? <p role="status" className="text-sm text-green-700">{status}</p> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
  </form>;
}
