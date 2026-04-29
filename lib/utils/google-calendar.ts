interface GoogleCalendarParams {
  doctorName: string;
  doctorCrm?: string;
  patientName?: string;
  startISO: string;
  endISO: string;
  durationLabel?: string;
  meetLink?: string;
}

function toGoogleCalendarDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

export function buildGoogleCalendarUrl(params: GoogleCalendarParams): string {
  const start = toGoogleCalendarDate(params.startISO);
  const end = toGoogleCalendarDate(params.endISO);

  const detailsLines = [
    "Consulta online via Google Meet",
    params.durationLabel ? `Duração: ${params.durationLabel}` : null,
    `Médico: ${params.doctorName}${params.doctorCrm ? ` — ${params.doctorCrm}` : ""}`,
    params.meetLink ? `Link: ${params.meetLink}` : null,
  ].filter(Boolean) as string[];

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  const title = params.patientName
    ? `Consulta ${params.patientName} : ${params.doctorName}`
    : `Consulta CBD com Receita — ${params.doctorName}`;
  url.searchParams.set("text", title);
  // dates= uses UTC with Z suffix; ctz tells Google to render the form
  // in São Paulo time so what the user sees matches the consultation time.
  url.searchParams.set("dates", `${start}/${end}`);
  url.searchParams.set("ctz", "America/Sao_Paulo");
  url.searchParams.set("details", detailsLines.join("\n"));
  url.searchParams.set("location", params.meetLink || "Google Meet");

  // URL.searchParams percent-encodes the slash separator inside `dates`
  // as %2F. Google Calendar's /render endpoint silently fails to parse
  // that and redirects to the workspace marketing page. Restore the
  // literal slash only inside the dates value — every other param is
  // fine encoded.
  return url
    .toString()
    .replace(/([?&]dates=[^&]+)%2F([^&]+)/i, "$1/$2");
}
