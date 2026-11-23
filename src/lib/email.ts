import { Resend } from "resend";
import { getStore } from "./db";
import { isResendConfigured } from "./env";
import type { DevEmailRecord, Locale } from "./types";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildEmailLayout(params: {
  title: string;
  subtitle: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background-color:#0a1931;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f1f5f9;">
  <div style="max-width:520px;margin:0 auto;background:#112240;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.12);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;">
        <span style="color:#87ceeb;">boy</span><span style="color:#ffffff;">or</span><span style="color:#ffc0cb;">girl</span><span style="color:#94a3b8;">.party</span>
      </div>
    </div>
    <h1 style="margin:0 0 8px 0;font-size:22px;color:#ffc0cb;text-align:center;">${escapeHtml(params.title)}</h1>
    <p style="margin:0 0 24px 0;font-size:15px;color:#cbd5e1;text-align:center;line-height:1.5;">${escapeHtml(params.subtitle)}</p>
    ${params.bodyHtml}
    <div style="text-align:center;margin:28px 0 16px 0;">
      <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:14px 28px;border-radius:10px;background:linear-gradient(90deg,#87ceeb,#ffc0cb);color:#0a1931;font-weight:800;text-decoration:none;font-size:15px;">
        ${escapeHtml(params.ctaLabel)}
      </a>
    </div>
    <p style="margin:24px 0 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
      ${escapeHtml(params.footerNote)}
    </p>
  </div>
</body>
</html>`;
}

export async function sendRedeemCodeEmail(params: {
  to: string;
  code: string;
  maxGuests: number;
  locale: Locale;
  appUrl: string;
}): Promise<{ deliveredVia: "resend" | "mock"; devRecord?: DevEmailRecord }> {
  const redeemUrl = `${params.appUrl}/redeem?code=${encodeURIComponent(params.code)}`;
  const isTr = params.locale === "tr";

  const subject = isTr
    ? `boyorgirl.party Ürün Kodunuz: ${params.code}`
    : `Your boyorgirl.party Product Code: ${params.code}`;

  const title = isTr ? "Partiniz Hazır!" : "Your Party Is Ready!";
  const subtitle = isTr
    ? `${params.maxGuests} katılımcılık paketiniz aktive edildi. Aşağıdaki 8 haneli ürün kodu ile etkinliğinizi dilediğiniz zaman başlatabilirsiniz.`
    : `Your ${params.maxGuests}-guest package is active. Use the 8-character code below whenever you're ready to set up your party.`;

  const bodyHtml = `
    <div style="background:#0a1931;border-radius:12px;padding:20px;text-align:center;border:1px solid rgba(135,206,235,0.3);">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#87ceeb;margin-bottom:8px;">
        ${isTr ? "ÜRÜN KODU" : "PRODUCT CODE"}
      </div>
      <div style="font-size:32px;font-weight:900;letter-spacing:0.18em;color:#ffffff;font-family:monospace;">
        ${escapeHtml(params.code)}
      </div>
    </div>
  `;

  const ctaLabel = isTr ? "Etkinliği Şimdi Kur" : "Set Up Your Event";
  const footerNote = isTr
    ? "Bu kodu güvenli bir yerde saklayın. Sınırsız Prova Modu dahildir. Sorularınız için: boyorgirl.party@gmail.com"
    : "Keep this code safe. Unlimited Rehearsal Mode is included. Questions? boyorgirl.party@gmail.com";

  const html = buildEmailLayout({
    title,
    subtitle,
    bodyHtml,
    ctaLabel,
    ctaUrl: redeemUrl,
    footerNote,
  });

  const text = `${title}\n\n${subtitle}\n\n${isTr ? "Ürün Kodu" : "Product Code"}: ${params.code}\n${redeemUrl}`;

  return dispatchEmail({
    to: params.to,
    subject,
    html,
    text,
    code: params.code,
    link: redeemUrl,
  });
}

export async function sendHostRecoveryEmail(params: {
  to: string;
  eventTitle: string;
  roomCode: string;
  hostUrl: string;
  secretUrl?: string | null;
  locale: Locale;
}): Promise<{ deliveredVia: "resend" | "mock"; devRecord?: DevEmailRecord }> {
  const isTr = params.locale === "tr";
  const subject = isTr
    ? `Etkinlik Yönetim Linkiniz — ${params.eventTitle}`
    : `Your Party Host Link — ${params.eventTitle}`;

  const title = isTr ? "Etkinliğiniz Oluşturuldu!" : "Your Party Room Is Live!";
  const subtitle = isTr
    ? `"${params.eventTitle}" etkinliğinizi herhangi bir cihazdan yönetmek için bu gizli linki kullanabilirsiniz.`
    : `Use this private link to manage "${params.eventTitle}" from any device.`;

  const secretBlock = params.secretUrl
    ? `<div style="margin-top:16px;background:rgba(255,192,203,0.1);border-radius:10px;padding:14px;font-size:13px;color:#f8fafc;">
        <strong style="color:#ffc0cb;">${isTr ? "Sırrı Bilen Kişi Linki:" : "Secret Keeper Link:"}</strong><br/>
        <span style="word-break:break-all;color:#cbd5e1;">${escapeHtml(params.secretUrl)}</span>
      </div>`
    : "";

  const bodyHtml = `
    <div style="background:#0a1931;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:12px;letter-spacing:0.1em;color:#87ceeb;margin-bottom:4px;">
        ${isTr ? "DAVETLİ ODA KODU" : "GUEST ROOM CODE"}
      </div>
      <div style="font-size:26px;font-weight:900;letter-spacing:0.2em;color:#ffffff;font-family:monospace;">
        ${escapeHtml(params.roomCode)}
      </div>
    </div>
    ${secretBlock}
  `;

  const ctaLabel = isTr ? "Yönetim Panelini Aç" : "Open Host Studio";
  const footerNote = isTr
    ? "Yönetim linkini yalnızca organizatör/ebeveyn olarak siz kullanın; davetlilerle sadece Oda Kodunu veya QR kodunu paylaşın."
    : "Keep the Host Studio link private; share only the Room Code or QR code with your guests.";

  const html = buildEmailLayout({
    title,
    subtitle,
    bodyHtml,
    ctaLabel,
    ctaUrl: params.hostUrl,
    footerNote,
  });

  const text = `${title}\n\n${isTr ? "Oda Kodu" : "Room Code"}: ${params.roomCode}\n${isTr ? "Yönetim Linki" : "Host Link"}: ${params.hostUrl}${params.secretUrl ? `\nSecret Link: ${params.secretUrl}` : ""}`;

  return dispatchEmail({
    to: params.to,
    subject,
    html,
    text,
    code: params.roomCode,
    link: params.hostUrl,
  });
}

async function dispatchEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  code?: string;
  link?: string;
}): Promise<{ deliveredVia: "resend" | "mock"; devRecord?: DevEmailRecord }> {
  if (isResendConfigured()) {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const from =
      process.env.EMAIL_FROM?.trim() ||
      "boyorgirl.party <onboarding@resend.dev>";
    const { error } = await resend.emails.send({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
    return { deliveredVia: "resend" };
  }

  const store = getStore();
  const devRecord = await store.saveDevEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    code: params.code,
    link: params.link,
  });
  return { deliveredVia: "mock", devRecord };
}
