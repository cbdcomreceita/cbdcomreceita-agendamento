/**
 * Baseline (2026-11): 100% of real payments confirm within ~4 minutes of
 * PIX creation (see scripts/funnel-snapshot.ts) — 120 is generous
 * headroom, not a guess. Kept as an env var instead of a constant so it
 * can be retuned without a deploy if that distribution shifts.
 *
 * Lives in its own plain module (not generate-pix.ts) because that file
 * has "use server" — every export from a Server Actions file must be an
 * async function, and this needs to be called synchronously from the
 * /pagamento page and the WhatsApp reminder template too.
 */
export function getPixExpirationMinutes(): number {
  const raw = Number(process.env.PIX_EXPIRATION_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 120;
}
