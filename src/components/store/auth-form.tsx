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
  returnTo?: string;
};

export function AuthForm({
  action,
  submitLabel,
  footer,
  emailLabel = "Email",
  passwordLabel = "Password",
  pendingLabel = "Processing...",
  processingLabel,
  returnTo,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mx-auto w-full max-w-md space-y-4">
      {returnTo ? <input type="hidden" name="next" value={returnTo} /> : null}
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          {emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="text"
          inputMode="email"
          autoComplete="username"
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
        className="w-full rounded-lg bg-violet-700 py-2.5 text-white hover:bg-violet-800 disabled:opacity-50"
      >
        {pending ? (processingLabel ?? pendingLabel) : submitLabel}
      </button>
      {footer}
    </form>
  );
}
