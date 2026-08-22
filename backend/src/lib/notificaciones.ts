import { prisma } from './prisma.js';
import { sendEmail } from './google-gmail.js';
import { buildEventoInscripcionConfirmadaEmail } from './email-templates.js';
import { TipoNotificacion, Notificacion, Inscripcion, User, Evento } from '../generated/prisma/client.js';

// Cola idempotente de correos de eventos: el unique (inscripcionId, tipo)
// garantiza una fila por correo; encolar dos veces no duplica nada.

export class DispatchEnCursoError extends Error {
  constructor(eventoId: string) {
    super(`Ya hay un despacho de notificaciones en curso para el evento ${eventoId}`);
    this.name = 'DispatchEnCursoError';
  }
}

export async function encolarNotificacion(
  inscripcionId: string,
  tipo: TipoNotificacion,
): Promise<void> {
  await prisma.notificacion.createMany({
    data: [{ inscripcionId, tipo }],
    skipDuplicates: true,
  });
}

type NotificacionConContexto = Notificacion & {
  inscripcion: Inscripcion & { usuario: User; evento: Evento };
};

function buildEmailPorTipo(notif: NotificacionConContexto): { asunto: string; html: string } {
  const { usuario, evento } = notif.inscripcion;
  switch (notif.tipo) {
    case 'INSCRIPCION_CONFIRMADA':
      return {
        asunto: `Recibimos tu postulación: ${evento.titulo}`,
        html: buildEventoInscripcionConfirmadaEmail(usuario.name, evento, notif.inscripcion),
      };
    // Fase 5: SELECCIONADO, NO_SELECCIONADO y EVENTO_CANCELADO
    default:
      throw new Error('Plantilla no implementada');
  }
}

// Lock en memoria por evento. Válido solo porque el backend corre en UNA
// réplica (restricción de infraestructura): jamás escalar este servicio.
const dispatchLocks = new Set<string>();

export async function despacharNotificacionesPendientes(
  eventoId: string,
): Promise<{ despachadas: number; fallidas: number }> {
  if (dispatchLocks.has(eventoId)) throw new DispatchEnCursoError(eventoId);
  dispatchLocks.add(eventoId);

  try {
    const pendientes = await prisma.notificacion.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'ERROR'] },
        intentos: { lt: 5 },
        inscripcion: { eventoId },
      },
      include: { inscripcion: { include: { usuario: true, evento: true } } },
      orderBy: { creadaAt: 'asc' },
    });

    let despachadas = 0;
    let fallidas = 0;

    for (const notif of pendientes) {
      try {
        const { asunto, html } = buildEmailPorTipo(notif);
        const proveedorId = await sendEmail(notif.inscripcion.usuario.email, asunto, html);
        await prisma.notificacion.update({
          where: { id: notif.id },
          data: {
            estado: 'ENVIADA',
            enviadaAt: new Date(),
            proveedorId: proveedorId ?? null,
          },
        });
        despachadas++;
      } catch (err) {
        await prisma.notificacion.update({
          where: { id: notif.id },
          data: {
            estado: 'ERROR',
            intentos: { increment: 1 },
            ultimoError: String(err).slice(0, 500),
          },
        });
        fallidas++;
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    return { despachadas, fallidas };
  } finally {
    dispatchLocks.delete(eventoId);
  }
}
