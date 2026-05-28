import { describe, it, expect } from "vitest";
import {
  RetroConfigSchema,
  parseRetroConfig,
  CreateRetroSchema,
  CreateTeamSchema,
  UpdateProfileSchema,
  CardContentSchema,
} from "@/lib/schemas";

describe("RetroConfigSchema", () => {
  it("accepts valid config", () => {
    const result = RetroConfigSchema.safeParse({
      allowGuests: false,
      voteLimit: 5,
      phaseTimers: { write: 10, vote: 5 },
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults", () => {
    const result = RetroConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowGuests).toBe(false);
      expect(result.data.voteLimit).toBe(5);
    }
  });

  it("rejects voteLimit > 20", () => {
    const result = RetroConfigSchema.safeParse({ voteLimit: 100 });
    expect(result.success).toBe(false);
  });

  it("rejects negative timer", () => {
    const result = RetroConfigSchema.safeParse({
      phaseTimers: { write: -5 },
    });
    expect(result.success).toBe(false);
  });
});

describe("parseRetroConfig", () => {
  it("returns defaults for invalid config", () => {
    const config = parseRetroConfig(null);
    expect(config.voteLimit).toBe(5);
    expect(config.allowGuests).toBe(false);
  });

  it("returns defaults for undefined", () => {
    const config = parseRetroConfig(undefined);
    expect(config.voteLimit).toBe(5);
  });

  it("parses valid config", () => {
    const config = parseRetroConfig({ allowGuests: true, voteLimit: 10 });
    expect(config.voteLimit).toBe(10);
    expect(config.allowGuests).toBe(true);
  });
});

describe("CreateRetroSchema", () => {
  it("accepts valid input", () => {
    const result = CreateRetroSchema.safeParse({
      name: "Sprint 42 Retro",
      teamId: "550e8400-e29b-41d4-a716-446655440000",
      templateType: "start-stop-continue",
      voteLimit: 5,
      writeTimerMinutes: 10,
      voteTimerMinutes: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = CreateRetroSchema.safeParse({
      name: "",
      teamId: "550e8400-e29b-41d4-a716-446655440000",
      templateType: "start-stop-continue",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid teamId", () => {
    const result = CreateRetroSchema.safeParse({
      name: "Test",
      teamId: "not-a-uuid",
      templateType: "start-stop-continue",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name > 100 chars", () => {
    const result = CreateRetroSchema.safeParse({
      name: "x".repeat(101),
      teamId: "550e8400-e29b-41d4-a716-446655440000",
      templateType: "start-stop-continue",
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateTeamSchema", () => {
  it("accepts valid name", () => {
    const result = CreateTeamSchema.safeParse({ name: "My Team" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = CreateTeamSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name > 80 chars", () => {
    const result = CreateTeamSchema.safeParse({ name: "x".repeat(81) });
    expect(result.success).toBe(false);
  });

  it("trims whitespace", () => {
    const result = CreateTeamSchema.safeParse({ name: "  My Team  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("My Team");
  });
});

describe("UpdateProfileSchema", () => {
  it("accepts valid name", () => {
    const result = UpdateProfileSchema.safeParse({ fullName: "John Doe" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = UpdateProfileSchema.safeParse({ fullName: "" });
    expect(result.success).toBe(false);
  });
});

describe("CardContentSchema", () => {
  it("accepts valid content", () => {
    const result = CardContentSchema.safeParse("This is a valid card");
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = CardContentSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects content > 1000 chars", () => {
    const result = CardContentSchema.safeParse("x".repeat(1001));
    expect(result.success).toBe(false);
  });

  it("trims whitespace", () => {
    const result = CardContentSchema.safeParse("  hello  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("hello");
  });

  it("rejects whitespace-only", () => {
    const result = CardContentSchema.safeParse("   ");
    expect(result.success).toBe(false);
  });
});
