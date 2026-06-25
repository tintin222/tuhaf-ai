import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";

describe("schema", () => {
  it("exposes the LoginToken model", () => {
    expect(typeof prisma.loginToken.create).toBe("function");
  });
});
