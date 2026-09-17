import { describe, expect, it } from "vitest";
import { NextalkResponseShapeError, assertFiniteNumber, readNumericField, unwrapNextalkObject } from "./nextalk-response";

describe("unwrapNextalkObject", () => {
  it("finds the field on the bare object", () => {
    const raw = { id: 1, display_id: 83 };
    expect(unwrapNextalkObject(raw, "display_id", "ctx")).toBe(raw);
  });

  it("falls back to `payload` when the bare object doesn't have the field", () => {
    const raw = { payload: { id: 1, display_id: 83 } };
    expect(unwrapNextalkObject(raw, "display_id", "ctx")).toBe(raw.payload);
  });

  it("falls back to `data` when neither bare nor `payload` have the field", () => {
    const raw = { data: { id: 1, display_id: 83 } };
    expect(unwrapNextalkObject(raw, "display_id", "ctx")).toBe(raw.data);
  });

  it("does NOT fall through to payload/data when the field is present but malformed at the bare level", () => {
    // display_id is present (as a string) right on the bare object — this
    // must commit to the bare object, even though payload also has a
    // (numeric) display_id. A present-but-wrong-type field is a real error,
    // not a hint to keep searching for a better-looking shape.
    const raw = { display_id: "83", payload: { display_id: 83 } };
    expect(unwrapNextalkObject(raw, "display_id", "ctx")).toBe(raw);
  });

  it("throws NextalkResponseShapeError with the raw body when the field isn't found anywhere", () => {
    const raw = { foo: "bar" };
    expect(() => unwrapNextalkObject(raw, "display_id", "POST /conversations")).toThrow(NextalkResponseShapeError);
    try {
      unwrapNextalkObject(raw, "display_id", "POST /conversations");
    } catch (err) {
      expect(String(err)).toContain("POST /conversations");
      expect(String(err)).toContain("display_id");
      expect(String(err)).toContain('"foo":"bar"');
    }
  });

  it("throws on null/undefined/non-object raw bodies", () => {
    expect(() => unwrapNextalkObject(null, "id", "ctx")).toThrow(NextalkResponseShapeError);
    expect(() => unwrapNextalkObject(undefined, "id", "ctx")).toThrow(NextalkResponseShapeError);
    expect(() => unwrapNextalkObject("oops", "id", "ctx")).toThrow(NextalkResponseShapeError);
  });
});

describe("readNumericField", () => {
  it("returns the value when it's a finite number", () => {
    expect(readNumericField({ display_id: 83 }, "display_id", "ctx", {})).toBe(83);
  });

  it("throws — does not coerce — when the field is a numeric string", () => {
    expect(() => readNumericField({ display_id: "83" }, "display_id", "ctx", {})).toThrow(NextalkResponseShapeError);
  });

  it("throws when the field is undefined (this is how the original bug manifested)", () => {
    expect(() => readNumericField({}, "display_id", "ctx", { some: "body" })).toThrow(NextalkResponseShapeError);
  });

  it("throws when the field is NaN or Infinity", () => {
    expect(() => readNumericField({ display_id: NaN }, "display_id", "ctx", {})).toThrow(NextalkResponseShapeError);
    expect(() => readNumericField({ display_id: Infinity }, "display_id", "ctx", {})).toThrow(NextalkResponseShapeError);
  });

  it("includes the raw body in the thrown error message", () => {
    const raw = { weird: "shape" };
    try {
      readNumericField({}, "display_id", "POST /conversations (criação)", raw);
      throw new Error("expected readNumericField to throw");
    } catch (err) {
      expect(String(err)).toContain('"weird":"shape"');
    }
  });
});

describe("assertFiniteNumber", () => {
  it("returns the value when valid", () => {
    expect(assertFiniteNumber(8645, "id", "ctx", {})).toBe(8645);
  });

  it("throws on a non-numeric value, including the raw body", () => {
    const raw = { id: "8645" };
    expect(() => assertFiniteNumber(raw.id, "id", "GET /contacts/{id}/conversations (reuso)", raw)).toThrow(
      NextalkResponseShapeError
    );
  });
});
