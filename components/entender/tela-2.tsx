"use client";

import { BackLink } from "./back-link";
import { CopyCard } from "./copy-card";
import { ButtonsPair } from "./buttons-pair";
import { ABERTURA_PARAGRAPHS, CBD_BLOCK_TITLE } from "@/lib/entender/copy";

interface Props {
  cbdParagraphs: string[];
  onBack: () => void;
  onAgendar: () => void;
  onIrParaDuvidas: () => void;
}

export function Tela2({ cbdParagraphs, onBack, onAgendar, onIrParaDuvidas }: Props) {
  return (
    <div className="space-y-8">
      <BackLink onClick={onBack} />
      <CopyCard paragraphs={ABERTURA_PARAGRAPHS} />
      <CopyCard title={CBD_BLOCK_TITLE} paragraphs={cbdParagraphs} />
      <ButtonsPair
        tela={2}
        destino="duvidas"
        onAgendar={onAgendar}
        onIrParaDuvidas={onIrParaDuvidas}
      />
    </div>
  );
}
