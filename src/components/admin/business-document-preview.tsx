"use client";

import { useRef, useState } from "react";

export function BusinessDocumentPreview({ userId, fileName, compact = false }: { userId: string; fileName: string; compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const [failed, setFailed] = useState(false);
  const pdf = /\.pdf$/i.test(fileName);
  const source = `/api/account/business-document?user=${encodeURIComponent(userId)}&preview=1`;
  return <>
    <button type="button" className={compact ? "inline-flex min-h-11 items-center rounded-xl border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700" : "block w-40 overflow-hidden rounded-xl border border-violet-200 bg-white text-left hover:border-violet-500"} onClick={() => { setOpened(true); dialog.current?.showModal(); }} aria-label={`사업자 증빙 크게 보기: ${fileName}`}>
      {compact ? "증빙 보기" : <>{pdf ? <span className="flex h-24 items-center justify-center bg-violet-50 font-semibold text-violet-700">PDF 문서 보기</span> : failed ? <span className="flex h-24 items-center justify-center text-zinc-500">미리보기 열기</span> : /* eslint-disable-next-line @next/next/no-img-element */
        <img src={source} alt="제출된 사업자 증빙" loading="lazy" referrerPolicy="no-referrer" className="h-24 w-full object-contain" onError={() => setFailed(true)} />}
      <span className="block px-3 py-2 font-semibold text-violet-700">클릭하여 크게 보기</span>
      </>}
    </button>
    <dialog ref={dialog} className="fixed inset-0 m-auto h-[90vh] w-[94vw] max-w-5xl rounded-2xl border border-zinc-200 bg-white p-0 shadow-xl backdrop:bg-black/50" onClose={() => setOpened(false)}>
      <div className="flex items-center justify-between gap-4 border-b p-4">
        <h2 className="truncate text-base font-semibold">사업자 증빙 · {fileName}</h2>
        <button type="button" className="shrink-0 rounded-lg border px-4 py-2 text-sm" onClick={() => dialog.current?.close()}>닫기</button>
      </div>
      {opened ? <div className="h-[calc(100%_-_5rem)] overflow-auto bg-zinc-50 p-3">
        {pdf ? <iframe src={source} title="사업자 증빙 PDF 미리보기" referrerPolicy="no-referrer" className="h-full min-h-96 w-full rounded-lg bg-white" /> : /* eslint-disable-next-line @next/next/no-img-element */
          <img src={source} alt="사업자 증빙 원본" referrerPolicy="no-referrer" className="mx-auto h-auto max-w-full" />}
      </div> : null}
    </dialog>
  </>;
}
