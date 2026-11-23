"use client";

import {
  ArrowRight,
  Gift,
  Globe,
  KeyRound,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function HomePage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-[680px] px-5 pt-6 pb-8 space-y-10">
      {/* Hero */}
      <section className="space-y-6">
        <div className="overflow-hidden rounded-[22px] border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/main2.webp"
            alt="boyorgirl.party — Gender reveal crowd holding lit blue and pink smartphones"
            className="w-full h-auto block object-cover"
          />
        </div>

        <div className="space-y-4">
          <h1 className="font-display text-3xl sm:text-4xl leading-[1.15] text-[#ffc0cb]">
            {t.home.heroTitle}
          </h1>
          <p className="text-base sm:text-lg leading-relaxed text-slate-200">
            <span className="font-extrabold">
              <span className="text-[#87ceeb]">boy</span>
              <span className="text-white">or</span>
              <span className="text-[#ffc0cb]">girl</span>
              <span className="text-slate-300">.party</span>
            </span>{" "}
            {t.home.heroSubtitle}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Link
              href="/pricing"
              id="home-hero-pricing-cta"
              className="btn-party rounded-xl py-3.5 px-5 text-center text-base inline-flex items-center justify-center gap-2"
            >
              <span>{t.home.heroPrimaryCta}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/join"
              id="home-hero-join-cta"
              className="rounded-xl py-3.5 px-5 text-center text-base font-bold text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-[#87ceeb]" />
              <span>{t.home.heroSecondaryCta}</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="h-[2px] w-full bg-[#87ceeb]/60 rounded-full" />

      {/* How It Works */}
      <section className="space-y-5">
        <h2 className="font-display text-2xl sm:text-3xl text-[#ffc0cb]">
          {t.home.howItWorksTitle}
        </h2>
        <ol className="space-y-3.5">
          {t.home.steps.map((step, index) => (
            <li
              key={step.title}
              className="surface-card rounded-2xl p-4 sm:p-5 flex items-start gap-4"
            >
              <span className="shrink-0 w-9 h-9 rounded-xl bg-[#0a1931] border border-white/15 flex items-center justify-center font-display text-sm text-[#87ceeb]">
                {index + 1}
              </span>
              <div className="space-y-1">
                <h3 className="font-display text-lg text-[#ffc0cb]">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-slate-200">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Secret Keeper Callout */}
        <div className="surface-card rounded-2xl p-5 flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-[#0a1931] flex items-center justify-center text-[#ffc0cb]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-base sm:text-lg text-white">
              {t.home.secretKeeperTitle}
            </h3>
            <p className="text-sm leading-relaxed text-slate-300">
              {t.home.secretKeeperDesc}
            </p>
          </div>
        </div>
      </section>

      <div className="h-[2px] w-full bg-[#87ceeb]/60 rounded-full" />

      {/* 3 Connected Action Sections (matching original layout flow) */}
      <section className="space-y-7">
        <div className="space-y-2.5">
          <h2 className="font-display text-2xl text-[#ffc0cb] flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-[#87ceeb]" />
            <span>{t.home.actions.buyTitle}</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            {t.home.actions.buyDesc}
          </p>
          <Link
            href="/pricing"
            id="home-buy-btn"
            className="btn-party block w-full rounded-xl py-3.5 text-center text-base"
          >
            {t.home.actions.buyBtn}
          </Link>
        </div>

        <div className="space-y-2.5">
          <h2 className="font-display text-2xl text-[#ffc0cb] flex items-center gap-2.5">
            <Gift className="w-5 h-5 text-[#87ceeb]" />
            <span>{t.home.actions.startTitle}</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            {t.home.actions.startDesc}
          </p>
          <Link
            href="/redeem"
            id="home-start-btn"
            className="btn-party block w-full rounded-xl py-3.5 text-center text-base"
          >
            {t.home.actions.startBtn}
          </Link>
        </div>

        <div className="space-y-2.5">
          <h2 className="font-display text-2xl text-[#ffc0cb] flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#87ceeb]" />
            <span>{t.home.actions.joinTitle}</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            {t.home.actions.joinDesc}
          </p>
          <Link
            href="/join"
            id="home-join-btn"
            className="btn-party block w-full rounded-xl py-3.5 text-center text-base"
          >
            {t.home.actions.joinBtn}
          </Link>
        </div>
      </section>

      <div className="h-[2px] w-full bg-[#87ceeb]/60 rounded-full" />

      {/* PWA Badge Card */}
      <section className="rounded-2xl bg-[#0A1931] border border-white/10 p-6 text-center space-y-4">
        <h2 className="font-display text-lg sm:text-xl text-[#ffc0cb] leading-snug">
          {t.home.pwaTitle}
        </h2>
        <div className="flex items-center justify-center gap-8 text-sm font-bold">
          <div className="flex flex-col items-center gap-1.5 text-white">
            <Globe className="w-8 h-8 text-[#87ceeb]" />
            <span>Web</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-[#C7C7CC]">
            <Smartphone className="w-8 h-8 text-[#C7C7CC]" />
            <span>iOS</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-[#A4C639]">
            <Smartphone className="w-8 h-8 text-[#A4C639]" />
            <span>Android</span>
          </div>
        </div>
      </section>
    </div>
  );
}
