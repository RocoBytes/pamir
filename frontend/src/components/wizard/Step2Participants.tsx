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
    horaRetornoEstimada: z.string().min(1, 'Ingresa la hora estimada de retorno'),
    horaAlerta: z.string().min(1, 'Ingresa la hora de alerta'),
    avisosExternos: z
      .array(z.enum(['CARABINEROS', 'SOCORRO_ANDINO', 'FAMILIAR_OTRO']))
      .min(1, 'Selecciona al menos una opción'),
  })
  .refine((d) => d.fechaRetornoEstimada >= d.fechaInicio, {
    message: 'La fecha de retorno debe ser igual o posterior a la de inicio',
    path: ['fechaRetornoEstimada'],
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
      <legend className="text-sm font-semibold text-[#4E805D]">
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
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues,
  })

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
              label="Hora Estimada de Retorno"
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

      {/* Avisos externos — selección múltiple */}
      <div className="rounded-2xl border border-[#687C6B]/15 bg-[#f2f0ec]/60 p-4">
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
