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

/**
 * "3 próximas agendas" + reserva real de horário no Cal.com (Entrega 3).
 * Default false everywhere — validado só em Preview antes de ir para
 * Production. Server-only env var, mesma razão de isLightFormEnabled.
 */
export async function isAgenda3NextEnabled(): Promise<boolean> {
  return process.env.AGENDA_3_NEXT_ENABLED?.trim().toLowerCase() === "true";
}

/**
 * Gates only the e-mail side-effect of /api/cron/health (the health check
 * itself and its 200/503 response always run — this flag just controls
 * whether an unhealthy result also fires a team e-mail). Default false so
 * merging this doesn't start paging anyone until explicitly turned on.
 */
export async function isCronHealthAlertEnabled(): Promise<boolean> {
  return process.env.CRON_HEALTH_ALERT_ENABLED?.trim().toLowerCase() === "true";
}
