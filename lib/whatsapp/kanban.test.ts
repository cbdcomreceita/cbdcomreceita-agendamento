import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextalkKanbanItem, NextalkKanbanListResponse } from "./types";

const nextalkGet = vi.fn();
const nextalkPatch = vi.fn();
const nextalkPostCreate = vi.fn();

vi.mock("./nextalk-client", () => ({
  nextalkGet: (...args: unknown[]) => nextalkGet(...args),
  nextalkPatch: (...args: unknown[]) => nextalkPatch(...args),
  nextalkPostCreate: (...args: unknown[]) => nextalkPostCreate(...args),
}));

const { upsertKanbanCard } = await import("./kanban");

const baseCtx = {
  patientFullName: "Maria Silva",
  dateBR: "12/09/2026",
  timeH: "14h30",
  doctorName: "Dra. Ana Costa",
  conversationDisplayId: 82,
  amountPaid: 49.9,
};

function cardAt(stage: string, id = 70): NextalkKanbanItem {
  return {
    id,
    funnel_id: 1,
    funnel_stage: stage,
    conversation_display_id: 82,
    item_details: {
      title: "Maria Silva",
      description: "...",
      status: "open",
      priority: "medium",
      conversation_id: 82,
      offers: [],
    },
  };
}

beforeEach(() => {
  nextalkGet.mockReset();
  nextalkPatch.mockReset();
  nextalkPostCreate.mockReset();
});

describe("upsertKanbanCard — decision table by funnel_stage", () => {
  it("no card → creates one directly in consulta_agendada", async () => {
    nextalkGet.mockResolvedValueOnce({ items: [] } satisfies NextalkKanbanListResponse);
    nextalkPostCreate.mockResolvedValueOnce(cardAt("consulta_agendada", 99));

    const result = await upsertKanbanCard(baseCtx);

    expect(result).toEqual({ action: "created", cardId: 99 });
    expect(nextalkPostCreate).toHaveBeenCalledWith(
      "/kanban_items",
      expect.objectContaining({
        kanban_item: expect.objectContaining({ funnel_stage: "consulta_agendada" }),
      })
    );
  });

  it.each(["prospeccao", "qualificacao", "pagto_consulta"])(
    "card at %s (before target) → adds the offer and moves to consulta_agendada",
    async (stage) => {
      const card = cardAt(stage);
      nextalkGet
        .mockResolvedValueOnce({ items: [card] } satisfies NextalkKanbanListResponse)
        .mockResolvedValueOnce(card);
      nextalkPatch.mockResolvedValueOnce({});
      nextalkPostCreate.mockResolvedValueOnce({});

      const result = await upsertKanbanCard(baseCtx);

      expect(result).toEqual({ action: "moved", cardId: 70 });
      expect(nextalkPatch).toHaveBeenCalledWith(
        "/kanban_items/70",
        expect.objectContaining({
          kanban_item: expect.objectContaining({
            item_details: expect.objectContaining({
              offers: [expect.objectContaining({ id: 1, description: "Consulta Padrão" })],
            }),
          }),
        })
      );
      expect(nextalkPostCreate).toHaveBeenCalledWith("/kanban_items/70/move_to_stage", {
        funnel_stage: "consulta_agendada",
        funnel_id: 1,
      });
    }
  );

  it("card already at consulta_agendada → left untouched", async () => {
    nextalkGet.mockResolvedValueOnce({
      items: [cardAt("consulta_agendada")],
    } satisfies NextalkKanbanListResponse);

    const result = await upsertKanbanCard(baseCtx);

    expect(result).toEqual({ action: "unchanged", cardId: 70 });
    expect(nextalkPatch).not.toHaveBeenCalled();
    expect(nextalkPostCreate).not.toHaveBeenCalled();
  });

  it.each(["negocia_o_produtos", "pagto_produtos", "fechamento"])(
    "card at %s (past target) → leaves it alone and creates a NEW card",
    async (stage) => {
      nextalkGet.mockResolvedValueOnce({
        items: [cardAt(stage)],
      } satisfies NextalkKanbanListResponse);
      nextalkPostCreate.mockResolvedValueOnce(cardAt("consulta_agendada", 150));

      const result = await upsertKanbanCard(baseCtx);

      expect(result).toEqual({ action: "new_card_after_later_stage", cardId: 150 });
      expect(nextalkPatch).not.toHaveBeenCalled();
    }
  );

  it("moving an existing card does not duplicate an offer already present", async () => {
    const card = cardAt("pagto_consulta");
    card.item_details.offers = [
      {
        id: 1,
        description: "Consulta Padrão",
        value: "49.90",
        default: true,
        manual: false,
        product_link: "",
        image_url: null,
        offer_group_id: null,
        offer_group_name: null,
        currency: { symbol: "R$", code: "BRL", locale: "pt-BR" },
      },
    ];
    nextalkGet
      .mockResolvedValueOnce({ items: [card] } satisfies NextalkKanbanListResponse)
      .mockResolvedValueOnce(card);
    nextalkPatch.mockResolvedValueOnce({});
    nextalkPostCreate.mockResolvedValueOnce({});

    await upsertKanbanCard(baseCtx);

    const patchBody = nextalkPatch.mock.calls[0][1] as {
      kanban_item: { item_details: { offers: unknown[] } };
    };
    expect(patchBody.kanban_item.item_details.offers).toHaveLength(1);
  });
});
