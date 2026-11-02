/**
 * Phone normalization for NexTalk (E.164, no mask).
 *
 * Two input shapes exist in `patients.phone`, and both must keep working:
 *
 * 1. Legacy rows (saved before the Entrega 1 phone validation): digits-only,
 *    no `+`, no DDI, assumed Brazilian — min 10 / max 11 digits.
 *      - 11 digits: DDD + 9 + 8-digit subscriber (modern format, has the 9th
 *        digit).
 *      - 10 digits, subscriber starts with 6/7/8/9: legacy mobile, missing
 *        the 9th digit. Search BOTH variants (with 9 first, per the PDF's
 *        documented search order), create using the WITH-9 variant.
 *      - 10 digits, subscriber starts with 2-5: landline. Single variant,
 *        no 9-insertion — landlines never had a 9th digit.
 * 2. New rows (saved by the country-aware /dados phone field): full E.164,
 *    leading `+`.
 *      - `+55...`: same BR dual-variant logic as above, applied to the
 *        national significant number (digits after the `+55`).
 *      - Any other country code: NexTalk has no 9th-digit concept outside
 *        Brazil — single variant, used as-is.
 *
 * Anything that fits neither shape is invalid; the caller alerts instead of
 * sending.
 */

export interface PhoneVariants {
  /** Preferred E.164 form — used for creating a new contact, tried first in search. */
  primary: string;
  /** Alternate E.164 form to search if `primary` isn't found. Absent for landlines. */
  fallback?: string;
}

const MOBILE_LEGACY_PREFIXES = new Set(["6", "7", "8", "9"]);

/** BR dual-variant logic, shared by legacy digits-only input and +55 E.164 input. */
function brVariantsFromNationalNumber(digits: string): PhoneVariants | null {
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const subscriber = digits.slice(2); // 9 digits
    const primary = `+55${digits}`;
    // Only offer a fallback if it actually looks like a 9-prefixed mobile —
    // don't blindly strip a digit from something that isn't one.
    const fallback = subscriber[0] === "9" ? `+55${ddd}${subscriber.slice(1)}` : undefined;
    return { primary, fallback };
  }

  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const subscriber = digits.slice(2); // 8 digits
    const firstDigit = subscriber[0];

    if (MOBILE_LEGACY_PREFIXES.has(firstDigit)) {
      // Legacy mobile missing the 9th digit: primary = with 9 inserted
      // (search first, and used if we need to create the contact),
      // fallback = as-stored (search second).
      return {
        primary: `+55${ddd}9${subscriber}`,
        fallback: `+55${digits}`,
      };
    }

    // Landline pattern (starts with 2-5) — single variant, no dual search.
    return { primary: `+55${digits}` };
  }

  return null;
}

/** E.164 total length (country code + national number) is capped at 15 digits (ITU). */
const E164_RE = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneToVariants(rawPhone: string): PhoneVariants | null {
  const trimmed = rawPhone.trim();

  if (trimmed.startsWith("+")) {
    if (!E164_RE.test(trimmed)) return null;

    if (trimmed.startsWith("+55")) {
      return brVariantsFromNationalNumber(trimmed.slice(3));
    }

    // Non-Brazilian E.164 — no 9th-digit concept, single variant as-is.
    return { primary: trimmed };
  }

  // Legacy shape: digits-only (possibly masked), assumed Brazilian.
  const digits = trimmed.replace(/\D/g, "");
  return brVariantsFromNationalNumber(digits);
}

/** Ordered list of variants to try when searching NexTalk for an existing contact. */
export function searchOrder(variants: PhoneVariants): string[] {
  return variants.fallback ? [variants.primary, variants.fallback] : [variants.primary];
}

const MEET_LINK_PATTERN = /^https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})$/i;

/** Extracts just the code portion (e.g. "abc-defg-hij") for the button's `parameter`. */
export function extractMeetCode(meetLink: string | null | undefined): string | null {
  if (!meetLink) return null;
  const match = MEET_LINK_PATTERN.exec(meetLink.trim());
  return match ? match[1] : null;
}

export function isValidMeetLink(meetLink: string | null | undefined): boolean {
  return extractMeetCode(meetLink) !== null;
}
