"use client";

import confetti from "canvas-confetti";
import type { Gender } from "./types";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtor) {
      audioCtx = new AudioCtor();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function primeAudio(): void {
  try {
    getAudioContext();
  } catch {
    // Ignore autoplay restriction until user interacts
  }
}

export function playCountdownTick(secondsLeft: number, muted: boolean): void {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    // Higher pitch for final 3 seconds
    osc.frequency.value = secondsLeft <= 3 ? 880 : 540;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Non-fatal
  }
}

export function playRevealFanfare(muted: boolean): void {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + idx * 0.08;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  } catch {
    // Non-fatal
  }
}

export function triggerHaptic(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Unsupported on iOS Safari; gracefully ignore
  }
}

export function launchRevealConfetti(gender: Gender): void {
  const colors =
    gender === "boy"
      ? ["#38bdf8", "#87ceeb", "#0284c7", "#ffffff", "#bae6fd"]
      : ["#f472b6", "#ffc0cb", "#ec4899", "#ffffff", "#fbcfe8"];

  try {
    confetti({
      particleCount: 95,
      spread: 80,
      origin: { y: 0.6 },
      colors,
    });
    setTimeout(() => {
      confetti({
        particleCount: 65,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 65,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors,
      });
    }, 260);
  } catch {
    // Non-fatal
  }
}

export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      return await navigator.wakeLock.request("screen");
    }
  } catch {
    // Ignore if unsupported or blocked
  }
  return null;
}

/**
 * Estimates clock offset (serverTimeMs - clientTimeMs) using /api/time.
 */
export async function measureServerClockOffset(): Promise<number> {
  try {
    const t0 = Date.now();
    const res = await fetch("/api/time", { cache: "no-store" });
    const t1 = Date.now();
    if (!res.ok) return 0;
    const data = (await res.json()) as { serverTimeMs: number };
    const midpoint = (t0 + t1) / 2;
    return Math.round(data.serverTimeMs - midpoint);
  } catch {
    return 0;
  }
}
