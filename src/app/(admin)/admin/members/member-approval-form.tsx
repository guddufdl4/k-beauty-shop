"use client";

import { useRef, useState, type ReactNode } from "react";
import { setBusinessApproval } from "@/app/actions/members";

export function MemberApprovalForm({ children, selectableCount }: { children: ReactNode; selectableCount: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  function updateSelection(selectAll?: boolean) {
    const boxes = formRef.current?.querySelectorAll<HTMLInputElement>('input[name="member_id"]');
    let count = 0;
    boxes?.forEach((box) => {
      if (selectAll !== undefined) box.checked = selectAll;
      if (box.checked) count += 1;
    });
    setSelectedCount(count);
  }

  return (
    <form ref={formRef} action={setBusinessApproval} className="mt-4" onChange={() => updateSelection()} onReset={() => setSelectedCount(0)}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={selectableCount === 0} onClick={() => updateSelection(true)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">현재 페이지 전체 선택</button>
        <button type="button" disabled={selectedCount === 0} onClick={() => updateSelection(false)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">선택 해제</button>
        <span className="text-sm text-zinc-500" aria-live="polite">{selectedCount}명 선택</span>
        <button name="decision" value="approve" disabled={selectedCount === 0} className="rounded-lg bg-violet-700 px-4 py-2 text-sm text-white disabled:opacity-40">선택 회원 승인</button>
        <button name="decision" value="revoke" disabled={selectedCount === 0} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">선택 회원 승인 취소</button>
      </div>
      {children}
    </form>
  );
}
