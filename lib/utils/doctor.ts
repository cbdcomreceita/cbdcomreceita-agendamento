/** Initials for the avatar fallback when photo_url is null. */
export function getDoctorInitials(name: string): string {
  const stripped = name.replace(/^(Dra?\.)\s+/i, "").trim();
  const parts = stripped.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (parts.length > 1 ? first + last : first).toUpperCase();
}
