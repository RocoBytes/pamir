import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

interface MesRow {
  // DATE_TRUNC returns timestamp-without-tz; some driver versions deliver
  // it as a string instead of a Date — handle both defensively.
  mes: Date | string;
  total: bigint;
}

// GET /api/admin/stats
export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const [
      totalSalidas,
      porStatus,
      totalCierres,
      incidentes,
      accidentes,
      porMesRaw,
      topDisciplinasRaw,
    ] = await prisma.$transaction([
      prisma.salida.count(),
      prisma.salida.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.cierre.count(),
      prisma.cierre.count({ where: { ocurrioIncidente: 'SI' } }),
      prisma.cierre.count({ where: { ocurrioAccidente: 'SI' } }),
      // Salidas per month over the last 12 months (table mapped as "salidas").
      // Timezone contract: fecha_inicio is stored as midnight UTC of the
      // user's intended calendar date, so UTC DATE_TRUNC yields the intended
      // month directly — converting with AT TIME ZONE would shift it wrong.
      prisma.$queryRaw<MesRow[]>`
        SELECT DATE_TRUNC('month', fecha_inicio) AS mes, COUNT(*) AS total
        FROM "salidas"
        WHERE fecha_inicio >= NOW() - INTERVAL '12 months'
        GROUP BY mes
        ORDER BY mes DESC
      `,
      prisma.salida.groupBy({
        by: ['disciplina'],
        _count: { _all: true },
        // Prisma's aggregate orderBy only accepts field names (no _all);
        // disciplina is non-nullable so its count equals the row count.
        orderBy: { _count: { disciplina: 'desc' } },
        take: 5,
      }),
    ]);

    const countFor = (status: string): number =>
      porStatus.find((s) => s.status === status)?._count._all ?? 0;

    const salidasAbiertas = countFor('EN_CURSO');
    const salidasCompletadas = countFor('COMPLETADA');
    // Salida-form vs cierre-form relation: how many salidas have a cierre filed
    const pctConCierre =
      totalSalidas > 0 ? Math.round((totalCierres / totalSalidas) * 100) : 0;

    // $queryRaw COUNT returns BigInt — convert before JSON serialization
    const porMes = porMesRaw.map((r) => ({
      mes: typeof r.mes === 'string' ? r.mes : r.mes.toISOString(),
      total: Number(r.total),
    }));

    const topDisciplinas = topDisciplinasRaw.map((d) => ({
      disciplina: d.disciplina,
      total: d._count._all,
    }));

    res.json({
      totalSalidas,
      salidasAbiertas,
      salidasCompletadas,
      totalCierres,
      pctConCierre,
      incidentes,
      accidentes,
      porMes,
      topDisciplinas,
    });
  } catch (error) {
    console.error('[getStats]', error);
    res.status(500).json({ error: 'No se pudieron obtener las estadísticas' });
  }
}
