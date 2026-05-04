/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AnalyticsEvent } from "./events";

export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;

  const { name, ...params } = event;

  // GTM dataLayer → GA4
  const dataLayer = (window as any).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push({ event: name, ...params });
  }

  // Meta Pixel client-side
  const fbq = (window as any).fbq;
  if (typeof fbq === "function") {
    if (name === "payment_confirmed") {
      const e = event as Extract<AnalyticsEvent, { name: "payment_confirmed" }>;
      fbq("track", "Purchase", {
        value: e.value,
        currency: "BRL",
        content_ids: [e.booking_id],
      });
    } else if (name === "pix_generated") {
      fbq("track", "InitiateCheckout");
    } else if (name === "quiz_started") {
      fbq("track", "ViewContent");
    } else if (name === "form_submitted") {
      fbq("track", "Lead");
    } else {
      fbq("trackCustom", name, params);
    }
  }
}
