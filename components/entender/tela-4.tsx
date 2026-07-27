"use client";

import { BackLink } from "./back-link";
import { CopyCard } from "./copy-card";
import { ButtonsPair } from "./buttons-pair";
import { CONFIANCA_TITLE, CONFIANCA_PARAGRAPHS } from "@/lib/entender/copy";

interface Props {
  duvidaBlocks: { question: string; paragraphs: string[] }[];
  onBack: () => void;
  onAgendar: () => void;
  onAbrirWhatsApp: () => void;
}

export function Tela4({ duvidaBlocks, onBack, onAgendar, onAbrirWhatsApp }: Props) {
  return (
    <div className="space-y-8">
      <BackLink onClick={onBack} />

      {duvidaBlocks.map((block) => (
        <CopyCard key={block.question} title={block.question} paragraphs={block.paragraphs} />
      ))}

      <CopyCard title={CONFIANCA_TITLE} paragraphs={CONFIANCA_PARAGRAPHS} />

      <ButtonsPair
        tela={4}
        destino="whatsapp"
        onAgendar={onAgendar}
        onAbrirWhatsApp={onAbrirWhatsApp}
      />
    </div>
  );
}
