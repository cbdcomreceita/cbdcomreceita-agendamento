"use server";

/**
 * Light /dados form — RG, nascimento and endereço move to the prontuário
 * (Entrega 2). Default false: ships with Entrega 1, but only goes live
 * alongside the prontuário page. Server-only env var (not NEXT_PUBLIC_) so
 * flipping it doesn't require trusting the client bundle; /dados calls
 * this action on mount, same pattern as isCouponAvailable().
 */
export async function isLightFormEnabled(): Promise<boolean> {
  return process.env.LIGHT_FORM_ENABLED?.trim().toLowerCase() === "true";
}
