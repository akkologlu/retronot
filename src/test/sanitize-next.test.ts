import { describe, it, expect } from "vitest";

// Test the sanitizeNext logic (extracted for testability)
function sanitizeNext(next: string | null): string {
  if (!next) return "/dashboard";
  if (/^[a-z]+:/i.test(next) || next.startsWith("//")) return "/dashboard";
  if (!next.startsWith("/")) return "/dashboard";
  return next;
}

describe("sanitizeNext (open redirect prevention)", () => {
  it("returns /dashboard for null", () => {
    expect(sanitizeNext(null)).toBe("/dashboard");
  });

  it("returns /dashboard for empty string", () => {
    expect(sanitizeNext("")).toBe("/dashboard");
  });

  it("allows internal paths", () => {
    expect(sanitizeNext("/retro/123")).toBe("/retro/123");
    expect(sanitizeNext("/dashboard")).toBe("/dashboard");
    expect(sanitizeNext("/teams")).toBe("/teams");
  });

  it("blocks absolute URLs", () => {
    expect(sanitizeNext("https://evil.com")).toBe("/dashboard");
    expect(sanitizeNext("http://evil.com")).toBe("/dashboard");
    expect(sanitizeNext("HTTP://EVIL.COM")).toBe("/dashboard");
  });

  it("blocks protocol-relative URLs", () => {
    expect(sanitizeNext("//evil.com")).toBe("/dashboard");
    expect(sanitizeNext("//evil.com/path")).toBe("/dashboard");
  });

  it("blocks javascript: URLs", () => {
    expect(sanitizeNext("javascript:alert(1)")).toBe("/dashboard");
  });

  it("blocks data: URLs", () => {
    expect(sanitizeNext("data:text/html,<script>alert(1)</script>")).toBe(
      "/dashboard",
    );
  });

  it("blocks relative paths without leading slash", () => {
    expect(sanitizeNext("evil.com/path")).toBe("/dashboard");
    expect(sanitizeNext("dashboard")).toBe("/dashboard");
  });
});
