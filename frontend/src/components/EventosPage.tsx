import { useState, useEffect, useCallback } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CalendarOff,
  Loader2,
  Plus,
  Settings2,
} from 'lucide-react'
import logoPamir from '../assets/logo_PAMIR.png'

import type { CategoriaEventoRecord, EventoListItem } from '../types/evento'
import { fetchCategoriasEvento, fetchEventos } from '../lib/api'
import { Button } from './ui/Button'
import { EventoCard } from './EventoCard'
import { EventoDetailModal } from './EventoDetailModal'

interface EventosPageProps {
  isEventosAdmin?: boolean
  onBack: () => void
  onCrearEvento: () => void
  onGestionarEvento: (id: string) => void
}

export function EventosPage({ isEventosAdmin = false, onBack, onCrearEvento, onGestionarEvento }: EventosPageProps) {
  const [categorias, setCategorias] = useState<CategoriaEventoRecord[]>([])
  const [eventos, setEventos] = useState<EventoListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slugsSeleccionados, setSlugsSeleccionados] = useState<string[]>([])
  const [verPasados, setVerPasados] = useState(false)
  const [selectedEventoId, setSelectedEventoId] = useState<string | null>(null)

  useEffect(() => {
    fetchCategoriasEvento()
      .then(setCategorias)
      .catch(() => {
        // Sin categorías solo se pierden los chips de filtro; la lista funciona igual
      })
  }, [])

  const loadEventos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchEventos({
        categorias: slugsSeleccionados.length > 0 ? slugsSeleccionados : undefined,
        incluirPasados: verPasados || undefined,
      })
      setEventos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los eventos')
    } finally {
      setIsLoading(false)
    }
  }, [slugsSeleccionados, verPasados])

  useEffect(() => {
    void loadEventos()
  }, [loadEventos])

  function toggleCategoria(slug: string) {
    setSlugsSeleccionados((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f4fb]">
      <header className="bg-white border-b border-[#4a6fad]/10 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoPamir} alt="Pamir Andino Club" className="w-11 h-11 object-contain" />
            <span className="font-bold text-slate-900 text-lg">Pamir</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={16} />
            Volver
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#4a6fad] text-xs font-semibold uppercase tracking-widest mb-1">
              <CalendarDays size={14} />
              Andino Club Pamir
            </div>
            <h1 className="text-xl font-bold text-slate-900">Eventos del club</h1>
            <p className="text-sm text-[#757874] mt-0.5">
              Calendario de actividades e inscripciones.
            </p>
          </div>
          {isEventosAdmin && (
            <Button variant="primary" size="sm" onClick={onCrearEvento}>
              <Plus size={16} />
              Crear evento
            </Button>
          )}
        </div>

        {/* Filtros: chips de categoría + ver pasados */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSlugsSeleccionados([])}
            aria-pressed={slugsSeleccionados.length === 0}
            className={[
              'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#264c99]',
              slugsSeleccionados.length === 0
                ? 'bg-[#264c99] text-white border-[#264c99]'
                : 'bg-white text-[#757874] border-[#4a6fad]/20 hover:bg-[#f0f4fb]',
            ].join(' ')}
          >
            Todas
          </button>
          {categorias.map((cat) => {
            const activa = slugsSeleccionados.includes(cat.slug)
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => toggleCategoria(cat.slug)}
                aria-pressed={activa}
                className={[
                  'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#264c99]',
                  activa
                    ? 'bg-[#e8eef7] text-[#264c99] border-[#264c99]/40'
                    : 'bg-white text-[#757874] border-[#4a6fad]/20 hover:bg-[#f0f4fb]',
                ].join(' ')}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden="true"
                />
                {cat.nombre}
              </button>
            )
          })}
          <label className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-[#757874] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verPasados}
              onChange={(e) => setVerPasados(e.target.checked)}
              className="w-4 h-4 rounded border-[#4a6fad]/40 text-[#264c99] focus:ring-[#264c99]"
            />
            Ver pasados
          </label>
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#757874]">
            <Loader2 className="animate-spin text-[#264c99]" size={28} />
            <p className="text-sm">Cargando eventos...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center py-12 gap-4 text-center">
            <AlertCircle size={32} className="text-[#A4636E]" />
            <div>
              <p className="font-semibold text-slate-700">Error al cargar</p>
              <p className="text-sm text-[#757874] mt-1">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void loadEventos()}>
              Reintentar
            </Button>
          </div>
        )}

        {!isLoading && !error && eventos.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#e8eef7]">
              <CalendarOff size={24} className="text-[#264c99]" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Sin eventos próximos</p>
              <p className="text-sm text-[#757874] mt-0.5">
                {isEventosAdmin
                  ? 'Usa el botón Crear evento para publicar la primera actividad'
                  : 'Cuando el club publique actividades las verás aquí'}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && eventos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {eventos.map((evento) => (
              <div key={evento.id} className="min-w-0">
                <EventoCard evento={evento} onClick={setSelectedEventoId} />
                {isEventosAdmin && (
                  <button
                    onClick={() => onGestionarEvento(evento.id)}
                    className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#4a6fad] hover:text-[#264c99] px-2 py-1 rounded-lg hover:bg-[#e8eef7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#264c99]"
                    aria-label={`Gestionar ${evento.titulo}`}
                  >
                    <Settings2 size={13} />
                    Gestionar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedEventoId && (
        <EventoDetailModal
          eventoId={selectedEventoId}
          onClose={() => setSelectedEventoId(null)}
          isEventosAdmin={isEventosAdmin}
          onGestionar={(id) => {
            setSelectedEventoId(null)
            onGestionarEvento(id)
          }}
          onChanged={() => void loadEventos()}
        />
      )}
    </div>
  )
}
