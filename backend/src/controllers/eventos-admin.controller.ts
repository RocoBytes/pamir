import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { Evento, Prisma } from '../generated/prisma/client.js';
import {
  despacharNotificacionesPendientes,
  DispatchEnCursoError,
} from '../lib/notificaciones.js';

// Errores con código HTTP lanzados desde dentro de la transacción de
// finalización; el catch del handler los mapea a la respuesta.
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

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

    const estadoPrevio = evento.estado;
    const cancelado = await prisma.evento.update({
      where: { id },
      data: { estado: 'CANCELADO', canceladoAt: new Date(), motivoCancelacion: motivo },
    });

    // Aviso de cancelación: a los POSTULADO si venía de PUBLICADO, a los
    // SELECCIONADO si venía de FINALIZADO. El unique de la cola evita duplicados.
    let hayAvisos = false;
    if (estadoPrevio === 'PUBLICADO' || estadoPrevio === 'FINALIZADO') {
      const objetivo = estadoPrevio === 'PUBLICADO' ? 'POSTULADO' : 'SELECCIONADO';
      const destinatarios = await prisma.inscripcion.findMany({
        where: { eventoId: id, estado: objetivo },
        select: { id: true },
      });
      if (destinatarios.length > 0) {
        await prisma.notificacion.createMany({
          data: destinatarios.map((d) => ({ inscripcionId: d.id, tipo: 'EVENTO_CANCELADO' as const })),
          skipDuplicates: true,
        });
        hayAvisos = true;
      }
    }

    res.json(cancelado);

    if (hayAvisos) {
      despacharNotificacionesPendientes(id).catch((err) =>
        console.error('[cancelarEvento] dispatch:', err),
      );
    }
  } catch (error) {
    console.error('[cancelarEvento]', error);
    res.status(500).json({ error: 'Error al cancelar el evento' });
  }
}

// ─── Postulantes ──────────────────────────────────────────────────────────────

export async function getPostulantes(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    const evento = await prisma.evento.findUnique({
      where: { id },
      select: { id: true, titulo: true, cupos: true, estado: true, fechaCorte: true },
    });
    if (!evento) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }

    // D10: orden de llegada. Los RETIRADO se incluyen (visibles, no
    // seleccionables) porque le sirven al organizador como contexto.
    const inscripciones = await prisma.inscripcion.findMany({
      where: { eventoId: id },
      orderBy: { postuladoAt: 'asc' },
      include: {
        usuario: { select: { name: true, email: true } },
        notificaciones: {
          select: { tipo: true, estado: true, intentos: true, ultimoError: true },
          orderBy: { creadaAt: 'asc' },
        },
      },
    });

    // D8: teléfono y club salen de la ficha de integrante, cruzada por email
    const emails = inscripciones.map((i) => i.usuario.email);
    const integrantes = emails.length
      ? await prisma.integrante.findMany({
          where: { email: { in: emails, mode: 'insensitive' } },
          select: { email: true, telefonoCelular: true, membresiaClub: true },
        })
      : [];
    const fichaPorEmail = new Map(integrantes.map((i) => [i.email.toLowerCase(), i]));

    res.json({
      evento,
      postulantes: inscripciones.map((i) => {
        const ficha = fichaPorEmail.get(i.usuario.email.toLowerCase());
        return {
          id: i.id,
          usuario: { nombre: i.usuario.name, email: i.usuario.email },
          telefono: ficha?.telefonoCelular ?? null,
          membresiaClub: ficha?.membresiaClub ?? null,
          tieneVehiculo: i.tieneVehiculo,
          cuposVehiculo: i.cuposVehiculo,
          estado: i.estado,
          postuladoAt: i.postuladoAt,
          retiradoAt: i.retiradoAt,
          notificaciones: i.notificaciones,
        };
      }),
    });
  } catch (error) {
    console.error('[getPostulantes]', error);
    res.status(500).json({ error: 'Error al obtener los postulantes' });
  }
}

// ─── Finalización (F1–F5) ─────────────────────────────────────────────────────

const finalizarSchema = z.object({
  seleccionadosIds: z
    .array(z.string().uuid('Selección inválida'))
    .min(1, 'Selecciona al menos un participante')
    .max(200, 'Selección demasiado grande'),
});

export async function finalizarEvento(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  const parsed = finalizarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
    return;
  }
  const ids = [...new Set(parsed.data.seleccionadosIds)];

  try {
    const resultado = await prisma.$transaction(
      async (tx) => {
        // F1: FOR UPDATE serializa finalizaciones concurrentes sobre el evento
        const filas = await tx.$queryRaw<{ id: string; cupos: number | null }[]>`
          SELECT id, cupos FROM "eventos"
          WHERE id = ${id} AND estado = 'PUBLICADO'::"EstadoEvento"
          FOR UPDATE`;
        if (filas.length === 0) {
          throw new HttpError(409, 'El evento ya fue finalizado o cancelado');
        }
        const cupos = filas[0]?.cupos ?? 0;

        // F2: la selección cabe en los cupos
        if (ids.length < 1 || ids.length > cupos) {
          throw new HttpError(422, `La selección debe tener entre 1 y ${cupos} participantes`);
        }

        // F3: todos los seleccionados siguen POSTULADO (nadie se retiró entremedio)
        const vigentes = await tx.inscripcion.count({
          where: { id: { in: ids }, eventoId: id, estado: 'POSTULADO' },
        });
        if (vigentes !== ids.length) {
          throw new HttpError(409, 'Alguien de tu selección se retiró; recarga la lista');
        }

        const ahora = new Date();
        await tx.inscripcion.updateMany({
          where: { id: { in: ids } },
          data: { estado: 'SELECCIONADO', resueltoAt: ahora },
        });
        // F5: solo los POSTULADO restantes pasan a NO_SELECCIONADO; RETIRADO intacto
        const noSeleccionados = await tx.inscripcion.updateMany({
          where: { eventoId: id, estado: 'POSTULADO' },
          data: { estado: 'NO_SELECCIONADO', resueltoAt: ahora },
        });

        await tx.evento.update({
          where: { id },
          data: { estado: 'FINALIZADO', finalizadoAt: ahora, finalizadoPor: req.user!.id },
        });

        // F4: una notificación por resuelto; el unique la mantiene única aunque
        // esta transacción se reintente o se finalice dos veces
        const resueltas = await tx.inscripcion.findMany({
          where: { eventoId: id, estado: { in: ['SELECCIONADO', 'NO_SELECCIONADO'] } },
          select: { id: true, estado: true },
        });
        await tx.notificacion.createMany({
          data: resueltas.map((i) => ({
            inscripcionId: i.id,
            tipo: i.estado === 'SELECCIONADO' ? ('SELECCIONADO' as const) : ('NO_SELECCIONADO' as const),
          })),
          skipDuplicates: true,
        });

        return { seleccionados: ids.length, noSeleccionados: noSeleccionados.count };
      },
      { timeout: 15000 },
    );

    res.json(resultado);

    despacharNotificacionesPendientes(id).catch((err) =>
      console.error('[finalizarEvento] dispatch:', err),
    );
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('[finalizarEvento]', error);
    res.status(500).json({ error: 'Error al finalizar el evento' });
  }
}

// ─── Reenvío de notificaciones pendientes ─────────────────────────────────────

export async function reenviarNotificaciones(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  try {
    const evento = await prisma.evento.findUnique({ where: { id }, select: { id: true } });
    if (!evento) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }

    const { despachadas, fallidas } = await despacharNotificacionesPendientes(id);
    const pendientes = await prisma.notificacion.count({
      where: {
        inscripcion: { eventoId: id },
        estado: { in: ['PENDIENTE', 'ERROR'] },
        intentos: { lt: 5 },
      },
    });
    res.json({ despachadas, fallidas, pendientes });
  } catch (error) {
    if (error instanceof DispatchEnCursoError) {
      res.status(409).json({ error: 'Ya hay un envío en curso para este evento' });
      return;
    }
    console.error('[reenviarNotificaciones]', error);
    res.status(500).json({ error: 'Error al reenviar las notificaciones' });
  }
}
