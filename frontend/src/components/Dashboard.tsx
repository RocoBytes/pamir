import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  LogOut,
  Loader2,
  AlertCircle,
  Backpack,
  MapPin,
  FileWarning,
  ChevronRight,
  ClipboardList,
  Clock,
  ClipboardCheck,
  Lock,
  UserPlus,
} from 'lucide-react'
import logoPamir from '../assets/logo_PAMIR.png'

import type { SalidaRecord, User } from '../types/salida'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  DISCIPLINA_LABELS,
} from '../types/salida'
import { fetchSalidas } from '../lib/api'
import { Button } from './ui/Button'

// Imagen de ruta alpinista en Chile — reemplazar por foto propia si se desea
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80'

// Imagen de refugio alpino — reemplazar por foto propia si se desea
const CIERRE_IMAGE =
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80'

interface DashboardProps {
  user: User
  onNewSalida: () => void
  onNewCierre: () => void
  onNewIntegrante: () => void
  onLogout: () => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function SalidaCard({ salida }: { salida: SalidaRecord }) {
  return (
    <article className="bg-white rounded-2xl border border-[#4a6fad]/15 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-base leading-tight truncate">
              {salida.nombreActividad}
            </h3>
            <p className="text-sm text-[#757874] mt-0.5 truncate flex items-center gap-1">
              <MapPin size={12} className="shrink-0" />
              {salida.ubicacionGeografica}
            </p>
          </div>
          <span
            className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[salida.status]}`}
          >
            {STATUS_LABELS[salida.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-[#757874]">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-[#757874]/60 shrink-0" />
            <span>{formatDate(salida.fechaInicio)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-[#757874]/60 shrink-0" />
            <span>Retorno {salida.horaRetornoEstimada}</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <Backpack size={13} className="text-[#757874]/60 shrink-0" />
            <span className="font-medium text-[#4a6fad]">
              {DISCIPLINA_LABELS[salida.disciplina]}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

export function Dashboard({ user, onNewSalida, onNewCierre, onNewIntegrante, onLogout }: DashboardProps) {
  const [salidas, setSalidas] = useState<SalidaRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSalidas = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchSalidas()
      setSalidas(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar las salidas',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSalidas()
  }, [loadSalidas])

  return (
    <div className="min-h-screen bg-[#f0f4fb]">
      {/* Top nav */}
      <header className="bg-white border-b border-[#4a6fad]/10 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoPamir} alt="Pamir Andino Club" className="w-11 h-11 object-contain" />
            <span className="font-bold text-slate-900 text-lg">Pamir</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#757874] hidden sm:inline">
              {user.name}
            </span>
            <Button variant="ghost" size="sm" onClick={onLogout} aria-label="Cerrar sesion">
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Hero cards — formulario de salida + ficha de cierre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Card: Formulario de Salida */}
          <button
            onClick={onNewSalida}
            className="relative w-full rounded-3xl overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#264c99] focus-visible:ring-offset-2"
            aria-label="Abrir formulario de salida"
            style={{ minHeight: '220px' }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${HERO_IMAGE})` }}
            />
            <div className="absolute inset-0 bg-[#264c99] opacity-60" />
            <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 py-10 text-white text-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-inner">
                <ClipboardList size={24} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">
                  Andino Club Pamir
                </p>
                <h2 className="text-xl font-bold leading-tight drop-shadow">
                  Formulario de Salida
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 rounded-full transition-colors group-hover:bg-white/30">
                Registrar salida
                <ChevronRight size={14} />
              </span>
            </div>
          </button>

          {/* Card: Ficha de Cierre */}
          {salidas.length > 0 ? (
            <button
              onClick={onNewCierre}
              className="relative w-full rounded-3xl overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6fad] focus-visible:ring-offset-2"
              aria-label="Abrir ficha de cierre de actividad"
              style={{ minHeight: '220px' }}
            >
              {/* Imagen de fondo */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${CIERRE_IMAGE})` }}
              />
              {/* Overlay al 50% desbloqueado */}
              <div className="absolute inset-0 bg-[#0f2040] opacity-50" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 py-10 text-white text-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-inner">
                  <ClipboardCheck size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">
                    Post-Salida
                  </p>
                  <h2 className="text-xl font-bold leading-tight drop-shadow">
                    Ficha de Cierre
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 rounded-full transition-colors group-hover:bg-white/30">
                  Cerrar actividad
                  <ChevronRight size={14} />
                </span>
              </div>
            </button>
          ) : (
            <div
              className="relative w-full rounded-3xl overflow-hidden"
              aria-label="Ficha de cierre bloqueada"
              style={{ minHeight: '220px' }}
            >
              {/* Imagen de fondo */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${CIERRE_IMAGE})` }}
              />
              {/* Overlay al 75% bloqueado */}
              <div className="absolute inset-0 bg-[#0f2040] opacity-75" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 py-10 text-white text-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/20">
                  <Lock size={20} className="text-white/70" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">
                    Post-Salida
                  </p>
                  <h2 className="text-xl font-bold leading-tight text-white/80">
                    Ficha de Cierre
                  </h2>
                </div>
                <p className="text-xs text-white/50 max-w-[180px]">
                  Registra tu primera salida para desbloquear esta sección
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick action: Registrar Integrante */}
        <button
          onClick={onNewIntegrante}
          className="w-full flex items-center gap-4 bg-white rounded-2xl border border-[#4a6fad]/15 shadow-sm hover:shadow-md transition-shadow duration-200 p-4 mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#264c99] focus-visible:ring-offset-2"
          aria-label="Registrar nuevo integrante"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#e8eef7] flex items-center justify-center">
            <UserPlus size={20} className="text-[#264c99]" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-slate-900 text-sm">Registrar Integrante</p>
            <p className="text-xs text-[#757874]">Crear ficha sin necesidad de asociar una salida</p>
          </div>
          <ChevronRight size={16} className="text-[#757874]" />
        </button>

        {/* Page header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900">Mis Salidas</h1>
          <p className="text-sm text-[#757874] mt-0.5">
            {salidas.length === 0
              ? 'Aun no hay salidas registradas'
              : `${salidas.length} ${salidas.length === 1 ? 'salida' : 'salidas'} registradas`}
          </p>
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#757874]">
            <Loader2 className="animate-spin text-[#264c99]" size={28} />
            <p className="text-sm">Cargando salidas...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center py-12 gap-4 text-center">
            <AlertCircle size={32} className="text-[#A4636E]" />
            <div>
              <p className="font-semibold text-slate-700">Error al cargar</p>
              <p className="text-sm text-[#757874] mt-1">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void loadSalidas()}>
              Reintentar
            </Button>
          </div>
        )}

        {!isLoading && !error && salidas.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#e8eef7]">
              <FileWarning size={24} className="text-[#264c99]" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Sin salidas aun</p>
              <p className="text-sm text-[#757874] mt-0.5">
                Usa la tarjeta de arriba para registrar tu primera salida
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && salidas.length > 0 && (
          <div className="grid gap-3">
            {salidas.map((salida) => (
              <SalidaCard key={salida.id} salida={salida} />
            ))}
          </div>
        )}
      </main>

    </div>
  )
}
