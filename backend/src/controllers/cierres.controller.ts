import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';

const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

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
