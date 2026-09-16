import { z } from 'zod';

export const ANIO_MINIMO = 2000;
export const ANIO_MAXIMO = 2100;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// True when the string is a real calendar date within the supported year range.
export function esFechaCalendarioValida(value: string): boolean {
  if (!FORMATO_FECHA.test(value)) return false;
  const [anio, mes, dia] = value.split('-').map(Number) as [number, number, number];
  if (anio < ANIO_MINIMO || anio > ANIO_MAXIMO) return false;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

export const fechaCalendarioField = z
  .string()
  .regex(FORMATO_FECHA, 'Formato de fecha inválido (se espera YYYY-MM-DD)')
  .refine(esFechaCalendarioValida, `Fecha inválida: revisa el día, el mes y el año (entre ${ANIO_MINIMO} y ${ANIO_MAXIMO})`);
