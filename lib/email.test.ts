import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendLoginLink } from "./email";

describe("sendLoginLink (no API key → console fallback)", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });
  it("logs the link and reports ok", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await sendLoginLink("a@b.com", "http://x/giris/dogrula?token=t");
    expect(res.ok).toBe(true);
    expect(spy.mock.calls.flat().join(" ")).toContain("http://x/giris/dogrula?token=t");
    spy.mockRestore();
  });
});
