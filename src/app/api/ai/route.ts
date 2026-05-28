import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiRatelimit } from "@/lib/ratelimit";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const MAX_CARDS = 200;
const MAX_CARD_CONTENT_LENGTH = 1500;

interface Card {
  id: string;
  content: string;
  column_name: string;
}

interface GroupSuggestion {
  name: string;
  cardIds: string[];
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("NO_GEMINI_KEY");

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("NO_GROQ_KEY");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAI(prompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!geminiKey && !groqKey) {
    throw new Error(
      "No AI provider configured. Set GEMINI_API_KEY or GROQ_API_KEY.",
    );
  }

  if (geminiKey) {
    try {
      return await callGemini(prompt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Fall through to Groq on quota/auth errors
      const shouldFallback =
        msg.includes("429") ||
        msg.includes("403") ||
        msg.includes("404") ||
        msg.includes("NO_GEMINI_KEY");
      if (!shouldFallback) throw err;
      if (!groqKey)
        throw new Error(
          "Gemini quota exceeded and no GROQ_API_KEY configured as fallback.",
        );
      console.warn("Gemini failed, falling back to Groq:", msg.slice(0, 120));
    }
  }

  return callGroq(prompt);
}

function buildGroupPrompt(cards: Card[]): string {
  const cardList = cards
    .map((c) => `[${c.id}] (${c.column_name}) ${c.content}`)
    .join("\n");
  return `You are a retrospective facilitator. Analyze these cards from a team retro and suggest meaningful thematic groups.

Cards:
${cardList}

Return ONLY valid JSON array (no markdown, no explanation):
[
  {"name": "Group Name", "cardIds": ["id1", "id2"]},
  ...
]

Rules:
- Group semantically related cards together
- Give each group a concise, actionable name (2-5 words)
- A card can only appear in one group
- Omit cards that don't fit a group
- Return 2-6 groups maximum`;
}

async function suggestGroups(cards: Card[]): Promise<GroupSuggestion[]> {
  if (cards.length === 0) return [];
  const raw = await callAI(buildGroupPrompt(cards));
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]) as GroupSuggestion[];
  const validCardIds = new Set(cards.map((c) => c.id));
  return parsed
    .filter((g) => g.name && Array.isArray(g.cardIds))
    .map((g) => ({
      name: g.name,
      cardIds: g.cardIds.filter((id) => validCardIds.has(id)),
    }))
    .filter((g) => g.cardIds.length > 1);
}

async function draftAction(
  cardContent: string,
  columnName: string,
): Promise<string> {
  const prompt = `You are a retrospective facilitator. Based on this card from a team retrospective, suggest one clear, specific, actionable action item.

Card (${columnName}): ${cardContent}

Return ONLY the action item text — no explanation, no bullet points, no quotes. Max 120 characters.`;

  return (await callAI(prompt)).trim().slice(0, 200);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit AI requests per user
  try {
    const { success } = await aiRatelimit.limit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Too many AI requests. Please try again later." },
        { status: 429 },
      );
    }
  } catch {
    // Redis unavailable — allow the request
  }

  const body = await req.json();
  const { action } = body;

  try {
    if (action === "suggest-groups") {
      const { cards } = body as { cards: Card[] };
      if (!Array.isArray(cards) || cards.length === 0) {
        return NextResponse.json(
          { error: "No cards provided" },
          { status: 400 },
        );
      }
      if (cards.length > MAX_CARDS) {
        return NextResponse.json(
          { error: `Too many cards (max ${MAX_CARDS})` },
          { status: 400 },
        );
      }
      // Sanitize card content length
      const sanitizedCards = cards.map((c) => ({
        ...c,
        content:
          typeof c.content === "string"
            ? c.content.slice(0, MAX_CARD_CONTENT_LENGTH)
            : "",
      }));
      const groups = await suggestGroups(sanitizedCards);
      return NextResponse.json({ groups });
    }

    if (action === "draft-action") {
      const { cardContent, columnName } = body as {
        cardContent: string;
        columnName: string;
      };
      if (!cardContent)
        return NextResponse.json({ error: "No card content" }, { status: 400 });
      const truncatedContent =
        typeof cardContent === "string"
          ? cardContent.slice(0, MAX_CARD_CONTENT_LENGTH)
          : "";
      const truncatedColumn =
        typeof columnName === "string" ? columnName.slice(0, 100) : "";
      const suggestion = await draftAction(truncatedContent, truncatedColumn);
      return NextResponse.json({ suggestion });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    // Log full error server-side only; never leak provider details to client
    console.error("[AI Route]", err instanceof Error ? err.message : err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("429")) {
      return NextResponse.json(
        { error: "AI provider rate limit exceeded. Try again later." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "AI service temporarily unavailable" },
      { status: 500 },
    );
  }
}
