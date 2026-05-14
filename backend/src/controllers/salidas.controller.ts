import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { Prisma, SalidaStatus, Salida } from '../generated/prisma/client.js';
import { sendEmail } from '../lib/google-gmail.js';
import { buildSalidaNotificationEmail } from '../lib/email-templates.js';

const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

async function sendSalidaParticipantEmails(participantObjs: unknown[], salida: Salida): Promise<void> {
  const ruts = (participantObjs as { rut?: string }[])
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
      `Has sido registrado en la salida "${salida.nombreActividad}" — Pamir`,
      buildSalidaNotificationEmail(i.nombreCompleto, salida),
    ).catch((err) => console.error(`[salida-email] Fallo al enviar a ${i.email}:`, err));
    await new Promise((r) => setTimeout(r, 350));
  }
}

interface CreateSalidaBody {
  // Paso 1
  tipoSalida: string;
  disciplina: string;
  temporada: string;
  nombreActividad: string;
  ubicacionGeografica: string;
  // Paso 2
  fechaInicio: string;
  fechaRetornoEstimada: string;
  horaRetornoEstimada: string;
  horaAlerta: string;
  avisosExternos?: string[];
  retenCarabineros?: string;
  nombreFamiliar?: string;
  telefonoFamiliar?: string;
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
        creatorEmail: req.user?.email ?? null,
        tipoSalida: data.tipoSalida,
        disciplina: data.disciplina,
        temporada: data.temporada,
        nombreActividad: data.nombreActividad,
        ubicacionGeografica: data.ubicacionGeografica,
        fechaInicio: new Date(data.fechaInicio),
        fechaRetornoEstimada: new Date(data.fechaRetornoEstimada),
        horaRetornoEstimada: data.horaRetornoEstimada,
        horaAlerta: data.horaAlerta,
        avisosExternos: asJson(data.avisosExternos ?? []),
        retenCarabineros: data.retenCarabineros || null,
        nombreFamiliar: data.nombreFamiliar || null,
        telefonoFamiliar: data.telefonoFamiliar || null,
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

    sendSalidaParticipantEmails(
      (data.participantes ?? []) as unknown[],
      salida,
    ).catch((err) => console.error('[salida-email]', err));
  } catch (error) {
    console.error('[createSalida]', error);
    res.status(500).json({ error: 'No se pudo crear la salida' });
  }
}

export async function getSalidas(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId) {
      const salidas = await prisma.salida.findMany({
        where: { userId: null, status: 'EN_CURSO' },
        orderBy: { createdAt: 'desc' },
      });
      res.json(salidas);
      return;
    }

    let userRut: string | null = null;
    if (userEmail) {
      const integrante = await prisma.integrante.findFirst({
        where: { email: userEmail },
        select: { rut: true },
      });
      if (integrante) {
        userRut = integrante.rut;
      }
    }

    const whereClause: Prisma.SalidaWhereInput = {
      status: 'EN_CURSO',
      OR: [
        { userId: userId },
      ],
    };

    if (userRut) {
      whereClause.OR!.push({
        participantes: {
          path: '$[*].rut',
          array_contains: userRut,
        },
      });
    }

    const salidas = await prisma.salida.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    res.json(salidas);
  } catch (error) {
    console.error('[getSalidas]', error);
    res.status(500).json({ error: 'No se pudieron obtener las salidas' });
  }
}

export async function claimSalida(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Debes iniciar sesión para reclamar una salida' });
      return;
    }

    const salida = await prisma.salida.findUnique({ where: { id } });

    if (!salida) {
      res.status(404).json({ error: 'Salida no encontrada' });
      return;
    }
    if (salida.userId !== null) {
      res.status(409).json({ error: 'Esta salida ya tiene un propietario' });
      return;
    }

    const updated = await prisma.salida.update({
      where: { id },
      data: { userId, creatorEmail: req.user!.email },
    });

    res.json(updated);
  } catch (error) {
    console.error('[claimSalida]', error);
    res.status(500).json({ error: 'No se pudo reclamar la salida' });
  }
}

export async function getSalidaById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const requestUserId = req.user?.id ?? null;
    const requestUserEmail = req.user?.email ?? null;

    const salida = await prisma.salida.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!salida) {
      res.status(404).json({ error: 'Salida no encontrada' });
      return;
    }

    let isParticipant = false;
    if (requestUserEmail) {
      const integrante = await prisma.integrante.findFirst({
        where: { email: requestUserEmail },
        select: { rut: true },
      });
      if (integrante && integrante.rut) {
        const parts = (salida.participantes ?? []) as { rut?: string }[];
        if (parts.some((p) => p.rut === integrante.rut)) {
          isParticipant = true;
        }
      }
    }

    if (salida.userId !== null && salida.userId !== requestUserId && !isParticipant) {
      res.status(403).json({ error: 'No tienes permiso para ver esta salida' });
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
    const requestUserId = req.user?.id ?? null;

    const existing = await prisma.salida.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Salida no encontrada' });
      return;
    }
    // Salidas con dueño sólo puede editarlas ese dueño
    if (existing.userId !== null && existing.userId !== requestUserId) {
      res.status(403).json({ error: 'No tienes permiso para modificar esta salida' });
      return;
    }

    // Whitelist explícita — nunca exponer campos de sistema al cliente
    const body = req.body as Partial<CreateSalidaBody>;
    const salida = await prisma.salida.update({
      where: { id },
      data: {
        ...(body.tipoSalida !== undefined && { tipoSalida: body.tipoSalida }),
        ...(body.disciplina !== undefined && { disciplina: body.disciplina }),
        ...(body.temporada !== undefined && { temporada: body.temporada }),
        ...(body.nombreActividad !== undefined && { nombreActividad: body.nombreActividad }),
        ...(body.ubicacionGeografica !== undefined && { ubicacionGeografica: body.ubicacionGeografica }),
        ...(body.fechaInicio !== undefined && { fechaInicio: new Date(body.fechaInicio) }),
        ...(body.fechaRetornoEstimada !== undefined && { fechaRetornoEstimada: new Date(body.fechaRetornoEstimada) }),
        ...(body.horaRetornoEstimada !== undefined && { horaRetornoEstimada: body.horaRetornoEstimada }),
        ...(body.horaAlerta !== undefined && { horaAlerta: body.horaAlerta }),
        ...(body.avisosExternos !== undefined && { avisosExternos: asJson(body.avisosExternos) }),
        ...(body.retenCarabineros !== undefined && { retenCarabineros: body.retenCarabineros || null }),
        ...(body.nombreFamiliar !== undefined && { nombreFamiliar: body.nombreFamiliar || null }),
        ...(body.telefonoFamiliar !== undefined && { telefonoFamiliar: body.telefonoFamiliar || null }),
        ...(body.liderCordada !== undefined && { liderCordada: body.liderCordada }),
        ...(body.participantes !== undefined && { participantes: asJson(body.participantes) }),
        ...(body.coordinacionGrupal !== undefined && { coordinacionGrupal: body.coordinacionGrupal }),
        ...(body.matrizRiesgos !== undefined && { matrizRiesgos: body.matrizRiesgos }),
        ...(body.mediosComunicacion !== undefined && { mediosComunicacion: asJson(body.mediosComunicacion) }),
        ...(body.idDispositivoFrecuencia !== undefined && { idDispositivoFrecuencia: body.idDispositivoFrecuencia }),
        ...(body.equipoColectivo !== undefined && { equipoColectivo: asJson(body.equipoColectivo) }),
        ...(body.equipoColectivoOtro !== undefined && { equipoColectivoOtro: body.equipoColectivoOtro }),
        ...(body.pronosticoMeteorologico !== undefined && { pronosticoMeteorologico: body.pronosticoMeteorologico }),
        ...(body.riesgosIdentificados !== undefined && { riesgosIdentificados: asJson(body.riesgosIdentificados) }),
        ...(body.riesgosOtro !== undefined && { riesgosOtro: body.riesgosOtro }),
        ...(body.planEvacuacion !== undefined && { planEvacuacion: body.planEvacuacion }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.incidentReport !== undefined && { incidentReport: body.incidentReport }),
      },
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
    const requestUserId = req.user?.id ?? null;

    const existing = await prisma.salida.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Salida no encontrada' });
      return;
    }
    if (existing.userId !== null && existing.userId !== requestUserId) {
      res.status(403).json({ error: 'No tienes permiso para eliminar esta salida' });
      return;
    }

    await prisma.salida.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('[deleteSalida]', error);
    res.status(500).json({ error: 'No se pudo eliminar la salida' });
  }
}
