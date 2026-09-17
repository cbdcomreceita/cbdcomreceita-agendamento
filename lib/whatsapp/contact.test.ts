import { beforeEach, describe, expect, it, vi } from "vitest";

const nextalkPostSearch = vi.fn();
const nextalkPostCreate = vi.fn();

vi.mock("./nextalk-client", async () => {
  const actual = await vi.importActual<typeof import("./nextalk-client")>("./nextalk-client");
  return {
    ...actual,
    nextalkPostSearch: (...a: unknown[]) => nextalkPostSearch(...a),
    nextalkPostCreate: (...a: unknown[]) => nextalkPostCreate(...a),
  };
});

const { findOrCreateContact } = await import("./contact");
const { NextalkResponseShapeError } = await import("./nextalk-response");
const { NextalkApiError } = await import("./nextalk-client");

const variants = { primary: "+5511999999999", fallback: undefined };

beforeEach(() => {
  nextalkPostSearch.mockReset();
  nextalkPostCreate.mockReset();
});

describe("findOrCreateContact", () => {
  it("returns the found contact with createRaw: null (the working search path)", async () => {
    nextalkPostSearch.mockResolvedValue({ meta: { count: 1, current_page: "1" }, payload: [{ id: 8645, name: "Maria", phone_number: "+5511999999999" }] });

    const result = await findOrCreateContact(variants, "Maria", null);

    expect(result).toEqual({
      contact: { id: 8645, name: "Maria", phone_number: "+5511999999999" },
      createRaw: null,
    });
    expect(nextalkPostCreate).not.toHaveBeenCalled();
  });

  it("creates a contact when not found, returning the raw response for provider_response", async () => {
    nextalkPostSearch.mockResolvedValue({ meta: { count: 0, current_page: "1" }, payload: [] });
    const raw = { payload: { contact: { id: 8645, name: "Maria", phone_number: "+5511999999999" }, contact_inbox: null } };
    nextalkPostCreate.mockResolvedValue(raw);

    const result = await findOrCreateContact(variants, "Maria", null);

    expect(result.contact.id).toBe(8645);
    expect(result.createRaw).toBe(raw);
  });

  it("throws if the created contact's id is missing/invalid, instead of returning a broken contact object", async () => {
    nextalkPostSearch.mockResolvedValue({ meta: { count: 0, current_page: "1" }, payload: [] });
    nextalkPostCreate.mockResolvedValue({ payload: { contact: { name: "Maria", phone_number: "+5511999999999" }, contact_inbox: null } });

    await expect(findOrCreateContact(variants, "Maria", null)).rejects.toThrow(NextalkResponseShapeError);
  });

  it("re-searches on a 422 'already taken' race instead of failing", async () => {
    nextalkPostSearch
      .mockResolvedValueOnce({ meta: { count: 0, current_page: "1" }, payload: [] })
      .mockResolvedValueOnce({ meta: { count: 1, current_page: "1" }, payload: [{ id: 8645, name: "Maria", phone_number: "+5511999999999" }] });
    nextalkPostCreate.mockRejectedValue(new NextalkApiError(422, {}, "Phone number has already been taken"));

    const result = await findOrCreateContact(variants, "Maria", null);

    expect(result.contact.id).toBe(8645);
    expect(result.createRaw).toBeNull();
  });
});
