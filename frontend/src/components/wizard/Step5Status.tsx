import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Send, Link } from 'lucide-react'
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

// ─── GPX link input ───────────────────────────────────────────────────────────

interface GpxLinkInputProps {
  value: string
  onChange: (link: string) => void
}

function GpxLinkInput({ value, onChange }: GpxLinkInputProps) {
  const isValidUrl = value === '' || /^https?:\/\/.+/.test(value)

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="gpxLink" className="text-sm font-semibold text-[#4E805D]">
        Link de la Ruta GPX{' '}
        <span className="text-[#757874] font-normal">(opcional)</span>
      </label>
      <p className="text-xs text-[#757874]">
        Sube tu archivo .gpx a Google Drive o OneDrive, compártelo con acceso
        público y pega el link aquí.
      </p>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <Link size={15} className="text-[#687C6B]/60" />
        </div>
        <input
          id="gpxLink"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://drive.google.com/file/d/..."
          className={[
            'w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm text-slate-900 bg-white',
            'placeholder:text-[#757874]/50',
            'focus:outline-none focus:ring-2 focus:ring-[#4E805D]/40 focus:border-[#4E805D] transition-colors',
            !isValidUrl ? 'border-[#A4636E]' : 'border-[#687C6B]/40',
          ].join(' ')}
        />
      </div>
      {!isValidUrl && (
        <p className="text-xs text-[#A4636E]" role="alert">
          Ingresa una URL válida (debe comenzar con http:// o https://)
        </p>
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Step5TechnicalPlanProps {
  defaultValues: Step5Data
  gpxLink: string
  isSubmitting: boolean
  onLinkChange: (link: string) => void
  onSubmit: (data: Step5Data) => Promise<void>
  onBack: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Step5Status({
  defaultValues,
  gpxLink,
  isSubmitting,
  onLinkChange,
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

      {/* GPX Link */}
      <GpxLinkInput value={gpxLink} onChange={onLinkChange} />

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
          disabled={isSubmitting}
        >
          <Send size={18} />
          Guardar salida
        </Button>
      </div>
    </form>
  )
}
