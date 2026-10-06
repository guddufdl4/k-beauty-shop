import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export const SIGNUP_CURRENCIES = ["USD", "KRW"] as const;
export type SignupCurrency = (typeof SIGNUP_CURRENCIES)[number];

export const SIGNUP_COUNTRIES: { code: string; name: string }[] = [
  { code: "KR", name: "South Korea" },
  { code: "US", name: "United States" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "TW", name: "Taiwan" },
  { code: "HK", name: "Hong Kong" },
  { code: "MO", name: "Macau (Macao)" },
  { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "PL", name: "Poland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "PT", name: "Portugal" },
  { code: "CZ", name: "Czechia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" },
  { code: "KW", name: "Kuwait" },
  { code: "IL", name: "Israel" },
  { code: "TR", name: "Turkiye" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "EG", name: "Egypt" },
  { code: "RU", name: "Russia" },
  { code: "UA", name: "Ukraine" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "MN", name: "Mongolia" },
];

const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i;

export function callingCode(country: string): string {
  return `+${getCountryCallingCode(country as CountryCode)}`;
}

function validIdentity(value: string, maxLength: number): boolean {
  return value.length >= 2 && value.length <= maxLength && /\p{L}/u.test(value)
    && !/[\p{Cc}<>]/u.test(value) && !/^(.)\1+$/u.test(value.replace(/\s/g, ""))
    && !/^(test|testing|dummy|asdf|qwerty|n\/?a|none|null|undefined|테스트|없음)$/i.test(value);
}

export type ParsedSignupInput = {
  countryCode: string;
  phoneNumber: string;
  companyName: string;
  email: string;
  fullName: string;
  password: string;
  preferredCurrency: SignupCurrency;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
};

export type SignupFormErrorKey =
  | "phoneInvalid"
  | "countryRequired"
  | "companyRequired"
  | "emailInvalid"
  | "nameRequired"
  | "passwordWeak"
  | "passwordMismatch"
  | "currencyRequired"
  | "consentRequired";

export function parseSignupForm(formData: FormData): ParsedSignupInput | { errorKey: SignupFormErrorKey } {
  const countryCode = String(formData.get("country_code") ?? "").trim().toUpperCase();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const preferredCurrency = String(formData.get("preferred_currency") ?? "").trim().toUpperCase();
  const acceptedTerms = formData.get("accept_terms") === "on" || formData.get("accept_terms") === "true";
  const acceptedPrivacy =
    formData.get("accept_privacy") === "on" || formData.get("accept_privacy") === "true";

  if (!SIGNUP_COUNTRIES.some((country) => country.code === countryCode)) {
    return { errorKey: "countryRequired" };
  }
  if (!validIdentity(companyName, 200)) {
    return { errorKey: "companyRequired" };
  }
  if (!looksLikeEmail(email) || email.length > 200) {
    return { errorKey: "emailInvalid" };
  }
  if (!validIdentity(fullName, 80)) {
    return { errorKey: "nameRequired" };
  }
  const phoneCountry = String(formData.get("phone_country") ?? "").trim().toUpperCase();
  const phoneInput = String(formData.get("phone_number") ?? "").trim();
  if (!SIGNUP_COUNTRIES.some((country) => country.code === phoneCountry) || !/^[0-9 ()+.-]{6,30}$/.test(phoneInput)) return { errorKey: "phoneInvalid" };
  const phone = parsePhoneNumberFromString(phoneInput, phoneCountry as CountryCode);
  if (!phone?.isValid() || phone.country !== phoneCountry) return { errorKey: "phoneInvalid" };
  if (!["MOBILE", "FIXED_LINE_OR_MOBILE"].includes(phone.getType() ?? "")) return { errorKey: "phoneInvalid" };
  if (password.length < 8 || password.length > 72) {
    return { errorKey: "passwordWeak" };
  }
  if (password !== passwordConfirm) {
    return { errorKey: "passwordMismatch" };
  }
  if (!SIGNUP_CURRENCIES.includes(preferredCurrency as SignupCurrency)) {
    return { errorKey: "currencyRequired" };
  }
  if (!acceptedTerms || !acceptedPrivacy) {
    return { errorKey: "consentRequired" };
  }

  return {
    countryCode,
    phoneNumber: phone.number,
    companyName,
    email,
    fullName,
    password,
    preferredCurrency: preferredCurrency as SignupCurrency,
    acceptedTerms,
    acceptedPrivacy,
  };
}

export function looksLikeEmail(value: string): boolean {
  const email = value.trim();
  const local = email.split("@")[0];
  return EMAIL_PATTERN.test(email) && local.length <= 64 && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..");
}

export function isSignupPasswordStrong(password: string): boolean {
  return password.length >= 8 && password.length <= 72;
}
