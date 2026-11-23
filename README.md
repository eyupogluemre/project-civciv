# Project Civciv (`boyorgirl.party`)

Cinsiyet öğrenme partileri (gender reveal party) için tüm katılımcı telefonlarını gerçek zamanlı ve milisaniye hassasiyetinde senkronize eden interaktif web uygulaması (PWA).

## Özellikler

- **Ticari Paket & Ödeme Akışı:** 3 kapasite kademesi (25 / 75 / 200 katılımcı — tüm özellikler her pakette açık), Lemon Squeezy (Merchant of Record) checkout + HMAC-imzalı idempotent webhook.
- **Otomatik E-posta Teslimatı:** Resend ile 8 haneli karışmayan alfabeli ürün kodu ve Host kurtarma linki gönderimi (TR & EN şablonlar).
- **Sıfır Sızıntı (Zero-Leak) Secret Keeper Modu:** Anne-baba adayları da sürprizi yaşamak isterse doktora/arkadaşa tek kullanımlık `/secret/[token]` linki gönderilir; gerçek cinsiyet `REVEALED` fazı gelene kadar hiçbir API veya Realtime olayında istemciye dönülmez.
- **Canlı Senkronize Parti Akışı:** QR / 6 haneli kodla hesapsız misafir katılımı → tahmin & sıkıştırılmış isteğe bağlı selfie → tam ekran Renkli Gösteri → sunucu saat farkı telafili (clock-sync) geri sayım → tüm telefonlarda (host dahil) eş zamanlı Büyük An (konfeti, Web Audio, titreşim, Screen Wake Lock).
- **Sınırsız Prova (Rehearsal) Modu:** Gerçek kilitli cinsiyeti asla açığa çıkarmadan tüm telefonlarda önceden test imkanı.
- **HD Hatıra Kolajı & Gizlilik:** İstemci tarafı Canvas ile Instagram Story (9:16) ve Kare (1:1) HD PNG indirme, 30 gün sonra Vercel Cron ile otomatik fotoğraf silme + tek tıkla anında silme.
- **Admin Paneli (`/admin`):** Sipariş takibi, manuel/hediye kod üretimi, e-posta yeniden gönderimi, etkinlik temizliği ve yerel Dev E-posta Kutusu.
- **Otomatik Dev / Mock Modu:** Harici API anahtarları olmadan tek komutla uçtan uca yerel test imkanı (`AABB1997` demo kodu ön tanımlı).

---

## Hızlı Başlangıç (Yerel Dev / Mock Modu)

```bash
npm install
npm run dev
```

Hiçbir API anahtarı girmeden doğrudan `http://localhost:3000` adresinde tüm akışı test edebilirsiniz:
- **Mock Checkout:** `/pricing` üzerinden test ödemesi tamamlayıp anında 8 haneli ürün kodu alabilirsiniz.
- **Hazır Demo Kod:** `/redeem` ekranında `AABB1997` kodunu kullanabilirsiniz.
- **Admin Paneli & Dev E-posta Kutusu:** `/admin` (yerel varsayılan şifre: `civciv-admin-dev`).

---

## Prodüksiyon Kurulumu (Supabase + Resend + Lemon Squeezy + Vercel)

1. **Supabase:**
   - Yeni proje oluşturun ve `supabase/schema.sql` dosyasını **SQL Editor** içinde çalıştırın (4 tablo, RLS kilitleri ve private `selfies` Storage bucket'ı otomatik oluşur).
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` ve `SUPABASE_SERVICE_ROLE_KEY` değerlerini `.env.local` / Vercel ortam değişkenlerine ekleyin.
2. **Resend:**
   - `boyorgirl.party` domainini doğrulayın ve `RESEND_API_KEY` + `EMAIL_FROM` değerlerini tanımlayın.
3. **Lemon Squeezy:**
   - 3 paket (Mini 25 / Party 75 / Mega 200) için ürün/variant oluşturun ve variant ID'lerini `LEMONSQUEEZY_VARIANT_*` olarak girin.
   - Webhook hedefini `https://boyorgirl.party/api/webhooks/lemonsqueezy` (`order_created`) olarak ayarlayıp imza gizli anahtarını `LEMONSQUEEZY_WEBHOOK_SECRET` olarak ekleyin.
4. **Vercel Deploy & Cron:**
   - Repoyu Vercel'e bağlayın, `.env.example` içindeki tüm anahtarları (`ADMIN_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` dahil) tanımlayın.
   - `vercel.json` içindeki günlük cron (`/api/cron/cleanup-photos`) 30 günü dolan etkinliklerin selfielerini otomatik olarak siler.
