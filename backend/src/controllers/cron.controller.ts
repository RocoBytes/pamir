import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/google-gmail.js';
import { buildAlertaSalidaEmail } from '../lib/email-templates.js';
import { ADMIN_EMAIL } from '../lib/constants.js';

/**
 * Derives the UTC offset of America/Santiago for a given calendar date.
 *
 * DST note: Chile observes DST (UTC-3 in summer / UTC-4 in winter), so the
 * offset must be computed for the salida's own return date — not for "now".
 * A return date on the other side of a DST transition would otherwise get
 * the wrong offset. Noon UTC of that date is used as the probe instant to
 * stay safely away from the midnight transition edges.
 */
function santiagoOffsetFor(dateStr: string): string {
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    timeZoneName: 'longOffset',
  }).formatToParts(probe);
  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-04:00';
  // longOffset produces "GMT+HH:MM" or "GMT-HH:MM"; extract the signed offset
  return tzPart.replace('GMT', '');
}

/**
 * GET /api/cron/check-alertas?secret=<CRON_SECRET>
 *
 * Finds open salidas whose alert threshold has passed and no cierre exists,
 * sends an alarm email to the admin, and marks alertaEnviadaAt so re-runs
 * do not send duplicates.
 */
export async function checkAlertas(req: Request, res: Response): Promise<void> {
  // An unset CRON_SECRET intentionally denies all requests (fail closed).
  const secret = process.env.CRON_SECRET;
  if (!secret || req.query.secret !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Candidate salidas: open (EN_CURSO), alert not yet sent, and no cierre
    const candidates = await prisma.salida.findMany({
      where: {
        status: 'EN_CURSO',
        alertaEnviadaAt: null,
        cierres: { none: {} },
      },
    });

    const now = new Date();
    let alerted = 0;

    for (const salida of candidates) {
      try {
        // The wizard sends "YYYY-MM-DD" and the controller stores it as
        // midnight UTC of the chosen calendar date, so the UTC date string
        // IS the intended return date — no timezone conversion here.
        const returnDateStr = salida.fechaRetornoEstimada.toISOString().slice(0, 10);

        // Anchor horaAlerta to the Santiago offset valid on that date (DST-safe)
        const offset = santiagoOffsetFor(returnDateStr);
        const alarmMoment = new Date(`${returnDateStr}T${salida.horaAlerta}:00${offset}`);

        if (now < alarmMoment) continue;

        // Mark the flag BEFORE sending: if the email send fails afterwards we
        // lose one alert (recoverable, logged below), but we never risk
        // re-sending a duplicate safety alarm on the next cron run.
        await prisma.salida.update({
          where: { id: salida.id },
          data: { alertaEnviadaAt: new Date() },
        });

        try {
          await sendEmail(
            ADMIN_EMAIL,
            `ALERTA: Salida sin cierre — ${salida.nombreActividad}`,
            buildAlertaSalidaEmail(salida),
          );
          alerted++;
        } catch (emailErr) {
          console.error(
            `[cron/check-alertas] Email de alerta falló para salida ${salida.id} (alertaEnviadaAt ya marcado, no se reintentará):`,
            emailErr,
          );
        }
      } catch (err) {
        // One failure must not block the remaining salidas
        console.error(`[cron/check-alertas] Error al procesar salida ${salida.id}:`, err);
      }
    }

    res.json({ checked: candidates.length, alerted });
  } catch (err) {
    console.error('[cron/check-alertas]', err);
    res.status(500).json({ error: 'Error interno al procesar alertas' });
  }
}
