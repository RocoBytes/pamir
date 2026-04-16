import { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Mountain,
  X,
  Check,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react'

import type {
  User,
  SalidaRecord,
  EstadoCierre,
  MotivoAbandono,
  FichaCierreRecord,
} from '../types/salida'
import {
  ESTADO_CIERRE_LABELS,
  MOTIVO_ABANDONO_LABELS,
} from '../types/salida'
import { fetchSalidas } from '../lib/api'
import { loadGuestSalidas, saveGuestCierre } from '../lib/storage'
import { Button } from './ui/Button'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const ESTADOS = [
  'COMPLETADA_SEGUN_PLAN',
  'COMPLETADA_CON_VARIACIONES',
  'ABORTADA_INCOMPLETA',
] as const

const MOTIVOS = [
  'METEOROLOGIA',
  'SALUD_INTEGRANTE',
  'MAL_ESTADO_RUTA',
  'FALLO_EQUIPO',
  'ERROR_PLANIFICACION',
  'FALTA_TIEMPO',
] as const

const cierreSchema = z
  .object({
    salidaId: z.string().min(1, 'Selecciona una salida'),
    fechaFinalizacionReal: z.string().min(1, 'La fecha de finalización es obligatoria'),
    estadoCierre: z.enum(ESTADOS, { required_error: 'Selecciona el estado de la salida' }),
    motivoAbandono: z.enum(MOTIVOS).optional(),
  })
  .refine(
    (data) =>
      data.estadoCierre !== 'ABORTADA_INCOMPLETA' || !!data.motivoAbandono,
    { message: 'Indica el motivo del abandono', path: ['motivoAbandono'] },
  )

type CierreFormValues = z.infer<typeof cierreSchema>

// ─── Radio group ──────────────────────────────────────────────────────────────

interface RadioGroupProps<T extends string> {
  label: string
  required?: boolean
  options: readonly T[]
  labels: Record<T, string>
  value: T | undefined
  onChange: (val: T) => void
  error?: string
}

function RadioGroup<T extends string>({
  label,
  required,
  options,
  labels,
  value,
  onChange,
  error,
}: RadioGroupProps<T>) {
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
          const checked = value === opt
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
                type="radio"
                checked={checked}
                onChange={() => onChange(opt)}
                className="sr-only"
              />
              <span
                className={[
                  'flex items-center justify-center w-4 h-4 rounded-full border shrink-0 transition-colors',
                  checked
                    ? 'bg-[#4E805D] border-[#4E805D]'
                    : 'bg-white border-[#687C6B]/50',
                ].join(' ')}
                aria-hidden="true"
              >
                {checked && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white block" />
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface FichaCierreProps {
  user: User
  isGuest: boolean
  onDone: () => void
  onCancel: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FichaCierre({ user, isGuest, onDone, onCancel }: FichaCierreProps) {
  const [salidas, setSalidas] = useState<SalidaRecord[]>([])
  const [loadingSalidas, setLoadingSalidas] = useState(!isGuest)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CierreFormValues>({
    resolver: zodResolver(cierreSchema),
  })

  const estadoSeleccionado = watch('estadoCierre')

  const loadSalidas = useCallback(async () => {
    if (isGuest) {
      setSalidas(loadGuestSalidas())
      return
    }
    setLoadingSalidas(true)
    setLoadError(null)
    try {
      const data = await fetchSalidas()
      setSalidas(data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error al cargar las salidas')
    } finally {
      setLoadingSalidas(false)
    }
  }, [isGuest])

  useEffect(() => {
    void loadSalidas()
  }, [loadSalidas])

  const onSubmit = useCallback(
    async (values: CierreFormValues) => {
      const salida = salidas.find((s) => s.id === values.salidaId)
      setIsSubmitting(true)
      setSubmitError(null)
      try {
        const record: FichaCierreRecord = {
          id: `cierre-${Date.now()}`,
          salidaId: values.salidaId,
          salidaNombre: salida?.nombreActividad ?? values.salidaId,
          fechaFinalizacionReal: values.fechaFinalizacionReal,
          estadoCierre: values.estadoCierre,
          motivoAbandono: values.motivoAbandono,
          createdAt: new Date().toISOString(),
          userId: user.id,
        }
        // For now, always save locally (API endpoint not yet implemented)
        saveGuestCierre(record)
        setSubmitSuccess(true)
        setTimeout(onDone, 1500)
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Error al guardar el cierre')
        setIsSubmitting(false)
      }
    },
    [salidas, user.id, onDone],
  )

  // ─── Success screen ─────────────────────────────────────────────────────────

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#f2f0ec] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#e8f0ea] mx-auto mb-4">
            <Check size={32} className="text-[#4E805D]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Cierre registrado</h2>
          <p className="text-[#757874] text-sm">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f2f0ec] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#687C6B]/15 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-sm text-[#757874] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4E805D] rounded transition-colors"
            aria-label="Cancelar y volver"
          >
            <X size={18} />
            <span className="hidden sm:inline">Cancelar</span>
          </button>
          <div className="flex items-center gap-2">
            <Mountain size={18} className="text-[#4E805D]" />
            <span className="font-semibold text-slate-800 text-sm">Cierre de Actividad</span>
          </div>
          <div className="w-16" aria-hidden="true" />
        </div>
      </header>

      {/* Step label strip */}
      <div className="bg-white border-b border-[#687C6B]/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-2.5">
          <p className="text-xs font-semibold text-[#4E805D] uppercase tracking-wider">
            Ficha de Cierre de Actividad (Post-Salida)
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Cierre de Actividad</h2>
          <p className="text-sm text-[#757874] mt-1">
            Registra cómo resultó la salida y cierra el expediente de la actividad.
          </p>
        </div>

        {/* Loading salidas */}
        {loadingSalidas && (
          <div className="flex items-center gap-2 text-sm text-[#757874] py-6 justify-center">
            <Loader2 className="animate-spin text-[#4E805D]" size={20} />
            Cargando salidas...
          </div>
        )}

        {loadError && (
          <div className="flex items-start gap-2 rounded-xl bg-[#f5e8ea] border border-[#A4636E]/30 p-3 mb-5 text-sm text-[#8b3a44]">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {!loadingSalidas && !loadError && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-6"
          >
            {/* Campo: Selección de Salida */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="salidaId"
                className="text-sm font-semibold text-[#4E805D]"
              >
                Formulario de Salida asociado
                <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>
              </label>
              <p className="text-xs text-[#757874] -mt-0.5">
                Selecciona la salida que deseas cerrar.
              </p>
              <div className="relative">
                <select
                  id="salidaId"
                  {...register('salidaId')}
                  aria-invalid={errors.salidaId ? 'true' : undefined}
                  className={[
                    'w-full appearance-none rounded-xl border bg-white px-3 py-2 pr-9 text-sm text-slate-900',
                    'transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-[#4E805D] focus:border-[#4E805D]',
                    errors.salidaId
                      ? 'border-[#A4636E] focus:ring-[#A4636E] focus:border-[#A4636E]'
                      : 'border-[#687C6B]/40',
                  ].join(' ')}
                >
                  <option value="">— Selecciona una salida —</option>
                  {salidas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombreActividad} ({s.ubicacionGeografica})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687C6B]/60 pointer-events-none"
                  size={16}
                />
              </div>
              {errors.salidaId && (
                <p className="text-xs text-[#A4636E]" role="alert">
                  {errors.salidaId.message}
                </p>
              )}
            </div>

            {/* Campo: Fecha de Finalización Real */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="fechaFinalizacionReal"
                className="text-sm font-semibold text-[#4E805D]"
              >
                Fecha de Finalización Real
                <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>
              </label>
              <input
                id="fechaFinalizacionReal"
                type="date"
                {...register('fechaFinalizacionReal')}
                aria-invalid={errors.fechaFinalizacionReal ? 'true' : undefined}
                className={[
                  'w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900',
                  'transition-colors duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-[#4E805D] focus:border-[#4E805D]',
                  errors.fechaFinalizacionReal
                    ? 'border-[#A4636E] focus:ring-[#A4636E] focus:border-[#A4636E]'
                    : 'border-[#687C6B]/40',
                ].join(' ')}
              />
              {errors.fechaFinalizacionReal && (
                <p className="text-xs text-[#A4636E]" role="alert">
                  {errors.fechaFinalizacionReal.message}
                </p>
              )}
            </div>

            {/* Campo: Estado de la Salida */}
            <Controller
              control={control}
              name="estadoCierre"
              render={({ field }) => (
                <RadioGroup<EstadoCierre>
                  label="Estado de la Salida"
                  required
                  options={ESTADOS}
                  labels={ESTADO_CIERRE_LABELS}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.estadoCierre?.message}
                />
              )}
            />

            {/* Campo condicional: Motivo de Abandono */}
            {estadoSeleccionado === 'ABORTADA_INCOMPLETA' && (
              <Controller
                control={control}
                name="motivoAbandono"
                render={({ field }) => (
                  <RadioGroup<MotivoAbandono>
                    label="Si fue abortada, ¿cuál fue el motivo principal?"
                    required
                    options={MOTIVOS}
                    labels={MOTIVO_ABANDONO_LABELS}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.motivoAbandono?.message}
                  />
                )}
              />
            )}

            {/* Submit error */}
            {submitError && (
              <div className="flex items-start gap-2 rounded-xl bg-[#f5e8ea] border border-[#A4636E]/30 p-3 text-sm text-[#8b3a44]">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
              >
                <Check size={18} />
                Registrar cierre
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
