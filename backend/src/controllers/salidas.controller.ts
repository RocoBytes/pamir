import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { DifficultyLevel, SalidaStatus } from '../generated/prisma/enums.js';

interface CreateSalidaBody {
  mountain: string;
  route: string;
  startDate: string;
  endDate: string;
  objective?: string;
  participants?: unknown;
  emergencyName?: string;
  emergencyPhone?: string;
  difficulty?: DifficultyLevel;
  equipment?: unknown;
  weatherNote?: string;
}

export async function createSalida(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body as CreateSalidaBody;

    // Usuarios autenticados tienen userId; invitados dejan userId null
    const userId = req.user?.id ?? null;

    const salida = await prisma.salida.create({
      data: {
        userId,
        mountain: data.mountain,
        route: data.route,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        objective: data.objective,
        participants: (data.participants ?? []) as object[],
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        difficulty: data.difficulty,
        equipment: (data.equipment ?? []) as object[],
        weatherNote: data.weatherNote,
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
      where: userId ? { userId } : undefined,
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
    const { status, difficulty, ...rest } = req.body as {
      status?: SalidaStatus;
      difficulty?: DifficultyLevel;
      [key: string]: unknown;
    };

    const salida = await prisma.salida.update({
      where: { id },
      data: { ...rest, status, difficulty },
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
