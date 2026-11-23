export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function isSupabaseClientRealtimeConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function isLemonSqueezyConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY?.trim() &&
      process.env.LEMONSQUEEZY_STORE_ID?.trim()
  );
}

export function getAppUrl(request?: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }
  return "http://localhost:3000";
}

export function getAdminSecret(): string {
  const configured = process.env.ADMIN_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    return "civciv-admin-dev";
  }
  return "";
}

export function getCronSecret(): string {
  return process.env.CRON_SECRET?.trim() || "";
}

export function getModeStatus() {
  const supabase = isSupabaseConfigured();
  const resend = isResendConfigured();
  const lemonSqueezy = isLemonSqueezyConfigured();
  return {
    database: supabase ? ("supabase" as const) : ("mock" as const),
    email: resend ? ("resend" as const) : ("mock" as const),
    payments: lemonSqueezy ? ("lemonsqueezy" as const) : ("mock" as const),
    isAnyMock: !supabase || !resend || !lemonSqueezy,
    devAdminDefaultActive:
      !process.env.ADMIN_SECRET?.trim() && process.env.NODE_ENV !== "production",
  };
}
