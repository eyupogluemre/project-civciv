"use client";

import { Wrench, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

interface ModeStatus {
  database: "supabase" | "mock";
  email: "resend" | "mock";
  payments: "lemonsqueezy" | "mock";
  isAnyMock: boolean;
}

export function DevModeBanner() {
  const { t } = useI18n();
  const [mode, setMode] = useState<ModeStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ModeStatus | null) => {
        if (active && data?.isAnyMock) setMode(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!mode?.isAnyMock || dismissed) return null;

  return (
    <div className="no-print fixed bottom-3 left-3 right-3 z-30 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-[660px] rounded-xl bg-[#071327]/95 backdrop-blur-md border border-[#87ceeb]/30 px-3.5 py-2 shadow-xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <Wrench className="w-3.5 h-3.5 text-[#87ceeb] shrink-0" />
          <span className="font-semibold text-[#87ceeb]">{t.devBanner.label}</span>
          <span className="text-slate-400">•</span>
          <span>
            {t.devBanner.demoCode}{" "}
            <Link
              href="/redeem?code=AABB1997"
              className="font-mono font-bold text-[#ffc0cb] underline underline-offset-2 hover:text-white"
            >
              AABB1997
            </Link>
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin"
            className="font-semibold text-white underline underline-offset-2 hover:text-[#87ceeb]"
          >
            {t.devBanner.adminLink}
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
