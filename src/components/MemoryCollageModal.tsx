"use client";

import { Download, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type CollageFormat,
  generateMemoryCollageDataUrl,
} from "@/lib/collage";
import { useI18n } from "@/lib/i18n/context";
import type { Gender, PartyStats, SanitizedParticipant } from "@/lib/types";

interface MemoryCollageModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  revealedGender: Gender;
  stats: PartyStats;
  participants: SanitizedParticipant[];
  dateIso?: string | null;
}

export function MemoryCollageModal({
  open,
  onClose,
  title,
  revealedGender,
  stats,
  participants,
  dateIso,
}: MemoryCollageModalProps) {
  const { locale, t } = useI18n();
  const [format, setFormat] = useState<CollageFormat>("story");
  const [rendered, setRendered] = useState<{
    key: string;
    url: string;
  } | null>(null);

  const renderKey = `${format}|${title}|${revealedGender}|${stats.total}|${participants.length}|${locale}`;
  const dataUrl = rendered?.key === renderKey ? rendered.url : null;
  const rendering = open && !dataUrl;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    generateMemoryCollageDataUrl({
      format,
      title,
      revealedGender,
      stats,
      participants,
      locale,
      dateIso,
    })
      .then((url) => {
        if (!cancelled) {
          setRendered({ key: renderKey, url });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    open,
    renderKey,
    format,
    title,
    revealedGender,
    stats,
    participants,
    locale,
    dateIso,
  ]);

  if (!open) return null;

  const fileName = `boyorgirl-${format}-${revealedGender}.png`;

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  };

  const handleShare = async () => {
    if (!dataUrl || typeof navigator === "undefined" || !navigator.share) {
      handleDownload();
      return;
    }
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text: "boyorgirl.party",
          files: [file],
        });
      } else {
        handleDownload();
      }
    } catch {
      // User cancelled share
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="surface-card w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-[#ffc0cb]">
            {t.collage.modalTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.collage.close}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#071327]">
          <button
            type="button"
            id="collage-tab-story"
            onClick={() => setFormat("story")}
            className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              format === "story"
                ? "bg-white/15 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t.collage.storyTab}
          </button>
          <button
            type="button"
            id="collage-tab-square"
            onClick={() => setFormat("square")}
            className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              format === "square"
                ? "bg-white/15 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t.collage.squareTab}
          </button>
        </div>

        <div className="rounded-xl overflow-hidden bg-[#071327] flex items-center justify-center min-h-[300px] p-2">
          {rendering || !dataUrl ? (
            <p className="text-sm text-slate-300 py-20">{t.collage.generating}</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={t.collage.modalTitle}
              className="max-h-[52dvh] w-auto rounded-lg shadow-2xl object-contain"
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            id="collage-download-btn"
            disabled={!dataUrl || rendering}
            onClick={handleDownload}
            className="btn-party rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t.collage.downloadBtn}</span>
          </button>
          <button
            type="button"
            id="collage-share-btn"
            disabled={!dataUrl || rendering}
            onClick={handleShare}
            className="rounded-xl py-3.5 px-4 bg-white/10 hover:bg-white/15 text-white font-bold flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer disabled:opacity-45"
          >
            <Share2 className="w-4 h-4" />
            <span>{t.collage.shareBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
