import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string; fileName: string }> }
) {
  const { eventId, fileName } = await context.params;
  if (!eventId || !fileName || fileName.includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const store = getStore();
  const event = await store.findEventById(eventId);
  if (!event || event.photos_deleted_at) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const media = await store.getSelfieBuffer(eventId, fileName);
  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(media.buffer), {
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
