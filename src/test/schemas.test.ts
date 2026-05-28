import { describe, it, expect } from "vitest";
import { parseRetroConfig } from "@/lib/schemas";

describe("parseRetroConfig", () => {
  it("returns defaults for null", () => {
    const cfg = parseRetroConfig(null);
    expect(cfg.allowGuests).toBe(false);
    expect(cfg.voteLimit).toBe(5);
  });

  it("returns defaults for undefined", () => {
    const cfg = parseRetroConfig(undefined);
    expect(cfg.allowGuests).toBe(false);
    expect(cfg.voteLimit).toBe(5);
  });

  it("parses valid config", () => {
    const cfg = parseRetroConfig({ allowGuests: false, voteLimit: 10 });
    expect(cfg.allowGuests).toBe(false);
    expect(cfg.voteLimit).toBe(10);
  });

  it("falls back to defaults for wrong types", () => {
    const cfg = parseRetroConfig({ allowGuests: "yes", voteLimit: "five" });
    expect(cfg.allowGuests).toBe(false);
    expect(cfg.voteLimit).toBe(5);
  });
});
