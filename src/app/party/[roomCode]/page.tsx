"use client";

import {
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MemoryCollageModal } from "@/components/MemoryCollageModal";
import { compressSelfieFile } from "@/lib/client-image";
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
import type { Gender, SanitizedEventState } from "@/lib/types";

interface GuestMe {
  id: string;
  name: string;
  prediction: Gender;
  selfieUrl: string | null;
}

export default function GuestPartyRoomPage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = (params.roomCode || "").toUpperCase();
  const { t } = useI18n();

  const [event, setEvent] = useState<SanitizedEventState | null>(null);
  const [me, setMe] = useState<GuestMe | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);

  // Guest form state
  const [name, setName] = useState("");
  const [prediction, setPrediction] = useState<Gender | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [clearSelfie, setClearSelfie] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live sync & sensory state
  const [muted, setMuted] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [collageOpen, setCollageOpen] = useState(false);
  const [showRevealStats, setShowRevealStats] = useState(false);

  const lastTickSecRef = useRef<number | null>(null);
  const realRevealCelebratedRef = useRef(false);
  const rehearsalRevealCelebratedRef = useRef(false);

  const guestStorageKey = `civciv_guest_token_${roomCode}`;

  const getStoredGuestToken = useCallback((): string | null => {
    try {
      return window.localStorage.getItem(guestStorageKey);
    } catch {
      return null;
    }
  }, [guestStorageKey]);

  const fetchRoomState = useCallback(async () => {
    if (!roomCode) return;
    try {
      const token = getStoredGuestToken();
      const res = await fetch(`/api/events/${encodeURIComponent(roomCode)}`, {
        cache: "no-store",
        headers: token ? { "x-guest-token": token } : undefined,
      });
      if (!res.ok) {
        if (res.status === 404) setNotFound(true);
        return;
      }
      const data = (await res.json()) as {
        event: SanitizedEventState;
        me: GuestMe | null;
      };
      setEvent(data.event);
      if (data.me) {
        setMe(data.me);
        setName((prev) => prev || data.me!.name);
        setPrediction((prev) => prev || data.me!.prediction);
      }
    } catch {
      // Keep last known state
    }
  }, [roomCode, getStoredGuestToken]);

  useEffect(() => {
    if (!roomCode) return;
    let active = true;
    const token = getStoredGuestToken();
    fetch(`/api/events/${encodeURIComponent(roomCode)}`, {
      cache: "no-store",
      headers: token ? { "x-guest-token": token } : undefined,
    })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          if (res.status === 404) setNotFound(true);
          return;
        }
        const data = (await res.json()) as {
          event: SanitizedEventState;
          me: GuestMe | null;
        };
        setEvent(data.event);
        if (data.me) {
          setMe(data.me);
          setName((prev) => prev || data.me!.name);
          setPrediction((prev) => prev || data.me!.prediction);
        }
      })
      .catch(() => {});

    void measureServerClockOffset().then((offset) => {
      if (active) setServerOffsetMs(offset);
    });
    return () => {
      active = false;
    };
  }, [roomCode, getStoredGuestToken]);

  // Realtime subscriptions: Supabase Broadcast + SSE + gentle backup poll
  useEffect(() => {
    if (!roomCode) return;
    const unsubSupa = subscribeSupabaseRoom(roomCode, (incoming) => {
      setEvent(incoming);
    });

    const es = new EventSource(
      `/api/events/${encodeURIComponent(roomCode)}/stream`
    );
    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as SanitizedEventState;
        setEvent(parsed);
      } catch {
        // Ignore malformed ping
      }
    };

    const backupPoll = setInterval(() => {
      void fetchRoomState();
    }, 6000);

    return () => {
      unsubSupa?.();
      es.close();
      clearInterval(backupPoll);
    };
  }, [roomCode, fetchRoomState]);

  // Screen Wake Lock while guest is participating in the room
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    if (me && event && event.phase !== "revealed") {
      void requestWakeLock().then((s) => {
        lock = s;
      });
    }
    return () => {
      void lock?.release().catch(() => {});
    };
  }, [me, event]);

  // Determine active visual mode (rehearsal takes precedence before live reveal)
  const isRehearsalActive =
    event && event.phase !== "revealed" && event.phase !== "countdown"
      ? event.rehearsal.phase !== "idle"
      : false;

  const effectivePhase = isRehearsalActive
    ? event!.rehearsal.phase
    : event?.phase ?? "lobby";

  const activeCountdownEndsAt =
    event?.phase === "countdown"
      ? event.countdownEndsAt
      : isRehearsalActive && event?.rehearsal.phase === "countdown"
        ? event.rehearsal.countdownEndsAt
        : null;

  // Synchronized countdown loop
  useEffect(() => {
    if (!activeCountdownEndsAt) {
      lastTickSecRef.current = null;
      return;
    }

    const endMs = new Date(activeCountdownEndsAt).getTime();
    let zeroSynced = false;

    const timer = setInterval(() => {
      const remainingMs = endMs - (Date.now() + serverOffsetMs);
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(secs);
      if (secs > 0 && secs !== lastTickSecRef.current) {
        lastTickSecRef.current = secs;
        playCountdownTick(secs, muted);
        triggerHaptic(30);
      }
      if (remainingMs <= 0 && !zeroSynced) {
        zeroSynced = true;
        // Fetch atomically resolved reveal state from server at T=0
        void fetchRoomState();
      }
    }, 45);

    return () => clearInterval(timer);
  }, [activeCountdownEndsAt, serverOffsetMs, muted, fetchRoomState]);

  // Celebrate real reveal
  useEffect(() => {
    if (
      event?.phase === "revealed" &&
      event.revealedGender &&
      !realRevealCelebratedRef.current
    ) {
      realRevealCelebratedRef.current = true;
      playRevealFanfare(muted);
      triggerHaptic([120, 60, 220]);
      launchRevealConfetti(event.revealedGender);
    }
  }, [event?.phase, event?.revealedGender, muted]);

  // Celebrate rehearsal reveal
  useEffect(() => {
    if (
      isRehearsalActive &&
      event?.rehearsal.phase === "revealed" &&
      event.rehearsal.simulatedGender
    ) {
      if (!rehearsalRevealCelebratedRef.current) {
        rehearsalRevealCelebratedRef.current = true;
        playRevealFanfare(muted);
        triggerHaptic([80, 40, 120]);
        launchRevealConfetti(event.rehearsal.simulatedGender);
      }
    } else {
      rehearsalRevealCelebratedRef.current = false;
    }
  }, [isRehearsalActive, event?.rehearsal.phase, event?.rehearsal.simulatedGender, muted]);

  const handleSelectSelfie = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressSelfieFile(file);
      setSelfieBlob(compressed);
      setSelfiePreview(URL.createObjectURL(compressed));
      setClearSelfie(false);
    } catch {
      setError("Could not process photo");
    }
  };

  const handleSubmitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    primeAudio();
    setError(null);
    if (!name.trim() || !prediction) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("prediction", prediction);
      const existingToken = getStoredGuestToken();
      if (existingToken) formData.set("guestToken", existingToken);
      if (clearSelfie) formData.set("clearSelfie", "true");
      if (selfieBlob) {
        formData.set("selfie", selfieBlob, "selfie.jpg");
      }

      const res = await fetch(
        `/api/events/${encodeURIComponent(roomCode)}/join`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "room_full") {
          setError(t.party.roomFull);
        } else {
          setError(data.error || "Error");
        }
        return;
      }

      try {
        window.localStorage.setItem(guestStorageKey, data.guestToken);
      } catch {
        // Non-fatal
      }

      setMe(data.me);
      setEvent(data.event);
      setSelfieBlob(null);
      setSelfiePreview(null);
      setEditing(false);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-[540px] px-5 pt-16 text-center">
        <div className="surface-card rounded-2xl p-8">
          <p className="font-bold text-rose-300">{t.party.roomNotFound}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-[540px] px-5 pt-16 text-center text-slate-300">
        ...
      </div>
    );
  }

  // 1. FULLSCREEN COLOR SHOW (Each phone lights up in the guest's OWN prediction!)
  if (effectivePhase === "color_show") {
    const myColor = me?.prediction ?? prediction;
    const bgClass =
      myColor === "boy"
        ? "bg-[#38bdf8]"
        : myColor === "girl"
          ? "bg-[#f472b6]"
          : "bg-gradient-to-b from-[#38bdf8] to-[#f472b6]";

    return (
      <div
        className={`fixed inset-0 z-50 ${bgClass} flex flex-col items-center justify-between p-8 text-center select-none transition-colors duration-300`}
      >
        <div>
          {isRehearsalActive && (
            <span className="inline-block rounded-full bg-[#0a1931] text-amber-300 px-4 py-1.5 text-xs font-black tracking-wider">
              {t.party.rehearsalTag}
            </span>
          )}
        </div>
        <div className="space-y-3">
          {myColor && (
            <div className="font-display text-5xl sm:text-7xl text-[#0a1931]">
              {myColor === "boy" ? t.brand.boy : t.brand.girl}
            </div>
          )}
          <p className="font-extrabold text-lg text-[#0a1931]/85">
            {t.party.colorShowHint}
          </p>
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-[#0a1931]/65">
          {event.title} • boyorgirl.party
        </div>
      </div>
    );
  }

  // 2. FULLSCREEN SYNCHRONIZED COUNTDOWN
  if (effectivePhase === "countdown") {
    return (
      <div className="fixed inset-0 z-50 bg-[#050d1c] flex flex-col items-center justify-center p-6 text-center select-none">
        {isRehearsalActive && (
          <span className="mb-6 inline-block rounded-full bg-amber-400 text-[#0a1931] px-4 py-1.5 text-xs font-black tracking-wider">
            {t.party.rehearsalTag}
          </span>
        )}
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

  // 3. FULLSCREEN REVEALED (Real Reveal OR Simulated Rehearsal Reveal)
  if (effectivePhase === "revealed") {
    const shownGender: Gender | null = isRehearsalActive
      ? event.rehearsal.simulatedGender
      : event.revealedGender;

    if (shownGender) {
      const isBoy = shownGender === "boy";
      const guessedRight = me ? me.prediction === shownGender : null;

      return (
        <div
          className={`fixed inset-0 z-50 overflow-y-auto transition-colors duration-300 ${
            isBoy ? "bg-[#38bdf8]" : "bg-[#f472b6]"
          }`}
        >
          <div className="min-h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
            {isRehearsalActive && (
              <span className="inline-block rounded-full bg-[#0a1931] text-amber-300 px-4 py-1.5 text-xs font-black tracking-wider shadow-lg">
                {t.party.rehearsalTag}
              </span>
            )}

            <div className="space-y-2">
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#0a1931]/75">
                {event.title}
              </p>
              <h1
                id="guest-reveal-headline"
                className="font-display text-6xl sm:text-8xl text-[#0a1931]"
              >
                {isBoy ? t.brand.boyBang : t.brand.girlBang}
              </h1>
              {!isRehearsalActive && guessedRight !== null && (
                <p className="text-lg font-extrabold text-[#0a1931]/90 pt-1">
                  {guessedRight
                    ? `★ ${t.party.revealedRight}`
                    : t.party.revealedSurprise}
                </p>
              )}
            </div>

            {!isRehearsalActive && (
              <div className="w-full max-w-sm space-y-3 pt-4">
                {!showRevealStats ? (
                  <button
                    type="button"
                    id="guest-show-results-btn"
                    onClick={() => setShowRevealStats(true)}
                    className="w-full rounded-xl bg-[#0a1931] text-white font-bold py-4 px-5 shadow-xl hover:bg-[#11264b] cursor-pointer"
                  >
                    {t.party.statsHeading} & {t.party.downloadCollage}
                  </button>
                ) : (
                  <div className="rounded-2xl bg-[#0a1931]/95 text-white p-5 space-y-4 shadow-2xl text-left">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-base text-[#ffc0cb]">
                        {t.party.statsHeading}
                      </h2>
                      <span className="text-xs text-slate-300">
                        {event.stats.total} {t.party.guestsJoined}
                      </span>
                    </div>

                    <div className="h-3 rounded-full overflow-hidden bg-slate-800 flex">
                      <div
                        className="bg-[#38bdf8]"
                        style={{ width: `${event.stats.boyPercent}%` }}
                      />
                      <div
                        className="bg-[#f472b6]"
                        style={{ width: `${event.stats.girlPercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#87ceeb]">
                        {t.brand.boy}: %{event.stats.boyPercent} (
                        {event.stats.boyCount})
                      </span>
                      <span className="text-[#ffc0cb]">
                        {t.brand.girl}: %{event.stats.girlPercent} (
                        {event.stats.girlCount})
                      </span>
                    </div>

                    {event.allowGuestCollage ? (
                      <button
                        type="button"
                        id="guest-open-collage-btn"
                        onClick={() => setCollageOpen(true)}
                        className="btn-party w-full rounded-xl py-3.5 px-4 text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>{t.party.downloadCollage}</span>
                      </button>
                    ) : (
                      <p className="text-xs text-slate-400 text-center">
                        {t.party.collageHostOnly}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isRehearsalActive && event.revealedGender && (
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
  }

  // 4. LOBBY VIEW (Form OR Waiting Screen)
  return (
    <div className="mx-auto max-w-[540px] px-5 pt-8 pb-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#87ceeb]">
          <span>#{event.roomCode}</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {event.stats.total} {t.party.guestsJoined}
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl text-[#ffc0cb]">
          {event.title}
        </h1>
      </div>

      {!me || editing ? (
        <form
          onSubmit={handleSubmitGuess}
          className="surface-card rounded-2xl p-6 space-y-5"
        >
          {/* Guest Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="guest-name-input"
              className="block text-sm font-bold text-slate-100"
            >
              {t.party.yourName}
            </label>
            <input
              id="guest-name-input"
              type="text"
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.party.namePlaceholder}
              className="w-full rounded-xl bg-[#071327] border border-white/15 px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#87ceeb]"
            />
          </div>

          {/* Boy / Girl Prediction */}
          <div className="space-y-2">
            <span className="block text-sm font-bold text-slate-100">
              {t.party.yourGuess}
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="guest-guess-boy"
                onClick={() => {
                  primeAudio();
                  setPrediction("boy");
                }}
                className={`rounded-2xl py-6 font-display text-2xl transition-all cursor-pointer border-2 ${
                  prediction === "boy"
                    ? "bg-[#38bdf8] text-[#0a1931] border-white shadow-[0_0_25px_rgba(56,189,248,0.45)] scale-[1.02]"
                    : "bg-[#071327] text-[#87ceeb] border-[#87ceeb]/35 hover:border-[#87ceeb]"
                }`}
              >
                {t.brand.boy}
              </button>
              <button
                type="button"
                id="guest-guess-girl"
                onClick={() => {
                  primeAudio();
                  setPrediction("girl");
                }}
                className={`rounded-2xl py-6 font-display text-2xl transition-all cursor-pointer border-2 ${
                  prediction === "girl"
                    ? "bg-[#f472b6] text-[#0a1931] border-white shadow-[0_0_25px_rgba(244,114,182,0.45)] scale-[1.02]"
                    : "bg-[#071327] text-[#ffc0cb] border-[#ffc0cb]/35 hover:border-[#ffc0cb]"
                }`}
              >
                {t.brand.girl}
              </button>
            </div>
          </div>

          {/* Optional Selfie Upload */}
          <div className="space-y-2">
            <span className="block text-sm font-bold text-slate-100">
              {t.party.selfieOptional}
            </span>
            <p className="text-xs text-slate-400">{t.party.selfieDesc}</p>

            <div className="flex items-center gap-4 pt-1">
              {(selfiePreview || (!clearSelfie && me?.selfieUrl)) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selfiePreview || me?.selfieUrl || ""}
                  alt="Selfie preview"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#87ceeb]"
                />
              )}
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2.5 text-xs font-bold text-white cursor-pointer">
                  <Camera className="w-4 h-4 text-[#ffc0cb]" />
                  <span>
                    {selfiePreview || (!clearSelfie && me?.selfieUrl)
                      ? t.party.changeSelfie
                      : t.party.takeSelfie}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSelectSelfie}
                    className="hidden"
                  />
                </label>

                {(selfiePreview || (!clearSelfie && me?.selfieUrl)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieBlob(null);
                      setSelfiePreview(null);
                      setClearSelfie(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-rose-950/60 hover:bg-rose-900 px-3 py-2.5 text-xs font-bold text-rose-200 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.party.removeSelfie}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm font-semibold text-rose-300 bg-rose-950/50 border border-rose-500/30 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            id="guest-submit-guess-btn"
            disabled={submitting || !name.trim() || !prediction}
            className="btn-party w-full rounded-xl py-4 text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>
              {submitting ? t.party.updatingGuess : t.party.submitGuess}
            </span>
          </button>
        </form>
      ) : (
        <div className="surface-card rounded-2xl p-6 sm:p-7 text-center space-y-5">
          <div className="flex justify-center">
            {me.selfieUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={me.selfieUrl}
                alt={me.name}
                className={`w-24 h-24 rounded-full object-cover border-4 shadow-xl ${
                  me.prediction === "boy"
                    ? "border-[#38bdf8]"
                    : "border-[#f472b6]"
                }`}
              />
            ) : (
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center font-display text-3xl text-white border-4 shadow-xl ${
                  me.prediction === "boy"
                    ? "bg-sky-900 border-[#38bdf8]"
                    : "bg-pink-900 border-[#f472b6]"
                }`}
              >
                {me.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-emerald-300 text-xs font-extrabold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.party.lobbyReadyTitle}</span>
            </div>
            <h2 className="font-display text-2xl text-white">{me.name}</h2>
            <p className="text-sm font-bold">
              <span className="text-slate-400">{t.party.yourPredictionWas} </span>
              <span
                className={
                  me.prediction === "boy" ? "text-[#87ceeb]" : "text-[#ffc0cb]"
                }
              >
                {me.prediction === "boy" ? t.brand.boy : t.brand.girl}
              </span>
            </p>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed bg-[#071327] rounded-xl p-4">
            {t.party.lobbyReadyDesc}
          </p>

          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              id="guest-edit-guess-btn"
              onClick={() => setEditing(true)}
              className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2.5 text-xs font-bold text-white cursor-pointer"
            >
              {t.party.editGuess}
            </button>
            <button
              type="button"
              onClick={() => {
                primeAudio();
                setMuted((m) => !m);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2.5 text-xs font-bold text-white cursor-pointer"
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#87ceeb]" />
              )}
              <span>{muted ? t.party.soundOff : t.party.soundOn}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
