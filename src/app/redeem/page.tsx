"use client";

import { CheckCircle2, EyeOff, KeyRound, Sparkles, UserCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { Gender, GenderMode } from "@/lib/types";

interface VerifiedCodeInfo {
  code: string;
  tier: string;
  maxGuests: number;
  email: string | null;
}

function RedeemContent() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [codeInput, setCodeInput] = useState(
    () => (searchParams.get("code") || "").toUpperCase().slice(0, 8)
  );
  const [validating, setValidating] = useState(false);
  const [verified, setVerified] = useState<VerifiedCodeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Setup wizard fields
  const [title, setTitle] = useState("");
  const [hostEmail, setHostEmail] = useState("");
  const [genderMode, setGenderMode] = useState<GenderMode>("secret_keeper");
  const [trueGender, setTrueGender] = useState<Gender | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const [allowGuestCollage, setAllowGuestCollage] = useState(true);
  const [creating, setCreating] = useState(false);

  const purchased = searchParams.get("purchased") === "1";

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleaned = codeInput.trim().toUpperCase();
    if (!cleaned) {
      setError(t.redeem.errors.emptyCode);
      return;
    }
    setValidating(true);
    try {
      const res = await fetch("/api/redeem/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleaned }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        if (data.reason === "used") setError(t.redeem.errors.usedCode);
        else if (data.reason === "revoked") setError(t.redeem.errors.revokedCode);
        else setError(t.redeem.errors.invalidCode);
        return;
      }
      setVerified({
        code: data.code,
        tier: data.tier,
        maxGuests: data.maxGuests,
        email: data.email || null,
      });
      if (data.email) setHostEmail(data.email);
    } catch {
      setError(t.redeem.errors.invalidCode);
    } finally {
      setValidating(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verified) return;
    setError(null);

    if (title.trim().length < 2) {
      setError(t.redeem.errors.missingTitle);
      return;
    }
    if (genderMode === "host" && !trueGender) {
      setError(t.redeem.errors.missingGender);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: verified.code,
          title: title.trim(),
          hostEmail: hostEmail.trim(),
          locale,
          genderMode,
          trueGender: genderMode === "host" ? trueGender : null,
          countdownSeconds,
          allowGuestCollage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not create event");
      }

      // Store host recovery & optional secret link locally so Host Studio shows it right away
      try {
        window.localStorage.setItem(
          `civciv_host_meta_${data.hostToken}`,
          JSON.stringify({
            secretToken: data.secretToken ?? null,
            roomCode: data.roomCode,
          })
        );
      } catch {
        // Non-fatal
      }

      router.push(`/host/${data.hostToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-[600px] px-5 pt-10 pb-14 space-y-6">
      {purchased && (
        <div className="rounded-2xl bg-emerald-950/60 border border-emerald-400/35 p-4 text-sm text-emerald-100 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{t.redeem.purchasedNotice}</span>
        </div>
      )}

      {!verified ? (
        <form
          onSubmit={handleValidate}
          className="surface-card rounded-2xl p-6 sm:p-7 space-y-5"
        >
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl text-[#ffc0cb]">
              {t.redeem.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-200">
              {t.redeem.subtitle}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="redeem-code-input"
              className="block text-xs font-bold uppercase tracking-wider text-[#87ceeb]"
            >
              {t.redeem.codeLabel}
            </label>
            <input
              id="redeem-code-input"
              type="text"
              maxLength={8}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder={t.redeem.codePlaceholder}
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
            id="redeem-validate-btn"
            disabled={validating}
            className="btn-party w-full rounded-xl py-4 text-base cursor-pointer"
          >
            {validating ? t.redeem.validating : t.redeem.validateBtn}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleCreateEvent}
          className="surface-card rounded-2xl p-6 sm:p-7 space-y-6"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="font-display text-2xl text-[#ffc0cb]">
              {t.redeem.setupTitle}
            </h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {verified.code} • {verified.maxGuests} {t.redeem.guestsCapacity}
            </span>
          </div>

          {/* Party Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="event-title-input"
              className="block text-sm font-bold text-slate-100"
            >
              {t.redeem.eventTitleLabel}
            </label>
            <input
              id="event-title-input"
              type="text"
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.redeem.eventTitlePlaceholder}
              className="w-full rounded-xl bg-[#071327] border border-white/15 px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#87ceeb]"
            />
          </div>

          {/* Host Recovery Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="host-email-input"
              className="block text-sm font-bold text-slate-100"
            >
              {t.redeem.hostEmailLabel}
            </label>
            <input
              id="host-email-input"
              type="email"
              value={hostEmail}
              onChange={(e) => setHostEmail(e.target.value)}
              placeholder={t.redeem.hostEmailPlaceholder}
              className="w-full rounded-xl bg-[#071327] border border-white/15 px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#87ceeb]"
            />
          </div>

          {/* Gender Mode: Secret Keeper vs Direct Host */}
          <div className="space-y-2.5">
            <span className="block text-sm font-bold text-slate-100">
              {t.redeem.genderModeLabel}
            </span>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                id="mode-secret-keeper-btn"
                onClick={() => setGenderMode("secret_keeper")}
                className={`text-left rounded-xl p-4 border transition-all cursor-pointer flex items-start gap-3 ${
                  genderMode === "secret_keeper"
                    ? "bg-[#132a52] border-[#ffc0cb]"
                    : "bg-[#071327]/70 border-white/10 hover:border-white/25"
                }`}
              >
                <KeyRound className="w-5 h-5 text-[#ffc0cb] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-sm">
                    {t.redeem.modeSecretTitle}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    {t.redeem.modeSecretDesc}
                  </div>
                </div>
              </button>

              <button
                type="button"
                id="mode-host-direct-btn"
                onClick={() => setGenderMode("host")}
                className={`text-left rounded-xl p-4 border transition-all cursor-pointer flex items-start gap-3 ${
                  genderMode === "host"
                    ? "bg-[#132a52] border-[#87ceeb]"
                    : "bg-[#071327]/70 border-white/10 hover:border-white/25"
                }`}
              >
                <UserCheck className="w-5 h-5 text-[#87ceeb] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-sm">
                    {t.redeem.modeHostTitle}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    {t.redeem.modeHostDesc}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Direct Gender Selection (only when genderMode === "host") */}
          {genderMode === "host" && (
            <div className="space-y-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
                <EyeOff className="w-4 h-4 text-slate-400" />
                {t.redeem.selectGenderLabel}
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="direct-gender-boy"
                  onClick={() => setTrueGender("boy")}
                  className={`rounded-xl py-4 font-display text-lg transition-all cursor-pointer border-2 ${
                    trueGender === "boy"
                      ? "bg-[#38bdf8] text-[#0a1931] border-white shadow-lg"
                      : "bg-[#071327] text-[#87ceeb] border-[#87ceeb]/35 hover:border-[#87ceeb]"
                  }`}
                >
                  {t.brand.boy}
                </button>
                <button
                  type="button"
                  id="direct-gender-girl"
                  onClick={() => setTrueGender("girl")}
                  className={`rounded-xl py-4 font-display text-lg transition-all cursor-pointer border-2 ${
                    trueGender === "girl"
                      ? "bg-[#f472b6] text-[#0a1931] border-white shadow-lg"
                      : "bg-[#071327] text-[#ffc0cb] border-[#ffc0cb]/35 hover:border-[#ffc0cb]"
                  }`}
                >
                  {t.brand.girl}
                </button>
              </div>
            </div>
          )}

          {/* Countdown Duration */}
          <div className="space-y-2">
            <label
              htmlFor="countdown-select"
              className="block text-sm font-bold text-slate-100"
            >
              {t.redeem.countdownLabel}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setCountdownSeconds(sec)}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
                    countdownSeconds === sec
                      ? "bg-white/15 border-[#87ceeb] text-white"
                      : "bg-[#071327] border-white/10 text-slate-300"
                  }`}
                >
                  {sec} {t.redeem.secondsUnit}
                </button>
              ))}
            </div>
          </div>

          {/* Guest Collage Permission */}
          <label className="flex items-start gap-3 cursor-pointer rounded-xl bg-[#071327]/70 p-3.5 border border-white/10">
            <input
              type="checkbox"
              checked={allowGuestCollage}
              onChange={(e) => setAllowGuestCollage(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#87ceeb]"
            />
            <span className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {t.redeem.guestCollageLabel}
            </span>
          </label>

          {error && (
            <p className="text-sm font-semibold text-rose-300 bg-rose-950/50 border border-rose-500/30 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            id="redeem-create-event-btn"
            disabled={creating}
            className="btn-party w-full rounded-xl py-4 text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>{creating ? t.redeem.creating : t.redeem.createBtn}</span>
          </button>
        </form>
      )}
    </div>
  );
}

export default function RedeemPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[600px] px-5 pt-16 text-center text-slate-300">
          ...
        </div>
      }
    >
      <RedeemContent />
    </Suspense>
  );
}
