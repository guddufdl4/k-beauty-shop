"use client";

import { useState, useActionState, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { normalizeMemberDecision } from "@/lib/admin/member-form-data";
import { setBusinessApproval } from "@/app/actions/members";

const selectionEvent = "hmt-member-selection";
const memorySelection = new Map<string, string>();
function readSelection(key: string) {
  try { return sessionStorage.getItem(key) ?? memorySelection.get(key) ?? "[]"; }
  catch { return memorySelection.get(key) ?? "[]"; }
}
function saveSelection(key: string, ids: string[]) {
  const value = JSON.stringify(ids);
  memorySelection.set(key, value);
  try { sessionStorage.setItem(key, value); } catch { /* Keep selections in memory if storage is unavailable. */ }
  window.dispatchEvent(new Event(selectionEvent));
}
function subscribe(listener: () => void) {
  window.addEventListener(selectionEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(selectionEvent, listener);
    window.removeEventListener("storage", listener);
  };
}
function parseSelection(value: string): string[] {
  try {
    const ids: unknown = JSON.parse(value);
    return Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 2000) : [];
  } catch { return []; }
}

export function MemberApprovalForm({ children, selectableCount, adminId, canAssignStaff, canAssignAdmin }: { children: ReactNode; selectableCount: number; adminId: string; canAssignStaff: boolean; canAssignAdmin: boolean }) {
  const [grade, setGrade] = useState("normal");
  const [mobileGrade, setMobileGrade] = useState("normal");
  const formRef = useRef<HTMLFormElement>(null);
  const storageKey = `hmt-member-selection:${adminId}`;
  const snapshot = useSyncExternalStore(subscribe, () => readSelection(storageKey), () => "[]");
  const selectedIds = parseSelection(snapshot);
  const selectedCount = selectedIds.length;
  const [state, formAction, pending] = useActionState<{ error?: string; success?: string }, FormData>(async (_previous, data) => {
    try {
      const singleApprovalId = normalizeMemberDecision(data);
      const result = await setBusinessApproval(data);
      if ("error" in result) return { error: result.error };
      saveSelection(storageKey, typeof singleApprovalId === "string" && singleApprovalId ? parseSelection(readSelection(storageKey)).filter(id => id !== singleApprovalId) : []);
      return { success: `${result.updated}명에게 변경을 적용했습니다. 관리자와 권한 밖의 계정은 제외됩니다.` };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "승인 상태를 변경하지 못했습니다. 선택은 유지됩니다. 다시 시도해 주세요." };
    }
  }, {});

  useEffect(() => {
    const selected = new Set(parseSelection(snapshot));
    formRef.current?.querySelectorAll<HTMLInputElement>("input[data-member-id]").forEach((box) => {
      box.checked = selected.has(box.dataset.memberId!);
    });
  }, [snapshot, children]);

  function updateSelection(selectAll?: boolean) {
    const selected = new Set(parseSelection(readSelection(storageKey)));
    formRef.current?.querySelectorAll<HTMLInputElement>("input[data-member-id]").forEach((box) => {
      if (selectAll !== undefined) box.checked = selectAll;
      if (box.checked) selected.add(box.dataset.memberId!);
      else selected.delete(box.dataset.memberId!);
    });
    saveSelection(storageKey, [...selected]);
  }

  return (
    <form ref={formRef} action={formAction} className="member-manager-form mt-4 flex min-w-0 max-w-full flex-col" onChange={(event) => {
      const box = event.target;
      if (!(box instanceof HTMLInputElement) || !box.dataset.memberId) return;
      const selected = new Set(parseSelection(readSelection(storageKey)));
      if (box.checked) selected.add(box.dataset.memberId); else selected.delete(box.dataset.memberId);
      saveSelection(storageKey, [...selected]);
    }}>
      {canAssignAdmin && grade === "admin" ? <label className="mb-3 hidden rounded-xl border border-violet-200 bg-white p-4 text-sm md:order-2 md:block">관리자 지정 비밀번호<input name="admin_password" type="password" autoComplete="off" maxLength={128} className="mt-2 block min-h-11 w-full rounded-lg border border-zinc-200 px-3"/><span className="mt-2 block text-xs text-zinc-500">선택한 회원에게 주문·상품·사이트 설정을 포함한 관리자 권한을 부여합니다. 관리자 지정 권한은 마스터에게만 유지됩니다.</span></label> : null}
      {selectedIds.map((id) => <input key={id} type="hidden" name="member_id" value={id} />)}
      <div className="member-bulk-toolbar mb-3 hidden flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:order-2 md:flex">
        <button type="button" disabled={pending || selectableCount === 0} onClick={() => updateSelection(true)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">현재 페이지 전체 선택</button>
        <button type="button" disabled={pending || selectedCount === 0} onClick={() => saveSelection(storageKey, [])} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">전체 선택 해제</button>
        <span className="text-sm text-zinc-500" aria-live="polite">전체 페이지에서 {selectedCount}명 선택</span>
        <button name="decision" value="approve" disabled={pending || selectedCount === 0} className="rounded-lg bg-violet-700 px-4 py-2 text-sm text-white disabled:opacity-40">{pending ? "처리 중…" : "선택 회원 승인"}</button>
        <button name="decision" value="revoke" disabled={pending || selectedCount === 0} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">선택 회원 승인 취소</button>
        <label className="flex items-center gap-2 text-sm">회원 등급
          <select name="grade" value={grade} onChange={event=>setGrade(event.target.value)} disabled={pending} className="rounded-lg border bg-white px-3 py-2">
            <option value="normal">일반회원</option><option value="vip">VIP</option>
            {canAssignStaff ? <option value="members">회원관리 담당자</option> : null}{canAssignAdmin ? <option value="admin">관리자</option> : null}
          </select>
        </label>
        <button name="decision" value="grade" disabled={pending || selectedCount === 0} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40">선택 회원 등급 변경</button>
      </div>
      <p className="member-note mb-3 hidden text-xs text-zinc-500 md:order-3 md:block">사업자회원 변경은 증빙 제출 회원만 가능합니다. 서류의 진위 확인은 별도입니다. VIP 등급과 사업자 승인은 별도입니다. 회원관리 담당자는 대시보드 조회·회원관리·문의관리가 가능하며, 담당자 지정·해제는 관리자만 가능합니다.</p>
      <p className="member-note mb-3 hidden text-xs text-zinc-500 md:order-3 md:block">페이지 이동·검색 후에도 선택이 유지됩니다. 승인 버튼은 모든 페이지에서 선택한 회원에게 적용됩니다.</p>
      {state.error ? <p role="alert" className="mb-3 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p role="status" className="mb-3 text-sm text-green-700">{state.success}</p> : null}
      <div className="mb-3 flex items-center justify-between gap-2 md:hidden">
        <button type="button" disabled={pending || selectableCount === 0} onClick={() => updateSelection(true)} className="min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium disabled:opacity-40">현재 페이지 전체 선택</button>
        <span className="text-xs text-zinc-500" aria-live="polite">{selectedCount}명 선택</span>
      </div>
      {selectedCount > 0 ? <div className="fixed inset-x-0 bottom-[calc(4rem_+_env(safe-area-inset-bottom))] z-40 border-t border-violet-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] md:hidden" aria-label="선택 회원 일괄 처리">
        <div className="mb-3 flex items-center justify-between"><strong className="text-sm">{selectedCount}명 선택</strong><button type="button" onClick={() => saveSelection(storageKey,[])} disabled={pending} className="min-h-11 px-3 text-sm text-violet-700">선택 해제</button></div>
        <div className="flex items-start gap-2">
          <button name="decision" value="approve" disabled={pending} className="min-h-12 flex-1 rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white disabled:opacity-40">{pending ? '처리 중…' : '선택 회원 승인'}</button>
          <details className="flex-1 rounded-xl border border-violet-200 bg-white text-sm"><summary className="flex min-h-12 cursor-pointer items-center justify-center font-semibold text-violet-700">등급 변경 · 더보기</summary><div className="space-y-2 border-t border-zinc-100 p-3">
            <label className="block text-xs text-zinc-500">회원 등급<select name="mobile_grade" value={mobileGrade} onChange={event=>setMobileGrade(event.target.value)} disabled={pending} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-2 text-base"><option value="normal">일반회원</option><option value="vip">VIP</option>{canAssignStaff ? <option value="members">회원관리 담당자</option> : null}{canAssignAdmin ? <option value="admin">관리자</option> : null}</select></label>
            {canAssignAdmin && mobileGrade === "admin" ? <label className="block text-xs text-zinc-500">관리자 지정 비밀번호<input name="mobile_admin_password" type="password" autoComplete="off" maxLength={128} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-200 px-2 text-base"/></label> : null}
            <button name="decision" value="mobile-grade" disabled={pending} className="min-h-11 w-full rounded-lg bg-zinc-900 px-2 text-white">등급 적용</button>
            <button name="decision" value="revoke" disabled={pending} className="min-h-11 w-full rounded-lg border border-zinc-200 px-2 text-zinc-700">사업자 승인 취소</button>
          </div></details>
        </div>
      </div> : null}
      <fieldset disabled={pending} className="min-w-0 max-w-full md:order-1">{children}</fieldset>
    </form>
  );
}
