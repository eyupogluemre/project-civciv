import { NextResponse } from "next/server";
import { safeCompareSecret } from "@/lib/crypto";
import { getStore } from "@/lib/db";
import { getCronSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = getCronSecret();
  if (cronSecret) {
    const authHeader = request.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!bearer || !safeCompareSecret(bearer, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }

  const store = getStore();
  const nowIso = new Date().toISOString();
  const expired = await store.findExpiredPhotoEvents(nowIso);

  let cleanedEvents = 0;
  let removedFiles = 0;
  for (const ev of expired) {
    const count = await store.deleteAllEventSelfies(ev.id);
    await store.updateEvent(ev.id, { photos_deleted_at: nowIso });
    cleanedEvents += 1;
    removedFiles += count;
  }

  return NextResponse.json({
    ok: true,
    cleanedEvents,
    removedFiles,
    ranAt: nowIso,
  });
}
