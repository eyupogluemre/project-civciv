"use client";

import { Code2, Mail } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="no-print mt-14 bg-[#0A1931] border-t border-white/10">
      <div className="mx-auto max-w-[680px] px-5 py-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-300">
          <a
            href="mailto:boyorgirl.party@gmail.com"
            className="inline-flex items-center gap-2 hover:text-[#87ceeb] transition-colors"
          >
            <Mail className="w-4 h-4 text-[#ffc0cb]" />
            <span>boyorgirl.party@gmail.com</span>
          </a>
          <a
            href="https://github.com/eyupogluemre"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-[#87ceeb] transition-colors"
          >
            <Code2 className="w-4 h-4 text-[#87ceeb]" />
            <span>github.com/eyupogluemre</span>
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3 border-t border-white/10 text-xs text-slate-400">
          <Link href="/legal/privacy" className="hover:text-white transition-colors">
            {t.footer.privacy}
          </Link>
          <Link href="/legal/terms" className="hover:text-white transition-colors">
            {t.footer.terms}
          </Link>
          <Link href="/legal/refund" className="hover:text-white transition-colors">
            {t.footer.refund}
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} boyorgirl.party
        </p>
      </div>
    </footer>
  );
}
