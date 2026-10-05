"use client";

import { useActionState, useMemo, useState } from "react";
import type { AuthState } from "@/app/actions/auth";
import { resendSignupConfirmation } from "@/app/actions/auth";
import { callingCode, SIGNUP_COUNTRIES, SIGNUP_CURRENCIES, isSignupPasswordStrong } from "@/lib/auth/signup-fields";
import { Link } from "@/i18n/navigation";

type Props = {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  returnTo?: string;
  labels: {
    phone: string;
    phoneHint: string;
    phoneCountry: string;
    country: string;
    company: string;
    companyHint: string;
    email: string;
    emailHint: string;
    name: string;
    password: string;
    passwordHint: string;
    passwordConfirm: string;
    passwordMatch: string;
    passwordMismatch: string;
    currency: string;
    acceptTerms: string;
    acceptPrivacy: string;
    terms: string;
    privacy: string;
    submit: string;
    pending: string;
    benefitsTitle: string;
    benefitPrices: string;
    benefitMoq: string;
    benefitQuotes: string;
    resend: string;
    resendPending: string;
  };
  footer?: React.ReactNode;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-violet-700 focus:outline-none focus:ring-1 focus:ring-violet-700";

export function SignupForm({ action, returnTo, labels, footer }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [resendState, resendAction, resendPending] = useActionState(resendSignupConfirmation, {});
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("KR");
  const [email, setEmail] = useState("");

  const passwordOk = isSignupPasswordStrong(password);
  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const canSubmit = passwordOk && passwordsMatch;

  const statusText = useMemo(() => {
    if (!passwordConfirm) {
      return "";
    }
    return passwordsMatch ? labels.passwordMatch : labels.passwordMismatch;
  }, [labels.passwordMatch, labels.passwordMismatch, passwordConfirm, passwordsMatch]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <ul className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-700">
        <li className="font-semibold text-zinc-900">{labels.benefitsTitle}</li>
        <li className="mt-2">• {labels.benefitPrices}</li>
        <li>• {labels.benefitMoq}</li>
        <li>• {labels.benefitQuotes}</li>
      </ul>

      <form action={formAction} className="space-y-5">
        {returnTo ? <input type="hidden" name="next" value={returnTo} /> : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="country_code" className="block text-sm font-medium">
              {labels.country} <span className="text-violet-700">*</span>
            </label>
            <select id="country_code" name="country_code" required defaultValue="" onChange={(event) => setPhoneCountry(event.target.value)} className={fieldClass}>
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
            <label htmlFor="company_name" className="block text-sm font-medium">
              {labels.company} <span className="text-violet-700">*</span>
            </label>
            <p id="company_name-hint" className="mt-1 text-xs text-zinc-500">
              {labels.companyHint}
            </p>
            <input
              id="company_name"
              name="company_name"
              type="text"
              required
              maxLength={200}
              autoComplete="organization"
              aria-describedby="company_name-hint"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium">
              {labels.name} <span className="text-violet-700">*</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              maxLength={80}
              autoComplete="name"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              {labels.email} <span className="text-violet-700">*</span>
            </label>
            <p id="email-hint" className="mt-1 text-xs text-zinc-500">
              {labels.emailHint}
            </p>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              aria-describedby="email-hint"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="phone_number" className="block text-sm font-medium">{labels.phone} <span className="text-violet-700">*</span></label>
            <p id="phone-hint" className="mt-1 text-xs text-zinc-500">{labels.phoneHint}</p>
            <div className="flex gap-2">
              <select name="phone_country" aria-label={labels.phoneCountry} value={phoneCountry} onChange={(event) => setPhoneCountry(event.target.value)} className={`${fieldClass} max-w-56`}>
                {SIGNUP_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name} ({callingCode(country.code)})</option>)}
              </select>
              <input id="phone_number" name="phone_number" type="tel" inputMode="tel" autoComplete="tel-national" required minLength={6} maxLength={30} aria-describedby="phone-hint" className={fieldClass} />
            </div>
          </div>
          <div>
            <label htmlFor="preferred_currency" className="block text-sm font-medium">
              {labels.currency} <span className="text-violet-700">*</span>
            </label>
            <div className="mt-2 flex gap-4 text-sm">
              {SIGNUP_CURRENCIES.map((currency) => (
                <label key={currency} htmlFor={`currency-${currency}`} className="inline-flex items-center gap-2">
                  <input
                    id={`currency-${currency}`}
                    type="radio"
                    name="preferred_currency"
                    value={currency}
                    defaultChecked={currency === "USD"}
                    required
                    className="accent-violet-700"
                  />
                  {currency}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              {labels.password} <span className="text-violet-700">*</span>
            </label>
            <p id="password-hint" className="mt-1 text-xs text-zinc-500">
              {labels.passwordHint}
            </p>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              aria-describedby="password-hint password-status"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="password_confirm" className="block text-sm font-medium">
              {labels.passwordConfirm} <span className="text-violet-700">*</span>
            </label>
            <input
              id="password_confirm"
              name="password_confirm"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              aria-describedby="password-status"
              aria-invalid={passwordConfirm.length > 0 && !passwordsMatch}
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className={fieldClass}
            />
            <p id="password-status" className="mt-1 text-xs text-zinc-600" aria-live="polite">
              {statusText}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <label htmlFor="accept_terms" className="flex items-start gap-2">
            <input id="accept_terms" name="accept_terms" type="checkbox" required className="mt-1 accent-violet-700" />
            <span>
              {labels.acceptTerms}{" "}
              <Link href="/terms" className="font-medium text-violet-700 underline">
                {labels.terms}
              </Link>
            </span>
          </label>
          <label htmlFor="accept_privacy" className="flex items-start gap-2">
            <input id="accept_privacy" name="accept_privacy" type="checkbox" required className="mt-1 accent-violet-700" />
            <span>
              {labels.acceptPrivacy}{" "}
              <Link href="/privacy" className="font-medium text-violet-700 underline">
                {labels.privacy}
              </Link>
            </span>
          </label>
        </div>

        {state.error ? (
          <p className="text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-green-700" role="status">
            {state.success}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="w-full rounded-lg bg-violet-700 py-2.5 text-white hover:bg-violet-800 disabled:opacity-50 sm:w-auto sm:px-10"
        >
          {pending ? labels.pending : labels.submit}
        </button>
      </form>

      {state.success ? (
        <form action={resendAction} className="space-y-2">
          <input type="hidden" name="email" value={email} />
          {returnTo ? <input type="hidden" name="next" value={returnTo} /> : null}
          <button
            type="submit"
            disabled={resendPending || !email}
            className="text-sm font-medium text-violet-700 underline disabled:opacity-50"
          >
            {resendPending ? labels.resendPending : labels.resend}
          </button>
          {resendState.error ? (
            <p className="text-sm text-red-700" role="alert">
              {resendState.error}
            </p>
          ) : null}
          {resendState.success ? (
            <p className="text-sm text-green-700" role="status">
              {resendState.success}
            </p>
          ) : null}
        </form>
      ) : null}
      {footer}
    </div>
  );
}
