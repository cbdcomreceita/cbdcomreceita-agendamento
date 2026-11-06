"use server";

import { resend, FROM_EMAIL, isResendConfigured } from "./client";
import { logError } from "@/lib/audit/log-error";
import type { CronHealthStatus } from "@/lib/cron/health";

const TEAM_EMAIL = process.env.TEAM_EMAIL || "contato@cbdcomreceita.com.br";

/**
 * Only called by /api/cron/health when CRON_HEALTH_ALERT_ENABLED is on and
 * the funnel cron's heartbeat has gone stale — see lib/cron/health.ts for
 * why this alert has to live outside the funnel route itself.
 */
export async function sendCronHealthAlert(status: CronHealthStatus): Promise<void> {
  if (!isResendConfigured()) {
    console.warn("[Resend] API key not set — skipping cron health alert (mock mode)");
    return;
  }

  const lastHeartbeatLabel = status.lastHeartbeatAt
    ? `${status.ageMinutes} minuto(s) atrás (${status.lastHeartbeatAt})`
    : "nunca registrado";

  const subject = "Alerta: cron do funil sem resposta — CBD com Receita";
  const body = `O cron do funil (/api/cron/funnel) não dá sinal de vida há mais de ${status.maxAgeMinutes} minuto(s).

Último heartbeat: ${lastHeartbeatLabel}.

Causas prováveis: a CRON_SECRET foi rotacionada e o pg_cron ainda está com a senha antiga (a rota responde 401), a aplicação está fora do ar, ou o job do pg_cron foi desativado.

Verifique:
1. select * from cron.job; — confirme que o job está ativo e com a URL/senha certas.
2. curl -i https://www.cbdcomreceita.com.br/api/cron/funnel -H "Authorization: Bearer <CRON_SECRET atual>" — confirme se responde 200.`;

  try {
    const { error } = await resend!.emails.send({
      from: `CBD com Receita <${FROM_EMAIL}>`,
      to: TEAM_EMAIL,
      subject,
      text: body,
    });
    if (error) {
      await logError({
        scope: "cron",
        message: "Cron health alert email send error",
        metadata: { error, status },
      });
    }
  } catch (err) {
    await logError({
      scope: "cron",
      message: "Cron health alert email threw",
      metadata: { error: String(err), status },
    });
  }
}
