export function calculateAge(birthDate: string | Date): number {
  const bd = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (isNaN(bd.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  const m = now.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
  return age;
}
