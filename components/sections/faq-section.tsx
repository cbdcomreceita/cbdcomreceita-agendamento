"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Section } from "@/components/ui/section";
import { FadeUp } from "@/components/ui/motion";
import { faqItems } from "@/data/faq";

export function FaqSection() {
  return (
    <Section id="duvidas" bg="cream" narrow>
      <FadeUp>
        <h2 className="text-center text-2xl font-bold tracking-tight text-brand-forest-dark sm:text-3xl lg:text-4xl">
          Perguntas frequentes
        </h2>
      </FadeUp>

      <FadeUp delay={0.15}>
        <Accordion className="mt-12">
          {faqItems.map((item, i) => (
            <AccordionItem
              key={i}
              className="border-brand-sand/80"
              data-track="faq_item_clicked"
              data-track-label={item.question}
            >
              <AccordionTrigger className="text-left text-base font-semibold text-brand-forest-dark hover:text-brand-forest hover:no-underline py-5 [&[data-state=open]]:text-brand-forest">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-[1.8] text-brand-text-secondary sm:text-base">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </FadeUp>
    </Section>
  );
}

/** JSON-LD FAQPage schema — rendered in page head */
export function FaqJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }),
      }}
    />
  );
}
