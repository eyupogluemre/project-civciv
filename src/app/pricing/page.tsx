"use client";

import { Check, Lock, Sparkles, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { PLANS } from "@/lib/plans";
import type { TierId } from "@/lib/types";

interface MockSessionState {
  tier: TierId;
  email: string;
  maxGuests: number;
  amountLabel: string;
}

export default function PricingPage() {
  const { locale, t } = useI18n();
  const [selectedTier, setSelectedTier] = useState<TierId>("party");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mockModal, setMockModal] = useState<MockSessionState | null>(null);
  const [mockCompleting, setMockCompleting] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  const formatPrice = (plan: (typeof PLANS)[number]) =>
    locale === "tr" ? `${plan.priceTry} TL` : `$${plan.priceUsd}`;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError(
        locale === "tr"
          ? "Lütfen geçerli bir e-posta adresi girin."
          : "Please enter a valid email address."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier,
          email: trimmed,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      if (data.mode === "lemonsqueezy" && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      const plan = PLANS.find((p) => p.id === selectedTier)!;
      setIssuedCode(null);
      setMockModal({
        tier: selectedTier,
        email: trimmed,
        maxGuests: plan.maxGuests,
        amountLabel: formatPrice(plan),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMockPayment = async () => {
    if (!mockModal) return;
    setMockCompleting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/mock-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: mockModal.tier,
          email: mockModal.email,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mock checkout failed");
      setIssuedCode(data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setMockCompleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[780px] px-5 pt-8 pb-12 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl text-[#ffc0cb]">
          {t.pricing.title}
        </h1>
        <p className="text-sm sm:text-base text-slate-200 max-w-xl mx-auto leading-relaxed">
          {t.pricing.subtitle}
        </p>
      </div>

      {/* 3 Capacity Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const active = selectedTier === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              id={`plan-card-${plan.id}`}
              onClick={() => setSelectedTier(plan.id)}
              className={`surface-card text-left rounded-2xl p-5 transition-all cursor-pointer relative ${
                active
                  ? "ring-2 ring-[#87ceeb] bg-[#13294d]/95 -translate-y-0.5"
                  : "hover:bg-[#112445]/90"
              }`}
            >
              {plan.popular && (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#ffc0cb] text-[#0a1931] mb-3">
                  <Sparkles className="w-3 h-3" />
                  {t.pricing.popular}
                </span>
              )}
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl text-white">
                  {t.pricing.planNames[plan.id]}
                </h2>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    active
                      ? "border-[#87ceeb] bg-[#87ceeb] text-[#0a1931]"
                      : "border-slate-500"
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </span>
              </div>

              <div className="mt-4">
                <div className="font-display text-3xl text-[#87ceeb]">
                  {formatPrice(plan)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {t.pricing.perParty}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-sm font-bold text-slate-100">
                <Users className="w-4 h-4 text-[#ffc0cb]" />
                <span>
                  {plan.maxGuests} {t.pricing.guestsUpTo}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Checkout Form */}
      <form
        onSubmit={handleCheckout}
        className="surface-card rounded-2xl p-6 space-y-4"
      >
        <div className="space-y-2">
          <label
            htmlFor="checkout-email"
            className="block text-sm font-bold text-slate-100"
          >
            {t.pricing.emailLabel}
          </label>
          <input
            id="checkout-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.pricing.emailPlaceholder}
            className="w-full rounded-xl bg-[#071327] border border-white/15 px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#87ceeb]"
          />
        </div>

        {error && (
          <p className="text-sm font-semibold text-rose-300 bg-rose-950/50 border border-rose-500/30 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          id="checkout-submit-btn"
          disabled={loading}
          className="btn-party w-full rounded-xl py-4 px-5 text-base cursor-pointer"
        >
          {loading
            ? t.pricing.processing
            : `${t.pricing.buyCta} — ${formatPrice(
                PLANS.find((p) => p.id === selectedTier)!
              )}`}
        </button>

        <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 text-center">
          <Lock className="w-3.5 h-3.5 text-[#87ceeb] shrink-0" />
          <span>{t.pricing.secureNote}</span>
        </p>
      </form>

      {/* All Included Features */}
      <section className="surface-card rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-xl text-[#ffc0cb]">
          {t.pricing.allFeaturesTitle}
        </h2>
        <ul className="space-y-2.5">
          {t.pricing.includedFeatures.map((feat) => (
            <li
              key={feat}
              className="flex items-start gap-3 text-sm sm:text-base text-slate-200"
            >
              <Check className="w-5 h-5 text-[#87ceeb] shrink-0 mt-0.5" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Local Mock Checkout Modal */}
      {mockModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="surface-card w-full max-w-md rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-[#ffc0cb]">
                {issuedCode ? t.pricing.mockSuccessTitle : t.pricing.mockModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setMockModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!issuedCode ? (
              <>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {t.pricing.mockModalDesc}
                </p>
                <div className="rounded-xl bg-[#071327] p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plan:</span>
                    <span className="font-bold text-white">
                      {t.pricing.planNames[mockModal.tier]} ({mockModal.maxGuests})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">E-posta:</span>
                    <span className="font-semibold text-slate-200">
                      {mockModal.email}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="text-slate-400">Total:</span>
                    <span className="font-display text-[#87ceeb]">
                      {mockModal.amountLabel}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  id="mock-checkout-complete-btn"
                  disabled={mockCompleting}
                  onClick={handleCompleteMockPayment}
                  className="btn-party w-full rounded-xl py-3.5 text-base cursor-pointer"
                >
                  {mockCompleting ? t.pricing.processing : t.pricing.mockPayBtn}
                </button>
              </>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-sm text-slate-200">
                  {t.pricing.mockSuccessDesc}
                </p>
                <div className="rounded-xl bg-[#071327] border border-[#87ceeb]/40 py-5 px-4">
                  <div
                    id="mock-issued-code"
                    className="font-mono text-3xl font-black tracking-[0.2em] text-white"
                  >
                    {issuedCode}
                  </div>
                </div>
                <Link
                  href={`/redeem?code=${encodeURIComponent(issuedCode)}`}
                  id="mock-go-redeem-btn"
                  className="btn-party block w-full rounded-xl py-3.5 text-base"
                >
                  {t.pricing.goToRedeem}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
