import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  LayoutDashboard,
  Loader2,
  AlertCircle,
  Clock,
  BellOff,
  CheckCircle2,
  Users,
} from 'lucide-react'
import logoPamir from '../assets/logo_PAMIR.png'

import { fetchSalidas } from '../lib/api'
import type { SalidaRecord } from '../types/salida'
import { STATUS_LABELS, STATUS_COLORS, DISCIPLINA_LABELS } from '../types/salida'
import { Button } from './ui/Button'

interface AdminPanelProps {
  onBack: () => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

/**
 * Derives the UTC offset of America/Santiago for a given calendar date.
 * Chile observes DST, so the offset is computed for the salida's own return
 * date (probing noon UTC of that date) — same logic as the backend cron.
 */
function santiagoOffsetFor(dateStr: string): string {
  const probe = new Date(`${dateStr}T12:00:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    timeZoneName: 'longOffset',
  }).formatToParts(probe)
  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-04:00'
  return tzPart.replace('GMT', '')
}

/**
 * Determines whether a salida has exceeded its alert threshold.
 * Uses an explicit Santiago offset (instead of the browser's local timezone)
 * so the result matches the backend cron regardless of the viewer's locale.
 */
function isVencida(salida: SalidaRecord): boolean {
  try {
    // fechaRetornoEstimada arrives as ISO string stored as midnight UTC of
    // the intended calendar date; the UTC date substring IS the return date
    const dateStr = salida.fechaRetornoEstimada.slice(0, 10)
    const offset = santiagoOffsetFor(dateStr)
    const alarmDate = new Date(`${dateStr}T${salida.horaAlerta}:00${offset}`)
    return !isNaN(alarmDate.getTime()) && new Date() >= alarmDate
  } catch {
    return false
  }
}

function isOpenSalida(salida: SalidaRecord): boolean {
  return salida.status === 'EN_CURSO' && (salida._count?.cierres ?? 0) === 0
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [salidas, setSalidas] = useState<SalidaRecord[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSalidas = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchSalidas()
      setSalidas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las salidas')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSalidas()
  }, [loadSalidas])

  const openSalidas = salidas ? salidas.filter(isOpenSalida) : []
  const allSalidas = salidas ?? []

  // Group all salidas by status for the history section
  const grouped = allSalidas.reduce<Record<string, SalidaRecord[]>>((acc, s) => {
    const list = acc[s.status] ?? []
    list.push(s)
    acc[s.status] = list
    return acc
  }, {})

  const statusOrder: Array<SalidaRecord['status']> = [
    'EN_CURSO',
    'COMPLETADA',
    'BORRADOR',
    'CONFIRMADA',
    'INCIDENTE',
    'CANCELADA',
  ]

  return (
    <div className="min-h-screen bg-[#f0f4fb]">
      <header className="bg-white border-b border-[#4a6fad]/10 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Page title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[#4a6fad] text-xs font-semibold uppercase tracking-widest mb-1">
            <LayoutDashboard size={14} />
            Administración
          </div>
          <h1 className="text-xl font-bold text-slate-900">Panel de Administración</h1>
          <p className="text-sm text-[#757874] mt-0.5">
            Salidas abiertas, alarmas pendientes e historial completo de registros.
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#757874]">
            <Loader2 className="animate-spin text-[#264c99]" size={28} />
            <p className="text-sm">Cargando datos...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-[#f5e8ea] border border-[#A4636E]/30 p-3 text-sm text-[#8b3a44] mb-6">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{error}</p>
              <button
                onClick={() => void loadSalidas()}
                className="mt-2 text-[#8b3a44] font-semibold underline text-xs"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {!isLoading && salidas && (
          <>
            {/* ── Section 1: Salidas abiertas ─────────────────────────────── */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-bold text-slate-900">Salidas abiertas</h2>
                <span className="text-xs font-bold bg-[#e8eef7] text-[#264c99] px-2 py-0.5 rounded-full">
                  {openSalidas.length}
                </span>
              </div>

              {openSalidas.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#e8eef7]">
                    <CheckCircle2 size={22} className="text-[#264c99]" />
                  </div>
                  <p className="text-sm text-[#757874]">No hay salidas abiertas sin cierre</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {openSalidas.map((s) => {
                    const vencida = isVencida(s)
                    const alertada = Boolean(s.alertaEnviadaAt)
                    const participantCount = Array.isArray(s.participantes)
                      ? s.participantes.length
                      : 0

                    return (
                      <li
                        key={s.id}
                        className="bg-white rounded-2xl border border-[#4a6fad]/15 shadow-sm p-4"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            {typeof s.numeroSalida === 'number' && (
                              <span className="inline-block text-[10px] font-bold text-[#4a6fad] bg-[#e8eef7] px-2 py-0.5 rounded-md mb-1">
                                N° {s.numeroSalida}
                              </span>
                            )}
                            <p className="font-semibold text-slate-900 text-sm leading-tight">
                              {s.nombreActividad}
                            </p>
                            <p className="text-xs text-[#757874] mt-0.5">{s.ubicacionGeografica}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {vencida && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white bg-red-600 px-2 py-0.5 rounded-md">
                                <Clock size={10} />
                                VENCIDA
                              </span>
                            )}
                            {alertada && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                                <BellOff size={10} />
                                Alerta enviada
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#757874] mt-2">
                          <span>
                            <span className="font-medium text-slate-600">Inicio:</span>{' '}
                            {formatDate(s.fechaInicio)}
                          </span>
                          <span>
                            <span className="font-medium text-slate-600">Retorno est.:</span>{' '}
                            {formatDate(s.fechaRetornoEstimada)} {s.horaRetornoEstimada}
                          </span>
                          <span>
                            <span className="font-medium text-slate-600">Hora alerta:</span>{' '}
                            {s.horaAlerta}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {participantCount}{' '}
                            {participantCount === 1 ? 'participante' : 'participantes'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-2">
                          <span className="font-medium text-slate-700">Líder:</span>{' '}
                          {s.liderCordada}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* ── Section 2: Historial de registros ───────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-bold text-slate-900">Historial de registros</h2>
                <span className="text-xs font-bold bg-[#e8eef7] text-[#264c99] px-2 py-0.5 rounded-full">
                  {allSalidas.length}
                </span>
              </div>

              {allSalidas.length === 0 ? (
                <p className="text-sm text-[#757874] py-6 text-center">
                  No hay salidas registradas en el sistema
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {statusOrder
                    .filter((st) => grouped[st]?.length)
                    .map((st) => (
                      <div key={st}>
                        <h3 className="text-xs font-bold text-[#264c99] uppercase tracking-wide mb-2">
                          {STATUS_LABELS[st]} ({grouped[st].length})
                        </h3>
                        <ul className="flex flex-col gap-1">
                          {grouped[st].map((s) => (
                            <li
                              key={s.id}
                              className="flex items-center gap-3 bg-white rounded-xl border border-[#4a6fad]/10 px-3 py-2.5"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {s.nombreActividad}
                                </p>
                                <p className="text-xs text-[#757874] truncate">
                                  {DISCIPLINA_LABELS[s.disciplina] ?? s.disciplina} ·{' '}
                                  {formatDate(s.fechaInicio)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}
                                >
                                  {STATUS_LABELS[s.status]}
                                </span>
                                {/* Cierre indicator */}
                                {(s._count?.cierres ?? 0) > 0 ? (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                    Con cierre
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                    Sin cierre
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
