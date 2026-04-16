export const ANALYTICS_EVENTS = {
  TRIAGEM_STARTED: "triagem_started",
  TRIAGEM_STEP_COMPLETED: "triagem_step_completed",
  TRIAGEM_EMERGENCY_SHOWN: "triagem_emergency_shown",
  DOCTOR_MATCHED: "doctor_matched",
  CALENDAR_VIEWED: "calendar_viewed",
  SLOT_SELECTED: "slot_selected",
  FORM_STARTED: "form_started",
  FORM_COMPLETED: "form_completed",
  PAYMENT_INITIATED: "payment_initiated",
  PAYMENT_COMPLETED: "payment_completed",
  BOOKING_CONFIRMED: "booking_confirmed",
  FAQ_ITEM_CLICKED: "faq_item_clicked",
  CTA_CLICKED: "cta_clicked",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
