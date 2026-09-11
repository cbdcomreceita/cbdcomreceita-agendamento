import {
  NEXTALK_FUNNEL_ID,
  NEXTALK_OFFER_DESCRIPTION,
  NEXTALK_OFFER_ID,
  NEXTALK_TARGET_STAGE,
  stagePosition,
} from "./config";
import { nextalkGet, nextalkPatch, nextalkPostCreate } from "./nextalk-client";
import type { KanbanAction, NextalkKanbanItem, NextalkKanbanListResponse, NextalkOffer } from "./types";

export interface KanbanContext {
  patientFullName: string;
  dateBR: string;
  timeH: string;
  doctorName: string;
  conversationDisplayId: number;
  amountPaid: number; // reais, e.g. 49.9 — coupon-aware, already the amount actually charged
}

export interface KanbanResult {
  action: KanbanAction;
  cardId: number;
}

function buildOffer(amountPaid: number): NextalkOffer {
  return {
    id: NEXTALK_OFFER_ID,
    description: NEXTALK_OFFER_DESCRIPTION,
    value: amountPaid.toFixed(2),
    default: true,
    manual: false,
    product_link: "",
    image_url: null,
    offer_group_id: null,
    offer_group_name: null,
    currency: { symbol: "R$", code: "BRL", locale: "pt-BR" },
  };
}

function buildDescription(ctx: KanbanContext): string {
  return `Consulta confirmada para ${ctx.dateBR} às ${ctx.timeH} com ${ctx.doctorName} (site)`;
}

async function createCard(ctx: KanbanContext): Promise<KanbanResult> {
  const created = await nextalkPostCreate<NextalkKanbanItem>("/kanban_items", {
    kanban_item: {
      funnel_id: NEXTALK_FUNNEL_ID,
      funnel_stage: NEXTALK_TARGET_STAGE,
      position: 1,
      item_details: {
        title: ctx.patientFullName,
        description: buildDescription(ctx),
        status: "open",
        priority: "medium",
        conversation_id: ctx.conversationDisplayId,
        offers: [buildOffer(ctx.amountPaid)],
      },
    },
  });
  return { action: "created", cardId: created.id };
}

/**
 * GET-merge-PATCH the offer onto an existing card, then move it to the
 * target stage. PATCH replaces item_details wholesale, so we always read
 * the current card first and only append the offer if it isn't already
 * there (never blindly overwrite the existing offers array).
 */
async function addOfferAndMove(cardId: number, ctx: KanbanContext): Promise<void> {
  const current = await nextalkGet<NextalkKanbanItem>(`/kanban_items/${cardId}`);
  const hasOffer = current.item_details.offers.some((o) => o.id === NEXTALK_OFFER_ID);
  const offers = hasOffer ? current.item_details.offers : [...current.item_details.offers, buildOffer(ctx.amountPaid)];

  await nextalkPatch(`/kanban_items/${cardId}`, {
    kanban_item: {
      item_details: {
        ...current.item_details,
        offers,
      },
    },
  });

  await nextalkPostCreate(`/kanban_items/${cardId}/move_to_stage`, {
    funnel_stage: NEXTALK_TARGET_STAGE,
    funnel_id: NEXTALK_FUNNEL_ID,
  });
}

/**
 * Passo 5 — positions the card in the funnel per the decision table:
 *  - no card                              → create in consulta_agendada
 *  - card at prospeccao/qualificacao/
 *    pagto_consulta (before our stage)    → add offer + move to consulta_agendada
 *  - card already at consulta_agendada    → leave untouched
 *  - card past consulta_agendada          → create a NEW card, leave the old one alone
 *
 * Runs even if the message send failed, as long as a conversation exists —
 * callers should invoke this independently of message-send outcome.
 */
export async function upsertKanbanCard(ctx: KanbanContext): Promise<KanbanResult> {
  const list = await nextalkGet<NextalkKanbanListResponse>(
    `/kanban_items?conversation=${ctx.conversationDisplayId}`
  );
  const card = list.items[0];

  if (!card) {
    return createCard(ctx);
  }

  const currentPos = stagePosition(card.funnel_stage);
  const targetPos = stagePosition(NEXTALK_TARGET_STAGE);

  if (currentPos === targetPos) {
    return { action: "unchanged", cardId: card.id };
  }

  if (currentPos < targetPos) {
    await addOfferAndMove(card.id, ctx);
    return { action: "moved", cardId: card.id };
  }

  // currentPos > targetPos: card is further along (negociação/pagamento de
  // produtos/fechamento) — don't touch it, open a fresh confirmation card.
  const result = await createCard(ctx);
  return { ...result, action: "new_card_after_later_stage" };
}
