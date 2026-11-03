import { describe, expect, it } from "vitest";
import { stripPaymentTokenPrefix } from "./payment-token";

const TOKEN = "Gy1vzkdKZT4lXKfesBpTNwHm35_cLp2B";

describe("stripPaymentTokenPrefix", () => {
  it("leaves a pure token untouched", () => {
    expect(stripPaymentTokenPrefix(TOKEN)).toBe(TOKEN);
  });

  it("strips a literal {{1}} prefix", () => {
    expect(stripPaymentTokenPrefix(`{{1}}${TOKEN}`)).toBe(TOKEN);
  });

  it("strips a percent-encoded %7B%7B1%7D%7D prefix", () => {
    expect(stripPaymentTokenPrefix(`%7B%7B1%7D%7D${TOKEN}`)).toBe(TOKEN);
  });

  it("is case-insensitive for the percent-encoded prefix", () => {
    expect(stripPaymentTokenPrefix(`%7b%7b1%7d%7d${TOKEN}`)).toBe(TOKEN);
  });

  it("does not touch a token that merely contains the sequence mid-string", () => {
    const weird = `abc{{1}}${TOKEN}`;
    expect(stripPaymentTokenPrefix(weird)).toBe(weird);
  });
});
