import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { Prisma, SalidaStatus } from '../generated/prisma/client.js';

const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

interface CreateSalidaBody {
  // Paso 1
  tipoSalida: string;
  disciplina: string;
  nombreActividad: string;
  ubicacionGeografica: string;
  // Paso 2
  fechaInicio: string;
  fechaRetornoEstimada: string;
  horaRetornoEstimada: string;
  horaAlerta: string;
  avisosExternos?: string[];
  // Paso 3
  liderCordada: string;
  participantes?: unknown[];
  coordinacionGrupal?: boolean;
  matrizRiesgos?: boolean;
  // Paso 4
  mediosComunicacion?: string[];
  idDispositivoFrecuencia?: string;
  equipoColectivo?: string[];
  equipoColectivoOtro?: string;
  // Paso 5
  pronosticoMeteorologico?: string;
  riesgosIdentificados?: string[];
  riesgosOtro?: string;
  planEvacuacion?: string;
  // GPX
  gpxFileUrl?: string;
  // Estado
  status?: SalidaStatus;
  incidentReport?: string;
}

export async function createSalida(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body as CreateSalidaBody;
    const userId = req.user?.id ?? null;

    const salida = await prisma.salida.create({
      data: {
        userId,
        tipoSalida: data.tipoSalida,
        disciplina: data.disciplina,
        nombreActividad: data.nombreActividad,
        ubicacionGeografica: data.ubicacionGeografica,
        fechaInicio: new Date(data.fechaInicio),
        fechaRetornoEstimada: new Date(data.fechaRetornoEstimada),
        horaRetornoEstimada: data.horaRetornoEstimada,
        horaAlerta: data.horaAlerta,
        avisosExternos: asJson(data.avisosExternos ?? []),
        liderCordada: data.liderCordada,
        participantes: asJson(data.participantes ?? []),
        coordinacionGrupal: data.coordinacionGrupal ?? false,
        matrizRiesgos: data.matrizRiesgos ?? false,
        mediosComunicacion: asJson(data.mediosComunicacion ?? []),
        idDispositivoFrecuencia: data.idDispositivoFrecuencia,
        equipoColectivo: asJson(data.equipoColectivo ?? []),
        equipoColectivoOtro: data.equipoColectivoOtro,
        pronosticoMeteorologico: data.pronosticoMeteorologico,
        riesgosIdentificados: asJson(data.riesgosIdentificados ?? []),
        riesgosOtro: data.riesgosOtro,
        planEvacuacion: data.planEvacuacion,
        gpxFileUrl: data.gpxFileUrl,
        status: data.status ?? 'EN_CURSO',
        incidentReport: data.incidentReport,
      },
    });

    res.status(201).json(salida);
  } catch (error) {
    console.error('[createSalida]', error);
    res.status(500).json({ error: 'No se pudo crear la salida' });
  }
}

export async function getSalidas(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    const salidas = await prisma.salida.findMany({
      where: userId
        ? { userId, status: 'EN_CURSO' }
        : { status: 'EN_CURSO' },
      orderBy: { createdAt: 'desc' },
    });

    res.json(salidas);
  } catch (error) {
    console.error('[getSalidas]', error);
    res.status(500).json({ error: 'No se pudieron obtener las salidas' });
  }
}

export async function getSalidaById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const salida = await prisma.salida.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!salida) {
      res.status(404).json({ error: 'Salida no encontrada' });
      return;
    }

    res.json(salida);
  } catch (error) {
    console.error('[getSalidaById]', error);
    res.status(500).json({ error: 'No se pudo obtener la salida' });
  }
}

export async function updateSalida(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status, ...rest } = req.body as { status?: SalidaStatus; [key: string]: unknown };

    const salida = await prisma.salida.update({
      where: { id },
      data: { ...rest, status },
    });

    res.json(salida);
  } catch (error) {
    console.error('[updateSalida]', error);
    res.status(500).json({ error: 'No se pudo actualizar la salida' });
  }
}

export async function deleteSalida(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    await prisma.salida.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('[deleteSalida]', error);
    res.status(500).json({ error: 'No se pudo eliminar la salida' });
  }
}
