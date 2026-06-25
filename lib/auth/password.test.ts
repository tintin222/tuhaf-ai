import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("verifies a correct password round-trip", () => {
    const stored = hashPassword("correct horse");
    expect(verifyPassword("correct horse", stored)).toBe(true);
  });
  it("rejects a wrong password", () => {
    const stored = hashPassword("correct horse");
    expect(verifyPassword("wrong", stored)).toBe(false);
  });
  it("produces distinct hashes for the same input (random salt)", () => {
    expect(hashPassword("a")).not.toBe(hashPassword("a"));
  });
  it("fails safely on a malformed stored value", () => {
    expect(verifyPassword("x", "garbage")).toBe(false);
    expect(verifyPassword("x", "scrypt$zz$zz")).toBe(false);
  });
});
