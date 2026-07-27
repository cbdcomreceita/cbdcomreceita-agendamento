"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/brand/header";
import { Footer } from "@/components/sections/footer";
import { WhatsAppButton } from "@/components/brand/whatsapp-button";
import { CookieBanner } from "@/components/brand/cookie-banner";
import { Tela1 } from "@/components/entender/tela-1";
import { Tela2 } from "@/components/entender/tela-2";
import { Tela3 } from "@/components/entender/tela-3";
import { Tela4 } from "@/components/entender/tela-4";
import { trackEvent } from "@/lib/analytics/track";
import { saveEntenderRespostas, type EntenderRespostas } from "@/lib/entender/storage";
import {
  SINTOMA_CHIPS,
  MICRO_TEXTS,
  FECHO_COMUM,
  DUVIDA_OPTIONS,
  DUVIDA_BLOCKS,
  buildWhatsAppUrl,
  buildEntenderWhatsAppMessage,
  type ParaQuem,
  type DuvidaId,
  type MicroGroupId,
} from "@/lib/entender/copy";

type Step = "tela1" | "tela2" | "tela3" | "tela4";

function firstMicroGroup(selected: string[]): MicroGroupId | null {
  for (const chip of SINTOMA_CHIPS) {
    if (selected.includes(chip.id) && chip.microGroup) return chip.microGroup;
  }
  return null;
}

export default function EntenderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("tela1");

  const [paraQuem, setParaQuem] = useState<ParaQuem>();
  const [sintomasSelecionados, setSintomasSelecionados] = useState<string[]>([]);
  const [duvidasSelecionadas, setDuvidasSelecionadas] = useState<DuvidaId[]>([]);
  const [outroTexto, setOutroTexto] = useState("");

  useEffect(() => {
    trackEvent({ name: "entender_started" });
  }, []);

  function toggleSintoma(id: string) {
    setSintomasSelecionados((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleDuvida(id: DuvidaId) {
    setDuvidasSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  function handleTela1Continue() {
    trackEvent({ name: "entender_sintomas", sintomas: sintomasSelecionados.join(",") });
    setStep("tela2");
  }

  function handleTela3Continue() {
    trackEvent({ name: "entender_duvidas", duvidas: duvidasSelecionadas.join(",") });
    setStep("tela4");
  }

  function handleAgendar() {
    const respostas: EntenderRespostas = {
      para_quem: paraQuem ?? "mim",
      sintomas: sintomasSelecionados.flatMap(
        (id) => SINTOMA_CHIPS.find((c) => c.id === id)?.triagemSlugs ?? []
      ),
      duvidas: duvidasSelecionadas,
    };
    saveEntenderRespostas(respostas);
    router.push("/triagem");
  }

  function handleAbrirWhatsApp() {
    const message = buildEntenderWhatsAppMessage({
      sintomasLabels: sintomasSelecionados
        .map((id) => SINTOMA_CHIPS.find((c) => c.id === id)?.label ?? "")
        .filter(Boolean),
      outroTexto,
    });
    window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  }

  const microGroup = firstMicroGroup(sintomasSelecionados);
  const cbdParagraphs = microGroup ? [...MICRO_TEXTS[microGroup], FECHO_COMUM] : [FECHO_COMUM];
  const duvidaBlocks = DUVIDA_OPTIONS.filter((opt) => duvidasSelecionadas.includes(opt.id)).map(
    (opt) => DUVIDA_BLOCKS[opt.id]
  );

  return (
    <>
      <Header />
      <main id="conteudo-principal" className="flex flex-1 flex-col pt-24 sm:pt-28">
        <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {step === "tela1" && (
                <Tela1
                  paraQuem={paraQuem}
                  onParaQuem={setParaQuem}
                  sintomasSelecionados={sintomasSelecionados}
                  onToggleSintoma={toggleSintoma}
                  onContinue={handleTela1Continue}
                />
              )}

              {step === "tela2" && (
                <Tela2
                  cbdParagraphs={cbdParagraphs}
                  onBack={() => setStep("tela1")}
                  onAgendar={handleAgendar}
                  onIrParaDuvidas={() => setStep("tela3")}
                />
              )}

              {step === "tela3" && (
                <Tela3
                  selecionadas={duvidasSelecionadas}
                  onToggle={toggleDuvida}
                  outroTexto={outroTexto}
                  onOutroTextoChange={setOutroTexto}
                  onBack={() => setStep("tela2")}
                  onContinue={handleTela3Continue}
                />
              )}

              {step === "tela4" && (
                <Tela4
                  duvidaBlocks={duvidaBlocks}
                  onBack={() => setStep("tela3")}
                  onAgendar={handleAgendar}
                  onAbrirWhatsApp={handleAbrirWhatsApp}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieBanner />
    </>
  );
}
