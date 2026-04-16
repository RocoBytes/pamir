import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Check, User } from 'lucide-react'
import { useState } from 'react'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { saveIntegrante } from '../lib/storage'
import type { IntegranteRecord } from '../types/salida'

// ─── RUT formatter ───────────────────────────────────────────────────────────

function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length <= 1) return clean
  const dv = clean.slice(-1)
  const body = clean.slice(0, -1)
  const bodyFormatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${bodyFormatted}-${dv}`
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIONES = [
  'Metropolitana de Santiago',
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Libertador Gral Bernardo O\'Higgins',
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén del Gral Carlos Ibáñez del Campo',
  'Magallanes y de la Antártica Chilena',
]

const PREVISIONES = [
  'Fonasa',
  'Banmédica',
  'Colmena',
  'Consalud',
  'Cruz Blanca',
  'Nueva MasVida',
  'Vida Tres',
  'Esencial',
  'Fundación - Banco Estado',
  'Isalud - Codelco',
  'Sistema de Salud del Ejército',
]

const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const GENEROS = [
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'PREFIERO_NO_DECIRLO', label: 'Prefiero no decirlo' },
]

// ─── Schema ───────────────────────────────────────────────────────────────────

const RUT_REGEX = /^\d{1,2}\.\d{3}\.\d{3}-[\dKk]$/

const schema = z.object({
  // Sección I
  nombreCompleto: z.string().min(1, 'Campo requerido').max(100, 'Máximo 100 caracteres'),
  rut: z.string().regex(RUT_REGEX, 'Formato inválido. Ej: 12.345.678-K'),
  nacionalidad: z.string().min(1, 'Campo requerido'),
  genero: z.enum(['FEMENINO', 'MASCULINO', 'PREFIERO_NO_DECIRLO'], {
    required_error: 'Selecciona una opción',
  }),
  fechaNacimiento: z.string().min(1, 'Selecciona tu fecha de nacimiento'),
  direccion: z.string().min(1, 'Campo requerido').max(100, 'Máximo 100 caracteres'),
  comuna: z.string().min(1, 'Campo requerido').max(100, 'Máximo 100 caracteres'),
  region: z.string().min(1, 'Selecciona una región'),
  telefonoCelular: z.string().min(1, 'Campo requerido').regex(/^\+?[\d\s\-()]{7,15}$/, 'Teléfono inválido'),
  email: z.string().min(1, 'Campo requerido').email('Email inválido').max(100, 'Máximo 100 caracteres'),
  previsionSalud: z.string().min(1, 'Selecciona tu previsión de salud'),

  // Sección II
  nombreContacto: z.string().min(1, 'Campo requerido').max(100, 'Máximo 100 caracteres'),
  parentesco: z.string().min(1, 'Campo requerido').max(100, 'Máximo 100 caracteres'),
  telefonoContacto: z.string().min(1, 'Campo requerido').regex(/^\+?[\d\s\-()]{7,15}$/, 'Teléfono inválido'),

  // Sección III
  grupoSanguineo: z.string().min(1, 'Selecciona tu grupo sanguíneo'),
  alergias: z.string().min(1, 'Campo requerido').max(1000, 'Máximo 1000 caracteres'),
  enfermedadesCronicas: z.string().min(1, 'Campo requerido').max(1000, 'Máximo 1000 caracteres'),
  medicamentos: z.string().min(1, 'Campo requerido').max(1000, 'Máximo 1000 caracteres'),
  cirugiasLesiones: z.string().min(1, 'Campo requerido').max(1000, 'Máximo 1000 caracteres'),
  fuma: z.boolean({ required_error: 'Selecciona una opción' }),
  usaLentes: z.boolean({ required_error: 'Selecciona una opción' }),

  // Sección IV
  declaracionSalud: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar esta declaración para continuar' }),
  }),
  aceptacionRiesgo: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar esta cláusula para continuar' }),
  }),
})

type IntegranteFormData = z.infer<typeof schema>

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#4E805D] text-white text-xs font-bold flex items-center justify-center">
        {number}
      </span>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-[#A4636E] mt-1" role="alert">
      {message}
    </p>
  )
}

interface TextareaFieldProps {
  label: string
  placeholder?: string
  maxLength?: number
  error?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
}

function TextareaField({ label, placeholder, maxLength, error, required, value, onChange }: TextareaFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-[#4E805D]">
        {label}
        {required && <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>}
      </label>
      <textarea
        rows={3}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          'w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-[#757874]/50 resize-none',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[#4E805D] focus:border-[#4E805D]',
          error ? 'border-[#A4636E]' : 'border-[#687C6B]/40',
        ].join(' ')}
      />
      {maxLength && (
        <p className="text-xs text-[#757874] self-end">{value.length}/{maxLength}</p>
      )}
      <FieldError message={error} />
    </div>
  )
}

interface SingleSelectChipProps {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  error?: string
  required?: boolean
}

function SingleSelectChip({ label, options, value, onChange, error, required }: SingleSelectChipProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-[#4E805D]">
        {label}
        {required && <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={selected}
              className={[
                'px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4E805D] focus-visible:ring-offset-1',
                selected
                  ? 'bg-[#4E805D] text-white border-[#4E805D] shadow-sm'
                  : 'bg-white text-slate-700 border-[#687C6B]/40 hover:border-[#4E805D] hover:text-[#4E805D]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      <FieldError message={error} />
    </fieldset>
  )
}

interface YesNoFieldProps {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  error?: string
}

function YesNoField({ label, value, onChange, error }: YesNoFieldProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-[#4E805D]">
        {label}
        <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>
      </legend>
      <div className="flex gap-2">
        {([true, false] as const).map((opt) => {
          const selected = value === opt
          const btnLabel = opt ? 'Sí' : 'No'
          return (
            <button
              key={String(opt)}
              type="button"
              onClick={() => onChange(opt)}
              aria-pressed={selected}
              className={[
                'px-6 py-2 rounded-xl text-sm font-medium border transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4E805D] focus-visible:ring-offset-1',
                selected
                  ? 'bg-[#4E805D] text-white border-[#4E805D] shadow-sm'
                  : 'bg-white text-slate-700 border-[#687C6B]/40 hover:border-[#4E805D] hover:text-[#4E805D]',
              ].join(' ')}
            >
              {btnLabel}
            </button>
          )
        })}
      </div>
      <FieldError message={error} />
    </fieldset>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RegistroIntegranteProps {
  onBack: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RegistroIntegrante({ onBack }: RegistroIntegranteProps) {
  const [success, setSuccess] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IntegranteFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombreCompleto: '',
      rut: '',
      nacionalidad: '',
      genero: undefined,
      fechaNacimiento: '',
      direccion: '',
      comuna: '',
      region: '',
      telefonoCelular: '',
      email: '',
      previsionSalud: '',
      nombreContacto: '',
      parentesco: '',
      telefonoContacto: '',
      grupoSanguineo: '',
      alergias: '',
      enfermedadesCronicas: '',
      medicamentos: '',
      cirugiasLesiones: '',
      fuma: false,
      usaLentes: false,
      declaracionSalud: undefined as unknown as true,
      aceptacionRiesgo: undefined as unknown as true,
    },
  })

  const alergias = watch('alergias')
  const enfermedadesCronicas = watch('enfermedadesCronicas')
  const medicamentos = watch('medicamentos')
  const cirugiasLesiones = watch('cirugiasLesiones')

  function onSubmit(data: IntegranteFormData) {
    const record: IntegranteRecord = {
      id: `integrante-${Date.now()}`,
      nombreCompleto: data.nombreCompleto,
      rut: data.rut,
      email: data.email,
      createdAt: new Date().toISOString(),
    }
    saveIntegrante(record)
    setSuccess(true)
    setTimeout(onBack, 1800)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f2f0ec] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#e8f0ea] mx-auto mb-4">
            <Check size={32} className="text-[#4E805D]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Integrante registrado</h2>
          <p className="text-[#757874] text-sm">Volviendo al formulario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f2f0ec] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-[#687C6B]/15 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[#757874] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4E805D] rounded transition-colors"
            aria-label="Volver"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <div className="flex items-center gap-2 ml-2">
            <User size={18} className="text-[#4E805D]" />
            <span className="font-semibold text-slate-800 text-sm">Registro de Integrante</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6">
        <p className="text-sm text-[#757874] mb-6">
          Completa la ficha de registro y datos médicos del integrante. Todos los campos marcados con{' '}
          <span className="text-[#A4636E] font-semibold">*</span> son obligatorios.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">

          {/* ── Sección I ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-[#687C6B]/15 bg-white p-5 flex flex-col gap-5">
            <SectionHeader number="I" title="Información Personal y de Contacto" />

            <Input
              label="Nombre Completo"
              placeholder="Ej: Juan Andrés Pérez González"
              required
              maxLength={100}
              error={errors.nombreCompleto?.message}
              {...register('nombreCompleto')}
            />

            <Controller
              control={control}
              name="rut"
              render={({ field }) => (
                <Input
                  label="RUT"
                  placeholder="12.345.678-K"
                  required
                  error={errors.rut?.message}
                  value={field.value}
                  onChange={(e) => field.onChange(formatRut(e.target.value))}
                />
              )}
            />

            <Input
              label="Nacionalidad"
              placeholder="Ej: Chilena"
              required
              error={errors.nacionalidad?.message}
              {...register('nacionalidad')}
            />

            <Controller
              control={control}
              name="genero"
              render={({ field }) => (
                <SingleSelectChip
                  label="Género"
                  options={GENEROS}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.genero?.message}
                  required
                />
              )}
            />

            <Input
              label="Fecha de Nacimiento"
              type="date"
              required
              error={errors.fechaNacimiento?.message}
              {...register('fechaNacimiento')}
            />

            <Input
              label="Dirección"
              placeholder="Calle, número, depto..."
              required
              maxLength={100}
              error={errors.direccion?.message}
              {...register('direccion')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Comuna"
                placeholder="Ej: Las Condes"
                required
                maxLength={100}
                error={errors.comuna?.message}
                {...register('comuna')}
              />

              <Select
                label="Región"
                required
                placeholder="Selecciona tu región"
                options={REGIONES.map((r) => ({ value: r, label: r }))}
                error={errors.region?.message}
                {...register('region')}
              />
            </div>

            <Input
              label="Teléfono Celular"
              type="tel"
              placeholder="+56 9 1234 5678"
              required
              inputMode="numeric"
              error={errors.telefonoCelular?.message}
              {...register('telefonoCelular')}
            />

            <Input
              label="Email"
              type="email"
              placeholder="correo@ejemplo.com"
              required
              maxLength={100}
              error={errors.email?.message}
              {...register('email')}
            />

            <Select
              label="Previsión de Salud"
              required
              placeholder="Selecciona tu previsión"
              options={PREVISIONES.map((p) => ({ value: p, label: p }))}
              error={errors.previsionSalud?.message}
              {...register('previsionSalud')}
            />
          </div>

          {/* ── Sección II ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-[#687C6B]/15 bg-white p-5 flex flex-col gap-5">
            <SectionHeader number="II" title="Contacto de Emergencia" />

            <Input
              label="Nombre del Contacto"
              placeholder="Nombre completo"
              required
              maxLength={100}
              error={errors.nombreContacto?.message}
              {...register('nombreContacto')}
            />

            <Input
              label="Parentesco"
              placeholder="Ej: Madre, Cónyuge, Hermano..."
              required
              maxLength={100}
              error={errors.parentesco?.message}
              {...register('parentesco')}
            />

            <Input
              label="Teléfono de Contacto"
              type="tel"
              placeholder="+56 9 1234 5678"
              required
              inputMode="numeric"
              error={errors.telefonoContacto?.message}
              {...register('telefonoContacto')}
            />
          </div>

          {/* ── Sección III ────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-[#687C6B]/15 bg-white p-5 flex flex-col gap-5">
            <SectionHeader number="III" title="Perfil Médico y Antecedentes" />

            <Controller
              control={control}
              name="grupoSanguineo"
              render={({ field }) => (
                <SingleSelectChip
                  label="Grupo Sanguíneo y Factor RH"
                  options={GRUPOS_SANGUINEOS.map((g) => ({ value: g, label: g }))}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.grupoSanguineo?.message}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="alergias"
              render={({ field }) => (
                <TextareaField
                  label="Alergias Conocidas"
                  placeholder="Ej: Medicamentos, alimentos, picaduras, otros. Escriba 'Ninguna' si no aplica."
                  maxLength={1000}
                  error={errors.alergias?.message}
                  required
                  value={alergias}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="enfermedadesCronicas"
              render={({ field }) => (
                <TextareaField
                  label="Enfermedades Crónicas"
                  placeholder="Ej: Diabetes, hipertensión, asma, epilepsia, problemas cardíacos. Escriba 'Ninguna' si no aplica."
                  maxLength={1000}
                  error={errors.enfermedadesCronicas?.message}
                  required
                  value={enfermedadesCronicas}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="medicamentos"
              render={({ field }) => (
                <TextareaField
                  label="¿Toma medicamentos de forma regular?"
                  placeholder="Ej: Indique nombre y dosis. Escriba 'No' si no aplica."
                  maxLength={1000}
                  error={errors.medicamentos?.message}
                  required
                  value={medicamentos}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="cirugiasLesiones"
              render={({ field }) => (
                <TextareaField
                  label="Cirugías o Lesiones"
                  placeholder="Ej: Indique cirugía o lesión y cuándo ocurrió (mes/año). Escriba 'Ninguna' si no aplica."
                  maxLength={1000}
                  error={errors.cirugiasLesiones?.message}
                  required
                  value={cirugiasLesiones}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="fuma"
              render={({ field }) => (
                <YesNoField
                  label="¿Fuma?"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.fuma?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="usaLentes"
              render={({ field }) => (
                <YesNoField
                  label="¿Usa lentes ópticos?"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.usaLentes?.message}
                />
              )}
            />
          </div>

          {/* ── Sección IV ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-[#687C6B]/15 bg-white p-5 flex flex-col gap-5">
            <SectionHeader number="IV" title="Cláusulas Legales y Consentimiento Informado" />

            {/* Cláusula 1 */}
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-[#687C6B]/20 bg-[#f2f0ec]/60 p-4">
                <p className="text-xs font-semibold text-[#4E805D] uppercase tracking-wider mb-2">
                  1. Declaración de Salud y Aptitud Física
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  El firmante declara que se encuentra en condiciones físicas y psíquicas aptas para la
                  práctica de deportes de montaña (senderismo, escalada, montañismo y otras actividades
                  relacionadas). Declara que la información proporcionada en este formulario es veraz y
                  completa, asumiendo que la ocultación de antecedentes médicos puede comprometer su
                  seguridad y la del grupo.
                </p>
              </div>
              <Controller
                control={control}
                name="declaracionSalud"
                render={({ field }) => (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value === true}
                      onChange={(e) =>
                        field.onChange(e.target.checked ? true : (undefined as unknown as true))
                      }
                      className="mt-0.5 w-4 h-4 rounded border-[#687C6B]/40 text-[#4E805D] focus:ring-[#4E805D]"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      He leído y estoy de acuerdo
                      <span className="text-[#A4636E] ml-1">*</span>
                    </span>
                  </label>
                )}
              />
              <FieldError message={errors.declaracionSalud?.message} />
            </div>

            {/* Cláusula 2 */}
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-[#687C6B]/20 bg-[#f2f0ec]/60 p-4">
                <p className="text-xs font-semibold text-[#4E805D] uppercase tracking-wider mb-2">
                  2. Aceptación de Riesgo y Exención de Responsabilidad
                </p>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  Reconozco que las actividades de montaña son intrínsecamente riesgosas y pueden
                  implicar peligros derivados del terreno, clima extremo, caída de rocas, fallas de equipo y
                  otros factores objetivos y subjetivos que pueden resultar en lesiones graves o la muerte.
                </p>
                <ul className="flex flex-col gap-2">
                  <li className="text-sm text-slate-700 leading-relaxed pl-3 border-l-2 border-[#687C6B]/30">
                    <span className="font-medium">Exención:</span> Libero de toda responsabilidad civil y
                    criminal al Club, a sus directivos, guías, instructores y miembros, por cualquier
                    accidente o incidente derivado de los riesgos propios de la actividad o de mi propia
                    negligencia, siempre que el club haya actuado bajo los protocolos de seguridad estándar.
                  </li>
                  <li className="text-sm text-slate-700 leading-relaxed pl-3 border-l-2 border-[#687C6B]/30">
                    El Club no se hace responsable por accidentes derivados de la omisión de información o
                    negligencia de los participantes.
                  </li>
                </ul>
              </div>
              <Controller
                control={control}
                name="aceptacionRiesgo"
                render={({ field }) => (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value === true}
                      onChange={(e) =>
                        field.onChange(e.target.checked ? true : (undefined as unknown as true))
                      }
                      className="mt-0.5 w-4 h-4 rounded border-[#687C6B]/40 text-[#4E805D] focus:ring-[#4E805D]"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      He leído y estoy de acuerdo
                      <span className="text-[#A4636E] ml-1">*</span>
                    </span>
                  </label>
                )}
              />
              <FieldError message={errors.aceptacionRiesgo?.message} />
            </div>
          </div>

          {/* Submit */}
          <div className="pb-8">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Registrar Integrante'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
