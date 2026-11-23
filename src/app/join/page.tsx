"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";

export default function JoinPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleaned = roomCode.trim().toUpperCase();
    if (cleaned.length < 4) {
      setError(t.join.notFound);
      return;
    }

    setChecking(true);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(cleaned)}`);
      if (!res.ok) {
        setError(t.join.notFound);
        return;
      }
      router.push(`/party/${encodeURIComponent(cleaned)}`);
    } catch {
      setError(t.join.notFound);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-[540px] px-5 pt-14 pb-16">
      <form
        onSubmit={handleJoin}
        className="surface-card rounded-2xl p-6 sm:p-7 space-y-5"
      >
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl text-[#ffc0cb]">
            {t.join.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-200">{t.join.subtitle}</p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="join-room-code-input"
            className="block text-xs font-bold uppercase tracking-wider text-[#87ceeb]"
          >
            {t.join.codeLabel}
          </label>
          <input
            id="join-room-code-input"
            type="text"
            maxLength={8}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder={t.join.codePlaceholder}
            autoComplete="off"
            className="w-full rounded-xl bg-black/80 border border-white/15 py-4 px-4 text-center font-mono text-2xl font-black tracking-[0.25em] text-white placeholder:text-slate-600 focus:outline-none focus:border-[#87ceeb]"
          />
        </div>

        {error && (
          <p className="text-sm font-semibold text-rose-300 bg-rose-950/50 border border-rose-500/30 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          id="join-submit-btn"
          disabled={checking}
          className="btn-party w-full rounded-xl py-4 text-base flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>{t.join.joinBtn}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
