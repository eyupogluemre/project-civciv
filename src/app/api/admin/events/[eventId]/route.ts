import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getStore } from "@/lib/db";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await context.params;
  const store = getStore();
  await store.deleteEvent(eventId);
  return NextResponse.json({ ok: true });
}
