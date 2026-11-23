"use client";

import {
  Check,
  Copy,
  KeyRound,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type {
  DevEmailRecord,
  OrderRecord,
  RedeemCodeRecord,
  TierId,
} from "@/lib/types";

interface AdminEventRow {
  id: string;
  roomCode: string;
  title: string;
  hostEmail: string | null;
  genderMode: string;
  genderConfigured: boolean;
  phase: string;
  maxGuests: number;
  guestCount: number;
  photosDeleted: boolean;
  photosExpiresAt: string;
  createdAt: string;
}

interface AdminOverview {
  mode: {
    database: string;
    email: string;
    payments: string;
    isAnyMock: boolean;
    devAdminDefaultActive: boolean;
  };
  orders: OrderRecord[];
  codes: RedeemCodeRecord[];
  events: AdminEventRow[];
  devEmails: DevEmailRecord[];
}

export default function AdminPage() {
  const { locale, t } = useI18n();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [devDefaultHint, setDevDefaultHint] = useState(false);

  const [secretInput, setSecretInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [tab, setTab] = useState<"codes" | "orders" | "events" | "emails">("codes");

  // Manual code generator form
  const [genTier, setGenTier] = useState<TierId>("party");
  const [genEmail, setGenEmail] = useState("");
  const [genNote, setGenNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (res.status === 401) {
        setAuthed(false);
        setData(null);
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as AdminOverview;
        setData(json);
        setAuthed(true);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/overview", { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (res.status === 401) {
          setAuthed(false);
          setData(null);
          return;
        }
        if (res.ok) {
          const json = (await res.json()) as AdminOverview;
          setData(json);
          setAuthed(true);
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (active && s?.devAdminDefaultActive) setDevDefaultHint(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secretInput }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setLoginError(j.error || "Unauthorized");
      return;
    }
    setSecretInput("");
    await loadOverview();
  };

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setData(null);
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: genTier,
          email: genEmail.trim(),
          note: genNote.trim(),
          locale,
          sendEmail: Boolean(genEmail.trim()),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setGenEmail("");
      setGenNote("");
      setFeedback(`Code generated: ${json.code.code}`);
      await loadOverview();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Error");
    } finally {
      setGenerating(false);
    }
  };

  const handleResend = async (code: string) => {
    setFeedback(null);
    const res = await fetch("/api/admin/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, locale }),
    });
    if (res.ok) {
      setFeedback(`Email re-dispatched for ${code}`);
      await loadOverview();
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Delete this event and all selfies permanently?")) return;
    await fetch(`/api/admin/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
    });
    await loadOverview();
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      // Ignore
    }
  };

  if (checking && !authed) {
    return (
      <div className="mx-auto max-w-[540px] px-5 pt-16 text-center text-slate-300">
        ...
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-[460px] px-5 pt-14 pb-16">
        <form
          onSubmit={handleLogin}
          className="surface-card rounded-2xl p-6 sm:p-7 space-y-5"
        >
          <div className="space-y-1.5">
            <div className="w-11 h-11 rounded-xl bg-[#071327] flex items-center justify-center text-[#87ceeb]">
              <KeyRound className="w-5 h-5" />
            </div>
            <h1 className="font-display text-2xl text-[#ffc0cb]">
              {t.admin.title}
            </h1>
            <p className="text-sm text-slate-300">{t.admin.loginPrompt}</p>
          </div>

          <input
            id="admin-secret-input"
            type="password"
            required
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder={t.admin.secretPlaceholder}
            className="w-full rounded-xl bg-[#071327] border border-white/15 px-4 py-3.5 text-white focus:outline-none focus:border-[#87ceeb]"
          />

          {devDefaultHint && (
            <p className="text-xs font-mono text-[#87ceeb] bg-[#071327] rounded-lg px-3 py-2">
              {t.admin.devDefaultHint}
            </p>
          )}

          {loginError && (
            <p className="text-xs font-semibold text-rose-300">{loginError}</p>
          )}

          <button
            type="submit"
            id="admin-login-btn"
            className="btn-party w-full rounded-xl py-3.5 text-base cursor-pointer"
          >
            {t.admin.loginBtn}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[920px] px-5 pt-8 pb-16 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#ffc0cb]">
            {t.admin.title}
          </h1>
          {data && (
            <p className="text-xs text-slate-400 mt-1">
              DB: <strong className="text-slate-200">{data.mode.database}</strong> •
              Email: <strong className="text-slate-200">{data.mode.email}</strong> •
              Payments:{" "}
              <strong className="text-slate-200">{data.mode.payments}</strong>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="rounded-xl bg-white/10 hover:bg-white/15 p-2.5 text-white cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-2 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.admin.logoutBtn}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["codes", `${t.admin.tabCodes} (${data?.codes.length ?? 0})`],
            ["orders", `${t.admin.tabOrders} (${data?.orders.length ?? 0})`],
            ["events", `${t.admin.tabEvents} (${data?.events.length ?? 0})`],
            ["emails", `${t.admin.tabEmails} (${data?.devEmails.length ?? 0})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              tab === id
                ? "bg-[#87ceeb] text-[#0a1931]"
                : "bg-white/10 text-slate-200 hover:bg-white/15"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-950/60 border border-emerald-400/35 px-4 py-2.5 text-sm font-semibold text-emerald-200">
          {feedback}
        </div>
      )}

      {/* CODES TAB */}
      {tab === "codes" && (
        <div className="space-y-6">
          <form
            onSubmit={handleGenerateCode}
            className="surface-card rounded-2xl p-5 space-y-4"
          >
            <h2 className="font-display text-lg text-[#87ceeb] flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span>{t.admin.createCodeTitle}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={genTier}
                onChange={(e) => setGenTier(e.target.value as TierId)}
                className="rounded-xl bg-[#071327] border border-white/15 px-3 py-3 text-sm text-white"
              >
                <option value="mini">Mini (25)</option>
                <option value="party">Party (75)</option>
                <option value="mega">Mega (200)</option>
              </select>
              <input
                type="email"
                value={genEmail}
                onChange={(e) => setGenEmail(e.target.value)}
                placeholder={t.admin.emailOptional}
                className="rounded-xl bg-[#071327] border border-white/15 px-3 py-3 text-sm text-white placeholder:text-slate-500"
              />
              <input
                type="text"
                value={genNote}
                onChange={(e) => setGenNote(e.target.value)}
                placeholder={t.admin.notePlaceholder}
                className="rounded-xl bg-[#071327] border border-white/15 px-3 py-3 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              id="admin-generate-code-btn"
              disabled={generating}
              className="btn-party rounded-xl px-5 py-3 text-sm cursor-pointer"
            >
              {t.admin.generateBtn}
            </button>
          </form>

          <div className="surface-card rounded-2xl overflow-hidden">
            {!data?.codes.length ? (
              <p className="p-6 text-sm text-slate-400 text-center">
                {t.admin.noData}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#071327] text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Tier</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Email / Note</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {data.codes.map((c) => (
                      <tr key={c.id}>
                        <td className="p-3.5 font-mono font-bold text-white">
                          {c.code}
                        </td>
                        <td className="p-3.5 text-slate-200">
                          {c.tier} ({c.max_guests})
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              c.status === "unused"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <div>{c.customer_email || "—"}</div>
                          {c.note && (
                            <div className="text-[11px] text-slate-400">
                              {c.note}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => copyCode(c.code)}
                            className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 px-2.5 py-1.5 text-xs text-white cursor-pointer"
                          >
                            {copiedCode === c.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {c.customer_email && (
                            <button
                              type="button"
                              onClick={() => void handleResend(c.code)}
                              title={t.admin.resendBtn}
                              className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 px-2.5 py-1.5 text-xs text-[#87ceeb] cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {tab === "orders" && (
        <div className="surface-card rounded-2xl overflow-hidden">
          {!data?.orders.length ? (
            <p className="p-6 text-sm text-slate-400 text-center">
              {t.admin.noData}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#071327] text-slate-400 uppercase text-[11px]">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Provider</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Plan</th>
                    <th className="p-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.orders.map((o) => (
                    <tr key={o.id}>
                      <td className="p-3.5 text-slate-300">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-mono text-xs text-[#87ceeb]">
                        {o.provider}
                      </td>
                      <td className="p-3.5 text-white">{o.customer_email}</td>
                      <td className="p-3.5 text-slate-200">
                        {o.tier} ({o.max_guests})
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-300">
                        {(o.amount_cents / 100).toFixed(2)} {o.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* EVENTS TAB */}
      {tab === "events" && (
        <div className="surface-card rounded-2xl overflow-hidden">
          {!data?.events.length ? (
            <p className="p-6 text-sm text-slate-400 text-center">
              {t.admin.noData}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#071327] text-slate-400 uppercase text-[11px]">
                  <tr>
                    <th className="p-3.5">Room</th>
                    <th className="p-3.5">Title</th>
                    <th className="p-3.5">Phase</th>
                    <th className="p-3.5">Guests</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="p-3.5 font-mono font-bold text-[#87ceeb]">
                        {ev.roomCode}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{ev.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {ev.hostEmail || "—"} • {ev.genderMode}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-200">{ev.phase}</td>
                      <td className="p-3.5 text-slate-200">
                        {ev.guestCount} / {ev.maxGuests}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeleteEvent(ev.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 px-2.5 py-1.5 text-xs text-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t.admin.deleteEventBtn}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DEV EMAIL OUTBOX TAB */}
      {tab === "emails" && (
        <div className="space-y-3">
          {!data?.devEmails.length ? (
            <div className="surface-card rounded-2xl p-6 text-sm text-slate-400 text-center">
              {t.admin.noData}
            </div>
          ) : (
            data.devEmails.map((mail) => (
              <div
                key={mail.id}
                className="surface-card rounded-2xl p-5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Mail className="w-4 h-4 text-[#ffc0cb]" />
                    <span>{mail.subject}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(mail.sentAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-[#87ceeb]">To: {mail.to}</div>
                <pre className="whitespace-pre-wrap text-xs text-slate-300 bg-[#071327] rounded-xl p-3 font-mono">
                  {mail.text}
                </pre>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
