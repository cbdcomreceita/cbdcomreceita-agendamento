"use server";

import { isCouponConfigured } from "@/lib/coupon/validate";

/** Whether to render the coupon field at all — never exposes the code itself. */
export async function isCouponAvailable(): Promise<boolean> {
  return isCouponConfigured();
}
