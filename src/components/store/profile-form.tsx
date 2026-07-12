"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ProfileState } from "@/app/actions/profile";

type Props = {
  action: (prev: ProfileState, formData: FormData) => Promise<ProfileState>;
  defaultFullName?: string | null;
};

export function ProfileForm({ action, defaultFullName }: Props) {
  const t = useTranslations("account");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium">
          {t("nickname")}
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          maxLength={50}
          defaultValue={defaultFullName ?? ""}
          placeholder={t("nicknamePlaceholder")}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-zinc-500">{t("nicknameHint")}</p>
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
        className="rounded-lg bg-rose-600 px-4 py-2.5 text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {pending ? t("nicknameSaving") : t("nicknameSave")}
      </button>
    </form>
  );
}
