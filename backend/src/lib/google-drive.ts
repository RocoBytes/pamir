import { google } from 'googleapis';
import { Readable, Transform, TransformCallback } from 'node:stream';

// ─── Size Guard Stream ────────────────────────────────────────────────────────

/**
 * Transform stream que aborta si el número de bytes supera maxBytes.
 * Garantiza que nunca cargamos el archivo completo en RAM antes de rechazarlo.
 */
class SizeGuard extends Transform {
  private bytes = 0;

  constructor(private readonly maxBytes: number) {
    super();
  }

  _transform(chunk: Buffer, _encoding: string, callback: TransformCallback): void {
    this.bytes += chunk.length;

    if (this.bytes > this.maxBytes) {
      callback(Object.assign(new Error('FILE_TOO_LARGE'), { code: 'FILE_TOO_LARGE' }));
      return;
    }

    this.push(chunk);
    callback();
  }
}

// ─── Drive Client Factory ─────────────────────────────────────────────────────

function createDriveClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
}

/**
 * Sube un archivo a Google Drive usando Resumable Upload (streaming).
 * El archivo NUNCA se carga completo en memoria RAM: se transmite en chunks.
 *
 * @param fileStream - Stream legible del archivo (proveniente de busboy)
 * @param fileName   - Nombre con que se guardará en Drive
 * @param mimeType   - MIME type del archivo
 * @param maxBytes   - Límite de tamaño en bytes (default 15 MB)
 */
export async function uploadToGoogleDrive(
  fileStream: Readable,
  fileName: string,
  mimeType: string,
  maxBytes = 15 * 1024 * 1024,
): Promise<UploadResult> {
  const drive = createDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // Insertar SizeGuard en el pipeline para rechazar archivos demasiado grandes
  // antes de que terminen de subirse
  const guarded = fileStream.pipe(new SizeGuard(maxBytes));

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType: mimeType || 'application/gpx+xml',
      body: guarded, // googleapis usa Resumable Upload automáticamente con streams
    },
    fields: 'id,name,webViewLink',
  });

  const file = response.data;
  if (!file.id) throw new Error('Google Drive no retornó un fileId');

  // Dar acceso de lectura a cualquiera con el enlace
  await drive.permissions.create({
    fileId: file.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return {
    fileId: file.id,
    fileName: file.name ?? fileName,
    webViewLink:
      file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
  };
}
