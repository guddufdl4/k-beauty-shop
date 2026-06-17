"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";

type Props = {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  defaultNickname?: string | null;
};

export function NicknameForm({ action, defaultNickname }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mx-auto w-full max-w-md space-y-4">
      <div>
        <label htmlFor="nickname" className="block text-sm font-medium">
          닉네임
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          required
          maxLength={30}
          defaultValue={defaultNickname ?? ""}
          placeholder="헤더에 표시될 이름"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-zinc-500">
          고객 계정은 이 닉네임이 헤더에 표시됩니다.
        </p>
      </div>
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-green-600">{state.success}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-rose-600 py-2.5 text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {pending ? "저장 중…" : "닉네임 저장"}
      </button>
    </form>
  );
}
