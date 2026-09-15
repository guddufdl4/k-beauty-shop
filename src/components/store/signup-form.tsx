"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";
import { SIGNUP_COUNTRIES, SIGNUP_CURRENCIES } from "@/lib/auth/signup-fields";

type Props = {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  labels: {
    country: string;
    company: string;
    companyHint: string;
    email: string;
    emailHint: string;
    name: string;
    username: string;
    usernameHint: string;
    password: string;
    passwordConfirm: string;
    currency: string;
    submit: string;
    pending: string;
  };
  footer?: React.ReactNode;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500";

export function SignupForm({ action, labels, footer }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mx-auto w-full max-w-3xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="country_code" className="block text-sm font-medium">
            {labels.country} <span className="text-rose-600">*</span>
          </label>
          <select id="country_code" name="country_code" required defaultValue="" className={fieldClass}>
            <option value="" disabled>
              {labels.country}
            </option>
            {SIGNUP_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="preferred_currency" className="block text-sm font-medium">
            {labels.currency} <span className="text-rose-600">*</span>
          </label>
          <div className="mt-2 flex gap-4 text-sm">
            {SIGNUP_CURRENCIES.map((currency) => (
              <label key={currency} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="preferred_currency"
                  value={currency}
                  defaultChecked={currency === "USD"}
                  required
                  className="accent-rose-600"
                />
                {currency}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="company_name" className="block text-sm font-medium">
            {labels.company} <span className="text-rose-600">*</span>
          </label>
          <p className="mt-1 text-xs text-zinc-500">{labels.companyHint}</p>
          <input id="company_name" name="company_name" type="text" required maxLength={200} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            {labels.email} <span className="text-rose-600">*</span>
          </label>
          <p className="mt-1 text-xs text-zinc-500">{labels.emailHint}</p>
          <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium">
            {labels.name} <span className="text-rose-600">*</span>
          </label>
          <input id="full_name" name="full_name" type="text" required maxLength={80} autoComplete="name" className={fieldClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="username" className="block text-sm font-medium">
            {labels.username} <span className="text-rose-600">*</span>
          </label>
          <p className="mt-1 text-xs text-zinc-500">{labels.usernameHint}</p>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={30}
            autoComplete="username"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            {labels.password} <span className="text-rose-600">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="password_confirm" className="block text-sm font-medium">
            {labels.passwordConfirm} <span className="text-rose-600">*</span>
          </label>
          <input
            id="password_confirm"
            name="password_confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={fieldClass}
          />
        </div>
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-rose-600 py-2.5 text-white hover:bg-rose-700 disabled:opacity-50 sm:w-auto sm:px-10"
      >
        {pending ? labels.pending : labels.submit}
      </button>
      {footer}
    </form>
  );
}
