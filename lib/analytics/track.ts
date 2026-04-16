/* eslint-disable @typescript-eslint/no-explicit-any */

import type { AnalyticsEvent } from "./events";

// Meta Pixel standard event mapping
const META_STANDARD_MAP: Partial<Record<AnalyticsEvent, { event: string; params?: Record<string, any> }>> = {
  triagem_started: { event: "ViewContent" },
  form_completed: { event: "Lead" },
  payment_initiated: { event: "InitiateCheckout" },
  payment_completed: { event: "Purchase", params: { value: 49.9, currency: "BRL" } },
};

/**
 * Track an event across all analytics providers:
 * - Google Analytics 4 (gtag)
 * - Google Tag Manager (dataLayer)
 * - Meta Pixel (fbq)
 */
export function trackEvent(
  eventName: AnalyticsEvent | string,
  params?: Record<string, any>
) {
  if (typeof window === "undefined") return;

  // GA4 via gtag
  const gtag = (window as any).gtag;
  if (typeof gtag === "function") {
    gtag("event", eventName, params);
  }

  // GTM via dataLayer
  const dataLayer = (window as any).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push({ event: eventName, ...params });
  }

  // Meta Pixel
  const fbq = (window as any).fbq;
  if (typeof fbq === "function") {
    // Map to standard event if available
    const mapped = META_STANDARD_MAP[eventName as AnalyticsEvent];
    if (mapped) {
      fbq("track", mapped.event, { ...mapped.params, ...params });
    } else {
      fbq("trackCustom", eventName, params);
    }
  }
}
