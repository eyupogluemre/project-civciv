"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function TermsOfServicePage() {
  const { locale, t } = useI18n();
  const isTr = locale === "tr";

  return (
    <article className="mx-auto max-w-[680px] px-5 pt-10 pb-16 space-y-6">
      <h1 className="font-display text-3xl text-[#ffc0cb]">
        {t.legal.termsTitle}
      </h1>
      <div className="surface-card rounded-2xl p-6 space-y-4 text-sm sm:text-base text-slate-200 leading-relaxed">
        {isTr ? (
          <>
            <p>
              <strong>boyorgirl.party</strong> hizmetini kullanarak aşağıdaki
              koşulları kabul etmiş sayılırsınız.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              1. Hizmet Kapsamı
            </h2>
            <p>
              Her 8 haneli ürün kodu, seçilen paketin katılımcı kapasitesi
              dahilinde tek bir cinsiyet öğrenme partisi etkinliği, sınırsız
              Prova Modu ve HD Hatıra Kolajı oluşturma hakkı sağlar.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              2. Kullanıcı İçeriği ve Sorumluluk
            </h2>
            <p>
              Davetliler tarafından yüklenen isim ve fotoğrafların uygunluğundan
              etkinlik katılımcıları ve etkinlik sahibi sorumludur. Etkinlik
              sahibi, uygunsuz içerikleri yönetim panelinden anında kaldırabilir.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              3. Bağlantı ve Cihaz Uyumu
            </h2>
            <p>
              Canlı senkronizasyon için katılımcı telefonlarının aktif internet
              bağlantısına sahip olması gerekir. Parti öncesi sınırsız Prova Modu
              ile mekan internet bağlantınızı test etmenizi öneririz.
            </p>
          </>
        ) : (
          <>
            <p>
              By using <strong>boyorgirl.party</strong>, you agree to the
              following Terms of Service.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              1. Scope of Service
            </h2>
            <p>
              Each 8-character product code unlocks one gender reveal event up to
              the purchased guest capacity, including unlimited Rehearsal Mode and
              HD Memory Collage generation.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              2. Acceptable Use
            </h2>
            <p>
              Guests and hosts are responsible for names and photos uploaded to a
              party room. Hosts can moderate and remove any participant entry at
              any time from Host Studio.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              3. Connectivity
            </h2>
            <p>
              Synchronized live effects require an active internet connection on
              guest phones. We encourage using the included unlimited Rehearsal
              Mode prior to your event to verify venue connectivity.
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
