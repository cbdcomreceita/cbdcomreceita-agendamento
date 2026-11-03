import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export const DEFAULT_COUNTRY: CountryCode = "BR";

export interface CountryOption {
  code: CountryCode;
  name: string;
  callingCode: string;
}

const displayNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });

/** Brasil first (pre-selected), rest alphabetical by Portuguese name. */
export const COUNTRY_OPTIONS: CountryOption[] = (() => {
  const options = getCountries().map((code) => ({
    code,
    name: displayNames.of(code) ?? code,
    callingCode: getCountryCallingCode(code),
  }));
  const brazil = options.find((o) => o.code === DEFAULT_COUNTRY)!;
  const rest = options
    .filter((o) => o.code !== DEFAULT_COUNTRY)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return [brazil, ...rest];
})();

/**
 * Strips a pasted +55/55 (or 0055) prefix before validating a Brazilian
 * number, so copy-pasting the number with the country code doesn't get
 * misread as extra subscriber digits.
 */
function stripBrDialPrefix(digits: string): string {
  if (digits.length === 13 && digits.startsWith("55")) return digits.slice(2);
  if (digits.length === 15 && digits.startsWith("0055")) return digits.slice(4);
  return digits;
}

/**
 * Brazil-specific rule, stricter than libphonenumber-js's own validity
 * check (which accepts landlines too): exactly 11 digits, DDD valid, and
 * the subscriber number must start with 9 (mobile). A 10-digit landline is
 * rejected outright, per product decision — this flow only works over
 * WhatsApp.
 */
function validateBr(raw: string): string | null {
  const digits = stripBrDialPrefix(raw.replace(/\D/g, ""));
  if (digits.length !== 11 || digits[2] !== "9") return null;
  const e164 = `+55${digits}`;
  return isValidPhoneNumber(e164, "BR") ? e164 : null;
}

function validateForeign(raw: string, country: CountryCode): string | null {
  if (!isValidPhoneNumber(raw, country)) return null;
  const parsed = parsePhoneNumberFromString(raw, country);
  return parsed?.number ?? null;
}

/** Returns the E.164 form if valid for the given country, or null. */
export function toE164(raw: string, country: CountryCode): string | null {
  if (!raw.trim()) return null;
  return country === "BR" ? validateBr(raw) : validateForeign(raw, country);
}

export function isValidPhoneForCountry(raw: string, country: CountryCode): boolean {
  return toE164(raw, country) !== null;
}

export function phoneErrorMessage(country: CountryCode): string {
  return country === "BR"
    ? "Confira o número com DDD. Exemplo: (11) 98765-4321."
    : "Confira o número para o país selecionado.";
}
