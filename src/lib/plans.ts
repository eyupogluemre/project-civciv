import type { TierId } from "./types";

export interface PlanDefinition {
  id: TierId;
  maxGuests: number;
  priceTry: number;
  priceUsd: number;
  popular?: boolean;
  lemonVariantEnvKey: string;
}

export const PLANS: PlanDefinition[] = [
  {
    id: "mini",
    maxGuests: 25,
    priceTry: 149,
    priceUsd: 5,
    lemonVariantEnvKey: "LEMONSQUEEZY_VARIANT_MINI",
  },
  {
    id: "party",
    maxGuests: 75,
    priceTry: 299,
    priceUsd: 9,
    popular: true,
    lemonVariantEnvKey: "LEMONSQUEEZY_VARIANT_PARTY",
  },
  {
    id: "mega",
    maxGuests: 200,
    priceTry: 499,
    priceUsd: 15,
    lemonVariantEnvKey: "LEMONSQUEEZY_VARIANT_MEGA",
  },
];

export function getPlanById(tier: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === tier);
}

export function getPlanByLemonVariantId(variantId: string): PlanDefinition | undefined {
  for (const plan of PLANS) {
    const envVal = process.env[plan.lemonVariantEnvKey];
    if (envVal && envVal.trim() === variantId.trim()) {
      return plan;
    }
  }
  return undefined;
}

export function getLemonVariantId(tier: TierId): string | null {
  const plan = getPlanById(tier);
  if (!plan) return null;
  const val = process.env[plan.lemonVariantEnvKey];
  return val && val.trim().length > 0 ? val.trim() : null;
}
