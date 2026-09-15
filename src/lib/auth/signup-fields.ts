export const SIGNUP_CURRENCIES = ["USD", "KRW"] as const;
export type SignupCurrency = (typeof SIGNUP_CURRENCIES)[number];

export const SIGNUP_COUNTRIES: { code: string; name: string }[] = [
  { code: "KR", name: "South Korea" },
  { code: "US", name: "United States" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "TW", name: "Taiwan" },
  { code: "HK", name: "Hong Kong" },
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

const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{2,29}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParsedSignupInput = {
  countryCode: string;
  companyName: string;
  email: string;
  fullName: string;
  username: string;
  password: string;
  preferredCurrency: SignupCurrency;
};

export type SignupFormErrorKey =
  | "countryRequired"
  | "companyRequired"
  | "emailInvalid"
  | "nameRequired"
  | "usernameInvalid"
  | "passwordWeak"
  | "passwordMismatch"
  | "currencyRequired";

export function parseSignupForm(formData: FormData): ParsedSignupInput | { errorKey: SignupFormErrorKey } {
  const countryCode = String(formData.get("country_code") ?? "").trim().toUpperCase();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const preferredCurrency = String(formData.get("preferred_currency") ?? "").trim().toUpperCase();

  if (!SIGNUP_COUNTRIES.some((country) => country.code === countryCode)) {
    return { errorKey: "countryRequired" };
  }
  if (companyName.length < 2 || companyName.length > 200) {
    return { errorKey: "companyRequired" };
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 200) {
    return { errorKey: "emailInvalid" };
  }
  if (fullName.length < 2 || fullName.length > 80) {
    return { errorKey: "nameRequired" };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { errorKey: "usernameInvalid" };
  }
  if (password.length < 8 || password.length > 72) {
    return { errorKey: "passwordWeak" };
  }
  if (password !== passwordConfirm) {
    return { errorKey: "passwordMismatch" };
  }
  if (!SIGNUP_CURRENCIES.includes(preferredCurrency as SignupCurrency)) {
    return { errorKey: "currencyRequired" };
  }

  return {
    countryCode,
    companyName,
    email,
    fullName,
    username,
    password,
    preferredCurrency: preferredCurrency as SignupCurrency,
  };
}

export function looksLikeEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}
