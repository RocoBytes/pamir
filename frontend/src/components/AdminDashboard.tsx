import { useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  Filter,
  LayoutDashboard,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import logoPamir from '../assets/logo_PAMIR.png'
import { Button } from './ui/Button'
import { Select } from './ui/Select'
import { fetchAdminDashboard } from '../lib/api'
import type { AdminDashboard as AdminDashboardData, DashboardFiltros } from '../lib/api'
import { STATUS_LABELS, DISCIPLINA_LABELS } from '../types/salida'

interface AdminDashboardProps {
  onBack: () => void
}

// Theme tokens (mirror index.css). Recharts needs concrete color strings.
const COLOR_PRIMARY = '#264c99'
const COLOR_SECONDARY = '#4a6fad'
const COLOR_TERTIARY = '#A4636E'
const COLOR_GRID = '#e8eef7'
const PIE_COLORS = ['#264c99', '#4a6fad', '#A4636E', '#7b9bd1', '#c08a93', '#9fb4d8']

const STATUS_LABEL = STATUS_LABELS as Record<string, string>
const DISCIPLINA_LABEL = DISCIPLINA_LABELS as Record<string, string>

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// "YYYY-MM" → "Jun 26"
function formatMes(key: string): string {
  const [year, month] = key.split('-')
  const idx = Number(month) - 1
  return `${MESES[idx] ?? month} ${year?.slice(2) ?? ''}`
}

const TRISTATE_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
]

type BoolFilterKey = 'conCierre' | 'conIncidente' | 'conAccidente' | 'conExpress'
type StringFilterKey = 'desde' | 'hasta' | 'status' | 'lider' | 'disciplina' | 'tipoSalida' | 'temporada'

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string
  value: string | number
  subtitle?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#4a6fad]/15 shadow-sm p-4">
      <p className="text-2xl font-bold text-[#264c99] leading-tight">{value}</p>
      <p className="text-xs text-[#757874] mt-1">{label}</p>
      {subtitle && <p className="text-[10px] text-[#757874]/70 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function ChartCard({
  title,
  empty,
  children,
}: {
  title: string
  empty?: boolean
  children: ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#4a6fad]/15 shadow-sm p-4">
      <h3 className="text-xs font-bold text-[#264c99] uppercase tracking-wide mb-3">{title}</h3>
      {empty ? (
        <p className="text-xs text-[#757874] py-8 text-center">
          Sin datos para los filtros seleccionados
        </p>
      ) : (
        children
      )}
    </div>
  )
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [filtros, setFiltros] = useState<DashboardFiltros>({})
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (f: DashboardFiltros) => {
    setLoading(true)
    try {
      const result = await fetchAdminDashboard(f)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-query whenever a filter changes (debounced so rapid edits collapse).
  useEffect(() => {
    const timer = setTimeout(() => void load(filtros), 300)
    return () => clearTimeout(timer)
  }, [filtros, load])

  function setFiltro(key: StringFilterKey, raw: string): void {
    setFiltros((prev) => {
      const next = { ...prev }
      if (raw === '') delete next[key]
      else next[key] = raw
      return next
    })
  }

  function setBoolFiltro(key: BoolFilterKey, raw: string): void {
    setFiltros((prev) => {
      const next = { ...prev }
      if (raw === 'true') next[key] = true
      else if (raw === 'false') next[key] = false
      else delete next[key]
      return next
    })
  }

  function setCalidadMin(raw: string): void {
    setFiltros((prev) => {
      const next = { ...prev }
      if (raw === '') delete next.calidadMin
      else next.calidadMin = Number(raw)
      return next
    })
  }

  const boolValue = (key: BoolFilterKey): string =>
    filtros[key] === undefined ? '' : String(filtros[key])

  const filterOptions = data?.filtros ?? { lideres: [], disciplinas: [], tipos: [], temporadas: [] }
  const hasActiveFilters = Object.keys(filtros).length > 0

  // ── Chart datasets ──
  const estadoData = (data?.porEstado ?? [])
    .filter((e) => e.total > 0)
    .map((e) => ({ label: STATUS_LABEL[e.estado] ?? e.estado, total: e.total }))

  const mesData = (data?.porMes ?? []).map((m) => ({ label: formatMes(m.mes), total: m.total }))

  const incidentesData = (data?.incidentesPorMes ?? []).map((m) => ({
    label: formatMes(m.mes),
    incidentes: m.incidentes,
    accidentes: m.accidentes,
  }))

  const participantesData = data
    ? [
        { label: 'Registrados', total: data.participantesPorTipo.registrados },
        { label: 'Express', total: data.participantesPorTipo.express },
      ].filter((d) => d.total > 0)
    : []

  const calidadDistData = (data?.calidad.distribucion ?? []).map((d) => ({
    label: `${d.nota}★`,
    total: d.total,
  }))

  const calidadMesData = (data?.calidad.porMes ?? []).map((m) => ({
    label: formatMes(m.mes),
    promedio: m.promedio,
  }))

  const liderData = (data?.porLider ?? []).map((l) => ({ lider: l.lider, total: l.total }))

  const salidaVsCierreData = data
    ? [
        { label: 'Con cierre', total: data.salidaVsCierre.conCierre },
        { label: 'Sin cierre', total: data.salidaVsCierre.sinCierre },
        { label: 'Cambios roster', total: data.salidaVsCierre.conCambiosRoster },
        { label: 'Incidentes', total: data.salidaVsCierre.conIncidentes },
        { label: 'Accidentes', total: data.salidaVsCierre.conAccidentes },
      ]
    : []

  const m = data?.metrics
  const sinSalidas = !!data && data.metrics.totalSalidas === 0

  return (
    <div className="min-h-screen bg-[#f0f4fb]">
      <header className="bg-white border-b border-[#4a6fad]/10 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoPamir} alt="Pamir Andino Club" className="w-11 h-11 object-contain" />
            <span className="font-bold text-slate-900 text-lg">Pamir</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void load(filtros)} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />
              Actualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft size={16} />
              Volver
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[#4a6fad] text-xs font-semibold uppercase tracking-widest mb-1">
            <LayoutDashboard size={14} />
            Administración
          </div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard analítico</h1>
          <p className="text-sm text-[#757874] mt-0.5">
            Relación entre el formulario de salida y el de cierre. Los gráficos se actualizan al cambiar los filtros.
          </p>
        </div>

        {/* Filters */}
        <section className="bg-white rounded-2xl border border-[#4a6fad]/15 shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-[#264c99]" />
              <h2 className="text-sm font-bold text-slate-900">Filtros</h2>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => setFiltros({})}
                className="text-xs font-semibold text-[#264c99] underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Date range */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#264c99]">Desde</label>
              <input
                type="date"
                value={filtros.desde ?? ''}
                onChange={(e) => setFiltro('desde', e.target.value)}
                className="w-full rounded-xl border border-[#4a6fad]/40 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#264c99]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#264c99]">Hasta</label>
              <input
                type="date"
                value={filtros.hasta ?? ''}
                onChange={(e) => setFiltro('hasta', e.target.value)}
                className="w-full rounded-xl border border-[#4a6fad]/40 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#264c99]"
              />
            </div>

            <Select
              label="Estado"
              value={filtros.status ?? ''}
              onChange={(e) => setFiltro('status', e.target.value)}
              options={[
                { value: '', label: 'Todos' },
                ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
              ]}
            />

            <Select
              label="Líder"
              value={filtros.lider ?? ''}
              onChange={(e) => setFiltro('lider', e.target.value)}
              options={[
                { value: '', label: 'Todos' },
                ...filterOptions.lideres.map((l) => ({ value: l, label: l })),
              ]}
            />

            <Select
              label="Disciplina"
              value={filtros.disciplina ?? ''}
              onChange={(e) => setFiltro('disciplina', e.target.value)}
              options={[
                { value: '', label: 'Todas' },
                ...filterOptions.disciplinas.map((d) => ({
                  value: d,
                  label: DISCIPLINA_LABEL[d] ?? d,
                })),
              ]}
            />

            <Select
              label="Tipo de salida"
              value={filtros.tipoSalida ?? ''}
              onChange={(e) => setFiltro('tipoSalida', e.target.value)}
              options={[
                { value: '', label: 'Todos' },
                ...filterOptions.tipos.map((t) => ({ value: t, label: t })),
              ]}
            />

            {filterOptions.temporadas.length > 0 && (
              <Select
                label="Temporada"
                value={filtros.temporada ?? ''}
                onChange={(e) => setFiltro('temporada', e.target.value)}
                options={[
                  { value: '', label: 'Todas' },
                  ...filterOptions.temporadas.map((t) => ({ value: t, label: t })),
                ]}
              />
            )}

            <Select
              label="Con cierre"
              value={boolValue('conCierre')}
              onChange={(e) => setBoolFiltro('conCierre', e.target.value)}
              options={TRISTATE_OPTIONS}
            />
            <Select
              label="Con incidente"
              value={boolValue('conIncidente')}
              onChange={(e) => setBoolFiltro('conIncidente', e.target.value)}
              options={TRISTATE_OPTIONS}
            />
            <Select
              label="Con accidente"
              value={boolValue('conAccidente')}
              onChange={(e) => setBoolFiltro('conAccidente', e.target.value)}
              options={TRISTATE_OPTIONS}
            />
            <Select
              label="Con express"
              value={boolValue('conExpress')}
              onChange={(e) => setBoolFiltro('conExpress', e.target.value)}
              options={TRISTATE_OPTIONS}
            />
            <Select
              label="Calidad mínima"
              value={filtros.calidadMin === undefined ? '' : String(filtros.calidadMin)}
              onChange={(e) => setCalidadMin(e.target.value)}
              options={[
                { value: '', label: 'Cualquiera' },
                { value: '1', label: '≥ 1★' },
                { value: '2', label: '≥ 2★' },
                { value: '3', label: '≥ 3★' },
                { value: '4', label: '≥ 4★' },
                { value: '5', label: '5★' },
              ]}
            />
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-[#f5e8ea] border border-[#A4636E]/30 p-3 text-sm text-[#8b3a44] mb-6">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{error}</p>
              <button
                onClick={() => void load(filtros)}
                className="mt-2 text-[#8b3a44] font-semibold underline text-xs"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Initial loading (no data yet) */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#757874]">
            <Loader2 className="animate-spin text-[#264c99]" size={28} />
            <p className="text-sm">Cargando dashboard...</p>
          </div>
        )}

        {data && (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {sinSalidas && (
              <div className="rounded-xl bg-white border border-[#4a6fad]/15 shadow-sm p-6 text-center text-sm text-[#757874] mb-6">
                No hay salidas que coincidan con los filtros seleccionados.
              </div>
            )}

            {/* Metric cards */}
            {m && (
              <section className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <MetricCard label="Total de salidas" value={m.totalSalidas} />
                <MetricCard label="Pendientes de cierre" value={m.pendientesCierre} />
                <MetricCard
                  label="Con cierre"
                  value={m.conCierre}
                  subtitle={`${m.pctConCierre}% del total`}
                />
                <MetricCard label="Canceladas" value={m.canceladas} />
                <MetricCard label="Total participantes" value={m.totalParticipantes} />
                <MetricCard label="Promedio por salida" value={m.promedioParticipantes} />
                <MetricCard label="Participantes express" value={m.totalExpress} />
                <MetricCard label="Salidas con incidentes" value={m.incidentes} />
                <MetricCard label="Salidas con accidentes" value={m.accidentes} />
                <MetricCard
                  label="Calidad promedio"
                  value={m.promedioCalidad === null ? '—' : `${m.promedioCalidad}★`}
                  subtitle={`${data.calidad.totalRespuestas} respuestas`}
                />
                <MetricCard label="Salidas con evaluación baja" value={m.salidasEvalBaja} />
              </section>
            )}

            {/* Charts */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Salidas por estado" empty={estadoData.length === 0}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={estadoData}
                      dataKey="total"
                      nameKey="label"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {estadoData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Salidas por mes" empty={mesData.length === 0}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={mesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Salidas"
                      stroke={COLOR_PRIMARY}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Incidentes y accidentes por mes"
                empty={incidentesData.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={incidentesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="incidentes" name="Incidentes" fill={COLOR_SECONDARY} />
                    <Bar dataKey="accidentes" name="Accidentes" fill={COLOR_TERTIARY} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Participantes por tipo" empty={participantesData.length === 0}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={participantesData}
                      dataKey="total"
                      nameKey="label"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {participantesData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Calidad de experiencia (distribución)"
                empty={data.calidad.totalRespuestas === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={calidadDistData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Respuestas" fill={COLOR_PRIMARY} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Evolución de la calidad"
                empty={calidadMesData.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={calidadMesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="promedio"
                      name="Promedio"
                      stroke={COLOR_TERTIARY}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Salidas por líder" empty={liderData.length === 0}>
                <ResponsiveContainer width="100%" height={Math.max(260, liderData.length * 32)}>
                  <BarChart data={liderData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="lider"
                      width={110}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="total" name="Salidas" fill={COLOR_PRIMARY} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Comparación salida vs cierre"
                empty={salidaVsCierreData.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={salidaVsCierreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Salidas" fill={COLOR_SECONDARY} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
