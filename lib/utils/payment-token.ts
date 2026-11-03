/**
 * pix_pendente/pix_pendente2's button URL was registered on Meta with a
 * literal "{{1}}" baked in before the real placeholder (see
 * lib/whatsapp/config.ts), so the link WhatsApp actually sends is
 * ".../pagamento/{{1}}<token>" (or percent-encoded, depending on what
 * decodes the URL first). Stripping it here lets the existing broken
 * template keep working without a new Meta submission.
 */
export function stripPaymentTokenPrefix(raw: string): string {
  if (raw.startsWith("{{1}}")) return raw.slice(5);
  if (raw.toUpperCase().startsWith("%7B%7B1%7D%7D")) return raw.slice(13);
  return raw;
}
