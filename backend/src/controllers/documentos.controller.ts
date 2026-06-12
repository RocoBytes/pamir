import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { ADMIN_EMAIL } from '../lib/constants.js';

const MEMBRESIA_SOCIO_PAMIR = 'SOCIO_ANDINO_PAMIR';

// GET /api/documentos — biblioteca del club, solo socios ACP y admin.
// El gate de membresía vive acá: ocultar el recuadro en el frontend es
// cosmético, la autorización real es esta.
export async function getDocumentos(req: Request, res: Response): Promise<void> {
  try {
    const email = req.user!.email;

    if (email !== ADMIN_EMAIL) {
      const integrante = await prisma.integrante.findFirst({
        where: { email },
        select: { membresiaClub: true },
      });
      if (integrante?.membresiaClub !== MEMBRESIA_SOCIO_PAMIR) {
        res.status(403).json({ error: 'Sección exclusiva para socios de Andino Club Pamir' });
        return;
      }
    }

    const documentos = await prisma.documento.findMany({
      where: { visible: true },
      orderBy: [{ categoria: 'asc' }, { orden: 'asc' }, { nombre: 'asc' }],
      select: {
        id: true,
        categoria: true,
        nombre: true,
        descripcion: true,
        driveFileUrl: true,
      },
    });

    res.json(documentos);
  } catch (error) {
    console.error('[getDocumentos]', error);
    res.status(500).json({ error: 'No se pudieron obtener los documentos' });
  }
}
