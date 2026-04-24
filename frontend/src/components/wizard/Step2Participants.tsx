import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { Input } from '../ui/Input'
import { TimeInput24 } from '../ui/TimeInput24'
import { Button } from '../ui/Button'
import type { AvisoExterno } from '../../types/salida'

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayString() {
  return new Date().toISOString().split('T')[0]
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const step2Schema = z
  .object({
    fechaInicio: z
      .string()
      .min(1, 'Selecciona la fecha de inicio')
      .refine((d) => d >= todayString(), {
        message: 'No puedes seleccionar una fecha pasada',
      }),
    fechaRetornoEstimada: z
      .string()
      .min(1, 'Selecciona la fecha estimada de retorno')
      .refine((d) => d >= todayString(), {
        message: 'No puedes seleccionar una fecha pasada',
      }),
    horaRetornoEstimada: z.string().min(1, 'Ingresa la hora de retorno'),
    horaAlerta: z.string().min(1, 'Ingresa la hora de alerta'),
    avisosExternos: z
      .array(z.enum(['CARABINEROS', 'SOCORRO_ANDINO', 'FAMILIAR_OTRO']))
      .min(1, 'Selecciona al menos una opción'),
    retenCarabineros: z.string().max(200).optional(),
    nombreFamiliar: z.string().max(200).optional(),
    telefonoFamiliar: z.string().max(50).optional(),
  })
  .refine((d) => d.fechaRetornoEstimada >= d.fechaInicio, {
    message: 'La fecha de retorno debe ser igual o posterior a la de inicio',
    path: ['fechaRetornoEstimada'],
  })
  .superRefine((data, ctx) => {
    if (data.avisosExternos.includes('CARABINEROS') && !data.retenCarabineros?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El retén de Carabineros es obligatorio',
        path: ['retenCarabineros'],
      })
    }
    if (data.avisosExternos.includes('FAMILIAR_OTRO')) {
      if (!data.nombreFamiliar?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El nombre del familiar es obligatorio',
          path: ['nombreFamiliar'],
        })
      }
      if (!data.telefonoFamiliar?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El teléfono del familiar es obligatorio',
          path: ['telefonoFamiliar'],
        })
      }
    }
  })

type Step2Data = z.infer<typeof step2Schema>

// ─── Aviso options ───────────────────────────────────────────────────────────

const AVISO_OPTIONS: { value: AvisoExterno; label: string }[] = [
  { value: 'CARABINEROS', label: 'Carabineros' },
  { value: 'SOCORRO_ANDINO', label: 'Socorro Andino' },
  { value: 'FAMILIAR_OTRO', label: 'Familiar u otra persona' },
]

// ─── Multi-select chip group ─────────────────────────────────────────────────

interface CheckChipGroupProps {
  label: string
  options: { value: AvisoExterno; label: string }[]
  value: AvisoExterno[]
  onChange: (val: AvisoExterno[]) => void
  error?: string
}

function CheckChipGroup({ label, options, value, onChange, error }: CheckChipGroupProps) {
  function toggle(opt: AvisoExterno) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt))
    } else {
      onChange([...value, opt])
    }
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-[#264c99]">
        {label}
        <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={selected}
              className={[
                'px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#264c99] focus-visible:ring-offset-1',
                selected
                  ? 'bg-[#264c99] text-white border-[#264c99] shadow-sm'
                  : 'bg-white text-slate-700 border-[#4a6fad]/40 hover:border-[#264c99] hover:text-[#264c99]',
              ].join(' ')}
            >
              {opt.label}
            </button>
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

// ─── Props ───────────────────────────────────────────────────────────────────

interface Step2Props {
  defaultValues: Step2Data
  onSubmit: (data: Step2Data) => void
  onBack: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Step2Participants({ defaultValues, onSubmit, onBack }: Step2Props) {
  const today = todayString()

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues,
  })

  const avisosSeleccionados = watch('avisosExternos') ?? []
  const showCarabineros = avisosSeleccionados.includes('CARABINEROS')
  const showFamiliar = avisosSeleccionados.includes('FAMILIAR_OTRO')

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {/* Fechas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Fecha de Inicio"
          type="date"
          required
          min={today}
          error={errors.fechaInicio?.message}
          {...register('fechaInicio')}
        />
        <Input
          label="Fecha Estimada de Retorno"
          type="date"
          required
          min={today}
          error={errors.fechaRetornoEstimada?.message}
          {...register('fechaRetornoEstimada')}
        />
      </div>

      {/* Horas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="horaRetornoEstimada"
          control={control}
          render={({ field }) => (
            <TimeInput24
              label="Hora de retorno al punto de inicio (Vehículos)"
              required
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.horaRetornoEstimada?.message}
            />
          )}
        />
        <Controller
          name="horaAlerta"
          control={control}
          render={({ field }) => (
            <TimeInput24
              label="Hora de Alerta"
              required
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.horaAlerta?.message}
            />
          )}
        />
      </div>

      {/* Avisos externos — selección múltiple + campos condicionales */}
      <div className="rounded-2xl border border-[#4a6fad]/15 bg-[#f0f4fb]/60 p-4 flex flex-col gap-4">
        <Controller
          name="avisosExternos"
          control={control}
          render={({ field }) => (
            <CheckChipGroup
              label="¿Se dio aviso a alguna autoridad o tercero externo?"
              options={AVISO_OPTIONS}
              value={field.value ?? []}
              onChange={field.onChange}
              error={errors.avisosExternos?.message}
            />
          )}
        />

        {/* Retén Carabineros */}
        {showCarabineros && (
          <div className="flex flex-col gap-1.5 pl-1">
            <label htmlFor="retenCarabineros" className="text-sm font-semibold text-[#264c99]">
              Retén de Carabineros
              <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>
            </label>
            <input
              id="retenCarabineros"
              type="text"
              maxLength={200}
              placeholder="ej. Retén Lo Valdés, Retén Cajón del Maipo"
              {...register('retenCarabineros')}
              className={[
                'w-full px-3 py-2.5 rounded-xl border bg-white text-sm text-slate-800',
                'placeholder:text-[#adb5ad] focus:outline-none focus:ring-2 focus:ring-[#264c99]/40 focus:border-[#264c99] transition-shadow',
                errors.retenCarabineros ? 'border-[#A4636E]' : 'border-[#4a6fad]/30',
              ].join(' ')}
            />
            {errors.retenCarabineros && (
              <p className="text-xs text-[#A4636E]" role="alert">{errors.retenCarabineros.message}</p>
            )}
          </div>
        )}

        {/* Contacto Familiar */}
        {showFamiliar && (
          <div className="flex flex-col gap-3 pl-1">
            <p className="text-sm font-semibold text-[#264c99]">
              Datos del familiar / contacto externo
              <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nombreFamiliar" className="text-xs font-semibold text-[#264c99]">
                  Nombre
                  <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>
                </label>
                <input
                  id="nombreFamiliar"
                  type="text"
                  maxLength={200}
                  placeholder="ej. María González"
                  {...register('nombreFamiliar')}
                  className={[
                    'w-full px-3 py-2.5 rounded-xl border bg-white text-sm text-slate-800',
                    'placeholder:text-[#adb5ad] focus:outline-none focus:ring-2 focus:ring-[#264c99]/40 focus:border-[#264c99] transition-shadow',
                    errors.nombreFamiliar ? 'border-[#A4636E]' : 'border-[#4a6fad]/30',
                  ].join(' ')}
                />
                {errors.nombreFamiliar && (
                  <p className="text-xs text-[#A4636E]" role="alert">{errors.nombreFamiliar.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="telefonoFamiliar" className="text-xs font-semibold text-[#264c99]">
                  Teléfono
                  <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>
                </label>
                <input
                  id="telefonoFamiliar"
                  type="tel"
                  maxLength={50}
                  placeholder="ej. +56 9 1234 5678"
                  {...register('telefonoFamiliar')}
                  className={[
                    'w-full px-3 py-2.5 rounded-xl border bg-white text-sm text-slate-800',
                    'placeholder:text-[#adb5ad] focus:outline-none focus:ring-2 focus:ring-[#264c99]/40 focus:border-[#264c99] transition-shadow',
                    errors.telefonoFamiliar ? 'border-[#A4636E]' : 'border-[#4a6fad]/30',
                  ].join(' ')}
                />
                {errors.telefonoFamiliar && (
                  <p className="text-xs text-[#A4636E]" role="alert">{errors.telefonoFamiliar.message}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeft size={18} />
          Anterior
        </Button>
        <Button type="submit" variant="primary" size="lg">
          Siguiente
          <ArrowRight size={18} />
        </Button>
      </div>
    </form>
  )
}
