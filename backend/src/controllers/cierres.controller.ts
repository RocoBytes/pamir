import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { Prisma, Cierre } from '../generated/prisma/client.js';
import { sendEmail } from '../lib/google-gmail.js';
import { buildCierreNotificationEmail } from '../lib/email-templates.js';

const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

async function sendCierreParticipantEmails(salidaId: string, cierre: Cierre): Promise<void> {
  const salida = await prisma.salida.findUnique({ where: { id: salidaId } });
  if (!salida) return;

  const ruts = (salida.participantes as { rut?: string }[])
    .map((p) => p.rut)
    .filter((r): r is string => Boolean(r));
  if (ruts.length === 0) return;

  const integrantes = await prisma.integrante.findMany({
    where: { rut: { in: ruts } },
    select: { email: true, nombreCompleto: true },
  });

  for (const i of integrantes) {
    await sendEmail(
      i.email,
      `Cierre de la salida "${salida.nombreActividad}" — Pamir`,
      buildCierreNotificationEmail(i.nombreCompleto, salida, cierre),
    ).catch((err) => console.error(`[cierre-email] Fallo al enviar a ${i.email}:`, err));
    await new Promise((r) => setTimeout(r, 350));
  }
}

interface CreateCierreBody {
  salidaId: string;
  fechaFinalizacionReal: string;
  estadoCierre: string;
  motivoAbandono?: string;
  huboCambios: string;
  motivosCambios?: unknown[];
  motivosCambiosOtro?: string;
  ocurrioIncidente: string;
  tiposIncidente?: unknown[];
  gravedadLesion?: string;
  descripcionSuceso?: string;
  causasRaiz?: unknown[];
  causaRaizOtro?: string;
  desempenoEquipo: string;
  detalleFallaEquipo?: string;
  observacionesRuta: string;
  precisionPronostico: number;
  leccionesAprendidas: string;
  recomendacionesFuturos?: string;
  sugerenciasClub?: string;
}

export async function createCierre(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body as CreateCierreBody;
    const userId = req.user?.id ?? null;

    const cierre = await prisma.cierre.create({
      data: {
        salidaId: data.salidaId,
        userId,
        fechaFinalizacionReal: new Date(data.fechaFinalizacionReal),
        estadoCierre: data.estadoCierre,
        motivoAbandono: data.motivoAbandono,
        huboCambios: data.huboCambios,
        motivosCambios: asJson(data.motivosCambios ?? []),
        motivosCambiosOtro: data.motivosCambiosOtro,
        ocurrioIncidente: data.ocurrioIncidente,
        tiposIncidente: asJson(data.tiposIncidente ?? []),
        gravedadLesion: data.gravedadLesion,
        descripcionSuceso: data.descripcionSuceso,
        causasRaiz: asJson(data.causasRaiz ?? []),
        causaRaizOtro: data.causaRaizOtro,
        desempenoEquipo: data.desempenoEquipo,
        detalleFallaEquipo: data.detalleFallaEquipo,
        observacionesRuta: data.observacionesRuta,
        precisionPronostico: data.precisionPronostico,
        leccionesAprendidas: data.leccionesAprendidas,
        recomendacionesFuturos: data.recomendacionesFuturos,
        sugerenciasClub: data.sugerenciasClub,
      },
    });

    res.status(201).json(cierre);

    sendCierreParticipantEmails(data.salidaId, cierre)
      .catch((err) => console.error('[cierre-email]', err));
  } catch (error) {
    console.error('[createCierre]', error);
    res.status(500).json({ error: 'No se pudo crear el cierre' });
  }
}

export async function getCierres(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    const cierres = await prisma.cierre.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      include: { salida: { select: { nombreActividad: true } } },
    });

    res.json(cierres);
  } catch (error) {
    console.error('[getCierres]', error);
    res.status(500).json({ error: 'No se pudieron obtener los cierres' });
  }
}
