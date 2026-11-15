import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/schemas";

// Target of navigator.sendBeacon when a retro page closes: drops the user's
// heartbeat so the moderator role can be handed over without waiting for it to expire.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse(null, { status: 403 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) return new NextResponse(null, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_participant_away", {
    p_retro_id: id,
  });
  return new NextResponse(null, { status: error ? 500 : 204 });
}
