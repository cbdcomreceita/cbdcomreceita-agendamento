import { parsePhoneNumberFromString } from "libphonenumber-js";

export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskBrDigits(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

/**
 * Display-only formatting. Two input shapes (see lib/whatsapp/phone.ts for
 * why both exist): legacy digits-only BR numbers get the classic
 * "(11) 99999-8888" mask; E.164 (`+...`) is reformatted via
 * libphonenumber-js — "(11) 99999-8888" for +55, "INTERNATIONAL" style
 * (e.g. "+1 202 555 1234") for everything else. Falls back to the raw
 * value if libphonenumber-js can't parse it.
 */
export function maskPhone(value: string): string {
  if (value.trim().startsWith("+")) {
    const parsed = parsePhoneNumberFromString(value);
    if (!parsed) return value;
    if (parsed.country === "BR") return maskBrDigits(parsed.nationalNumber);
    return parsed.formatInternational();
  }
  return maskBrDigits(value.replace(/\D/g, ""));
}

export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

export function unmask(value: string): string {
  return value.replace(/\D/g, "");
}
