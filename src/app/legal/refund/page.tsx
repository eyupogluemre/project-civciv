"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function RefundPolicyPage() {
  const { locale, t } = useI18n();
  const isTr = locale === "tr";

  return (
    <article className="mx-auto max-w-[680px] px-5 pt-10 pb-16 space-y-6">
      <h1 className="font-display text-3xl text-[#ffc0cb]">
        {t.legal.refundTitle}
      </h1>
      <div className="surface-card rounded-2xl p-6 space-y-4 text-sm sm:text-base text-slate-200 leading-relaxed">
        {isTr ? (
          <>
            <p>
              <strong>boyorgirl.party</strong> paketlerinizde memnuniyetinizi
              önemsiyoruz.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              1. Kullanılmamış Ürün Kodları (14 Gün Tam İade)
            </h2>
            <p>
              Satın aldığınız 8 haneli ürün kodu henüz aktive edilmemiş (bir
              etkinlik başlatılmamış) ise, satın alma tarihinden itibaren{" "}
              <strong>14 gün içinde koşulsuz tam iade</strong> talep
              edebilirsiniz.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              2. Aktive Edilmiş Etkinlikler
            </h2>
            <p>
              Büyük An (Reveal) fazı tamamlanmış etkinliklerde dijital hizmet
              tüketilmiş sayılır; ancak bizden kaynaklanan teknik bir aksaklık
              yaşamanız durumunda{" "}
              <a
                href="mailto:boyorgirl.party@gmail.com"
                className="text-[#87ceeb] underline"
              >
                boyorgirl.party@gmail.com
              </a>{" "}
              üzerinden sipariş numaranızla iletişime geçmeniz halinde hızla çözüm
              veya tam iade sağlıyoruz.
            </p>
          </>
        ) : (
          <>
            <p>
              We want your gender reveal party to be unforgettable and worry-free.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              1. Unused Product Codes (14-Day Full Refund)
            </h2>
            <p>
              If your 8-character product code has not yet been redeemed to create
              an event, you are eligible for a{" "}
              <strong>100% full refund within 14 days</strong> of purchase.
            </p>
            <h2 className="font-display text-lg text-[#87ceeb] pt-2">
              2. Technical Issues
            </h2>
            <p>
              Once a live reveal has been completed, the single-event digital
              service is considered delivered. If you encounter any technical issue
              on our side, contact{" "}
              <a
                href="mailto:boyorgirl.party@gmail.com"
                className="text-[#87ceeb] underline"
              >
                boyorgirl.party@gmail.com
              </a>{" "}
              with your order ID and we will promptly assist or issue a refund.
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
