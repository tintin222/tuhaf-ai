import { describe, it, expect } from "vitest";
import { newUserDefaults } from "./session";

describe("newUserDefaults", () => {
  it("derives a display name from the email local-part", () => {
    const d = newUserDefaults("ada.lovelace@x.com");
    expect(d.displayName).toBe("ada lovelace");
    expect(d.avatarSeed).toBe("ada.lovelace@x.com");
    expect(d.onboarded).toBe(false);
    expect(d.emailVerified).toBeInstanceOf(Date);
  });
  it("falls back to 'Okur' when local-part is empty after cleanup", () => {
    expect(newUserDefaults("___@x.com").displayName).toBe("Okur");
  });
});
