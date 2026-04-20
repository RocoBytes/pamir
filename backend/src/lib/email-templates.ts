interface IntegranteEmailData {
  nombreCompleto: string;
  rut: string;
  nacionalidad: string;
  genero: string;
  fechaNacimiento: string;
  direccion: string;
  comuna: string;
  region: string;
  telefonoCelular: string;
  email: string;
  previsionSalud: string;
  nombreContacto: string;
  parentesco: string;
  telefonoContacto: string;
  grupoSanguineo: string;
  alergiasTiene: boolean;
  alergiasDetalle?: string;
  enfermedadesCronicasTiene: boolean;
  enfermedadesCronicasDetalle?: string;
  medicamentosTiene: boolean;
  medicamentosDetalle?: string;
  cirugiasLesionesTiene: boolean;
  cirugiasLesionesDetalle?: string;
  fuma: boolean;
  usaLentes: boolean;
  declaracionSalud: boolean;
  aceptacionRiesgo: boolean;
  consentimientoDatos: boolean;
  derechoImagen: boolean;
}

const GREEN = '#264c99';
const LIGHT_GREEN = '#e8eef7';
const GRAY = '#757874';
const BORDER = '#d1d5db';

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:8px 12px;color:${GRAY};font-size:13px;width:45%;border-bottom:1px solid ${BORDER};">${label}</td>
      <td style="padding:8px 12px;color:#1f2937;font-size:13px;border-bottom:1px solid ${BORDER};">${value}</td>
    </tr>`;
}

function boolRow(label: string, value: boolean, detail?: string): string {
  const display = value ? `Sí${detail ? ` — ${detail}` : ''}` : 'No';
  return row(label, display);
}

function sectionHeader(title: string): string {
  return `
    <tr>
      <td colspan="2" style="background:${LIGHT_GREEN};padding:10px 12px;font-weight:700;font-size:13px;color:${GREEN};letter-spacing:0.05em;text-transform:uppercase;border-bottom:1px solid ${BORDER};">
        ${title}
      </td>
    </tr>`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatGenero(g: string): string {
  const map: Record<string, string> = {
    FEMENINO: 'Femenino',
    MASCULINO: 'Masculino',
    PREFIERO_NO_DECIRLO: 'Prefiero no decirlo',
  };
  return map[g] ?? g;
}

function clausulaBlock(number: string, title: string, body: string, accepted: boolean): string {
  const icon = accepted ? '&#10003;' : '&#10007;';
  const checkColor = accepted ? '#4E805D' : '#dc2626';
  const checkLabel = accepted ? 'He leído y estoy de acuerdo' : 'No aceptado';
  return `
    <tr>
      <td colspan="2" style="padding:14px 12px 6px;border-bottom:1px solid ${BORDER};">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${GREEN};text-transform:uppercase;letter-spacing:0.05em;">${number}. ${title}</p>
        <p style="margin:0 0 10px;font-size:12px;color:#374151;line-height:1.6;">${body}</p>
        <span style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;border:1px solid ${checkColor}33;border-radius:4px;padding:4px 10px;font-size:12px;font-weight:600;color:${checkColor};">
          <span style="font-size:14px;">${icon}</span> ${checkLabel}
        </span>
      </td>
    </tr>`;
}

export function buildConfirmationEmail(data: IntegranteEmailData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${GREEN};padding:28px 32px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Pamir</p>
            <p style="margin:6px 0 0;color:#c8dccb;font-size:14px;">Confirmación de registro de integrante</p>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:24px 32px 16px;">
            <p style="margin:0;color:#1f2937;font-size:15px;">
              Hola <strong>${data.nombreCompleto}</strong>, tu registro en el sistema Pamir se completó exitosamente.
              A continuación encontrarás el resumen de los datos ingresados.
            </p>
          </td>
        </tr>

        <!-- Data Table -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:6px;overflow:hidden;border-collapse:collapse;">

              ${sectionHeader('I. Datos personales y de contacto')}
              ${row('Nombre completo', data.nombreCompleto)}
              ${row('RUT', data.rut)}
              ${row('Nacionalidad', data.nacionalidad)}
              ${row('Género', formatGenero(data.genero))}
              ${row('Fecha de nacimiento', formatDate(data.fechaNacimiento))}
              ${row('Dirección', `${data.direccion}, ${data.comuna}, ${data.region}`)}
              ${row('Teléfono celular', data.telefonoCelular)}
              ${row('Email', data.email)}
              ${row('Previsión de salud', data.previsionSalud)}

              ${sectionHeader('II. Contacto de emergencia')}
              ${row('Nombre', data.nombreContacto)}
              ${row('Parentesco', data.parentesco)}
              ${row('Teléfono', data.telefonoContacto)}

              ${sectionHeader('III. Perfil médico')}
              ${row('Grupo sanguíneo', data.grupoSanguineo)}
              ${boolRow('Alergias', data.alergiasTiene, data.alergiasDetalle)}
              ${boolRow('Enfermedades crónicas', data.enfermedadesCronicasTiene, data.enfermedadesCronicasDetalle)}
              ${boolRow('Medicamentos', data.medicamentosTiene, data.medicamentosDetalle)}
              ${boolRow('Cirugías / lesiones', data.cirugiasLesionesTiene, data.cirugiasLesionesDetalle)}
              ${row('Fuma', data.fuma ? 'Sí' : 'No')}
              ${row('Usa lentes / lentes de contacto', data.usaLentes ? 'Sí' : 'No')}

              ${sectionHeader('IV. Cláusulas Legales y Consentimiento Informado')}
              ${clausulaBlock(
                '1', 'Declaración de Salud y Aptitud Física',
                'El firmante declara que se encuentra en condiciones físicas y psíquicas aptas para la práctica de deportes de montaña (senderismo, escalada, montañismo y otras actividades relacionadas). Declara que la información proporcionada en este formulario es veraz y completa, asumiendo que la ocultación de antecedentes médicos puede comprometer su seguridad y la del grupo.',
                data.declaracionSalud
              )}
              ${clausulaBlock(
                '2', 'Aceptación de Riesgo y Exención de Responsabilidad',
                'Reconozco que las actividades de montaña son intrínsecamente riesgosas y pueden implicar peligros derivados del terreno, clima extremo, caída de rocas, fallas de equipo y otros factores objetivos y subjetivos que pueden resultar en lesiones graves o la muerte. <strong>Exención:</strong> Libero de toda responsabilidad civil y criminal al Club, a sus directivos, guías, instructores y miembros, por cualquier accidente o incidente derivado de los riesgos propios de la actividad o de mi propia negligencia, siempre que el club haya actuado bajo los protocolos de seguridad estándar. El Club no se hace responsable por accidentes derivados de la omisión de información o negligencia de los participantes.',
                data.aceptacionRiesgo
              )}
              ${clausulaBlock(
                '3', 'Consentimiento de Uso de Datos Personales (Ley 19.628)',
                'En cumplimiento con la Ley N° 19.628 sobre Protección de la Vida Privada, autorizo expresamente al Club para: (a) Tratar mis datos personales y sensibles (salud) con el fin exclusivo de gestionar mi participación en actividades y responder ante emergencias médicas. (b) Almacenar de forma segura esta información, la cual solo será accesible por el cuerpo técnico o servicios de emergencia en caso de ser necesario. (c) Comunicar estos datos a centros de salud o cuerpos de socorro en caso de rescate o atención urgente. Los datos serán utilizados exclusivamente para la gestión de seguridad en montaña, coordinación de rescates, registro estadístico de incidentes y cumplimiento de protocolos internos del club.',
                data.consentimientoDatos
              )}
              ${clausulaBlock(
                '4', 'Derecho de Imagen',
                'Autorizo el uso de fotografías o videos capturados durante las salidas para fines promocionales o educativos del club, sin derecho a compensación económica.',
                data.derechoImagen
              )}

            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid ${BORDER};">
            <p style="margin:0;color:${GRAY};font-size:12px;line-height:1.6;">
              Este correo es un comprobante automático de tu registro en la aplicación de PAMIR.<br>
              Si no realizaste este registro o tienes dudas, por favor, comunícate con: <strong>Susana Madrid</strong> al correo <a href="mailto:madridnawrathsusana@gmail.com" style="color:${GREEN};">madridnawrathsusana@gmail.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
