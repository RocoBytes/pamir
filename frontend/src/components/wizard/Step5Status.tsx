import { useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Send, FileUp, X, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import type { RiesgoIdentificado } from '../../types/salida'
import { RIESGO_IDENTIFICADO_LABELS } from '../../types/salida'

// ─── Schema ───────────────────────────────────────────────────────────────────

const RIESGOS = [
  'AVALANCHAS',
  'DESPRENDIMIENTO_ROCAS',
  'CRUCE_RIOS',
  'FRIO_EXTREMO',
  'MAL_ALTURA',
  'CAIDA_DISTINTO_NIVEL',
  'CALOR_EXTREMO',
  'OTRO',
] as const

const MAX_GPX_MB = 10
const MAX_GPX_BYTES = MAX_GPX_MB * 1024 * 1024

const step5Schema = z.object({
  pronosticoMeteorologico: z
    .string()
    .min(1, 'El pronóstico meteorológico es obligatorio')
    .max(1000, 'Máximo 1000 caracteres'),
  riesgosIdentificados: z
    .array(z.enum(RIESGOS))
    .min(1, 'Selecciona al menos un riesgo'),
  riesgosOtro: z.string().max(100, 'Máximo 100 caracteres').default(''),
  planEvacuacion: z.string().max(1000, 'Máximo 1000 caracteres').default(''),
})

export type Step5Data = z.infer<typeof step5Schema>

// ─── Checkbox group (reused pattern from Step4) ───────────────────────────────

interface CheckboxGroupProps<T extends string> {
  label: string
  required?: boolean
  options: readonly T[]
  labels: Record<T, string>
  selected: T[]
  onChange: (next: T[]) => void
  error?: string
}

function CheckboxGroup<T extends string>({
  label,
  required,
  options,
  labels,
  selected,
  onChange,
  error,
}: CheckboxGroupProps<T>) {
  function toggle(value: T) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-[#4E805D]">
        {label}
        {required && (
          <span className="text-[#A4636E] ml-1" aria-hidden="true">
            *
          </span>
        )}
      </legend>
      <div className="flex flex-col gap-1.5">
        {options.map((opt) => {
          const checked = selected.includes(opt)
          return (
            <label
              key={opt}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-150 select-none',
                'focus-within:ring-2 focus-within:ring-[#4E805D]/40',
                checked
                  ? 'bg-[#e8f0ea] border-[#4E805D]/40 text-[#3d6b4a]'
                  : 'bg-white border-[#687C6B]/25 text-slate-700 hover:border-[#4E805D]/40 hover:bg-[#f5f8f5]',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt)}
                className="sr-only"
              />
              <span
                className={[
                  'flex items-center justify-center w-4 h-4 rounded border shrink-0 transition-colors',
                  checked
                    ? 'bg-[#4E805D] border-[#4E805D]'
                    : 'bg-white border-[#687C6B]/50',
                ].join(' ')}
                aria-hidden="true"
              >
                {checked && (
                  <svg viewBox="0 0 12 10" fill="none" className="w-2.5 h-2.5">
                    <path
                      d="M1 5l3.5 3.5L11 1"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="text-sm font-medium">{labels[opt]}</span>
            </label>
          )
        })}
      </div>
      {error && (
        <p className="text-xs text-[#A4636E]" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}

// ─── GPX upload section ───────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

interface GpxUploaderProps {
  gpxFile: File | null
  isGuest: boolean
  onFileChange: (file: File | null) => void
}

function GpxUploader({ gpxFile, isGuest, onFileChange }: GpxUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sizeError = gpxFile && gpxFile.size > MAX_GPX_BYTES

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    onFileChange(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.gpx')) onFileChange(file)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-[#4E805D]">
        Carga la Ruta en GPX{' '}
        <span className="text-[#757874] font-normal">(opcional)</span>
      </p>
      <p className="text-xs text-[#757874]">
        Máximo {MAX_GPX_MB} MB. Solo archivos .gpx.
      </p>

      {isGuest && (
        <div className="flex items-start gap-2 rounded-xl bg-[#fef9f0] border border-[#A4636E]/20 p-3 text-sm text-[#8b5a3a]">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#A4636E]" />
          <span>
            En modo invitado el archivo GPX no se subirá a la nube. Los datos
            de la salida se guardarán localmente.
          </span>
        </div>
      )}

      {!gpxFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Seleccionar archivo GPX"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
          }}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#687C6B]/30 bg-[#f2f0ec] hover:bg-[#eef1ee] hover:border-[#4E805D]/50 transition-colors p-8 cursor-pointer"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#e8f0ea] mb-3">
            <FileUp size={20} className="text-[#4E805D]" />
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">
            Arrastra tu archivo GPX aquí
          </p>
          <p className="text-xs text-[#757874] mb-3">o haz clic para seleccionar</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            Seleccionar archivo
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#687C6B]/15 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#e8f0ea] shrink-0">
              <FileUp size={18} className="text-[#4E805D]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {gpxFile.name}
              </p>
              <p className={`text-xs ${sizeError ? 'text-[#A4636E]' : 'text-[#757874]'}`}>
                {formatBytes(gpxFile.size)}
                {sizeError && ` — excede el límite de ${MAX_GPX_MB} MB`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="text-[#757874]/60 hover:text-[#A4636E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A4636E] rounded p-1"
              aria-label="Quitar archivo"
            >
              <X size={16} />
            </button>
          </div>
          {sizeError && (
            <p className="text-xs text-[#A4636E] mt-2" role="alert">
              El archivo supera el tamaño máximo permitido de {MAX_GPX_MB} MB.
            </p>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Seleccionar archivo GPX"
      />
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Step5TechnicalPlanProps {
  defaultValues: Step5Data
  gpxFile: File | null
  isGuest: boolean
  isSubmitting: boolean
  onFileChange: (file: File | null) => void
  onSubmit: (data: Step5Data) => Promise<void>
  onBack: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Step5Status({
  defaultValues,
  gpxFile,
  isGuest,
  isSubmitting,
  onFileChange,
  onSubmit,
  onBack,
}: Step5TechnicalPlanProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step5Data>({
    resolver: zodResolver(step5Schema),
    defaultValues,
  })

  const riesgosSeleccionados = watch('riesgosIdentificados')
  const showOtroRiesgo = riesgosSeleccionados?.includes('OTRO')

  const gpxSizeError = gpxFile && gpxFile.size > MAX_GPX_BYTES

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      {/* Pronóstico Meteorológico */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pronosticoMeteorologico"
          className="text-sm font-semibold text-[#4E805D]"
        >
          Pronóstico Meteorológico
          <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>
        </label>
        <p className="text-xs text-[#757874] -mt-0.5">
          Resumen de condiciones esperadas y fuente: Meteoblue, Mountain Forecast, etc.
        </p>
        <textarea
          id="pronosticoMeteorologico"
          rows={4}
          maxLength={1000}
          placeholder="Ej: Vientos moderados del SW, temperatura estimada -5°C en cima. Fuente: Meteoblue."
          {...register('pronosticoMeteorologico')}
          className={[
            'w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 bg-white',
            'placeholder:text-[#757874]/50 resize-y',
            'focus:outline-none focus:ring-2 focus:ring-[#4E805D]/40 focus:border-[#4E805D] transition-colors',
            errors.pronosticoMeteorologico ? 'border-[#A4636E]' : 'border-[#687C6B]/40',
          ].join(' ')}
        />
        {errors.pronosticoMeteorologico && (
          <p className="text-xs text-[#A4636E]" role="alert">
            {errors.pronosticoMeteorologico.message}
          </p>
        )}
      </div>

      {/* Principales Riesgos Identificados */}
      <div className="flex flex-col gap-3">
        <Controller
          control={control}
          name="riesgosIdentificados"
          render={({ field }) => (
            <CheckboxGroup<RiesgoIdentificado>
              label="Principales Riesgos Identificados"
              required
              options={RIESGOS}
              labels={RIESGO_IDENTIFICADO_LABELS}
              selected={field.value}
              onChange={field.onChange}
              error={errors.riesgosIdentificados?.message}
            />
          )}
        />

        {showOtroRiesgo && (
          <div className="flex flex-col gap-1.5 pl-7">
            <label
              htmlFor="riesgosOtro"
              className="text-xs font-semibold text-[#4E805D]"
            >
              Especifica el riesgo
            </label>
            <input
              id="riesgosOtro"
              type="text"
              maxLength={100}
              placeholder="Describe el riesgo..."
              {...register('riesgosOtro')}
              className={[
                'w-full px-3 py-2 rounded-xl border bg-white text-sm text-slate-800',
                'placeholder:text-[#adb5ad] focus:outline-none focus:ring-2 focus:ring-[#4E805D]/40 focus:border-[#4E805D] transition-shadow',
                errors.riesgosOtro ? 'border-[#A4636E]' : 'border-[#687C6B]/30',
              ].join(' ')}
            />
            {errors.riesgosOtro && (
              <p className="text-xs text-[#A4636E]" role="alert">
                {errors.riesgosOtro.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Plan de Evacuación / Ruta Alternativa */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="planEvacuacion"
          className="text-sm font-semibold text-[#4E805D]"
        >
          Plan de Evacuación / Ruta Alternativa{' '}
          <span className="text-[#757874] font-normal">(opcional)</span>
        </label>
        <textarea
          id="planEvacuacion"
          rows={3}
          maxLength={1000}
          placeholder='Ej: "En caso de incidente en el punto X, bajaremos por Y"'
          {...register('planEvacuacion')}
          className={[
            'w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 bg-white',
            'placeholder:text-[#757874]/50 resize-y',
            'focus:outline-none focus:ring-2 focus:ring-[#4E805D]/40 focus:border-[#4E805D] transition-colors',
            errors.planEvacuacion ? 'border-[#A4636E]' : 'border-[#687C6B]/40',
          ].join(' ')}
        />
        {errors.planEvacuacion && (
          <p className="text-xs text-[#A4636E]" role="alert">
            {errors.planEvacuacion.message}
          </p>
        )}
      </div>

      {/* GPX Upload */}
      <GpxUploader
        gpxFile={gpxFile}
        isGuest={isGuest}
        onFileChange={onFileChange}
      />

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <ChevronLeft size={18} />
          Anterior
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          disabled={!!gpxSizeError}
        >
          <Send size={18} />
          Guardar salida
        </Button>
      </div>
    </form>
  )
}
