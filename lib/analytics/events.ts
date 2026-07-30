export type AnalyticsEvent =
  | { name: "quiz_started" }
  | { name: "quiz_completed"; symptom: string; doctor_assigned: string }
  | { name: "slot_selected"; doctor: string; date: string }
  | { name: "form_submitted"; doctor: string }
  | { name: "pix_generated"; value: number; booking_id: string }
  | { name: "payment_confirmed"; value: number; booking_id: string; currency: "BRL" }
  | { name: "triagem_step_completed"; step: number }
  | { name: "doctor_matched"; doctor: string }
  | { name: "doctor_selected"; doctor_id: string }
  | { name: "calendar_viewed" }
  | { name: "cta_clicked"; section?: string; label?: string }
  | { name: "entender_cta_click" }
  | { name: "entender_started" }
  | { name: "entender_sintomas"; sintomas: string }
  | { name: "entender_duvidas_abertas" }
  | { name: "entender_duvidas"; duvidas: string }
  | { name: "entender_to_agenda"; tela: 2 | 4 }
  | { name: "entender_to_whatsapp" }
  | { name: "whatsapp_click"; origem: string };
