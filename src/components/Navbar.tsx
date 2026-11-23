"use client";

import {
  CalendarPlus,
  Gift,
  Globe,
  Home,
  LayoutGrid,
  ShoppingCart,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";

export function Navbar() {
  const [expanded, setExpanded] = useState(false);
  const { locale, t, toggleLocale } = useI18n();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <header className="no-print fixed top-0 left-0 right-0 z-40 h-[68px] bg-[#0A1931]/95 backdrop-blur-md border-b border-white/10">
      <div className="mx-auto max-w-[680px] h-full px-5 flex items-center justify-between">
        {!expanded ? (
          <>
            <Link
              href="/join"
              id="nav-join-btn"
              title={t.nav.joinParty}
              aria-label={t.nav.joinParty}
              className={`p-2 rounded-xl transition-colors ${
                isActive("/join")
                  ? "text-[#87ceeb] bg-white/10"
                  : "text-white hover:text-[#87ceeb] hover:bg-white/5"
              }`}
            >
              <CalendarPlus className="w-7 h-7" strokeWidth={2.1} />
            </Link>

            <Link
              href="/"
              id="nav-brand-logo"
              aria-label="boyorgirl.party"
              className="flex items-center gap-2 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/bog_logo_transparent.png"
                alt="boyorgirl.party"
                className="w-12 h-12 object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>

            <button
              type="button"
              id="nav-menu-open"
              onClick={() => setExpanded(true)}
              aria-label={t.nav.openMenu}
              title={t.nav.openMenu}
              className="p-2 rounded-xl text-white hover:text-[#ffc0cb] hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-7 h-7" strokeWidth={2.1} />
            </button>
          </>
        ) : (
          <nav
            aria-label="Main navigation"
            className="w-full flex items-center justify-between"
          >
            <Link
              href="/"
              id="nav-home-link"
              onClick={() => setExpanded(false)}
              title={t.nav.home}
              aria-label={t.nav.home}
              className={`p-2.5 rounded-xl transition-colors ${
                isActive("/")
                  ? "text-[#ffc0cb] bg-white/10"
                  : "text-white hover:text-[#ffc0cb] hover:bg-white/5"
              }`}
            >
              <Home className="w-7 h-7" strokeWidth={2.1} />
            </Link>

            <Link
              href="/redeem"
              id="nav-redeem-link"
              onClick={() => setExpanded(false)}
              title={t.nav.redeem}
              aria-label={t.nav.redeem}
              className={`p-2.5 rounded-xl transition-colors ${
                isActive("/redeem")
                  ? "text-[#87ceeb] bg-white/10"
                  : "text-white hover:text-[#87ceeb] hover:bg-white/5"
              }`}
            >
              <Gift className="w-7 h-7" strokeWidth={2.1} />
            </Link>

            <Link
              href="/pricing"
              id="nav-pricing-link"
              onClick={() => setExpanded(false)}
              title={t.nav.pricing}
              aria-label={t.nav.pricing}
              className={`p-2.5 rounded-xl transition-colors ${
                isActive("/pricing")
                  ? "text-[#ffc0cb] bg-white/10"
                  : "text-white hover:text-[#ffc0cb] hover:bg-white/5"
              }`}
            >
              <ShoppingCart className="w-7 h-7" strokeWidth={2.1} />
            </Link>

            <button
              type="button"
              id="nav-language-toggle"
              onClick={() => {
                toggleLocale();
              }}
              title={t.nav.language}
              aria-label={t.nav.language}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white hover:text-[#87ceeb] hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Globe className="w-6 h-6" strokeWidth={2.1} />
              <span className="text-xs font-extrabold uppercase tracking-wider">
                {locale === "tr" ? "TR" : "EN"}
              </span>
            </button>

            <button
              type="button"
              id="nav-menu-close"
              onClick={() => setExpanded(false)}
              title={t.nav.close}
              aria-label={t.nav.close}
              className="p-2.5 rounded-xl text-white hover:text-[#ffc0cb] hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-7 h-7" strokeWidth={2.2} />
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
