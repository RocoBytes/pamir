import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Send } from 'lucide-react'
import type { SalidaStatus } from '../../types/salida'
import { STATUS_LABELS } from '../../types/salida'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'

const step5Schema = z.object({
  status: z.enum([
    'BORRADOR',
    'CONFIRMADA',
    'EN_CURSO',
    'COMPLETADA',
    'CANCELADA',
    'INCIDENTE',
  ]),
  incidentReport: z.string().optional(),
})

type Step5Data = z.infer<typeof step5Schema>

const STATUS_OPTIONS = (
  Object.entries(STATUS_LABELS) as [SalidaStatus, string][]
).map(([value, label]) => ({ value, label }))

interface Step5StatusProps {
  defaultValues: {
    status: SalidaStatus
    incidentReport: string
  }
  isSubmitting: boolean
  onSubmit: (data: Step5Data) => Promise<void>
  onBack: () => void
}

export function Step5Status({ defaultValues, isSubmitting, onSubmit, onBack }: Step5StatusProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step5Data>({
    resolver: zodResolver(step5Schema),
    defaultValues,
  })

  // useWatch is the recommended way to subscribe to field values in React Compiler mode
  const currentStatus = useWatch({ control, name: 'status' })
  const showIncidentField = currentStatus === 'INCIDENTE'

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      <Select
        label="Estado de la salida"
        options={STATUS_OPTIONS}
        required
        error={errors.status?.message}
        {...register('status')}
      />

      {showIncidentField && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor="incidentReport"
            className="text-sm font-semibold text-[#4E805D]"
          >
            Reporte de incidente
          </label>
          <textarea
            id="incidentReport"
            rows={5}
            placeholder="Describe el incidente ocurrido: que paso, quien estuvo involucrado, que acciones se tomaron..."
            className={[
              'w-full rounded-xl border px-3 py-2 text-sm text-slate-900 bg-white',
              'placeholder:text-[#757874]/50 resize-y',
              'focus:outline-none focus:ring-2 focus:ring-[#4E805D] focus:border-[#4E805D]',
              'transition-colors',
              errors.incidentReport
                ? 'border-[#A4636E]'
                : 'border-[#687C6B]/40',
            ].join(' ')}
            aria-describedby={
              errors.incidentReport ? 'incidentReport-error' : undefined
            }
            {...register('incidentReport')}
          />
          {errors.incidentReport && (
            <p
              id="incidentReport-error"
              className="text-xs text-[#A4636E]"
              role="alert"
            >
              {errors.incidentReport.message}
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-[#687C6B]/15 bg-[#f2f0ec]/60 p-4 text-sm text-[#757874]">
        <p className="font-semibold text-slate-700 mb-1">Listo para guardar</p>
        <p>
          Revisa que toda la informacion sea correcta. Puedes cambiar el
          estado de la salida en cualquier momento desde el panel principal.
        </p>
      </div>

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
        <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
          <Send size={18} />
          Guardar salida
        </Button>
      </div>
    </form>
  )
}
