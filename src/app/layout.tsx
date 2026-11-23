import type { Metadata, Viewport } from "next";
import { Archivo_Black, Plus_Jakarta_Sans } from "next/font/google";
import { DevModeBanner } from "@/components/DevModeBanner";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { PwaRegistrar } from "@/components/PwaRegistrar";
import { LanguageProvider } from "@/lib/i18n/context";
import "./globals.css";

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-archivo-black",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://boyorgirl.party"
  ),
  title: "boyorgirl.party — Project Civciv | Cinsiyet Öğrenme Partisi Uygulaması",
  description:
    "Cinsiyet öğrenme partileri için tüm telefonları aynı anda senkronize eden interaktif web uygulaması (PWA). Tahmin et, renkli gösteri, geri sayım, büyük an ve HD hatıra kolajı!",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "boyorgirl.party — Cinsiyet Öğrenme Partinize Eğlence Katın!",
    description:
      "Tüm misafir telefonlarını aynı anda mavi veya pembe görsel şölene dönüştüren senkronize gender reveal web uygulaması.",
    images: ["/main2.webp"],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1931",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      className={`${archivoBlack.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <PwaRegistrar />
          <Navbar />
          <DevModeBanner />
          <main className="flex-1 pt-[68px]">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
