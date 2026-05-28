/* eslint-disable no-console */

/**
 * Validates required environment variables at application startup.
 * Import this module in instrumentation.ts or layout.tsx to fail fast
 * if the deployment is misconfigured.
 */

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const recommendedInProd = [
  "NEXT_PUBLIC_BASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n\nSee .env.example for reference.`,
    );
  }

  if (process.env.NODE_ENV === "production") {
    const warnings: string[] = [];
    for (const key of recommendedInProd) {
      if (!process.env[key]) warnings.push(key);
    }
    if (warnings.length > 0) {
      console.warn(
        `[env] Recommended env vars missing in production:\n  ${warnings.join("\n  ")}`,
      );
    }
  }
}
