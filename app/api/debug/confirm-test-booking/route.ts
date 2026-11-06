import { NextRequest, NextResponse } from "next/server";
import { confirmBooking } from "@/app/actions/confirm-booking";

/**
 * Rota de debug temporária — Entrega "prontuário paciente vs responsável",
 * item 4 (validação no Preview sem pagamento real). Chama confirmBooking
 * diretamente, sem esperar um webhook real do Mercado Pago, para um booking
 * cujo payment já foi marcado "approved" manualmente. Removida depois da
 * validação (mesmo padrão já usado várias vezes nesta sessão).
 */
export async function POST(req: NextRequest) {
  const { bookingId } = await req.json();
  if (!bookingId) return NextResponse.json({ error: "bookingId obrigatório" }, { status: 400 });

  const result = await confirmBooking({ bookingId, source: "webhook" });
  return NextResponse.json(result);
}
