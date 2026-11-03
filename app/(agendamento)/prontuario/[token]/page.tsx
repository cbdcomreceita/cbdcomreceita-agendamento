import type { Metadata } from "next";
import { ProntuarioClient } from "@/components/fluxo/prontuario-client";

// Carrega dados sensíveis de paciente por token — nunca deve ser indexado
// nem aparecer em busca, mesmo que alguém encontre o link por engano.
export const metadata: Metadata = {
  title: "Complete seu prontuário | CBD com Receita",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProntuarioTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ProntuarioClient token={token} />;
}
