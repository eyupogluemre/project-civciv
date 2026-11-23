import { NextResponse } from "next/server";
import { getModeStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getModeStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
