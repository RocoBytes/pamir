// ─── Auth types ───────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  picture?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isGuest: boolean
  isLoading: boolean
}

// ─── Salida data model ────────────────────────────────────────────────────────

export type AvisoExterno = 'CARABINEROS' | 'SOCORRO_ANDINO' | 'FAMILIAR_OTRO'

export type MedioComunicacion =
  | 'RADIO_VHF_UHF'
  | 'TELEFONO_SATELITAL'
  | 'INREACH_SPOT'
  | 'CELULAR'
  | 'NINGUNO'

export type EquipoColectivoSeguridad =
  | 'CUERDAS'
  | 'BOTIQUIN_AVANZADO'
  | 'GPS'
  | 'MAPA_BRUJULA'
  | 'RESCATE_GRIETAS'
  | 'ARVA_PALA_SONDA'
  | 'SIN_EQUIPO'
  | 'OTRO'

export type TipoSalida =
  | 'OFICIAL_CLUB'
  | 'NO_OFICIAL'
  | 'EXPEDICION_PARTICULAR'

export type Disciplina =
  | 'TREKKING'
  | 'MEDIA_ALTA_MONTANA'
  | 'ESCALADA_ROCA'
  | 'ESCALADA_HIELO'
  | 'ESQUI_MONTANA'
  | 'TRAIL_SKY_RUNNING'

export type SalidaStatus =
  | 'BORRADOR'
  | 'CONFIRMADA'
  | 'EN_CURSO'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'INCIDENTE'

export interface SalidaFormData {
  // Step 1 – Clasificación de la Salida
  tipoSalida: TipoSalida
  disciplina: Disciplina
  nombreActividad: string
  ubicacionGeografica: string

  // Step 2 – Cronología y Seguridad
  fechaInicio: string
  fechaRetornoEstimada: string
  horaRetornoEstimada: string
  horaAlerta: string
  avisosExternos: AvisoExterno[]

  // Step 3 – Equipo Humano
  liderCordada: string
  participantes: string[]
  coordinacionGrupal: boolean
  matrizRiesgos: boolean

  // Step 4 – Comunicaciones y Equipo Crítico
  mediosComunicacion: MedioComunicacion[]
  idDispositivoFrecuencia: string
  equipoColectivo: EquipoColectivoSeguridad[]
  equipoColectivoOtro: string

  // Step 5 – Status & incidents
  status: SalidaStatus
  incidentReport: string
}

// ─── API response types ───────────────────────────────────────────────────────

export interface SalidaRecord {
  id: string
  tipoSalida: TipoSalida
  disciplina: Disciplina
  nombreActividad: string
  ubicacionGeografica: string
  fechaInicio: string
  fechaRetornoEstimada: string
  horaRetornoEstimada: string
  horaAlerta: string
  avisosExternos: AvisoExterno[]
  liderCordada: string
  participantes: string[]
  coordinacionGrupal: boolean
  matrizRiesgos: boolean
  gpxFileId?: string
  gpxFileName?: string
  gpxFileUrl?: string
  mediosComunicacion: MedioComunicacion[]
  idDispositivoFrecuencia?: string
  equipoColectivo: EquipoColectivoSeguridad[]
  equipoColectivoOtro?: string
  status: SalidaStatus
  incidentReport?: string
  createdAt: string
  updatedAt: string
  userId: string
}

export interface GpxUploadResponse {
  fileId: string
  fileName: string
  fileUrl: string
}

// ─── Integrante (registered club member) ─────────────────────────────────────

export interface IntegranteRecord {
  id: string
  nombreCompleto: string
  rut: string
  email: string
  createdAt: string
}

export const STATUS_LABELS: Record<SalidaStatus, string> = {
  BORRADOR: 'Borrador',
  CONFIRMADA: 'Confirmada',
  EN_CURSO: 'En Curso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
  INCIDENTE: 'Incidente',
}

export const STATUS_COLORS: Record<SalidaStatus, string> = {
  BORRADOR: 'bg-[#f2f0ec] text-[#757874]',
  CONFIRMADA: 'bg-[#e8f0ea] text-[#4E805D]',
  EN_CURSO: 'bg-[#e8f0ea] text-[#3d6b4a]',
  COMPLETADA: 'bg-[#eef1ee] text-[#687C6B]',
  CANCELADA: 'bg-[#f5e8ea] text-[#A4636E]',
  INCIDENTE: 'bg-[#f5e8ea] text-[#8b3a44]',
}

export const AVISO_EXTERNO_LABELS: Record<AvisoExterno, string> = {
  CARABINEROS: 'Carabineros',
  SOCORRO_ANDINO: 'Socorro Andino',
  FAMILIAR_OTRO: 'Familiar u otra persona',
}

export const TIPO_SALIDA_LABELS: Record<TipoSalida, string> = {
  OFICIAL_CLUB: 'Oficial del Club',
  NO_OFICIAL: 'No Oficial',
  EXPEDICION_PARTICULAR: 'Expedición Particular',
}

export const DISCIPLINA_LABELS: Record<Disciplina, string> = {
  TREKKING: 'Trekking',
  MEDIA_ALTA_MONTANA: 'Media / Alta Montaña',
  ESCALADA_ROCA: 'Escalada en Roca',
  ESCALADA_HIELO: 'Escalada en Hielo',
  ESQUI_MONTANA: 'Esquí de Montaña',
  TRAIL_SKY_RUNNING: 'Trail / Sky Running',
}

export const MEDIO_COMUNICACION_LABELS: Record<MedioComunicacion, string> = {
  RADIO_VHF_UHF: 'Radio VHF / UHF',
  TELEFONO_SATELITAL: 'Teléfono Satelital',
  INREACH_SPOT: 'Dispositivo inReach / Spot',
  CELULAR: 'Celular',
  NINGUNO: 'Ninguno',
}

export const EQUIPO_COLECTIVO_LABELS: Record<EquipoColectivoSeguridad, string> = {
  CUERDAS: 'Cuerdas',
  BOTIQUIN_AVANZADO: 'Botiquín Avanzado',
  GPS: 'GPS',
  MAPA_BRUJULA: 'Mapa y Brújula',
  RESCATE_GRIETAS: 'Equipo de Rescate en Grietas',
  ARVA_PALA_SONDA: 'ARVA / Pala / Sonda',
  SIN_EQUIPO: 'No cuenta con equipo colectivo de seguridad',
  OTRO: 'Otro',
}

