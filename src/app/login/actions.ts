"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginRatelimit } from "@/lib/ratelimit";

/** Only allow redirects to internal paths */
function sanitizeNext(next: string | null): string {
  if (!next) return "/dashboard";
  // Block absolute URLs and protocol-relative URLs
  if (/^[a-z]+:/i.test(next) || next.startsWith("//")) return "/dashboard";
  // Must start with /
  if (!next.startsWith("/")) return "/dashboard";
  return next;
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = sanitizeNext(formData.get("next") as string);

  // Rate limit by email
  try {
    const { success } = await loginRatelimit.limit(email.toLowerCase());
    if (!success)
      return { error: "Too many login attempts. Please try again later." };
  } catch {
    // Redis unavailable — allow the request
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const next = sanitizeNext(formData.get("next") as string);

  // Rate limit by email
  try {
    const { success } = await loginRatelimit.limit(email.toLowerCase());
    if (!success)
      return { error: "Too many signup attempts. Please try again later." };
  } catch {
    // Redis unavailable — allow the request
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required, user won't have a session yet.
  // Check if identities array is empty — means the email is already registered.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "An account with this email already exists." };
  }

  // Return success so the UI can show the OTP verification form
  return { success: true, email, next };
}

export async function loginWithMagicLink(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const next = sanitizeNext(formData.get("next") as string);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Rate limit by email
  try {
    const { success } = await loginRatelimit.limit(email.toLowerCase());
    if (!success)
      return { error: "Too many requests. Please try again later." };
  } catch {
    // Redis unavailable — allow the request
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function verifySignupOtp(
  email: string,
  token: string,
  next: string,
) {
  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(sanitizeNext(next));
}

export async function resendSignupOtp(email: string) {
  const supabase = await createClient();

  // Rate limit by email
  try {
    const { success } = await loginRatelimit.limit(email.toLowerCase());
    if (!success)
      return { error: "Too many requests. Please try again later." };
  } catch {
    // Redis unavailable — allow the request
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/auth/callback?next=${encodeURIComponent("/reset-password?mode=reset")}`,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const code = formData.get("code") as string | null;

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  if (code) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return { error: exchangeError.message };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function loginWithGoogle(next?: string) {
  const supabase = await createClient();
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const safeNext = sanitizeNext(next ?? null);
  const callbackUrl =
    safeNext !== "/dashboard"
      ? `${base}/auth/callback?next=${encodeURIComponent(safeNext)}`
      : `${base}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });

  if (data.url) {
    redirect(data.url);
  }

  if (error) {
    return { error: error.message };
  }
}
