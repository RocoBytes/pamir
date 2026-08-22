import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';

const MES_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

// Medianoche UTC de la fecha calendario actual en Santiago — convención Salida:
// las fechas de eventos se guardan como medianoche UTC del día elegido.
function hoySantiagoUtc(): Date {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
  return new Date(`${hoy}T00:00:00.000Z`);
}

export async function getCategorias(_req: Request, res: Response): Promise<void> {
  try {
    const categorias = await prisma.categoriaEvento.findMany({
      where: { activa: true },
      orderBy: { orden: 'asc' },
    });
    res.json(categorias);
  } catch (error) {
    console.error('[getCategorias]', error);
    res.status(500).json({ error: 'Error al obtener las categorías' });
  }
}

export async function getEventos(req: Request, res: Response): Promise<void> {
  try {
    const isAdmin = req.user!.rol === 'ADMIN';

    const mes = req.query['mes'];
    if (mes !== undefined && (typeof mes !== 'string' || !MES_REGEX.test(mes))) {
      res.status(400).json({ error: 'Formato de mes inválido (se espera YYYY-MM)' });
      return;
    }

    const rawCategoria = req.query['categoria'];
    const slugs = (Array.isArray(rawCategoria) ? rawCategoria : rawCategoria ? [rawCategoria] : [])
      .filter((s): s is string => typeof s === 'string');

    const incluirPasados = req.query['incluirPasados'] === 'true';

    const condiciones: Prisma.EventoWhereInput[] = [];
    if (!isAdmin) {
      condiciones.push({ estado: { in: ['PUBLICADO', 'FINALIZADO'] } });
    }
    if (slugs.length > 0) {
      condiciones.push({ categoria: { slug: { in: slugs } } });
    }

    // Ventana temporal: mes usa semántica de solapamiento; por defecto se
    // ocultan los eventos ya terminados. Los borradores del admin sin fechas
    // deben aparecer siempre.
    let ventana: Prisma.EventoWhereInput | null = null;
    if (typeof mes === 'string') {
      const [anio, mesNum] = mes.split('-').map(Number) as [number, number];
      const inicioMes = new Date(Date.UTC(anio, mesNum - 1, 1));
      const finMes = new Date(Date.UTC(anio, mesNum, 0));
      ventana = { fechaInicio: { lte: finMes }, fechaFin: { gte: inicioMes } };
    } else if (!incluirPasados) {
      ventana = { fechaFin: { gte: hoySantiagoUtc() } };
    }
    if (ventana) {
      condiciones.push(
        isAdmin ? { OR: [ventana, { estado: 'BORRADOR', fechaInicio: null }] } : ventana,
      );
    }

    const eventos = await prisma.evento.findMany({
      where: { AND: condiciones },
      orderBy: { fechaInicio: 'asc' },
      include: {
        categoria: true,
        _count: { select: { inscripciones: { where: { estado: 'POSTULADO' } } } },
      },
    });

    const mias = await prisma.inscripcion.findMany({
      where: { usuarioId: req.user!.id, eventoId: { in: eventos.map((e) => e.id) } },
      select: { eventoId: true, estado: true },
    });
    const miEstadoPorEvento = new Map(mias.map((i) => [i.eventoId, i.estado]));

    res.json(
      eventos.map(({ _count, ...evento }) => ({
        ...evento,
        totalPostulantes: _count.inscripciones,
        miInscripcion: miEstadoPorEvento.has(evento.id)
          ? { estado: miEstadoPorEvento.get(evento.id) }
          : null,
      })),
    );
  } catch (error) {
    console.error('[getEventos]', error);
    res.status(500).json({ error: 'Error al obtener los eventos' });
  }
}

export async function getEventoById(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    const evento = await prisma.evento.findUnique({
      where: { id },
      include: {
        categoria: true,
        _count: { select: { inscripciones: { where: { estado: 'POSTULADO' } } } },
      },
    });

    // Un borrador no existe para quien no es admin (no filtrar existencia)
    if (!evento || (evento.estado === 'BORRADOR' && req.user!.rol !== 'ADMIN')) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }

    const [mia, declaracionVigente] = await Promise.all([
      prisma.inscripcion.findUnique({
        where: { eventoId_usuarioId: { eventoId: evento.id, usuarioId: req.user!.id } },
        select: { estado: true },
      }),
      prisma.declaracionJuradaVersion.findFirst({
        where: { vigenteHasta: null },
        orderBy: { vigenteDesde: 'desc' },
        select: { id: true, version: true, titulo: true, items: true },
      }),
    ]);

    const { _count, ...rest } = evento;
    res.json({
      ...rest,
      totalPostulantes: _count.inscripciones,
      miInscripcion: mia ? { estado: mia.estado } : null,
      declaracionVigente,
    });
  } catch (error) {
    console.error('[getEventoById]', error);
    res.status(500).json({ error: 'Error al obtener el evento' });
  }
}
