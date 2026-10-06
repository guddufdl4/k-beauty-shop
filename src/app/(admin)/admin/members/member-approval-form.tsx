"use client";

import { useActionState, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
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

export function MemberApprovalForm({ children, selectableCount, adminId, canAssignStaff }: { children: ReactNode; selectableCount: number; adminId: string; canAssignStaff: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const storageKey = `hmt-member-selection:${adminId}`;
  const snapshot = useSyncExternalStore(subscribe, () => readSelection(storageKey), () => "[]");
  const selectedIds = parseSelection(snapshot);
  const selectedCount = selectedIds.length;
  const [state, formAction, pending] = useActionState<{ error?: string; success?: string }, FormData>(async (_previous, data) => {
    try {
      const result = await setBusinessApproval(data);
      saveSelection(storageKey, []);
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
    <form ref={formRef} action={formAction} className="mt-4" onChange={() => updateSelection()}>
      {selectedIds.map((id) => <input key={id} type="hidden" name="member_id" value={id} />)}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending || selectableCount === 0} onClick={() => updateSelection(true)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">현재 페이지 전체 선택</button>
        <button type="button" disabled={pending || selectedCount === 0} onClick={() => saveSelection(storageKey, [])} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">전체 선택 해제</button>
        <span className="text-sm text-zinc-500" aria-live="polite">전체 페이지에서 {selectedCount}명 선택</span>
        <button name="decision" value="approve" disabled={pending || selectedCount === 0} className="rounded-lg bg-violet-700 px-4 py-2 text-sm text-white disabled:opacity-40">{pending ? "처리 중…" : "선택 회원 승인"}</button>
        <button name="decision" value="revoke" disabled={pending || selectedCount === 0} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">선택 회원 승인 취소</button>
        <label className="flex items-center gap-2 text-sm">회원 등급
          <select name="grade" defaultValue="normal" disabled={pending} className="rounded-lg border bg-white px-3 py-2">
            <option value="normal">일반회원</option><option value="vip">VIP</option>
            {canAssignStaff ? <option value="members">회원관리 담당자</option> : null}
          </select>
        </label>
        <button name="decision" value="grade" disabled={pending || selectedCount === 0} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40">선택 회원 등급 변경</button>
      </div>
      <p className="mb-3 text-xs text-zinc-500">VIP 등급과 사업자 승인은 별도입니다. 회원관리 담당자는 대시보드 조회·회원관리만 가능하며, 담당자 지정·해제는 관리자만 가능합니다.</p>
      <p className="mb-3 text-xs text-zinc-500">페이지 이동·검색 후에도 선택이 유지됩니다. 승인 버튼은 모든 페이지에서 선택한 회원에게 적용됩니다.</p>
      {state.error ? <p role="alert" className="mb-3 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p role="status" className="mb-3 text-sm text-green-700">{state.success}</p> : null}
      <fieldset disabled={pending}>{children}</fieldset>
    </form>
  );
}
