"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";

type Props = {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  footer?: React.ReactNode;
  emailLabel?: string;
  passwordLabel?: string;
  pendingLabel?: string;
  processingLabel?: string;
};

export function AuthForm({
  action,
  submitLabel,
  footer,
  emailLabel = "Email",
  passwordLabel = "Password",
  pendingLabel = "Processing...",
  processingLabel,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mx-auto w-full max-w-md space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          {emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          {passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-rose-600 py-2.5 text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {pending ? (processingLabel ?? pendingLabel) : submitLabel}
      </button>
      {footer}
    </form>
  );
}
