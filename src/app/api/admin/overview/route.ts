import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getStore } from "@/lib/db";
import { getModeStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = getStore();
  const [orders, codes, events, devEmails] = await Promise.all([
    store.listOrders(100),
    store.listRedeemCodes(100),
    store.listEvents(100),
    store.listDevEmails(30),
  ]);

  const eventsWithCounts = await Promise.all(
    events.map(async (ev) => {
      const participants = await store.listParticipants(ev.id);
      return {
        id: ev.id,
        roomCode: ev.room_code,
        title: ev.title,
        hostEmail: ev.host_email,
        genderMode: ev.gender_mode,
        genderConfigured: Boolean(ev.true_gender),
        phase: ev.phase,
        maxGuests: ev.max_guests,
        guestCount: participants.length,
        photosDeleted: Boolean(ev.photos_deleted_at),
        photosExpiresAt: ev.photos_expires_at,
        createdAt: ev.created_at,
      };
    })
  );

  return NextResponse.json(
    {
      mode: getModeStatus(),
      orders,
      codes,
      events: eventsWithCounts,
      devEmails,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
