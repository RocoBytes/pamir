import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, ChevronLeft, X, UserPlus } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Button } from '../ui/Button'
import { loadIntegrantes } from '../../lib/storage'

// ─── Schema ──────────────────────────────────────────────────────────────────

const step3Schema = z.object({
  liderCordada: z.string().min(1, 'Selecciona el líder de cordada'),
  participantes: z.array(z.string()).min(1, 'Agrega al menos un participante'),
  coordinacionGrupal: z.boolean({ required_error: 'Selecciona una opción' }),
  matrizRiesgos: z.boolean({ required_error: 'Selecciona una opción' }),
})

export type Step3Data = z.infer<typeof step3Schema>

// ─── Sí / No toggle ──────────────────────────────────────────────────────────

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
      {error && (
        <p className="text-xs text-[#A4636E]" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}

// ─── Shared dropdown shell ────────────────────────────────────────────────────

interface DropdownListProps {
  integrantes: ReturnType<typeof loadIntegrantes>
  filtered: ReturnType<typeof loadIntegrantes>
  query: string
  emptyMessage: string
  onSelect: (name: string, rut: string) => void
  onCreateIntegrante: () => void
}

function DropdownList({
  integrantes,
  filtered,
  query,
  emptyMessage,
  onSelect,
  onCreateIntegrante,
}: DropdownListProps) {
  return (
    <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-[#687C6B]/20 bg-white shadow-lg overflow-hidden">
      {integrantes.length === 0 ? (
        <p className="px-4 py-3 text-sm text-[#757874]">
          No hay integrantes registrados aún.
        </p>
      ) : filtered.length === 0 && query === '' ? (
        <p className="px-4 py-3 text-sm text-[#757874]">{emptyMessage}</p>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-3 text-sm text-[#757874]">
          No se encontraron coincidencias para &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul role="listbox" className="max-h-52 overflow-y-auto divide-y divide-[#687C6B]/10">
          {filtered.map((integrante) => (
            <li key={integrante.id} role="option" aria-selected={false}>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault()
                  onSelect(integrante.nombreCompleto, integrante.rut)
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-[#e8f0ea] transition-colors"
              >
                <span className="text-sm font-medium text-slate-800">
                  {integrante.nombreCompleto}
                </span>
                <span className="text-xs text-[#757874] ml-2">{integrante.rut}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-[#687C6B]/10 p-2">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            onCreateIntegrante()
          }}
          className="flex items-center gap-1.5 text-sm text-[#4E805D] hover:text-[#3d6b4a] font-medium px-2 py-1.5 rounded-lg hover:bg-[#e8f0ea] transition-colors w-full"
        >
          <UserPlus size={15} />
          Crear nuevo integrante
        </button>
      </div>
    </div>
  )
}

// ─── Líder picker (single-select) ─────────────────────────────────────────────

interface LiderPickerProps {
  value: string
  onChange: (name: string) => void
  onCreateIntegrante: () => void
  error?: string
}

function LiderPicker({ value, onChange, onCreateIntegrante, error }: LiderPickerProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [integrantes] = useState(() => loadIntegrantes())

  const filtered = integrantes.filter((i) =>
    i.nombreCompleto.toLowerCase().includes(query.toLowerCase()),
  )

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-[#4E805D]">
        Nombre del Líder de Cordada
        <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>
      </label>

      <div ref={containerRef} className="relative">
        {value ? (
          <div
            className={[
              'flex items-center gap-2 px-3 py-2.5 rounded-xl border',
              error ? 'border-[#A4636E]' : 'border-[#4E805D]/40 bg-[#e8f0ea]',
            ].join(' ')}
          >
            <span className="text-sm font-medium text-[#3d6b4a] flex-1">{value}</span>
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Quitar líder de cordada"
              className="text-[#4E805D] hover:text-[#A4636E] transition-colors leading-none"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Buscar integrante registrado..."
            aria-label="Buscar líder de cordada"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className={[
              'w-full px-3 py-2.5 rounded-xl border bg-white text-sm text-slate-800 placeholder:text-[#adb5ad]',
              'focus:outline-none focus:ring-2 focus:ring-[#4E805D]/40 focus:border-[#4E805D] transition-shadow',
              error ? 'border-[#A4636E]' : 'border-[#687C6B]/30',
            ].join(' ')}
          />
        )}

        {isOpen && !value && (
          <DropdownList
            integrantes={integrantes}
            filtered={filtered}
            query={query}
            emptyMessage="No se encontraron integrantes."
            onSelect={(name) => {
              onChange(name)
              setQuery('')
              setIsOpen(false)
            }}
            onCreateIntegrante={() => {
              setIsOpen(false)
              onCreateIntegrante()
            }}
          />
        )}
      </div>

      {error && (
        <p className="text-xs text-[#A4636E]" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-[#757874]">
        Se conectará con la lista de usuarios registrados del club.
      </p>
    </div>
  )
}

// ─── Participant picker (multi-select) ────────────────────────────────────────

interface ParticipantePickerProps {
  selected: string[]
  onAdd: (name: string) => void
  onCreateIntegrante: () => void
}

function ParticipantePicker({ selected, onAdd, onCreateIntegrante }: ParticipantePickerProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [integrantes] = useState(() => loadIntegrantes())

  const filtered = integrantes.filter(
    (i) =>
      i.nombreCompleto.toLowerCase().includes(query.toLowerCase()) &&
      !selected.includes(i.nombreCompleto),
  )

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={
          selected.length === 0
            ? 'Buscar integrante registrado...'
            : 'Agregar otro integrante...'
        }
        aria-label="Buscar participante"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="w-full px-3 py-2.5 rounded-xl border border-[#687C6B]/30 bg-white text-sm text-slate-800 placeholder:text-[#adb5ad] focus:outline-none focus:ring-2 focus:ring-[#4E805D]/40 focus:border-[#4E805D] transition-shadow"
      />

      {isOpen && (
        <DropdownList
          integrantes={integrantes}
          filtered={filtered}
          query={query}
          emptyMessage="Todos los integrantes ya están seleccionados."
          onSelect={(name) => {
            onAdd(name)
            setQuery('')
            // keep open for multi-select
          }}
          onCreateIntegrante={() => {
            setIsOpen(false)
            onCreateIntegrante()
          }}
        />
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Step3HumanTeamProps {
  defaultValues: Step3Data
  onSubmit: (data: Step3Data) => void
  onBack: () => void
  onCreateIntegrante: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Step3HumanTeam({ defaultValues, onSubmit, onBack, onCreateIntegrante }: Step3HumanTeamProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues,
  })

  const participantes = watch('participantes')

  function addParticipante(name: string) {
    if (!participantes.includes(name)) {
      setValue('participantes', [...participantes, name], { shouldValidate: true })
    }
  }

  function removeParticipante(name: string) {
    setValue(
      'participantes',
      participantes.filter((p) => p !== name),
      { shouldValidate: true },
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {/* Líder de Cordada */}
      <Controller
        control={control}
        name="liderCordada"
        render={({ field }) => (
          <LiderPicker
            value={field.value}
            onChange={(name) => field.onChange(name)}
            onCreateIntegrante={onCreateIntegrante}
            error={errors.liderCordada?.message}
          />
        )}
      />

      {/* Nómina de Participantes */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-[#4E805D]">
          Nómina de Participantes
          <span className="text-[#A4636E] ml-1" aria-hidden="true">*</span>
        </span>
        <p className="text-xs text-[#757874]">
          Selecciona los integrantes registrados que participarán en esta salida.
        </p>

        {/* Selected participant chips */}
        {participantes.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-[#687C6B]/20 bg-[#f2f0ec]/60">
            {participantes.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 bg-[#e8f0ea] text-[#3d6b4a] text-sm font-medium px-3 py-1 rounded-full border border-[#4E805D]/20"
              >
                {p}
                <button
                  type="button"
                  onClick={() => removeParticipante(p)}
                  aria-label={`Quitar ${p}`}
                  className="text-[#4E805D] hover:text-[#A4636E] transition-colors leading-none"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Searchable picker */}
        <ParticipantePicker
          selected={participantes}
          onAdd={addParticipante}
          onCreateIntegrante={onCreateIntegrante}
        />

        {errors.participantes && (
          <p className="text-xs text-[#A4636E]" role="alert">
            {errors.participantes.message}
          </p>
        )}
      </div>

      {/* Coordinación grupal */}
      <div className="rounded-2xl border border-[#687C6B]/15 bg-[#f2f0ec]/60 p-4">
        <Controller
          control={control}
          name="coordinacionGrupal"
          render={({ field }) => (
            <YesNoField
              label="¿Se realizó una coordinación grupal inicial antes de la salida?"
              value={field.value}
              onChange={field.onChange}
              error={errors.coordinacionGrupal?.message}
            />
          )}
        />
      </div>

      {/* Matriz de riesgos */}
      <div className="rounded-2xl border border-[#687C6B]/15 bg-[#f2f0ec]/60 p-4">
        <Controller
          control={control}
          name="matrizRiesgos"
          render={({ field }) => (
            <YesNoField
              label="¿Se completó una Matriz de Riesgos 3x3 para esta salida?"
              value={field.value}
              onChange={field.onChange}
              error={errors.matrizRiesgos?.message}
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
