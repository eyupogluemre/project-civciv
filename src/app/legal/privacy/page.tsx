"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function PrivacyPolicyPage() {
  const { locale, t } = useI18n();
  const isTr = locale === "tr";

  return (
    <article className="mx-auto max-w-[680px] px-5 pt-10 pb-16 space-y-6">
      <h1 className="font-display text-3xl text-[#ffc0cb]">
        {t.legal.privacyTitle}
      </h1>
      <div className="surface-card rounded-2xl p-6 space-y-4 text-sm sm:text-base text-slate-200 leading-relaxed">
        {isTr ? (
          <>
            <p>
              <strong>boyorgirl.party (Project Civciv)</strong> olarak kişisel
              verilerinizin ve parti fotoğraflarınızın gizliliğine en yüksek
              düzeyde önem veriyoruz.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              1. Toplanan Veriler
            </h2>
            <p>
              Satın alma sırasında yalnızca ürün kodunu ve yönetim kurtarma
              linkini iletmek için e-posta adresiniz alınır. Ödeme kart bilgileriniz
              sunucularımıza hiç ulaşmaz; tüm ödemeler Merchant of Record olan{" "}
              <strong>Lemon Squeezy</strong> tarafından işlenir. Davetliler hesap
              açmadan yalnızca ad, cinsiyet tahmini ve isteğe bağlı selfie paylaşır.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              2. Selfie Saklama Süresi ve Otomatik Silme
            </h2>
            <p>
              Parti sırasında yüklenen tüm misafir selfieleri özel (private)
              depolamada saklanır ve etkinlik tarihinden itibaren en geç{" "}
              <strong>30 gün sonra otomatik olarak kalıcı biçimde silinir</strong>.
              Etkinlik sahibi dilediği anda yönetim panelinden tek tıkla tüm
              fotoğrafları hemen silebilir.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              3. İletişim ve Veri Silme Hakları (KVKK / GDPR)
            </h2>
            <p>
              Verilerinizin silinmesi veya bilgi talebi için{" "}
              <a
                href="mailto:boyorgirl.party@gmail.com"
                className="text-[#87ceeb] underline"
              >
                boyorgirl.party@gmail.com
              </a>{" "}
              adresinden bize ulaşabilirsiniz.
            </p>
          </>
        ) : (
          <>
            <p>
              At <strong>boyorgirl.party (Project Civciv)</strong>, we take the
              privacy of your personal data and guest selfies seriously.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              1. Data We Collect
            </h2>
            <p>
              During checkout, we only collect your email address to deliver your
              8-character product code and Host Studio recovery link. Payment card
              details never touch our servers and are processed securely by{" "}
              <strong>Lemon Squeezy</strong> (Merchant of Record). Guests join
              without creating an account using only a display name, a Boy/Girl
              guess, and an optional selfie.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              2. 30-Day Automatic Photo Deletion
            </h2>
            <p>
              All guest selfies are stored in private storage solely to render your
              event Memory Collage and are{" "}
              <strong>permanently deleted automatically after 30 days</strong>.
              Hosts can also permanently wipe all event selfies immediately at any
              time from Host Studio.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              3. Contact & Privacy Requests
            </h2>
            <p>
              For data deletion or privacy inquiries, email{" "}
              <a
                href="mailto:boyorgirl.party@gmail.com"
                className="text-[#87ceeb] underline"
              >
                boyorgirl.party@gmail.com
              </a>
              .
            </p>
          </>
        )}
      </div>
      <Link
        href="/"
        className="inline-block text-sm font-bold text-[#87ceeb] hover:underline"
      >
        ← {t.legal.backHome}
      </Link>
    </article>
  );
}
