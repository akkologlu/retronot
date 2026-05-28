import { z } from "zod";

export const RetroConfigSchema = z.object({
  allowGuests: z.boolean().default(false),
  voteLimit: z.number().int().min(1).max(20).default(5),
  phaseTimers: z
    .object({
      write: z.number().int().min(0).max(120).optional(),
      vote: z.number().int().min(0).max(120).optional(),
    })
    .optional(),
  customColumns: z.array(z.string()).optional(),
});

export type RetroConfig = z.infer<typeof RetroConfigSchema>;

export function parseRetroConfig(config: unknown): RetroConfig {
  const result = RetroConfigSchema.safeParse(config);
  return result.success ? result.data : { allowGuests: false, voteLimit: 5 };
}

export const CreateRetroSchema = z.object({
  name: z.string().min(1, "Name required").max(100).trim(),
  teamId: z.string().uuid("Invalid team"),
  templateType: z.string().min(1),
  voteLimit: z.coerce.number().int().min(1).max(20).default(5),
  writeTimerMinutes: z.coerce.number().int().min(0).max(120).default(0),
  voteTimerMinutes: z.coerce.number().int().min(0).max(120).default(0),
});

export const CreateTeamSchema = z.object({
  name: z.string().min(1, "Name required").max(80).trim(),
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(1, "Name required").max(120).trim(),
});

export const CardContentSchema = z
  .string()
  .trim()
  .min(1, "Card cannot be empty")
  .max(1000, "Card too long (max 1000 chars)");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}
