import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { Evento, Prisma } from '../generated/prisma/client.js';

/**
 * UTC offset of America/Santiago for a calendar date (DST-safe). Mirrors the
 * helper in salidas.controller.ts: a noon-UTC probe avoids the midnight DST edge.
 */
function santiagoOffsetFor(dateStr: string): string {
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    timeZoneName: 'longOffset',
  }).formatToParts(probe);
  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-04:00';
  return tzPart.replace('GMT', '');
}

// El admin elige el cierre como hora de pared de Santiago; se guarda el
// instante UTC equivalente (abierto/cerrado se deriva comparando instantes).
function composeFechaCorte(fc: { fecha: string; hora: string }): Date {
  return new Date(`${fc.fecha}T${fc.hora}:00${santiagoOffsetFor(fc.fecha)}`);
}

// Fecha calendario (YYYY-MM-DD) de un instante, vista desde Santiago.
function fechaSantiagoDe(instante: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(instante);
}

// ─── Validación ───────────────────────────────────────────────────────────────

const fechaField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (se espera YYYY-MM-DD)');
const horaField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (se espera HH:MM)');

const tituloField = z
  .string()
  .trim()
  .min(2, 'El título es muy corto')
  .max(150, 'El título supera los 150 caracteres');

const texto300 = z.string().trim().max(300, 'El campo supera los 300 caracteres');
const texto5000 = z.string().trim().max(5000, 'El campo supera los 5000 caracteres');

// Todos los campos de la ficha son opcionales en un borrador (E1) y admiten
// null explícito para limpiar el valor.
const fichaShape = {
  categoriaId: z.number().int('Categoría inválida').nullable().optional(),
  fechaInicio: fechaField.nullable().optional(),
  horaInicio: horaField.nullable().optional(),
  fechaFin: fechaField.nullable().optional(),
  duracionTexto: texto300.nullable().optional(),
  ubicacion: texto300.nullable().optional(),
  reunionCoordinacion: texto300.nullable().optional(),
  organizadorNombre: texto300.nullable().optional(),
  alturaMaximaMsnm: z
    .number()
    .int()
    .min(0, 'La altura máxima debe estar entre 0 y 9000 msnm')
    .max(9000, 'La altura máxima debe estar entre 0 y 9000 msnm')
    .nullable()
    .optional(),
  dificultad: z
    .number()
    .int()
    .min(1, 'La dificultad debe estar entre 1 y 5')
    .max(5, 'La dificultad debe estar entre 1 y 5')
    .nullable()
    .optional(),
  costoTexto: texto300.nullable().optional(),
  cupos: z
    .number()
    .int('Los cupos deben ser un número entero')
    .min(1, 'Los cupos deben ser al menos 1')
    .nullable()
    .optional(),
  fechaCorte: z.object({ fecha: fechaField, hora: horaField }).nullable().optional(),
  objetivo: texto5000.nullable().optional(),
  itinerario: texto5000.nullable().optional(),
  incluye: texto5000.nullable().optional(),
  noIncluye: texto5000.nullable().optional(),
  recomendaciones: texto5000.nullable().optional(),
  avisoDestacado: texto300.nullable().optional(),
};

const createEventoSchema = z.object({ titulo: tituloField, ...fichaShape });
const updateEventoSchema = z.object({ titulo: tituloField.optional(), ...fichaShape });
const cancelarSchema = z.object({
  motivo: z.string().trim().max(1000, 'El motivo supera los 1000 caracteres').nullable().optional(),
});

type FichaInput = z.infer<typeof updateEventoSchema>;

function fechaUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// Solo mapea los campos presentes en el body (patch parcial). Los textos
// vacíos se normalizan a null para que la completitud de publicación no los
// cuente como llenos.
function toEventoData(data: FichaInput): Prisma.EventoUncheckedUpdateInput {
  const out: Prisma.EventoUncheckedUpdateInput = {};
  const texto = (v: string | null): string | null => (v === '' ? null : v);

  if (data.titulo !== undefined) out.titulo = data.titulo;
  if (data.categoriaId !== undefined) out.categoriaId = data.categoriaId;
  if (data.fechaInicio !== undefined) out.fechaInicio = data.fechaInicio ? fechaUtc(data.fechaInicio) : null;
  if (data.fechaFin !== undefined) out.fechaFin = data.fechaFin ? fechaUtc(data.fechaFin) : null;
  if (data.horaInicio !== undefined) out.horaInicio = data.horaInicio;
  if (data.duracionTexto !== undefined) out.duracionTexto = texto(data.duracionTexto);
  if (data.ubicacion !== undefined) out.ubicacion = texto(data.ubicacion);
  if (data.reunionCoordinacion !== undefined) out.reunionCoordinacion = texto(data.reunionCoordinacion);
  if (data.organizadorNombre !== undefined) out.organizadorNombre = texto(data.organizadorNombre);
  if (data.alturaMaximaMsnm !== undefined) out.alturaMaximaMsnm = data.alturaMaximaMsnm;
  if (data.dificultad !== undefined) out.dificultad = data.dificultad;
  if (data.costoTexto !== undefined) out.costoTexto = texto(data.costoTexto);
  if (data.cupos !== undefined) out.cupos = data.cupos;
  if (data.fechaCorte !== undefined) out.fechaCorte = data.fechaCorte ? composeFechaCorte(data.fechaCorte) : null;
  if (data.objetivo !== undefined) out.objetivo = texto(data.objetivo);
  if (data.itinerario !== undefined) out.itinerario = texto(data.itinerario);
  if (data.incluye !== undefined) out.incluye = texto(data.incluye);
  if (data.noIncluye !== undefined) out.noIncluye = texto(data.noIncluye);
  if (data.recomendaciones !== undefined) out.recomendaciones = texto(data.recomendaciones);
  if (data.avisoDestacado !== undefined) out.avisoDestacado = texto(data.avisoDestacado);
  return out;
}

// E2: la fecha de término no puede ser anterior a la de inicio
function violaE2(inicio: Date | null, fin: Date | null): boolean {
  return Boolean(inicio && fin && fin.getTime() < inicio.getTime());
}

const MENSAJE_E2 = 'La fecha de término no puede ser anterior a la fecha de inicio';

async function categoriaExiste(id: number): Promise<boolean> {
  const categoria = await prisma.categoriaEvento.findUnique({ where: { id } });
  return categoria !== null;
}

// ─── Crear borrador ───────────────────────────────────────────────────────────

export async function createEvento(req: Request, res: Response): Promise<void> {
  const parsed = createEventoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    return;
  }

  try {
    if (parsed.data.categoriaId != null && !(await categoriaExiste(parsed.data.categoriaId))) {
      res.status(400).json({ error: 'Categoría inválida' });
      return;
    }

    const inicio = parsed.data.fechaInicio ? fechaUtc(parsed.data.fechaInicio) : null;
    const fin = parsed.data.fechaFin ? fechaUtc(parsed.data.fechaFin) : null;
    if (violaE2(inicio, fin)) {
      res.status(400).json({ error: MENSAJE_E2 });
      return;
    }

    const evento = await prisma.evento.create({
      data: {
        ...(toEventoData(parsed.data) as Prisma.EventoUncheckedCreateInput),
        titulo: parsed.data.titulo,
        creadoPor: req.user!.id,
      },
      include: { categoria: true },
    });
    res.status(201).json(evento);
  } catch (error) {
    console.error('[createEvento]', error);
    res.status(500).json({ error: 'Error al crear el evento' });
  }
}

// ─── Editar ficha ─────────────────────────────────────────────────────────────

export async function updateEvento(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  const parsed = updateEventoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    return;
  }

  try {
    const evento = await prisma.evento.findUnique({ where: { id } });
    if (!evento) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }
    if (evento.estado === 'CANCELADO') {
      res.status(409).json({ error: 'El evento está cancelado' });
      return;
    }

    const camposPresentes = Object.entries(parsed.data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);
    if (evento.estado === 'FINALIZADO' && camposPresentes.some((k) => k !== 'avisoDestacado')) {
      res.status(409).json({ error: 'Un evento finalizado solo permite editar el aviso destacado' });
      return;
    }

    if (parsed.data.categoriaId != null && !(await categoriaExiste(parsed.data.categoriaId))) {
      res.status(400).json({ error: 'Categoría inválida' });
      return;
    }

    // E2 sobre el estado resultante (valor del patch o el ya guardado)
    const inicio =
      parsed.data.fechaInicio !== undefined
        ? parsed.data.fechaInicio
          ? fechaUtc(parsed.data.fechaInicio)
          : null
        : evento.fechaInicio;
    const fin =
      parsed.data.fechaFin !== undefined
        ? parsed.data.fechaFin
          ? fechaUtc(parsed.data.fechaFin)
          : null
        : evento.fechaFin;
    if (violaE2(inicio, fin)) {
      res.status(400).json({ error: MENSAJE_E2 });
      return;
    }

    const actualizado = await prisma.evento.update({
      where: { id },
      data: toEventoData(parsed.data),
      include: { categoria: true },
    });
    res.json(actualizado);
  } catch (error) {
    console.error('[updateEvento]', error);
    res.status(500).json({ error: 'Error al actualizar el evento' });
  }
}

// ─── Eliminar borrador ────────────────────────────────────────────────────────

export async function deleteEventoBorrador(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    const evento = await prisma.evento.findUnique({
      where: { id },
      include: { _count: { select: { inscripciones: true } } },
    });
    if (!evento) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }
    if (evento.estado !== 'BORRADOR') {
      res.status(409).json({ error: 'Solo un borrador puede eliminarse' });
      return;
    }
    if (evento._count.inscripciones > 0) {
      res.status(409).json({ error: 'Un evento con postulantes no se borra, se cancela' });
      return;
    }

    await prisma.evento.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('[deleteEventoBorrador]', error);
    res.status(500).json({ error: 'Error al eliminar el evento' });
  }
}

// ─── Ciclo de vida ────────────────────────────────────────────────────────────

// E1: campos que deben estar completos para publicar
const REQUERIDOS_PUBLICACION: Array<{ campo: keyof Evento; label: string }> = [
  { campo: 'titulo', label: 'título' },
  { campo: 'categoriaId', label: 'categoría' },
  { campo: 'fechaInicio', label: 'fecha de inicio' },
  { campo: 'fechaFin', label: 'fecha de término' },
  { campo: 'duracionTexto', label: 'duración' },
  { campo: 'ubicacion', label: 'ubicación' },
  { campo: 'reunionCoordinacion', label: 'reunión de coordinación' },
  { campo: 'organizadorNombre', label: 'organizador' },
  { campo: 'cupos', label: 'cupos' },
  { campo: 'fechaCorte', label: 'cierre de inscripciones' },
  { campo: 'objetivo', label: 'objetivo' },
  { campo: 'itinerario', label: 'itinerario' },
];

export async function publicarEvento(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    const evento = await prisma.evento.findUnique({ where: { id } });
    if (!evento) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }
    if (evento.estado !== 'BORRADOR') {
      res.status(409).json({ error: 'Solo un borrador puede publicarse' });
      return;
    }

    const faltantes = REQUERIDOS_PUBLICACION.filter(({ campo }) => {
      const valor = evento[campo];
      return valor === null || (typeof valor === 'string' && valor.trim() === '');
    }).map(({ label }) => label);
    if (faltantes.length > 0) {
      res.status(422).json({ error: `Faltan campos para publicar: ${faltantes.join(', ')}` });
      return;
    }

    if (violaE2(evento.fechaInicio, evento.fechaFin)) {
      res.status(422).json({ error: MENSAJE_E2 });
      return;
    }
    if ((evento.cupos as number) < 1) {
      res.status(422).json({ error: 'Los cupos deben ser al menos 1' });
      return;
    }

    // E3: el cierre (fecha calendario en Santiago) debe ser a más tardar el
    // día de inicio, y estar en el futuro.
    const fechaCorte = evento.fechaCorte as Date;
    if (fechaSantiagoDe(fechaCorte) > (evento.fechaInicio as Date).toISOString().slice(0, 10)) {
      res.status(422).json({ error: 'El cierre de inscripciones debe ser a más tardar el día de inicio del evento' });
      return;
    }
    if (fechaCorte.getTime() <= Date.now()) {
      res.status(422).json({ error: 'El cierre de inscripciones debe estar en el futuro' });
      return;
    }

    const publicado = await prisma.evento.update({
      where: { id },
      data: { estado: 'PUBLICADO', publicadoAt: new Date() },
    });
    res.json(publicado);
  } catch (error) {
    console.error('[publicarEvento]', error);
    res.status(500).json({ error: 'Error al publicar el evento' });
  }
}

export async function despublicarEvento(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    const evento = await prisma.evento.findUnique({ where: { id } });
    if (!evento) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }
    if (evento.estado !== 'PUBLICADO') {
      res.status(409).json({ error: 'Solo un evento publicado puede despublicarse' });
      return;
    }

    const activas = await prisma.inscripcion.count({
      where: { eventoId: id, estado: { in: ['POSTULADO', 'SELECCIONADO'] } },
    });
    if (activas > 0) {
      res.status(409).json({ error: 'No se puede despublicar: hay inscripciones activas' });
      return;
    }

    const despublicado = await prisma.evento.update({
      where: { id },
      data: { estado: 'BORRADOR', publicadoAt: null },
    });
    res.json(despublicado);
  } catch (error) {
    console.error('[despublicarEvento]', error);
    res.status(500).json({ error: 'Error al despublicar el evento' });
  }
}

export async function cancelarEvento(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  const parsed = cancelarSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    return;
  }
  const motivo = parsed.data.motivo || null;

  try {
    const evento = await prisma.evento.findUnique({ where: { id } });
    if (!evento) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }
    if (evento.estado === 'CANCELADO') {
      res.status(409).json({ error: 'El evento ya está cancelado' });
      return;
    }
    if (evento.estado === 'FINALIZADO' && !motivo) {
      res.status(422).json({ error: 'Debes indicar el motivo de la cancelación' });
      return;
    }

    const cancelado = await prisma.evento.update({
      where: { id },
      data: { estado: 'CANCELADO', canceladoAt: new Date(), motivoCancelacion: motivo },
    });

    // Fase 5: encolar notificaciones EVENTO_CANCELADO para los inscritos
    // (POSTULADO si venía de PUBLICADO, SELECCIONADO si venía de FINALIZADO).

    res.json(cancelado);
  } catch (error) {
    console.error('[cancelarEvento]', error);
    res.status(500).json({ error: 'Error al cancelar el evento' });
  }
}
