/**
 * Diagnostic script — NOT part of the app, not imported from anywhere.
 * Guardado para testar orchestrateConfirmation diretamente (fora do caminho
 * real de produção), contra um booking_id cujo paciente use um número que
 * nunca teve contato/conversa na NexTalk.
 *
 * Uso (a partir da raiz do repo):
 *   npx tsx scripts/test-nextalk-new-contact.ts <bookingId>
 *
 * O que faz:
 *  - Carrega .env.local manualmente (sem exigir dependência nova).
 *  - Define WHATSAPP_DISPATCH_MODE=inline só no processo deste script (não
 *    mexe em .env.local nem na Vercel) — evita depender de um round-trip do
 *    QStash de volta pro deploy para verificar entrega; o próprio script
 *    confere direto na NexTalk.
 *  - Aborta (sem tentar de novo) se já existir linha em notifications_log
 *    para o booking_id, se o status final vier "failed", ou se qualquer
 *    chamada lançar erro.
 *  - Imprime a linha completa de notifications_log (incluindo
 *    provider_response bruto de contato e conversa), o GET
 *    /conversations/{id}/messages bruto, e o GET /kanban_items/{id} bruto.
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
process.env.WHATSAPP_DISPATCH_MODE = "inline";

async function main() {
  const bookingId = process.argv[2];
  if (!bookingId) {
    console.error("uso: npx tsx scripts/test-nextalk-new-contact.ts <bookingId>");
    process.exit(1);
  }

  const { createServiceClient } = await import("@/lib/supabase/server");
  const { orchestrateConfirmation } = await import("@/lib/whatsapp/orchestrate-confirmation");
  const { nextalkGet } = await import("@/lib/whatsapp/nextalk-client");

  const supabase = createServiceClient();

  const { data: before } = await supabase
    .from("notifications_log")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("channel", "whatsapp")
    .eq("type", "booking_confirmation")
    .maybeSingle();

  if (before) {
    console.error(
      `ABORTANDO: já existe uma linha em notifications_log (id=${before.id}) para este booking_id. ` +
        "Isso não deveria acontecer para um agendamento novo — pare e investigue antes de continuar."
    );
    process.exit(1);
  }

  console.log(
    `Nenhuma linha prévia em notifications_log para booking_id=${bookingId} — reserva será nova (isNew=true), sem risco de pulo por idempotência.`
  );
  console.log("Chamando orchestrateConfirmation...");

  await orchestrateConfirmation(bookingId);

  const { data: row, error } = await supabase
    .from("notifications_log")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("channel", "whatsapp")
    .eq("type", "booking_confirmation")
    .single();

  if (error || !row) {
    console.error("Nenhuma linha encontrada em notifications_log após a chamada — algo abortou antes do reserveNotification.", error);
    process.exit(1);
  }

  console.log("\n=== notifications_log ===");
  console.log(JSON.stringify(row, null, 2));

  if (row.status === "failed") {
    console.error("\nSTATUS = failed. Parando aqui, sem tentar de novo, conforme combinado.");
    process.exit(1);
  }

  if (row.nextalk_conversation_display_id && row.nextalk_message_id) {
    console.log("\nAguardando 15s antes de checar o status de entrega na NexTalk...");
    await new Promise((r) => setTimeout(r, 15000));
    const messagesBody = await nextalkGet<unknown>(`/conversations/${row.nextalk_conversation_display_id}/messages`);
    console.log("\n=== GET /conversations/{id}/messages (bruto) ===");
    console.log(JSON.stringify(messagesBody, null, 2));
  }

  if (row.nextalk_kanban_card_id) {
    const card = await nextalkGet<unknown>(`/kanban_items/${row.nextalk_kanban_card_id}`);
    console.log("\n=== GET /kanban_items/{id} (bruto) ===");
    console.log(JSON.stringify(card, null, 2));
  }
}

main().catch((err) => {
  console.error("Erro inesperado no script de teste:", err);
  process.exit(1);
});
