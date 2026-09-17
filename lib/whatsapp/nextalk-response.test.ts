import { describe, expect, it } from "vitest";
import {
  NextalkResponseShapeError,
  assertFiniteNumber,
  readNumericField,
  readNumericFieldWithFallback,
  unwrapNextalkObject,
  unwrapNextalkObjectAny,
} from "./nextalk-response";

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

  it("lists the numeric fields actually present when the probe field isn't found — this is the point of the improvement", () => {
    const raw = { id: 265, uuid: "01a70843-7c40-4443-a135-53fdde7fa6d2", inbox_id: 13, contact_id: 10144 };
    try {
      unwrapNextalkObject(raw, "display_id", "POST /conversations (criação)");
      throw new Error("expected to throw");
    } catch (err) {
      expect(String(err)).toContain("id=265");
      expect(String(err)).toContain("inbox_id=13");
      expect(String(err)).toContain("contact_id=10144");
      expect(String(err)).not.toContain("uuid="); // non-numeric fields aren't listed
    }
  });
});

describe("unwrapNextalkObjectAny", () => {
  it("commits to the bare object when any of the probe fields is present there", () => {
    const raw = { id: 265, inbox_id: 13 };
    expect(unwrapNextalkObjectAny(raw, ["display_id", "id"], "ctx")).toBe(raw);
  });

  it("falls back to `payload`/`data` exactly like the single-field version", () => {
    const raw = { payload: { id: 265 } };
    expect(unwrapNextalkObjectAny(raw, ["display_id", "id"], "ctx")).toBe(raw.payload);
  });

  it("throws, listing numeric fields present, when none of the probe fields exist anywhere", () => {
    const raw = { inbox_id: 13, contact_id: 10144 };
    try {
      unwrapNextalkObjectAny(raw, ["display_id", "id"], "POST /conversations (criação)");
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(NextalkResponseShapeError);
      expect(String(err)).toContain("display_id");
      expect(String(err)).toContain("inbox_id=13");
    }
  });
});

describe("readNumericFieldWithFallback", () => {
  it("returns the first field (in priority order) that's present and valid", () => {
    expect(readNumericFieldWithFallback({ id: 265 }, ["display_id", "id"], "ctx", {})).toBe(265);
  });

  it("prefers the earlier field when both are present and valid", () => {
    expect(readNumericFieldWithFallback({ id: 501, display_id: 83 }, ["display_id", "id"], "ctx", {})).toBe(83);
  });

  it("throws — does not try the next field — when the first present field has the wrong type", () => {
    expect(() =>
      readNumericFieldWithFallback({ display_id: "83", id: 501 }, ["display_id", "id"], "ctx", {})
    ).toThrow(NextalkResponseShapeError);
  });

  it("throws, listing numeric fields present, when none of the fields exist", () => {
    try {
      readNumericFieldWithFallback({ inbox_id: 13 }, ["display_id", "id"], "POST /conversations", { inbox_id: 13 });
      throw new Error("expected to throw");
    } catch (err) {
      expect(String(err)).toContain("inbox_id=13");
    }
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
