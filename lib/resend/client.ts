import { Resend } from "resend";

const API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export const resend = API_KEY ? new Resend(API_KEY) : null;

export function isResendConfigured(): boolean {
  return !!API_KEY;
}

export { FROM_EMAIL };
