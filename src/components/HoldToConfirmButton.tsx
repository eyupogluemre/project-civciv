"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface HoldToConfirmButtonProps {
  id?: string;
  label: string;
  subtext?: string;
  durationMs?: number;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function HoldToConfirmButton({
  id,
  label,
  subtext,
  durationMs = 1500,
  disabled = false,
  onConfirm,
}: HoldToConfirmButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const cancelHold = useCallback(() => {
    setHolding(false);
    startTimeRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!firedRef.current) {
      setProgress(0);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const startHold = () => {
    if (disabled) return;
    firedRef.current = false;
    setHolding(true);
    startTimeRef.current = performance.now();

    const step = () => {
      if (startTimeRef.current === null) return;
      const elapsed = performance.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);
      if (pct >= 100 && !firedRef.current) {
        firedRef.current = true;
        setHolding(false);
        startTimeRef.current = null;
        void onConfirm();
        setTimeout(() => {
          firedRef.current = false;
          setProgress(0);
        }, 600);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  };

  return (
    <div className="space-y-1.5">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !holding) {
            e.preventDefault();
            startHold();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            cancelHold();
          }
        }}
        className="relative w-full overflow-hidden rounded-xl py-4 px-5 font-extrabold text-[#0a1931] select-none touch-none cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed bg-gradient-to-r from-[#87ceeb] via-[#d0c4f2] to-[#ffc0cb] shadow-lg transition-transform active:scale-[0.99]"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-white/45 transition-none"
          style={{ width: `${progress}%` }}
        />
        <span className="relative z-10 flex items-center justify-center gap-2 text-base">
          {label}
        </span>
      </button>
      {subtext && (
        <p className="text-center text-xs text-slate-400">{subtext}</p>
      )}
    </div>
  );
}
