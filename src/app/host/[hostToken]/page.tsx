"use client";

import {
  Check,
  CheckCircle2,
  Copy,
  FlaskConical,
  Image as ImageIcon,
  KeyRound,
  Printer,
  Share2,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { HoldToConfirmButton } from "@/components/HoldToConfirmButton";
import { MemoryCollageModal } from "@/components/MemoryCollageModal";
import { useI18n } from "@/lib/i18n/context";
import {
  launchRevealConfetti,
  measureServerClockOffset,
  playCountdownTick,
  playRevealFanfare,
  primeAudio,
  requestWakeLock,
  triggerHaptic,
} from "@/lib/sound-and-effects";
import { subscribeSupabaseRoom } from "@/lib/supabase-browser";
import type { SanitizedEventState } from "@/lib/types";

export default function HostStudioPage() {
  const params = useParams<{ hostToken: string }>();
  const hostToken = params.hostToken;
  const { locale, t } = useI18n();

  const [event, setEvent] = useState<SanitizedEventState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secretToken, setSecretToken] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [collageOpen, setCollageOpen] = useState(false);
  const [showHostFullscreenReveal, setShowHostFullscreenReveal] = useState(true);

  // Synchronized countdown display
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastTickSecondRef = useRef<number | null>(null);
  const revealFiredRef = useRef(false);
  const finalizeCalledRef = useRef(false);

  const fetchHostState = useCallback(async () => {
    if (!hostToken) return;
    try {
      const res = await fetch(`/api/host/${encodeURIComponent(hostToken)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) setNotFound(true);
        return;
      }
      const data = (await res.json()) as SanitizedEventState;
      setEvent(data);
    } catch {
      // Retain last known state on brief network glitch
    }
  }, [hostToken]);

  useEffect(() => {
    if (!hostToken) return;
    let active = true;
    fetch(`/api/host/${encodeURIComponent(hostToken)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          if (res.status === 404) setNotFound(true);
          return;
        }
        const data = (await res.json()) as SanitizedEventState;
        setEvent(data);
        try {
          const raw = window.localStorage.getItem(
            `civciv_host_meta_${hostToken}`
          );
          if (raw) {
            const parsed = JSON.parse(raw) as { secretToken?: string | null };
            if (parsed.secretToken) setSecretToken(parsed.secretToken);
          }
        } catch {
          // Ignore
        }
      })
      .catch(() => {});

    void measureServerClockOffset().then((offset) => {
      if (active) setServerOffsetMs(offset);
    });
    return () => {
      active = false;
    };
  }, [hostToken]);

  // Generate QR code once roomCode is known
  useEffect(() => {
    if (!event?.roomCode || typeof window === "undefined") return;
    const roomUrl = `${window.location.origin}/party/${event.roomCode}`;
    QRCode.toDataURL(roomUrl, {
      width: 320,
      margin: 2,
      color: { dark: "#0A1931", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [event?.roomCode]);

  // Subscribe to realtime updates (Supabase Broadcast + SSE + gentle backup poll)
  useEffect(() => {
    if (!event?.roomCode) return;
    const unsubSupa = subscribeSupabaseRoom(event.roomCode, (incoming) => {
      // Refresh full host view (including full participant list)
      setEvent((prev) =>
        prev
          ? {
              ...incoming,
              participants:
                incoming.participants.length > 0 || incoming.stats.total === 0
                  ? incoming.participants
                  : prev.participants,
            }
          : incoming
      );
    });

    const es = new EventSource(
      `/api/events/${encodeURIComponent(event.roomCode)}/stream`
    );
    es.onmessage = () => {
      void fetchHostState();
    };

    const interval = setInterval(() => {
      void fetchHostState();
    }, 5000);

    return () => {
      unsubSupa?.();
      es.close();
      clearInterval(interval);
    };
  }, [event?.roomCode, fetchHostState]);

  // Screen Wake Lock during live party
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    if (
      event &&
      (event.phase === "color_show" ||
        event.phase === "countdown" ||
        event.rehearsal.phase !== "idle")
    ) {
      void requestWakeLock().then((s) => {
        lock = s;
      });
    }
    return () => {
      void lock?.release().catch(() => {});
    };
  }, [event]);

  const sendHostAction = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/host/${encodeURIComponent(hostToken)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = (await res.json()) as SanitizedEventState;
          setEvent(updated);
        }
      } finally {
        setBusy(false);
      }
    },
    [hostToken]
  );

  // High-precision countdown loop for both real countdown and rehearsal countdown
  const activeCountdownEndsAt =
    event?.phase === "countdown"
      ? event.countdownEndsAt
      : event?.rehearsal.phase === "countdown"
        ? event.rehearsal.countdownEndsAt
        : null;

  useEffect(() => {
    if (!activeCountdownEndsAt) {
      lastTickSecondRef.current = null;
      finalizeCalledRef.current = false;
      return;
    }

    const endMs = new Date(activeCountdownEndsAt).getTime();
    const timer = setInterval(() => {
      const remainingMs = endMs - (Date.now() + serverOffsetMs);
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(secs);
      if (secs > 0 && secs !== lastTickSecondRef.current) {
        lastTickSecondRef.current = secs;
        playCountdownTick(secs, muted);
        triggerHaptic(35);
      }
      if (remainingMs <= 0 && !finalizeCalledRef.current) {
        finalizeCalledRef.current = true;
        if (event?.phase === "countdown") {
          void sendHostAction({ action: "finalize_reveal" });
        } else {
          void fetchHostState();
        }
      }
    }, 50);

    return () => clearInterval(timer);
  }, [
    activeCountdownEndsAt,
    serverOffsetMs,
    muted,
    event?.phase,
    sendHostAction,
    fetchHostState,
  ]);

  // Trigger confetti & fanfare on Host's own phone when real reveal happens!
  useEffect(() => {
    if (
      event?.phase === "revealed" &&
      event.revealedGender &&
      !revealFiredRef.current
    ) {
      revealFiredRef.current = true;
      setShowHostFullscreenReveal(true);
      playRevealFanfare(muted);
      triggerHaptic([120, 60, 220]);
      launchRevealConfetti(event.revealedGender);
    }
  }, [event?.phase, event?.revealedGender, muted]);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Ignore
    }
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-[540px] px-5 pt-16 text-center">
        <div className="surface-card rounded-2xl p-8 space-y-2">
          <p className="font-bold text-rose-300">
            {locale === "tr"
              ? "Geçersiz veya bulunamayan yönetim linki."
              : "Host link not found or invalid."}
          </p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-[600px] px-5 pt-16 text-center text-slate-300">
        ...
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const roomUrl = `${origin}/party/${event.roomCode}`;
  const secretUrl = secretToken ? `${origin}/secret/${secretToken}` : null;

  // FULLSCREEN OVERLAY ON HOST PHONE DURING LIVE COUNTDOWN OR REAL REVEAL!
  if (event.phase === "countdown") {
    return (
      <div className="fixed inset-0 z-50 bg-[#050d1c] flex flex-col items-center justify-center p-6 text-center select-none">
        <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-[#87ceeb] mb-4">
          {t.party.countdownGetReady}
        </p>
        <div className="font-display text-[130px] sm:text-[180px] leading-none text-white animate-countdown-pop">
          {secondsLeft ?? event.countdownSeconds}
        </div>
        <p className="mt-6 text-base text-slate-300">{event.title}</p>
      </div>
    );
  }

  if (
    event.phase === "revealed" &&
    event.revealedGender &&
    showHostFullscreenReveal
  ) {
    const isBoy = event.revealedGender === "boy";
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center transition-colors duration-300 ${
          isBoy ? "bg-[#38bdf8]" : "bg-[#f472b6]"
        }`}
      >
        <p className="font-extrabold uppercase tracking-[0.22em] text-[#0a1931]/75 text-sm mb-3">
          {t.host.revealBannerText}
        </p>
        <h1 className="font-display text-6xl sm:text-8xl text-[#0a1931] drop-shadow-sm">
          {isBoy ? t.brand.boyBang : t.brand.girlBang}
        </h1>
        <p className="mt-4 font-bold text-lg text-[#0a1931]/90">{event.title}</p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <button
            type="button"
            id="host-reveal-open-collage"
            onClick={() => {
              setShowHostFullscreenReveal(false);
              setCollageOpen(true);
            }}
            className="w-full rounded-xl bg-[#0a1931] text-white font-bold py-3.5 px-5 shadow-xl hover:bg-[#11264b] cursor-pointer"
          >
            {t.host.openCollage}
          </button>
          <button
            type="button"
            id="host-reveal-back-studio"
            onClick={() => setShowHostFullscreenReveal(false)}
            className="w-full rounded-xl bg-white/30 backdrop-blur text-[#0a1931] font-extrabold py-3.5 px-5 hover:bg-white/45 cursor-pointer"
          >
            {t.host.backToControls}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[740px] px-5 pt-6 pb-16 space-y-6">
      {/* Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#87ceeb]">
            {t.host.studioLabel}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl text-[#ffc0cb]">
            {event.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            primeAudio();
            setMuted((m) => !m);
          }}
          className="no-print inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
        >
          {muted ? (
            <VolumeX className="w-4 h-4 text-slate-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-[#87ceeb]" />
          )}
          <span>{muted ? t.party.soundOff : t.party.soundOn}</span>
        </button>
      </div>

      {/* Secret Keeper / Gender Readiness Status (ZERO-LEAK: never shows true_gender!) */}
      {!event.genderConfigured ? (
        <div className="rounded-2xl bg-amber-950/50 border border-amber-400/40 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="font-display text-lg text-amber-200">
                {t.host.secretWaitingTitle}
              </h2>
              <p className="text-sm text-amber-100/90 leading-relaxed">
                {t.host.secretWaitingDesc}
              </p>
            </div>
          </div>
          {secretUrl && (
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={secretUrl}
                className="flex-1 rounded-xl bg-[#071327] border border-white/15 px-3 py-2.5 text-xs font-mono text-slate-200"
              />
              <button
                type="button"
                id="host-copy-secret-link"
                onClick={() => copyText("secret", secretUrl)}
                className="btn-party rounded-xl px-4 py-2.5 text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedKey === "secret" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>
                  {copiedKey === "secret"
                    ? t.host.copied
                    : t.host.copySecretLink}
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-emerald-950/45 border border-emerald-400/35 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-sm text-emerald-200">
              {t.host.secretReadyTitle}
            </div>
            <div className="text-xs text-emerald-100/80">
              {event.genderMode === "secret_keeper"
                ? t.host.secretReadyDesc
                : t.host.directGenderHint}
            </div>
          </div>
        </div>
      )}

      {/* QR Code & Guest Share Card */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {qrDataUrl && (
            <div className="bg-white p-3 rounded-2xl shadow-lg shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR ${event.roomCode}`}
                className="w-40 h-40 block"
              />
            </div>
          )}
          <div className="flex-1 text-center sm:text-left space-y-3 w-full">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#87ceeb]">
                {t.host.roomCode}
              </div>
              <div
                id="host-room-code"
                className="font-mono text-4xl font-black tracking-[0.22em] text-white"
              >
                {event.roomCode}
              </div>
            </div>

            <div className="no-print flex flex-wrap gap-2 justify-center sm:justify-start">
              <button
                type="button"
                id="host-copy-room-link"
                onClick={() => copyText("room", roomUrl)}
                className="rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === "room" ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-[#87ceeb]" />
                )}
                <span>
                  {copiedKey === "room" ? t.host.copied : t.host.copyRoomLink}
                </span>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `${event.title} — ${roomUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-600/80 hover:bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white inline-flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>{t.host.shareWhatsapp}</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#ffc0cb]" />
                <span>{t.host.printQr}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Live Party Phase Controls */}
      <section className="no-print surface-card rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display text-xl text-[#ffc0cb] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#87ceeb]" />
            <span>{t.host.phaseTitle}</span>
          </h2>
          <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-[#071327] text-[#87ceeb] border border-white/10">
            {t.host.phases[event.phase]}
          </span>
        </div>

        {event.phase !== "revealed" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="host-phase-lobby-btn"
                disabled={busy || event.phase === "lobby"}
                onClick={() =>
                  sendHostAction({ action: "set_phase", phase: "lobby" })
                }
                className={`rounded-xl py-3.5 px-4 text-sm font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
                  event.phase === "lobby"
                    ? "bg-[#17305c] border-[#87ceeb] text-white"
                    : "bg-[#071327] border-white/15 text-slate-200 hover:bg-white/10"
                }`}
              >
                {t.host.backToLobby}
              </button>

              <button
                type="button"
                id="host-phase-colorshow-btn"
                disabled={busy || event.phase === "color_show"}
                onClick={() => {
                  primeAudio();
                  void sendHostAction({
                    action: "set_phase",
                    phase: "color_show",
                  });
                }}
                className={`rounded-xl py-3.5 px-4 text-sm font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
                  event.phase === "color_show"
                    ? "bg-[#17305c] border-[#ffc0cb] text-white"
                    : "bg-[#071327] border-white/15 text-slate-200 hover:bg-white/10"
                }`}
              >
                {t.host.startColorShow}
              </button>
            </div>

            <div className="pt-2 border-t border-white/10">
              {!event.genderConfigured ? (
                <p className="text-xs text-center text-amber-300 font-semibold py-2">
                  {t.host.mustSetGenderFirst}
                </p>
              ) : (
                <HoldToConfirmButton
                  id="host-hold-countdown-btn"
                  label={t.host.holdToReveal}
                  subtext={t.host.holdSubtext}
                  disabled={busy}
                  onConfirm={() => {
                    primeAudio();
                    return sendHostAction({ action: "start_countdown" });
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={`rounded-2xl p-5 text-center ${
                event.revealedGender === "boy"
                  ? "bg-[#38bdf8]/20 border border-[#38bdf8]/50"
                  : "bg-[#f472b6]/20 border border-[#f472b6]/50"
              }`}
            >
              <div className="font-display text-3xl text-white">
                {event.revealedGender === "boy"
                  ? t.brand.boyBang
                  : t.brand.girlBang}
              </div>
              <div className="mt-2 text-sm text-slate-200">
                {t.brand.boy}: %{event.stats.boyPercent} ({event.stats.boyCount})
                {" • "}
                {t.brand.girl}: %{event.stats.girlPercent} (
                {event.stats.girlCount})
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="host-open-collage-btn"
                onClick={() => setCollageOpen(true)}
                className="btn-party rounded-xl py-3.5 px-4 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                <span>{t.host.openCollage}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHostFullscreenReveal(true)}
                className="rounded-xl bg-white/10 hover:bg-white/15 py-3.5 px-4 text-sm font-bold text-white cursor-pointer"
              >
                {t.host.revealBannerText}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Unlimited Rehearsal Mode (available before live reveal) */}
      {event.phase !== "revealed" && (
        <section className="no-print surface-card rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-lg text-[#87ceeb] flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              <span>{t.host.rehearsalTitle}</span>
            </h2>
            {event.rehearsal.phase !== "idle" && (
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400 text-[#0a1931]">
                {t.host.rehearsalActive}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {t.host.rehearsalDesc}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              id="host-rehearsal-color-btn"
              disabled={busy}
              onClick={() =>
                sendHostAction({
                  action: "rehearsal",
                  rehearsalPhase: "color_show",
                })
              }
              className="rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white cursor-pointer"
            >
              {t.host.rehearsalColorShow}
            </button>
            <button
              type="button"
              id="host-rehearsal-countdown-btn"
              disabled={busy}
              onClick={() => {
                primeAudio();
                void sendHostAction({
                  action: "rehearsal",
                  rehearsalPhase: "countdown",
                });
              }}
              className="rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white cursor-pointer"
            >
              {t.host.rehearsalCountdown}
            </button>
            {event.rehearsal.phase !== "idle" && (
              <button
                type="button"
                id="host-rehearsal-stop-btn"
                disabled={busy}
                onClick={() =>
                  sendHostAction({
                    action: "rehearsal",
                    rehearsalPhase: "idle",
                  })
                }
                className="rounded-xl bg-amber-400 hover:bg-amber-300 px-3.5 py-2.5 text-xs font-extrabold text-[#0a1931] cursor-pointer"
              >
                {t.host.rehearsalStop}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Guests List & Live Moderation */}
      <section className="no-print surface-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display text-lg text-[#ffc0cb] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#87ceeb]" />
            <span>
              {t.host.guestsTitle} ({event.stats.total} / {event.maxGuests})
            </span>
          </h2>
          <div className="text-xs font-bold flex items-center gap-3">
            <span className="text-[#87ceeb]">
              {t.brand.boy}: {event.stats.boyCount} (%{event.stats.boyPercent})
            </span>
            <span className="text-[#ffc0cb]">
              {t.brand.girl}: {event.stats.girlCount} (%{event.stats.girlPercent})
            </span>
          </div>
        </div>

        {/* Live Prediction Bar */}
        <div className="h-3 rounded-full overflow-hidden bg-[#071327] flex">
          <div
            className="bg-[#38bdf8] transition-all duration-300"
            style={{ width: `${event.stats.boyPercent}%` }}
          />
          <div
            className="bg-[#f472b6] transition-all duration-300"
            style={{ width: `${event.stats.girlPercent}%` }}
          />
        </div>

        {event.participants.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            {t.host.noGuestsYet}
          </p>
        ) : (
          <ul className="divide-y divide-white/10 max-h-[360px] overflow-y-auto pr-1">
            {event.participants.map((p) => (
              <li
                key={p.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.selfieUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.selfieUrl}
                      alt={p.name}
                      className={`w-11 h-11 rounded-full object-cover border-2 shrink-0 ${
                        p.prediction === "boy"
                          ? "border-[#38bdf8]"
                          : "border-[#f472b6]"
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-display text-sm text-white shrink-0 border-2 ${
                        p.prediction === "boy"
                          ? "bg-sky-900 border-[#38bdf8]"
                          : "bg-pink-900 border-[#f472b6]"
                      }`}
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">
                      {p.name}
                    </div>
                    <div
                      className={`text-xs font-bold ${
                        p.prediction === "boy"
                          ? "text-[#87ceeb]"
                          : "text-[#ffc0cb]"
                      }`}
                    >
                      {p.prediction === "boy" ? t.brand.boy : t.brand.girl}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    sendHostAction({
                      action: "remove_participant",
                      participantId: p.id,
                    })
                  }
                  className="text-xs font-semibold text-slate-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 cursor-pointer"
                >
                  {t.host.removeGuest}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Privacy & Settings */}
      <section className="no-print surface-card rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-lg text-white flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#ffc0cb]" />
          <span>{t.host.settingsTitle}</span>
        </h2>

        <label className="flex items-center justify-between gap-3 rounded-xl bg-[#071327] p-4 cursor-pointer">
          <span className="text-sm text-slate-200 font-semibold">
            {t.host.allowCollageToggle}
          </span>
          <input
            type="checkbox"
            checked={event.allowGuestCollage}
            onChange={(e) =>
              sendHostAction({
                action: "update_settings",
                allowGuestCollage: e.target.checked,
              })
            }
            className="w-5 h-5 accent-[#87ceeb]"
          />
        </label>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#071327] p-4">
          <div className="text-xs text-slate-300">
            {event.photosDeleted ? (
              <span className="text-emerald-300 font-bold">
                {t.host.photosDeletedBadge}
              </span>
            ) : (
              <span>
                {t.host.photosExpireNote}{" "}
                <strong className="text-white">
                  {new Date(event.photosExpiresAt).toLocaleDateString(
                    locale === "tr" ? "tr-TR" : "en-US"
                  )}
                </strong>
              </span>
            )}
          </div>
          {!event.photosDeleted && (
            <button
              type="button"
              id="host-delete-photos-btn"
              onClick={() => {
                if (window.confirm(t.host.deletePhotosConfirm)) {
                  void sendHostAction({ action: "delete_photos" });
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 px-3.5 py-2 text-xs font-bold text-rose-200 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.host.deletePhotosBtn}</span>
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {t.host.hostRecoveryNote}
        </p>
      </section>

      {event.phase === "revealed" && event.revealedGender && (
        <MemoryCollageModal
          open={collageOpen}
          onClose={() => setCollageOpen(false)}
          title={event.title}
          revealedGender={event.revealedGender}
          stats={event.stats}
          participants={event.participants}
          dateIso={event.revealedAt}
        />
      )}
    </div>
  );
}
