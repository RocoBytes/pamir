import type { SalidaFormData, SalidaRecord, GpxUploadResponse, User, IntegranteRecord } from '../types/salida'
import { getAuthToken } from './auth-token'

// En desarrollo el proxy de Vite redirige /api → localhost:3000.
// En producción (Vercel) no hay proxy: se usa VITE_API_URL apuntando a Render.com.
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { message?: string; error?: string }
      message = body.message ?? body.error ?? message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<{ user: User; token: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse<{ user: User; token: string }>(res)
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  return handleResponse<{ message: string }>(res)
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return handleResponse<{ message: string }>(res)
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
  return handleResponse<{ message: string }>(res)
}

// ─── Salidas ──────────────────────────────────────────────────────────────────

export async function fetchSalidas(): Promise<SalidaRecord[]> {
  const res = await fetch(`${API_BASE}/salidas`, {
    headers: authHeaders(),
  })
  return handleResponse<SalidaRecord[]>(res)
}

export async function createSalida(
  data: Omit<SalidaFormData, 'gpxFile'> & {
    gpxFileId?: string
    gpxFileName?: string
    gpxFileUrl?: string
  },
): Promise<SalidaRecord> {
  const res = await fetch(`${API_BASE}/salidas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  return handleResponse<SalidaRecord>(res)
}

export async function updateSalida(
  id: string,
  data: Partial<Omit<SalidaFormData, 'gpxFile'>>,
): Promise<SalidaRecord> {
  const res = await fetch(`${API_BASE}/salidas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  return handleResponse<SalidaRecord>(res)
}

export async function claimSalida(id: string): Promise<SalidaRecord> {
  const res = await fetch(`${API_BASE}/salidas/${id}/claim`, {
    method: 'PATCH',
    headers: authHeaders(),
  })
  return handleResponse<SalidaRecord>(res)
}

export async function deleteSalida(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/salidas/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
}

// ─── GPX Upload ───────────────────────────────────────────────────────────────

export async function uploadGpx(salidaId: string, file: File): Promise<GpxUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/salidas/${salidaId}/gpx`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })
  return handleResponse<GpxUploadResponse>(res)
}

// ─── Integrantes ─────────────────────────────────────────────────────────────

export interface CreateIntegrantePayload {
  nombreCompleto: string
  rut: string
  nacionalidad: string
  genero: string
  fechaNacimiento: string
  direccion: string
  comuna: string
  region: string
  telefonoCelular: string
  email: string
  previsionSalud: string
  nombreContacto: string
  parentesco: string
  telefonoContacto: string
  grupoSanguineo: string
  alergiasTiene: boolean
  alergiasDetalle?: string
  enfermedadesCronicasTiene: boolean
  enfermedadesCronicasDetalle?: string
  medicamentosTiene: boolean
  medicamentosDetalle?: string
  cirugiasLesionesTiene: boolean
  cirugiasLesionesDetalle?: string
  fuma: boolean
  usaLentes: boolean
  declaracionSalud: boolean
  aceptacionRiesgo: boolean
  consentimientoDatos: boolean
  derechoImagen: boolean
}

export async function createIntegrante(
  data: CreateIntegrantePayload,
): Promise<IntegranteRecord> {
  const res = await fetch(`${API_BASE}/integrantes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  return handleResponse<IntegranteRecord>(res)
}

export async function getIntegranteByRut(rut: string): Promise<IntegranteRecord | null> {
  const res = await fetch(
    `${API_BASE}/integrantes/by-rut/${encodeURIComponent(rut)}`,
    { headers: authHeaders() },
  )
  if (res.status === 404) return null
  return handleResponse<IntegranteRecord>(res)
}

// ─── Cierres ──────────────────────────────────────────────────────────────────

export interface CreateCierrePayload {
  salidaId: string
  fechaFinalizacionReal: string
  estadoCierre: string
  motivoAbandono?: string
  huboCambios: string
  motivosCambios?: string[]
  motivosCambiosOtro?: string
  ocurrioIncidente: string
  tiposIncidente?: string[]
  gravedadLesion?: string
  patologiaMedica?: string
  descripcionSuceso?: string
  causasRaiz?: string[]
  causaRaizOtro?: string
  desempenoEquipo: string
  detalleFallaEquipo?: string
  observacionesRuta: string
  precisionPronostico: number
  leccionesAprendidas: string
  recomendacionesFuturos?: string
  sugerenciasClub?: string
}

export async function createCierre(data: CreateCierrePayload): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/cierres`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  return handleResponse<{ id: string }>(res)
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`)
  return handleResponse<{ status: string }>(res)
}
