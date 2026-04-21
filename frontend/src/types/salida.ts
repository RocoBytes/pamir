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
  | 'BOTIQUIN_GRUPAL'
  | 'GPS'
  | 'MAPA_BRUJULA'
  | 'RESCATE_GRIETAS'
  | 'ARVA_PALA_SONDA'
  | 'SIN_EQUIPO'
  | 'OTRO'

export type RiesgoIdentificado =
  | 'AVALANCHAS'
  | 'DESPRENDIMIENTO_ROCAS'
  | 'CRUCE_RIOS'
  | 'FRIO_EXTREMO'
  | 'MAL_ALTURA'
  | 'CAIDA_DISTINTO_NIVEL'
  | 'CALOR_EXTREMO'
  | 'OTRO'

export type TipoSalida =
  | 'OFICIAL_CLUB'
  | 'NO_OFICIAL'
  | 'EXPEDICION_PARTICULAR'

export type Disciplina =
  | 'TREKKING'
  | 'MEDIA_MONTANA'
  | 'ALTA_MONTANA'
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
  retenCarabineros?: string
  nombreFamiliar?: string
  telefonoFamiliar?: string

  // Step 3 – Equipo Humano
  liderCordada: string
  participantes: { rut: string; nombre: string }[]
  coordinacionGrupal: boolean
  matrizRiesgos: boolean

  // Step 4 – Comunicaciones y Equipo Crítico
  mediosComunicacion: MedioComunicacion[]
  idDispositivoFrecuencia: string
  equipoColectivo: EquipoColectivoSeguridad[]
  equipoColectivoOtro: string

  // Step 5 – Planificación Técnica
  pronosticoMeteorologico: string
  riesgosIdentificados: RiesgoIdentificado[]
  riesgosOtro: string
  planEvacuacion: string

  // Status & incidents (set by default, not shown in wizard)
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
  retenCarabineros?: string | null
  nombreFamiliar?: string | null
  telefonoFamiliar?: string | null
  liderCordada: string
  participantes: { rut: string; nombre: string }[]
  coordinacionGrupal: boolean
  matrizRiesgos: boolean
  gpxFileId?: string
  gpxFileName?: string
  gpxFileUrl?: string
  mediosComunicacion: MedioComunicacion[]
  idDispositivoFrecuencia?: string
  equipoColectivo: EquipoColectivoSeguridad[]
  equipoColectivoOtro?: string
  pronosticoMeteorologico?: string
  riesgosIdentificados?: RiesgoIdentificado[]
  riesgosOtro?: string
  planEvacuacion?: string
  status: SalidaStatus
  incidentReport?: string
  leccionesAprendidas?: string
  recomendacionesFuturos?: string
  sugerenciasClub?: string
  createdAt: string
  updatedAt: string
  userId: string
}

export interface GpxUploadResponse {
  message: string
  gpxFileId: string
  gpxFileName: string
  gpxFileUrl: string
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
  BORRADOR: 'bg-[#f0f4fb] text-[#757874]',
  CONFIRMADA: 'bg-[#e8eef7] text-[#264c99]',
  EN_CURSO: 'bg-[#e8eef7] text-[#1e3c7a]',
  COMPLETADA: 'bg-[#edf2fb] text-[#4a6fad]',
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
  MEDIA_MONTANA: 'Media Montaña',
  ALTA_MONTANA: 'Alta Montaña',
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

export const RIESGO_IDENTIFICADO_LABELS: Record<RiesgoIdentificado, string> = {
  AVALANCHAS: 'Avalanchas',
  DESPRENDIMIENTO_ROCAS: 'Desprendimiento de rocas',
  CRUCE_RIOS: 'Cruce de ríos',
  FRIO_EXTREMO: 'Frío extremo',
  MAL_ALTURA: 'Mal de altura',
  CAIDA_DISTINTO_NIVEL: 'Caída a distinto nivel',
  CALOR_EXTREMO: 'Calor Extremo',
  OTRO: 'Otro',
}

export const EQUIPO_COLECTIVO_LABELS: Record<EquipoColectivoSeguridad, string> = {
  CUERDAS: 'Cuerdas',
  BOTIQUIN_AVANZADO: 'Botiquín Avanzado',
  BOTIQUIN_GRUPAL: 'Botiquín Grupal',
  GPS: 'GPS',
  MAPA_BRUJULA: 'Mapa y Brújula',
  RESCATE_GRIETAS: 'Equipo de Rescate en Grietas',
  ARVA_PALA_SONDA: 'ARVA / Pala / Sonda',
  SIN_EQUIPO: 'No cuenta con equipo colectivo de seguridad',
  OTRO: 'Otro',
}

// ─── Ficha de Cierre ──────────────────────────────────────────────────────────

export type EstadoCierre =
  | 'COMPLETADA_SEGUN_PLAN'
  | 'COMPLETADA_CON_VARIACIONES'
  | 'ABORTADA_INCOMPLETA'

export type MotivoAbandono =
  | 'METEOROLOGIA'
  | 'SALUD_INTEGRANTE'
  | 'MAL_ESTADO_RUTA'
  | 'FALLO_EQUIPO'
  | 'ERROR_PLANIFICACION'
  | 'FALTA_TIEMPO'

export type MotivoCambio =
  | 'CLIMA_ADVERSO'
  | 'ERROR_NAVEGACION'
  | 'FATIGA_FISICA'
  | 'FALTA_EQUIPO_TECNICO'
  | 'FALTA_TIEMPO'
  | 'OTRO'

export type OcurrioIncidente =
  | 'NADA'
  | 'INCIDENTES_MENORES'
  | 'ACCIDENTE_LESION'
  | 'SUSTO'

export type TipoIncidente =
  | 'MEDICO'
  | 'LESION'
  | 'TECNICO'
  | 'LOGISTICO'
  | 'AMBIENTAL'

export type GravedadLesion =
  | 'LEVE'
  | 'MODERADA'
  | 'GRAVE'

export type CausaRaiz =
  | 'EXCESO_CONFIANZA'
  | 'ERROR_TECNICO'
  | 'FATIGA'
  | 'EQUIPAMIENTO_INADECUADO'
  | 'CONDICIONES_TERRENO'
  | 'MALA_VISIBILIDAD'
  | 'OTRO'

export type DesempenoEquipo = 'TODO_FUNCIONO' | 'FALLO_EQUIPO'

export interface FichaCierreFormData {
  salidaId: string
  fechaFinalizacionReal: string
  estadoCierre: EstadoCierre
  motivoAbandono?: MotivoAbandono
  // Paso 2 – Evaluación de la planificación
  huboCambios: 'SI' | 'NO'
  motivosCambios?: MotivoCambio[]
  motivosCambiosOtro?: string
  // Paso 3 – Gestión de Incidentes y Sustos (Near-Miss)
  ocurrioIncidente: OcurrioIncidente
  tiposIncidente?: TipoIncidente[]
  gravedadLesion?: GravedadLesion
  descripcionSuceso?: string
  causasRaiz?: CausaRaiz[]
  causaRaizOtro?: string
  // Paso 4 – Análisis Técnico y de Equipo
  desempenoEquipo: DesempenoEquipo
  detalleFallaEquipo?: string
  observacionesRuta: string
  precisionPronostico: number
  // Paso 5 – Lecciones Aprendidas y Recomendaciones
  leccionesAprendidas: string
  recomendacionesFuturos?: string
  sugerenciasClub?: string
}

export interface FichaCierreRecord extends FichaCierreFormData {
  id: string
  salidaNombre: string
  createdAt: string
  userId: string
}

export const ESTADO_CIERRE_LABELS: Record<EstadoCierre, string> = {
  COMPLETADA_SEGUN_PLAN: 'Completada según lo previsto',
  COMPLETADA_CON_VARIACIONES: 'Completada con variaciones',
  ABORTADA_INCOMPLETA: 'Abortada/Incompleta',
}

export const MOTIVO_ABANDONO_LABELS: Record<MotivoAbandono, string> = {
  METEOROLOGIA: 'Meteorología',
  SALUD_INTEGRANTE: 'Salud de un integrante',
  MAL_ESTADO_RUTA: 'Mal estado de la ruta',
  FALLO_EQUIPO: 'Fallo de equipo',
  ERROR_PLANIFICACION: 'Error de planificación',
  FALTA_TIEMPO: 'Falta de tiempo',
}

export const MOTIVO_CAMBIO_LABELS: Record<MotivoCambio, string> = {
  CLIMA_ADVERSO: 'Clima adverso',
  ERROR_NAVEGACION: 'Error de navegación/ruta',
  FATIGA_FISICA: 'Fatiga física de algún miembro',
  FALTA_EQUIPO_TECNICO: 'Falta de equipo técnico',
  FALTA_TIEMPO: 'Horario (falta de tiempo)',
  OTRO: 'Otro',
}

export const OCURRIO_INCIDENTE_LABELS: Record<OcurrioIncidente, string> = {
  NADA: 'No ocurrió nada',
  INCIDENTES_MENORES: 'Hubo incidentes menores sin lesión',
  ACCIDENTE_LESION: 'Hubo un accidente con lesión',
  SUSTO: 'Hubo un "Susto" (Situación de alto riesgo sin consecuencias)',
}

export const TIPO_INCIDENTE_LABELS: Record<TipoIncidente, string> = {
  MEDICO: 'Médico: Puna (MAM), agotamiento extremo, deshidratación, golpe de calor, etc.',
  LESION: 'Lesión: Torcedura, caída, herida cortante, ampolla limitante, etc.',
  TECNICO: 'Técnico: Pérdida de equipo, rotura de material crítico, etc.',
  LOGISTICO: 'Logístico: Extravío temporal, vivac no planificado, etc.',
  AMBIENTAL: 'Ambiental: Caída de rocas, encuentro con fauna, tormenta eléctrica, etc.',
}

export const GRAVEDAD_LESION_LABELS: Record<GravedadLesion, string> = {
  LEVE: 'Leve (primeros auxilios básicos)',
  MODERADA: 'Moderada (requiere atención médica)',
  GRAVE: 'Grave (requiere rescate/evacuación)',
}

export const CAUSA_RAIZ_LABELS: Record<CausaRaiz, string> = {
  EXCESO_CONFIANZA: 'Exceso de confianza',
  ERROR_TECNICO: 'Error técnico',
  FATIGA: 'Fatiga',
  EQUIPAMIENTO_INADECUADO: 'Equipamiento inadecuado',
  CONDICIONES_TERRENO: 'Condiciones objetivas del terreno',
  MALA_VISIBILIDAD: 'Mala visibilidad',
  OTRO: 'Otro',
}

export const DESEMPENO_EQUIPO_LABELS: Record<DesempenoEquipo, string> = {
  TODO_FUNCIONO: 'Todo funcionó correctamente',
  FALLO_EQUIPO: 'Algún equipo falló o se dañó',
}

