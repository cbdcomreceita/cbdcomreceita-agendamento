/**
 * Read-only baseline report — NOT part of the app, not imported anywhere.
 * Run before Entrega 1 lands, so we have a "before" number to compare
 * conversion against afterward.
 *
 * Uso (a partir da raiz do repo):
 *   npx tsx scripts/funnel-snapshot.ts [dias]
 *
 * Métricas (últimos N dias, default 30), uma única consulta a payments
 * joined com bookings, agrupada por (patient_id, scheduled_at) — cada
 * paciente+horário conta uma vez, mesmo que o refresh bug de
 * create-booking.ts tenha gerado múltiplos bookings/payments para o
 * mesmo slot:
 *   - PIX gerados: grupos com pelo menos 1 payment.
 *   - Pagos: grupos com pelo menos 1 payment status='approved'.
 *   - Expirados: grupos sem payment aprovado e com pelo menos 1
 *     payment status='expired' (hoje deve dar 0 — não existe cron de
 *     expiração ainda; ver nota no relatório).
 *   - Conversão: pagos / gerados.
 *   - Distribuição de tempo-até-pagamento (paid_at - created_at) para os
 *     payments com status='approved', em baldes fixos — usada para
 *     calibrar PIX_EXPIRATION_MINUTES antes de ativá-lo.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

interface PaymentRow {
  status: string;
  created_at: string;
  paid_at: string | null;
  booking_id: string;
  bookings: {
    patient_id: string;
    scheduled_at: string;
  } | null;
}

const TIME_TO_PAY_BUCKETS = [
  { label: "até 10 min", maxMinutes: 10 },
  { label: "10-30 min", maxMinutes: 30 },
  { label: "30-60 min", maxMinutes: 60 },
  { label: "1-2h", maxMinutes: 120 },
  { label: "2-6h", maxMinutes: 360 },
  { label: "6-24h", maxMinutes: 1440 },
  { label: ">24h", maxMinutes: Infinity },
];

function bucketLabel(minutes: number): string {
  for (const b of TIME_TO_PAY_BUCKETS) {
    if (minutes <= b.maxMinutes) return b.label;
  }
  return ">24h";
}

async function main() {
  const days = Number(process.argv[2] ?? "30");
  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = createServiceClient();

  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("payments")
    .select("status, created_at, paid_at, booking_id, bookings(patient_id, scheduled_at)")
    .gte("created_at", sinceIso);

  if (error) {
    console.error("Erro ao consultar payments:", error);
    process.exit(1);
  }

  const rows = (data ?? []) as unknown as PaymentRow[];

  type Group = { statuses: Set<string>; paymentCount: number; bookingIds: Set<string> };
  const groups = new Map<string, Group>();

  let skippedNoBooking = 0;
  for (const row of rows) {
    if (!row.bookings) {
      skippedNoBooking++;
      continue;
    }
    const key = `${row.bookings.patient_id}__${row.bookings.scheduled_at}`;
    const g = groups.get(key) ?? { statuses: new Set(), paymentCount: 0, bookingIds: new Set() };
    g.statuses.add(row.status);
    g.paymentCount++;
    g.bookingIds.add(row.booking_id);
    groups.set(key, g);
  }

  const totalGroups = groups.size;
  let paid = 0;
  let expiredNotPaid = 0;
  let pendingOnly = 0;
  let duplicateBookingGroups = 0;
  const totalPaymentRows = rows.length;

  for (const g of groups.values()) {
    const isPaid = g.statuses.has("approved");
    if (isPaid) paid++;
    else if (g.statuses.has("expired")) expiredNotPaid++;
    else pendingOnly++;
    if (g.bookingIds.size > 1) duplicateBookingGroups++;
  }

  const conversion = totalGroups > 0 ? (paid / totalGroups) * 100 : 0;

  console.log(`\n=== Funnel snapshot — últimos ${days} dias (baseline pré-Entrega 1) ===\n`);
  console.log(`Linhas de payments no período:        ${totalPaymentRows}`);
  if (skippedNoBooking > 0) {
    console.log(`  (payments sem booking via join:      ${skippedNoBooking} — ignorados)`);
  }
  console.log(`PIX gerados (paciente+horário único):  ${totalGroups}`);
  console.log(`  dos quais com >1 booking/payment:     ${duplicateBookingGroups}  (refresh duplicando /pagamento)`);
  console.log(`Pagos:                                  ${paid}`);
  console.log(`Expirados (sem pagamento aprovado):     ${expiredNotPaid}`);
  console.log(`Pendentes/outros (sem pago nem expirado):${pendingOnly}`);
  console.log(`Conversão PIX → pago:                   ${conversion.toFixed(1)}%`);
  console.log(
    `\nNota: "Expirados" depende de payments.status='expired', que hoje não é gravado por nenhum job ` +
      `(a expiração automática entra na Entrega 1). Um valor 0 aqui é esperado e correto como baseline.\n`
  );

  // Distribuição de tempo-até-pagamento, direto na linha de payment que
  // foi aprovada (não no grupo) — é o tempo real daquele código PIX
  // específico entre ser gerado e ser pago.
  const buckets = new Map<string, number>();
  let missingPaidAt = 0;
  let approvedCount = 0;
  for (const row of rows) {
    if (row.status !== "approved") continue;
    approvedCount++;
    if (!row.paid_at) {
      missingPaidAt++;
      continue;
    }
    const minutes = (new Date(row.paid_at).getTime() - new Date(row.created_at).getTime()) / 60000;
    const label = bucketLabel(minutes);
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }

  console.log(`=== Distribuição tempo-até-pagamento (payments status='approved', n=${approvedCount}) ===\n`);
  for (const b of TIME_TO_PAY_BUCKETS) {
    const count = buckets.get(b.label) ?? 0;
    const pct = approvedCount > 0 ? ((count / approvedCount) * 100).toFixed(1) : "0.0";
    console.log(`  ${b.label.padEnd(12)} ${String(count).padStart(3)}  (${pct}%)`);
  }
  if (missingPaidAt > 0) {
    console.log(`  (${missingPaidAt} payment(s) approved sem paid_at — não entraram na distribuição)`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
