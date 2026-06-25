import { describe, it, expect } from "vitest";
import { hashToken, isTokenValid } from "./tokens";

describe("hashToken", () => {
  it("is deterministic and 64 hex chars", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("differs for different inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("isTokenValid", () => {
  const now = new Date("2026-06-25T12:00:00Z");
  const future = new Date("2026-06-25T12:20:00Z");
  const past = new Date("2026-06-25T11:00:00Z");
  it("accepts an unused, unexpired token", () => {
    expect(isTokenValid({ usedAt: null, expiresAt: future }, now)).toBe(true);
  });
  it("rejects null, used, and expired tokens", () => {
    expect(isTokenValid(null, now)).toBe(false);
    expect(isTokenValid({ usedAt: now, expiresAt: future }, now)).toBe(false);
    expect(isTokenValid({ usedAt: null, expiresAt: past }, now)).toBe(false);
  });
});
