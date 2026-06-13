import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/google-gmail.js';
import { buildSaludSalidaEmail, type ParticipanteSaludEmailData } from '../lib/email-templates.js';

interface MesRow {
  // DATE_TRUNC returns timestamp-without-tz; some driver versions deliver
  // it as a string instead of a Date — handle both defensively.
  mes: Date | string;
  total: bigint;
}

// GET /api/admin/stats
export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const [
      totalSalidas,
      porStatus,
      totalCierres,
      incidentes,
      accidentes,
      porMesRaw,
      topDisciplinasRaw,
    ] = await prisma.$transaction([
      prisma.salida.count(),
      prisma.salida.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.cierre.count(),
      prisma.cierre.count({ where: { ocurrioIncidente: 'SI' } }),
      prisma.cierre.count({ where: { ocurrioAccidente: 'SI' } }),
      // Salidas per month over the last 12 months (table mapped as "salidas").
      // Timezone contract: fecha_inicio is stored as midnight UTC of the
      // user's intended calendar date, so UTC DATE_TRUNC yields the intended
      // month directly — converting with AT TIME ZONE would shift it wrong.
      prisma.$queryRaw<MesRow[]>`
        SELECT DATE_TRUNC('month', fecha_inicio) AS mes, COUNT(*) AS total
        FROM "salidas"
        WHERE fecha_inicio >= NOW() - INTERVAL '12 months'
        GROUP BY mes
        ORDER BY mes DESC
      `,
      prisma.salida.groupBy({
        by: ['disciplina'],
        _count: { _all: true },
        // Prisma's aggregate orderBy only accepts field names (no _all);
        // disciplina is non-nullable so its count equals the row count.
        orderBy: { _count: { disciplina: 'desc' } },
        take: 5,
      }),
    ]);

    const countFor = (status: string): number =>
      porStatus.find((s) => s.status === status)?._count._all ?? 0;

    const salidasAbiertas = countFor('EN_CURSO');
    const salidasCompletadas = countFor('COMPLETADA');
    // Salida-form vs cierre-form relation: how many salidas have a cierre filed
    const pctConCierre =
      totalSalidas > 0 ? Math.round((totalCierres / totalSalidas) * 100) : 0;

    // $queryRaw COUNT returns BigInt — convert before JSON serialization
    const porMes = porMesRaw.map((r) => ({
      mes: typeof r.mes === 'string' ? r.mes : r.mes.toISOString(),
      total: Number(r.total),
    }));

    const topDisciplinas = topDisciplinasRaw.map((d) => ({
      disciplina: d.disciplina,
      total: d._count._all,
    }));

    res.json({
      totalSalidas,
      salidasAbiertas,
      salidasCompletadas,
      totalCierres,
      pctConCierre,
      incidentes,
      accidentes,
      porMes,
      topDisciplinas,
    });
  } catch (error) {
    console.error('[getStats]', error);
    res.status(500).json({ error: 'No se pudieron obtener las estadísticas' });
  }
}

// ─── Health data helpers ──────────────────────────────────────────────────────

const SALUD_SELECT = {
  rut: true,
  grupoSanguineo: true,
  alergiasTiene: true,
  alergiasDetalle: true,
  enfermedadesCronicasTiene: true,
  enfermedadesCronicasDetalle: true,
  medicamentosTiene: true,
  medicamentosDetalle: true,
  cirugiasLesionesTiene: true,
  cirugiasLesionesDetalle: true,
  fuma: true,
  usaLentes: true,
  previsionSalud: true,
  nombreContacto: true,
  parentesco: true,
  telefonoContacto: true,
} as const;

type SalidaParticipanteJson = { rut?: string; nombre?: string; membresiaClub?: string };

// Health data is only exposed for salidas that are currently active
const ACTIVE_SALUD_STATUSES = ['EN_CURSO', 'CONFIRMADA'];

/**
 * Loads health data for all participants of a salida.
 * Names come from the salida.participantes JSON (source of truth for the trip),
 * health records from the Integrante model keyed by RUT.
 */
async function buildParticipantesSalud(
  salidaId: string,
): Promise<
  | { notFound: true }
  | { notActive: true }
  | {
      salida: { id: string; nombreActividad: string; liderCordada: string; creatorEmail: string | null; userId: string | null };
      participantes: ParticipanteSaludEmailData[];
    }
> {
  const salida = await prisma.salida.findUnique({
    where: { id: salidaId },
    select: {
      id: true,
      nombreActividad: true,
      liderCordada: true,
      creatorEmail: true,
      userId: true,
      participantes: true,
      status: true,
    },
  });

  if (!salida) return { notFound: true };
  if (!ACTIVE_SALUD_STATUSES.includes(salida.status)) return { notActive: true };

  const participantesJson = (Array.isArray(salida.participantes)
    ? (salida.participantes as SalidaParticipanteJson[])
    : []
  ).filter((p) => Boolean(p.rut) || Boolean(p.nombre));

  const ruts = participantesJson
    .map((p) => p.rut)
    .filter((r): r is string => typeof r === 'string' && r.length > 0);

  const integrantes = await prisma.integrante.findMany({
    where: { rut: { in: ruts } },
    select: SALUD_SELECT,
  });

  const integranteByRut = new Map(integrantes.map((i) => [i.rut, i]));

  const participantes: ParticipanteSaludEmailData[] = participantesJson.map((p) => {
    const rut = p.rut ?? '';
    const nombre = p.nombre ?? rut;
    const integrante = integranteByRut.get(rut);

    if (!integrante) {
      return { rut, nombre, fichaEncontrada: false, salud: null };
    }

    return {
      rut,
      nombre,
      fichaEncontrada: true,
      salud: {
        grupoSanguineo: integrante.grupoSanguineo,
        alergiasTiene: integrante.alergiasTiene,
        alergiasDetalle: integrante.alergiasDetalle,
        enfermedadesCronicasTiene: integrante.enfermedadesCronicasTiene,
        enfermedadesCronicasDetalle: integrante.enfermedadesCronicasDetalle,
        medicamentosTiene: integrante.medicamentosTiene,
        medicamentosDetalle: integrante.medicamentosDetalle,
        cirugiasLesionesTiene: integrante.cirugiasLesionesTiene,
        cirugiasLesionesDetalle: integrante.cirugiasLesionesDetalle,
        fuma: integrante.fuma,
        usaLentes: integrante.usaLentes,
        previsionSalud: integrante.previsionSalud,
        nombreContacto: integrante.nombreContacto,
        parentesco: integrante.parentesco,
        telefonoContacto: integrante.telefonoContacto,
      },
    };
  });

  return {
    salida: {
      id: salida.id,
      nombreActividad: salida.nombreActividad,
      liderCordada: salida.liderCordada,
      creatorEmail: salida.creatorEmail,
      userId: salida.userId,
    },
    participantes,
  };
}

// GET /api/admin/salidas/:id/salud
export async function getSaludSalida(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const result = await buildParticipantesSalud(id);

    if ('notFound' in result) {
      res.status(404).json({ error: 'Salida no encontrada' });
      return;
    }
    if ('notActive' in result) {
      res.status(422).json({ error: 'La salida no está activa' });
      return;
    }

    // The browser UI never renders the emergency contact — keep it out of
    // the API response; it only flows into the email built server-side.
    const participantes = result.participantes.map((p) => ({
      rut: p.rut,
      nombre: p.nombre,
      fichaEncontrada: p.fichaEncontrada,
      salud: p.salud
        ? {
            grupoSanguineo: p.salud.grupoSanguineo,
            alergiasTiene: p.salud.alergiasTiene,
            alergiasDetalle: p.salud.alergiasDetalle,
            enfermedadesCronicasTiene: p.salud.enfermedadesCronicasTiene,
            enfermedadesCronicasDetalle: p.salud.enfermedadesCronicasDetalle,
            medicamentosTiene: p.salud.medicamentosTiene,
            medicamentosDetalle: p.salud.medicamentosDetalle,
            cirugiasLesionesTiene: p.salud.cirugiasLesionesTiene,
            cirugiasLesionesDetalle: p.salud.cirugiasLesionesDetalle,
            fuma: p.salud.fuma,
            usaLentes: p.salud.usaLentes,
            previsionSalud: p.salud.previsionSalud,
          }
        : null,
    }));

    res.json({
      salidaId: result.salida.id,
      nombreActividad: result.salida.nombreActividad,
      liderCordada: result.salida.liderCordada,
      creatorEmail: result.salida.creatorEmail,
      participantes,
    });
  } catch (error) {
    console.error('[getSaludSalida]', error);
    res.status(500).json({ error: 'No se pudieron obtener las fichas de salud' });
  }
}

// POST /api/admin/salidas/:id/enviar-salud
export async function enviarSaludSalida(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const result = await buildParticipantesSalud(id);

    if ('notFound' in result) {
      res.status(404).json({ error: 'Salida no encontrada' });
      return;
    }
    if ('notActive' in result) {
      res.status(422).json({ error: 'La salida no está activa' });
      return;
    }

    // Resolve target email: creatorEmail first, then User.email via userId
    let targetEmail = result.salida.creatorEmail ?? null;

    if (!targetEmail && result.salida.userId) {
      const user = await prisma.user.findUnique({
        where: { id: result.salida.userId },
        select: { email: true },
      });
      targetEmail = user?.email ?? null;
    }

    if (!targetEmail) {
      res.status(422).json({ error: 'La salida no tiene un correo de responsable' });
      return;
    }

    const subject = `Resumen de fichas de salud — ${result.salida.nombreActividad}`;
    const htmlBody = buildSaludSalidaEmail(
      result.salida.nombreActividad,
      result.salida.liderCordada,
      result.participantes,
    );

    try {
      await sendEmail(targetEmail, subject, htmlBody);
    } catch (sendError) {
      console.error('[enviarSaludSalida] sendEmail failed', sendError);
      res.status(502).json({ error: 'No se pudo enviar el correo. Intenta nuevamente más tarde.' });
      return;
    }

    const participantesConFicha = result.participantes.filter((p) => p.fichaEncontrada).length;
    const participantesSinFicha = result.participantes.filter((p) => !p.fichaEncontrada).length;

    res.json({
      sent: true,
      to: targetEmail,
      participantesConFicha,
      participantesSinFicha,
    });
  } catch (error) {
    console.error('[enviarSaludSalida]', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
}
