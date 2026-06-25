import { describe, it, expect } from "vitest";
import { normalizeEmail } from "./normalize";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Efe@Infinics.XYZ ")).toBe("efe@infinics.xyz");
  });
});
