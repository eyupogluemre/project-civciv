"use client";

import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { Gender } from "@/lib/types";

interface SecretStatus {
  title: string;
  locale: "tr" | "en";
  locked: boolean;
  phase: string;
}

export default function SecretKeeperPage() {
  const params = useParams<{ secretToken: string }>();
  const secretToken = params.secretToken;
  const { t } = useI18n();

  const [status, setStatus] = useState<SecretStatus | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<Gender | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justLocked, setJustLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!secretToken) return;
    fetch(`/api/secret/${encodeURIComponent(secretToken)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = (await res.json()) as SecretStatus;
        setStatus(data);
      })
      .catch(() => setNotFound(true));
  }, [secretToken]);

  const handleLock = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/secret/${encodeURIComponent(secretToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not lock secret");
      }
      setJustLocked(true);
      setStatus((prev) => (prev ? { ...prev, locked: true } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-[540px] px-5 pt-16 text-center">
        <div className="surface-card rounded-2xl p-8 space-y-3">
          <Lock className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-slate-200 font-semibold">{t.secret.invalidLink}</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="mx-auto max-w-[540px] px-5 pt-16 text-center text-slate-300">
        ...
      </div>
    );
  }

  if (justLocked || status.locked) {
    return (
      <div className="mx-auto max-w-[540px] px-5 pt-14 pb-16">
        <div className="surface-card rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-white">
            {justLocked ? t.secret.lockedTitle : t.secret.alreadyLockedTitle}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {justLocked ? t.secret.lockedDesc : t.secret.alreadyLockedDesc}
          </p>
          <div className="pt-2 text-xs font-semibold text-[#87ceeb]">
            {status.title}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px] px-5 pt-12 pb-16">
      <div className="surface-card rounded-2xl p-6 sm:p-7 space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#0a1931] border border-white/15 flex items-center justify-center mx-auto text-[#ffc0cb]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#ffc0cb]">
            {t.secret.title}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            {t.secret.subtitle}
          </p>
        </div>

        <div className="rounded-xl bg-[#071327] px-4 py-3 text-center">
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            {t.secret.forEvent}{" "}
          </span>
          <span className="font-display text-base text-white">{status.title}</span>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-100 text-center">
            {t.secret.choosePrompt}
          </p>
          <div className="grid grid-cols-2 gap-3.5">
            <button
              type="button"
              id="secret-choice-boy"
              onClick={() => {
                setSelected("boy");
                setConfirmStep(false);
              }}
              className={`rounded-2xl py-8 px-4 font-display text-2xl transition-all cursor-pointer border-2 ${
                selected === "boy"
                  ? "bg-[#38bdf8] text-[#0a1931] border-white shadow-[0_0_30px_rgba(56,189,248,0.4)] scale-[1.02]"
                  : "bg-[#071327] text-[#87ceeb] border-[#87ceeb]/35 hover:border-[#87ceeb]"
              }`}
            >
              {t.brand.boy}
            </button>
            <button
              type="button"
              id="secret-choice-girl"
              onClick={() => {
                setSelected("girl");
                setConfirmStep(false);
              }}
              className={`rounded-2xl py-8 px-4 font-display text-2xl transition-all cursor-pointer border-2 ${
                selected === "girl"
                  ? "bg-[#f472b6] text-[#0a1931] border-white shadow-[0_0_30px_rgba(244,114,182,0.4)] scale-[1.02]"
                  : "bg-[#071327] text-[#ffc0cb] border-[#ffc0cb]/35 hover:border-[#ffc0cb]"
              }`}
            >
              {t.brand.girl}
            </button>
          </div>
        </div>

        {selected && !confirmStep && (
          <button
            type="button"
            id="secret-continue-btn"
            onClick={() => setConfirmStep(true)}
            className="btn-party w-full rounded-xl py-4 text-base cursor-pointer"
          >
            {t.secret.lockBtn}
          </button>
        )}

        {selected && confirmStep && (
          <div className="rounded-xl bg-[#071327] border border-amber-400/35 p-4 space-y-4">
            <p className="text-sm text-amber-100 leading-relaxed text-center">
              {t.secret.confirmPrompt}
            </p>
            {error && (
              <p className="text-xs text-rose-300 text-center">{error}</p>
            )}
            <button
              type="button"
              id="secret-confirm-lock-btn"
              disabled={submitting}
              onClick={handleLock}
              className="btn-party w-full rounded-xl py-3.5 text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? t.secret.locking : t.secret.lockBtn}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
